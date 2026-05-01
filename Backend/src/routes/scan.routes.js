'use strict';

const express = require('express');
const multer = require('multer');
const { requireAuth } = require('../middleware/auth.middleware');
const userApiSettingsRepo = require('../services/userApiSettingsRepository');
const { scanServiceBase } = require('../config/scanUpstream');
const { sendRouteError } = require('../utils/routeError');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 18 * 1024 * 1024 },
});

const router = express.Router();

const UPSTREAM_SCAN_TIMEOUT_MS = 120_000;

router.post('/receipt-preview', requireAuth, upload.single('file'), async (req, res) => {
  if (!req.file?.buffer) {
    return res.status(400).json({ message: 'Missing image file (form field: file).' });
  }

  let row;
  try {
    row = await userApiSettingsRepo.getDefaultLlmForScan(req.userId);
  } catch (e) {
    return sendRouteError(res, e, 'Could not load API settings for scan.');
  }

  if (!row?.api_key || !String(row.api_key).trim()) {
    return res.status(400).json({
      message: 'Set a default API with an API key in Menu → API settings before scanning receipts.',
    });
  }

  const target = `${scanServiceBase()}/receipts/process-receipt-preview/`;
  let killUpstream;
  try {
    const upstreamController = new AbortController();
    killUpstream = setTimeout(() => upstreamController.abort(), UPSTREAM_SCAN_TIMEOUT_MS);
    const type =
      req.file.mimetype && req.file.mimetype !== 'application/octet-stream'
        ? req.file.mimetype
        : 'image/jpeg';
    const form = new FormData();
    form.append('file', new Blob([req.file.buffer], { type }), req.file.originalname || 'receipt.jpg');

    const headers = {
      'X-LLM-Api-Key': String(row.api_key).trim(),
    };
    if (row.base_url) headers['X-LLM-Base-Url'] = String(row.base_url).trim().replace(/\/+$/, '');
    if (row.model) headers['X-LLM-Model'] = String(row.model).trim();
    if (row.provider) headers['X-LLM-Provider'] = String(row.provider).trim();

    const upstream = await fetch(target, {
      method: 'POST',
      body: form,
      headers,
      signal: upstreamController.signal,
    });
    const ct = upstream.headers.get('content-type') || 'application/json';
    const buf = Buffer.from(await upstream.arrayBuffer());
    if (!res.headersSent) {
      res.status(upstream.status).setHeader('Content-Type', ct).send(buf);
    }
  } catch (e) {
    if (res.headersSent) {
      return;
    }
    if (e && e.name === 'AbortError') {
      return res.status(504).json({ message: 'Scan service timed out. Try again.' });
    }
    console.error('scan proxy:', e && e.message ? e.message : e);
    return res.status(502).json({
      message:
        `Receipt scan service is not reachable at ${scanServiceBase()}. ` +
        `Start ScanAndSave (uvicorn) or set SCAN_API_URL in Backend/.env to the FastAPI base URL.`,
    });
  } finally {
    if (killUpstream) clearTimeout(killUpstream);
  }
});

module.exports = router;
