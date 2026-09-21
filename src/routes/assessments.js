const express = require('express');
const prisma = require('../db');
const { getFullState } = require('../services/stateService');

const router = express.Router();

// GET /api/assessments
router.get('/', async (req, res) => {
  try {
    const list = await prisma.physicalAssessment.findMany({
      orderBy: { date: 'asc' },
    });
    return res.json(list);
  } catch (error) {
    console.error('[ASSESSMENTS ERROR]:', error);
    return res.status(500).json({ error: 'Erro ao buscar avaliações.' });
  }
});

// POST /api/assessments
router.post('/', async (req, res) => {
  try {
    const { id, date, pushups, abs, plank, height, weight, note } = req.body;

    if (!date) {
      return res.status(400).json({ error: 'Data obrigatória para a avaliação.' });
    }

    const created = await prisma.physicalAssessment.create({
      data: {
        id: id || `assess_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        date,
        pushups: pushups != null ? Number(pushups) : null,
        abs: abs != null ? Number(abs) : null,
        plankSeconds: plank != null ? Number(plank) : null,
        height: height != null ? Number(height) : null,
        weight: weight != null ? Number(weight) : null,
        observation: note ? String(note).trim() : '',
      },
    });

    const updatedState = await getFullState();
    return res.json({ success: true, assessment: created, state: updatedState });
  } catch (error) {
    console.error('[ASSESSMENT POST ERROR]:', error);
    return res.status(500).json({ error: 'Erro ao salvar avaliação.' });
  }
});

// PUT /api/assessments/:id
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { date, pushups, abs, plank, height, weight, note } = req.body;

    const updated = await prisma.physicalAssessment.update({
      where: { id },
      data: {
        date,
        pushups: pushups != null ? Number(pushups) : null,
        abs: abs != null ? Number(abs) : null,
        plankSeconds: plank != null ? Number(plank) : null,
        height: height != null ? Number(height) : null,
        weight: weight != null ? Number(weight) : null,
        observation: note !== undefined ? String(note).trim() : undefined,
      },
    });

    const updatedState = await getFullState();
    return res.json({ success: true, assessment: updated, state: updatedState });
  } catch (error) {
    console.error('[ASSESSMENT PUT ERROR]:', error);
    return res.status(500).json({ error: 'Erro ao atualizar avaliação.' });
  }
});

// DELETE /api/assessments/:id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.physicalAssessment.delete({ where: { id } });

    const updatedState = await getFullState();
    return res.json({ success: true, state: updatedState });
  } catch (error) {
    console.error('[ASSESSMENT DELETE ERROR]:', error);
    return res.status(500).json({ error: 'Erro ao excluir avaliação.' });
  }
});

module.exports = router;
