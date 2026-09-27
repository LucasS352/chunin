const express = require('express');
const prisma = require('../db');
const { getFullState } = require('../services/stateService');

const router = express.Router();

function todayInAppTimezone() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: process.env.APP_TIMEZONE || 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function isSenseiUnlocked(req) {
  return Number(req.session?.badgeAdminUntil || 0) > Date.now();
}

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
    const today = todayInAppTimezone();
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

    const today = todayInAppTimezone();
    if (date > today) {
      return res.status(403).json({ error: 'Missões futuras ainda não podem ser concluídas.' });
    }
    if (date < today && !isSenseiUnlocked(req)) {
      return res.status(403).json({ error: 'Este dia já foi encerrado. Use a senha do Sensei para corrigir o histórico.' });
    }

    const existing = await prisma.missionRecord.findUnique({
      where: {
        date_routineItemId: {
          date,
          routineItemId,
        },
      },
    });

    const completionSupplied = completed !== undefined;
    const noteSupplied = note !== undefined;
    const isCompleted = completionSupplied ? Boolean(completed) : existing ? existing.completed : true;
    const earned = isCompleted ? (Number(auraEarned) || (existing ? existing.auraEarned : 0)) : 0;
    const finalNote = noteSupplied ? String(note).trim() : existing ? existing.note : '';

    const updateData = {};
    if (completionSupplied) {
      updateData.completed = isCompleted;
      updateData.auraEarned = earned;
      updateData.completedAt = isCompleted ? (existing?.completedAt || new Date()) : null;
    }
    if (noteSupplied) {
      updateData.note = finalNote;
    }

    const record = await prisma.missionRecord.upsert({
      where: {
        date_routineItemId: {
          date,
          routineItemId,
        },
      },
      update: updateData,
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
