const express = require('express');
const { getFullState } = require('../services/stateService');
const prisma = require('../db');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const state = await getFullState();
    return res.json(state);
  } catch (error) {
    console.error('[STATE ERROR]:', error);
    return res.status(500).json({ error: 'Erro ao carregar estado do servidor.' });
  }
});

router.patch('/filter', async (req, res) => {
  try {
    const { historyFilter } = req.body;
    await prisma.appSettings.upsert({
      where: { id: 1 },
      update: { historyFilter: String(historyFilter) },
      create: { id: 1, historyFilter: String(historyFilter) },
    });
    return res.json({ success: true, historyFilter });
  } catch (error) {
    console.error('[FILTER ERROR]:', error);
    return res.status(500).json({ error: 'Erro ao salvar filtro.' });
  }
});

module.exports = router;
