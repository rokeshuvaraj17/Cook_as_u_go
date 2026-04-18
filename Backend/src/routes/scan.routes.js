'use strict';

const express = require('express');
const multer = require('multer');
const { requireAuth } = require('../middleware/auth.middleware');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 18 * 1024 * 1024 },
});

function scanUpstreamBase() {
  return (process.env.SCAN_API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
}

const router = express.Router();

/**
 * Proxies receipt image to ScanAndSave (FastAPI) so mobile apps only call this API (one host/port).
 */
const UPSTREAM_SCAN_TIMEOUT_MS = 120_000;

router.post('/receipt-preview', requireAuth, upload.single('file'), async (req, res) => {
  if (!req.file?.buffer) {
    return res.status(400).json({ message: 'Missing image file (form field: file).' });
  }
  const target = `${scanUpstreamBase()}/receipts/process-receipt-preview/`;
  const upstreamController = new AbortController();
  const killUpstream = setTimeout(() => upstreamController.abort(), UPSTREAM_SCAN_TIMEOUT_MS);
  try {
    const type =
      req.file.mimetype && req.file.mimetype !== 'application/octet-stream'
        ? req.file.mimetype
        : 'image/jpeg';
    const form = new FormData();
    form.append('file', new Blob([req.file.buffer], { type }), req.file.originalname || 'receipt.jpg');
    const upstream = await fetch(target, {
      method: 'POST',
      body: form,
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
      return res.status(504).json({ message: 'Scan service timed out. Try again or check SCAN_API_URL.' });
    }
    console.error('scan proxy:', e && e.message ? e.message : e);
    return res.status(502).json({
      message: `Scan service unreachable at ${scanUpstreamBase()}. Start uvicorn/FastAPI and set SCAN_API_URL if needed.`,
    });
  } finally {
    clearTimeout(killUpstream);
  }
});

module.exports = router;
