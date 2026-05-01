const express = require('express');
const { requireAuth } = require('../middleware/auth.middleware');
const kitchenRepository = require('../services/kitchenRepository');
const { sendRouteError } = require('../utils/routeError');

const router = express.Router();

router.use(requireAuth);

router.get('/items', async (req, res) => {
  try {
    const items = await kitchenRepository.listByUser(req.userId);
    return res.json({ items });
  } catch (e) {
    return sendRouteError(res, e, 'Failed to load kitchen items.');
  }
});

router.post('/items', async (req, res) => {
  try {
    const item = await kitchenRepository.createItem(req.userId, req.body || {});
    return res.status(201).json({ item });
  } catch (e) {
    if (e.code === 'VALIDATION' || e.code === 'INVALID_UNIT') {
      return res.status(400).json({ message: e.message });
    }
    if (e.code === '23503') {
      return res.status(400).json({ message: 'Invalid ingredient reference.' });
    }
    return sendRouteError(res, e, 'Failed to create item.');
  }
});

router.patch('/items/:id', async (req, res) => {
  try {
    const item = await kitchenRepository.updateItem(req.userId, req.params.id, req.body || {});
    if (!item) {
      return res.status(404).json({ message: 'Item not found.' });
    }
    return res.json({ item });
  } catch (e) {
    if (e.code === 'VALIDATION' || e.code === 'INVALID_UNIT') {
      return res.status(400).json({ message: e.message });
    }
    return sendRouteError(res, e, 'Failed to update item.');
  }
});

router.delete('/items/:id', async (req, res) => {
  try {
    const ok = await kitchenRepository.deleteItem(req.userId, req.params.id);
    if (!ok) {
      return res.status(404).json({ message: 'Item not found.' });
    }
    return res.status(204).send();
  } catch (e) {
    return sendRouteError(res, e, 'Failed to delete item.');
  }
});

module.exports = router;
