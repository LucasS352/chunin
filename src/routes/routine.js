const express = require('express');
const prisma = require('../db');
const { getFullState } = require('../services/stateService');

const router = express.Router();

// GET /api/routine
router.get('/', async (req, res) => {
  try {
    const items = await prisma.routineItem.findMany({
      orderBy: { time: 'asc' },
    });
    const active = items.filter((i) => !i.archivedAt);
    const archived = items.filter((i) => !!i.archivedAt);
    return res.json({ active, archived });
  } catch (error) {
    console.error('[ROUTINE ERROR]:', error);
    return res.status(500).json({ error: 'Erro ao buscar rotina.' });
  }
});

// POST /api/routine/week (marcar semana como pronta)
router.post('/week', async (req, res) => {
  try {
    const { weekStart, plannedAt, itemCount } = req.body;
    if (!weekStart || !plannedAt) {
      return res.status(400).json({ error: 'Dados incompletos de semana.' });
    }

    const plan = await prisma.weekPlan.upsert({
      where: { weekStart },
      update: {
        plannedAt,
        itemCount: Number(itemCount) || 0,
        confirmed: true,
      },
      create: {
        weekStart,
        plannedAt,
        itemCount: Number(itemCount) || 0,
        confirmed: true,
      },
    });

    return res.json({ success: true, plan });
  } catch (error) {
    console.error('[ROUTINE WEEK ERROR]:', error);
    return res.status(500).json({ error: 'Erro ao confirmar semana.' });
  }
});

// POST /api/routine/items (adicionar item ou múltiplos itens como modelo saudável)
router.post('/items', async (req, res) => {
  try {
    const items = Array.isArray(req.body) ? req.body : [req.body];

    for (const item of items) {
      const id = item.id || `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await prisma.routineItem.create({
        data: {
          id,
          title: item.title,
          time: item.time,
          category: item.category || 'outro',
          rank: item.rank || 'B',
          auraReward: Number(item.auraReward ?? item.aura ?? 10),
          daysOfWeek: Array.isArray(item.daysOfWeek ?? item.days) ? (item.daysOfWeek ?? item.days) : [0, 1, 2, 3, 4, 5, 6],
          note: item.note || '',
          isFixed: !!item.isFixed || !!item.fixed,
          createdAt: item.createdAt || new Date().toISOString().slice(0, 10),
        },
      });
    }

    // Invalidate future week plan when routine changes if requested
    if (req.query.invalidateWeek) {
      await prisma.weekPlan.deleteMany({
        where: { weekStart: req.query.invalidateWeek },
      });
    }

    const updatedState = await getFullState();
    return res.json({ success: true, state: updatedState });
  } catch (error) {
    console.error('[ROUTINE ADD ERROR]:', error);
    return res.status(500).json({ error: 'Erro ao adicionar item de rotina.' });
  }
});

// PUT /api/routine/items/:id
router.put('/items/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, time, category, rank, aura, days, note, fixed, archivedAt, invalidateWeek } = req.body;

    const existing = await prisma.routineItem.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Item não encontrado.' });
    }

    if (existing.isFixed) {
      // Escola fixa só pode ter o horário e notas atualizados, mantendo dias e título
      await prisma.routineItem.update({
        where: { id },
        data: {
          time: time || existing.time,
          note: note !== undefined ? note : existing.note,
        },
      });
    } else {
      // Para itens não-fixos, arquiva a versão anterior e cria a nova para preservar histórico
      if (archivedAt) {
        await prisma.routineItem.update({
          where: { id },
          data: { archivedAt },
        });

        const newId = `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await prisma.routineItem.create({
          data: {
            id: newId,
            title: title || existing.title,
            time: time || existing.time,
            category: category || existing.category,
            rank: rank || existing.rank,
            auraReward: Number(aura ?? existing.auraReward),
            daysOfWeek: Array.isArray(days) ? days : existing.daysOfWeek,
            note: note !== undefined ? note : existing.note,
            isFixed: false,
            createdAt: new Date().toISOString().slice(0, 10),
          },
        });
      } else {
        await prisma.routineItem.update({
          where: { id },
          data: {
            title: title || existing.title,
            time: time || existing.time,
            category: category || existing.category,
            rank: rank || existing.rank,
            auraReward: Number(aura ?? existing.auraReward),
            daysOfWeek: Array.isArray(days) ? days : existing.daysOfWeek,
            note: note !== undefined ? note : existing.note,
          },
        });
      }
    }

    if (invalidateWeek) {
      await prisma.weekPlan.deleteMany({
        where: { weekStart: invalidateWeek },
      });
    }

    const updatedState = await getFullState();
    return res.json({ success: true, state: updatedState });
  } catch (error) {
    console.error('[ROUTINE EDIT ERROR]:', error);
    return res.status(500).json({ error: 'Erro ao editar item da rotina.' });
  }
});

// DELETE /api/routine/items/:id
router.delete('/items/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { archivedAt, invalidateWeek } = req.body || {};

    const existing = await prisma.routineItem.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Item não encontrado.' });
    }

    if (existing.isFixed) {
      return res.status(400).json({ error: 'A Escola é uma missão fixa e não pode ser excluída.' });
    }

    const archDate = archivedAt || new Date().toISOString().slice(0, 10);
    await prisma.routineItem.update({
      where: { id },
      data: { archivedAt: archDate },
    });

    if (invalidateWeek) {
      await prisma.weekPlan.deleteMany({
        where: { weekStart: invalidateWeek },
      });
    }

    const updatedState = await getFullState();
    return res.json({ success: true, state: updatedState });
  } catch (error) {
    console.error('[ROUTINE DELETE ERROR]:', error);
    return res.status(500).json({ error: 'Erro ao remover item da rotina.' });
  }
});

// POST /api/routine/clear (limpar rotina, mantendo Escola e histórico)
router.post('/clear', async (req, res) => {
  try {
    const { archivedAt, invalidateWeek } = req.body || {};
    const archDate = archivedAt || new Date().toISOString().slice(0, 10);

    // Arquiva todos os itens ativos que NÃO são fixos
    await prisma.routineItem.updateMany({
      where: {
        isFixed: false,
        archivedAt: null,
      },
      data: {
        archivedAt: archDate,
      },
    });

    if (invalidateWeek) {
      await prisma.weekPlan.deleteMany({
        where: { weekStart: invalidateWeek },
      });
    }

    const updatedState = await getFullState();
    return res.json({ success: true, message: 'Rotina limpa com sucesso. Escola preservada.', state: updatedState });
  } catch (error) {
    console.error('[ROUTINE CLEAR ERROR]:', error);
    return res.status(500).json({ error: 'Erro ao limpar rotina.' });
  }
});

module.exports = router;
