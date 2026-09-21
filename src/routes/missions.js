const express = require('express');
const prisma = require('../db');
const { getFullState } = require('../services/stateService');

const router = express.Router();

// GET /api/missions
router.get('/', async (req, res) => {
  try {
    const records = await prisma.missionRecord.findMany({
      orderBy: [{ date: 'desc' }, { completedAt: 'desc' }],
    });
    return res.json(records);
  } catch (error) {
    console.error('[MISSIONS ERROR]:', error);
    return res.status(500).json({ error: 'Erro ao buscar missões.' });
  }
});

// GET /api/missions/today
router.get('/today', async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const records = await prisma.missionRecord.findMany({
      where: { date: today },
    });
    return res.json(records);
  } catch (error) {
    console.error('[MISSIONS TODAY ERROR]:', error);
    return res.status(500).json({ error: 'Erro ao buscar missões de hoje.' });
  }
});

// PATCH /api/missions/:id (toggle completion or update note)
// :id is the routineItemId
router.patch('/:id', async (req, res) => {
  try {
    const routineItemId = req.params.id;
    const { date, completed, auraEarned, note } = req.body;

    if (!date) {
      return res.status(400).json({ error: 'Data obrigatória para registrar missão.' });
    }

    const existing = await prisma.missionRecord.findUnique({
      where: {
        date_routineItemId: {
          date,
          routineItemId,
        },
      },
    });

    const isCompleted = completed !== undefined ? Boolean(completed) : existing ? existing.completed : true;
    const earned = isCompleted ? (Number(auraEarned) || (existing ? existing.auraEarned : 0)) : 0;
    const finalNote = note !== undefined ? String(note).trim() : existing ? existing.note : '';

    const record = await prisma.missionRecord.upsert({
      where: {
        date_routineItemId: {
          date,
          routineItemId,
        },
      },
      update: {
        completed: isCompleted,
        auraEarned: earned,
        note: finalNote,
        completedAt: isCompleted ? (existing?.completedAt || new Date()) : null,
      },
      create: {
        date,
        routineItemId,
        completed: isCompleted,
        auraEarned: earned,
        note: finalNote,
        completedAt: isCompleted ? new Date() : null,
      },
    });

    const updatedState = await getFullState();
    return res.json({ success: true, record, state: updatedState });
  } catch (error) {
    console.error('[MISSION PATCH ERROR]:', error);
    return res.status(500).json({ error: 'Erro ao atualizar missão.' });
  }
});

module.exports = router;
