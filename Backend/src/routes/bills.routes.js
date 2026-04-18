const express = require('express');
const { requireAuth } = require('../middleware/auth.middleware');
const { saveBillAndPantryItems } = require('../services/billRepository');

const router = express.Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  try {
    const bills = await require('../services/billRepository').listBillsByUser(req.userId, {
      store: req.query.store,
      fromDate: req.query.fromDate,
      toDate: req.query.toDate,
      minSpend: req.query.minSpend,
      maxSpend: req.query.maxSpend,
    });
    return res.json({ bills });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: 'Failed to load bills.' });
  }
});

router.get('/report', async (req, res) => {
  try {
    const report = await require('../services/billRepository').getBillsReport(req.userId, {
      date: req.query.date,
      fromDate: req.query.fromDate,
      toDate: req.query.toDate,
      month: req.query.month,
      year: req.query.year,
      company: req.query.company,
      product: req.query.product,
    });
    return res.json({ report });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: 'Failed to load report.' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const bill = await require('../services/billRepository').getBillDetail(req.userId, req.params.id);
    if (!bill) return res.status(404).json({ message: 'Bill not found.' });
    return res.json({ bill });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: 'Failed to load bill.' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const ok = await require('../services/billRepository').deleteBillByUser(req.userId, req.params.id);
    if (!ok) return res.status(404).json({ message: 'Bill not found.' });
    return res.status(204).send();
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: 'Failed to delete bill.' });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const bill = await require('../services/billRepository').updateBillByUser(
      req.userId,
      req.params.id,
      req.body || {}
    );
    if (!bill) return res.status(404).json({ message: 'Bill not found.' });
    return res.json({ bill });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: 'Failed to update bill.' });
  }
});

router.post('/save-and-add', async (req, res) => {
  try {
    const result = await saveBillAndPantryItems(req.userId, req.body || {});
    return res.status(201).json(result);
  } catch (e) {
    if (e.code === 'VALIDATION') {
      return res.status(400).json({ message: e.message });
    }
    console.error(e);
    return res.status(500).json({ message: 'Failed to save bill details.' });
  }
});

router.post('/revert-latest', async (req, res) => {
  try {
    const result = await require('../services/billRepository').revertLatestBillByUser(req.userId);
    if (!result) {
      return res.status(404).json({ message: 'No bills found to revert.' });
    }
    return res.json(result);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: 'Failed to revert latest bill.' });
  }
});

module.exports = router;
