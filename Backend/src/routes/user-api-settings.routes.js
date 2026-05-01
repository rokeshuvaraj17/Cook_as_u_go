const express = require('express');
const { requireAuth } = require('../middleware/auth.middleware');
const repo = require('../services/userApiSettingsRepository');
const { sendRouteError } = require('../utils/routeError');

const router = express.Router();

function normalizeBaseUrl(url) {
  const v = String(url || '').trim().replace(/\/+$/, '');
  if (!v) return '';
  const parsed = new URL(v);
  return parsed.toString().replace(/\/+$/, '');
}

function defaultBaseUrlForProvider(provider) {
  const p = String(provider || '').trim().toLowerCase();
  if (p === 'openrouter') return 'https://openrouter.ai/api/v1';
  if (p === 'gemini') return 'https://generativelanguage.googleapis.com/v1beta';
  if (p === 'openai') return 'https://api.openai.com/v1';
  if (p === 'claude') return 'https://api.anthropic.com/v1';
  return 'https://openrouter.ai/api/v1';
}

/** Label is optional from clients; derive a short display name from provider/model. */
function resolvedLabel({ label, provider, model }) {
  const fromClient = label != null && String(label).trim();
  if (fromClient) return fromClient;
  const p = String(provider || 'custom').trim() || 'custom';
  const m = model != null && String(model).trim();
  if (m) return `${p} · ${m}`;
  return p;
}

router.use(requireAuth);

router.get('/', async (req, res) => {
  try {
    const items = await repo.listByUser(req.userId);
    return res.json({ items });
  } catch (e) {
    return sendRouteError(res, e, 'Could not load API settings.');
  }
});

router.post('/', async (req, res) => {
  try {
    const {
      label,
      api_type: apiType,
      provider,
      model,
      base_url: baseUrl,
      api_key: apiKey,
      is_default: isDefault,
    } = req.body || {};
    if (!apiType) {
      return res.status(400).json({ message: 'api_type is required.' });
    }
    if (!apiKey || !String(apiKey).trim()) {
      return res.status(400).json({ message: 'api_key is required.' });
    }
    const chosenProvider = provider ? String(provider).trim() : 'custom';
    const trimmedModel = model ? String(model).trim() : null;
    const normalizedBase = baseUrl
      ? normalizeBaseUrl(baseUrl)
      : defaultBaseUrlForProvider(chosenProvider);
    const item = await repo.createForUser(req.userId, {
      label: resolvedLabel({ label, provider: chosenProvider, model: trimmedModel }),
      api_type: String(apiType).trim(),
      provider: chosenProvider,
      model: trimmedModel,
      base_url: normalizedBase,
      api_key: apiKey ? String(apiKey) : null,
      is_default: Boolean(isDefault),
    });
    if (item.is_default) {
      await repo.setDefaultForUser(req.userId, item.api_type, item.id);
    }
    return res.status(201).json({ item });
  } catch (e) {
    return sendRouteError(res, e, 'Could not save API setting.');
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const id = String(req.params.id || '').trim();
    const body = req.body || {};
    const chosenProvider = body.provider ? String(body.provider).trim() : null;
    const normalizedBase = body.base_url
      ? normalizeBaseUrl(body.base_url)
      : chosenProvider
        ? defaultBaseUrlForProvider(chosenProvider)
        : null;
    const updated = await repo.updateForUser(req.userId, id, {
      label: body.label ? String(body.label).trim() : null,
      api_type: body.api_type ? String(body.api_type).trim() : null,
      provider: chosenProvider,
      model: body.model ? String(body.model).trim() : null,
      base_url: normalizedBase,
      api_key: body.api_key ?? null,
      clear_api_key: body.clear_api_key === true,
      is_default: body.is_default,
    });
    if (!updated) {
      return res.status(404).json({ message: 'API setting not found.' });
    }
    if (body.is_default === true) {
      await repo.setDefaultForUser(req.userId, updated.api_type, updated.id);
    }
    return res.json({ item: updated });
  } catch (e) {
    return sendRouteError(res, e, 'Could not update API setting.');
  }
});

router.post('/:id/set-default', async (req, res) => {
  try {
    const id = String(req.params.id || '').trim();
    const apiType = String(req.body?.api_type || '').trim();
    if (!apiType) {
      return res.status(400).json({ message: 'api_type is required.' });
    }
    const item = await repo.setDefaultForUser(req.userId, apiType, id);
    if (!item) {
      return res.status(404).json({ message: 'API setting not found.' });
    }
    return res.json({ item });
  } catch (e) {
    return sendRouteError(res, e, 'Could not set default API.');
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const ok = await repo.removeForUser(req.userId, String(req.params.id || '').trim());
    if (!ok) {
      return res.status(404).json({ message: 'API setting not found.' });
    }
    return res.status(204).send();
  } catch (e) {
    return sendRouteError(res, e, 'Could not delete API setting.');
  }
});

module.exports = router;
