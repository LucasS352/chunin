const express = require('express');
const prisma = require('../db');
const { getFullState } = require('../services/stateService');

const router = express.Router();

// GET /api/challenges
router.get('/', async (req, res) => {
  try {
    const list = await prisma.challenge.findMany({
      orderBy: { dueDate: 'asc' },
    });
    return res.json(list);
  } catch (error) {
    console.error('[CHALLENGES GET ERROR]:', error);
    return res.status(500).json({ error: 'Erro ao buscar desafios.' });
  }
});

// POST /api/challenges
router.post('/', async (req, res) => {
  try {
    const { id, title, dueDate, rank, aura, note } = req.body;
    if (!title || !dueDate) {
      return res.status(400).json({ error: 'Título e data limite são obrigatórios.' });
    }

    const created = await prisma.challenge.create({
      data: {
        id: id || `chal_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        title: String(title).trim(),
        dueDate,
        rank: rank || 'B',
        auraReward: Number(aura) || 15,
        note: note ? String(note).trim() : '',
        completed: false,
        createdAt: new Date().toISOString().slice(0, 10),
      },
    });

    const updatedState = await getFullState();
    return res.json({ success: true, challenge: created, state: updatedState });
  } catch (error) {
    console.error('[CHALLENGE POST ERROR]:', error);
    return res.status(500).json({ error: 'Erro ao criar desafio.' });
  }
});

// PATCH /api/challenges/:id (marcar concluído / reabrir)
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { done, completedAt } = req.body;

    const existing = await prisma.challenge.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Desafio não encontrado.' });
    }

    const isDone = Boolean(done);
    const compDate = isDone ? (completedAt || new Date().toISOString().slice(0, 10)) : null;

    // Atualiza o desafio
    await prisma.challenge.update({
      where: { id },
      data: {
        completed: isDone,
        completedAt: compDate,
      },
    });

    // Atualiza auraBonus global se o desafio foi concluído ou reaberto
    if (isDone && !existing.completed) {
      await prisma.appSettings.update({
        where: { id: 1 },
        data: {
          auraBonus: { increment: existing.auraReward },
        },
      });
    } else if (!isDone && existing.completed) {
      await prisma.appSettings.update({
        where: { id: 1 },
        data: {
          auraBonus: { decrement: existing.auraReward },
        },
      });
    }

    const updatedState = await getFullState();
    return res.json({ success: true, state: updatedState });
  } catch (error) {
    console.error('[CHALLENGE PATCH ERROR]:', error);
    return res.status(500).json({ error: 'Erro ao atualizar status do desafio.' });
  }
});

// DELETE /api/challenges/:id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.challenge.findUnique({ where: { id } });
    if (existing) {
      if (existing.completed) {
        // Estorna aura se foi concluído antes de excluir
        await prisma.appSettings.update({
          where: { id: 1 },
          data: {
            auraBonus: { decrement: existing.auraReward },
          },
        });
      }
      await prisma.challenge.delete({ where: { id } });
    }

    const updatedState = await getFullState();
    return res.json({ success: true, state: updatedState });
  } catch (error) {
    console.error('[CHALLENGE DELETE ERROR]:', error);
    return res.status(500).json({ error: 'Erro ao excluir desafio.' });
  }
});

module.exports = router;
