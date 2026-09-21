const express = require('express');
const prisma = require('../db');
const { getFullState } = require('../services/stateService');

const router = express.Router();

// GET /api/checkins
router.get('/', async (req, res) => {
  try {
    const list = await prisma.dailyCheckin.findMany({
      orderBy: { date: 'desc' },
    });
    return res.json(list);
  } catch (error) {
    console.error('[CHECKIN GET ERROR]:', error);
    return res.status(500).json({ error: 'Erro ao buscar check-ins.' });
  }
});

// POST /api/checkins
router.post('/', async (req, res) => {
  try {
    const { date, mood, energy, observation } = req.body;
    if (!date) {
      return res.status(400).json({ error: 'Data obrigatória para check-in.' });
    }

    const checkin = await prisma.dailyCheckin.upsert({
      where: { date },
      update: {
        mood: mood !== undefined ? String(mood) : undefined,
        energy: energy != null ? Number(energy) : null,
        observation: observation !== undefined ? String(observation).trim() : undefined,
      },
      create: {
        date,
        mood: mood !== undefined ? String(mood) : '',
        energy: energy != null ? Number(energy) : null,
        observation: observation !== undefined ? String(observation).trim() : '',
      },
    });

    const updatedState = await getFullState();
    return res.json({ success: true, checkin, state: updatedState });
  } catch (error) {
    console.error('[CHECKIN POST ERROR]:', error);
    return res.status(500).json({ error: 'Erro ao salvar check-in.' });
  }
});

module.exports = router;
