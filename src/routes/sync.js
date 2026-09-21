const express = require('express');
const prisma = require('../db');
const { getFullState } = require('../services/stateService');

const router = express.Router();

router.post('/import-local', async (req, res) => {
  try {
    const rawData = req.body;
    if (!rawData || typeof rawData !== 'object') {
      return res.status(400).json({ error: 'Payload de dados inválido.' });
    }

    console.log('[MIGRATION] Iniciando importação dos dados do localStorage...');

    // 1. Routine (ativas)
    if (Array.isArray(rawData.routine)) {
      for (const item of rawData.routine) {
        if (!item.id || !item.title) continue;
        await prisma.routineItem.upsert({
          where: { id: item.id },
          update: {
            title: item.title,
            time: item.time || '07:00',
            category: item.category || 'outro',
            rank: item.rank || 'B',
            auraReward: Number(item.aura || item.auraReward || 10),
            daysOfWeek: Array.isArray(item.days) ? item.days : [0, 1, 2, 3, 4, 5, 6],
            note: item.note || '',
            isFixed: !!item.fixed || item.id === 'school-fixed',
            createdAt: item.createdAt || '2026-09-21',
            archivedAt: null,
          },
          create: {
            id: item.id,
            title: item.title,
            time: item.time || '07:00',
            category: item.category || 'outro',
            rank: item.rank || 'B',
            auraReward: Number(item.aura || item.auraReward || 10),
            daysOfWeek: Array.isArray(item.days) ? item.days : [0, 1, 2, 3, 4, 5, 6],
            note: item.note || '',
            isFixed: !!item.fixed || item.id === 'school-fixed',
            createdAt: item.createdAt || '2026-09-21',
          },
        });
      }
    }

    // 2. Archived Routine
    if (Array.isArray(rawData.archivedRoutine)) {
      for (const item of rawData.archivedRoutine) {
        if (!item.id || !item.title) continue;
        await prisma.routineItem.upsert({
          where: { id: item.id },
          update: {
            title: item.title,
            time: item.time || '07:00',
            category: item.category || 'outro',
            rank: item.rank || 'B',
            auraReward: Number(item.aura || item.auraReward || 10),
            daysOfWeek: Array.isArray(item.days) ? item.days : [0, 1, 2, 3, 4, 5, 6],
            note: item.note || '',
            isFixed: !!item.fixed,
            createdAt: item.createdAt || '2026-09-21',
            archivedAt: item.archivedAt || new Date().toISOString().slice(0, 10),
          },
          create: {
            id: item.id,
            title: item.title,
            time: item.time || '07:00',
            category: item.category || 'outro',
            rank: item.rank || 'B',
            auraReward: Number(item.aura || item.auraReward || 10),
            daysOfWeek: Array.isArray(item.days) ? item.days : [0, 1, 2, 3, 4, 5, 6],
            note: item.note || '',
            isFixed: !!item.fixed,
            createdAt: item.createdAt || '2026-09-21',
            archivedAt: item.archivedAt || new Date().toISOString().slice(0, 10),
          },
        });
      }
    }

    // 3. Completions, AuraLedger e MissionNotes
    const completions = rawData.completions || {};
    const auraLedger = rawData.auraLedger || {};
    const missionNotes = rawData.missionNotes || {};

    const allDates = new Set([
      ...Object.keys(completions),
      ...Object.keys(missionNotes),
    ]);

    for (const date of allDates) {
      const dateCompletions = completions[date] || {};
      const dateNotes = missionNotes[date] || {};
      const itemIds = new Set([
        ...Object.keys(dateCompletions),
        ...Object.keys(dateNotes),
      ]);

      for (const itemId of itemIds) {
        const completed = !!dateCompletions[itemId];
        const ledgerKey = `${date}|${itemId}`;
        const auraEarned = completed ? (Number(auraLedger[ledgerKey]) || 10) : 0;
        const note = dateNotes[itemId] ? String(dateNotes[itemId]).trim() : '';

        await prisma.missionRecord.upsert({
          where: {
            date_routineItemId: {
              date,
              routineItemId: itemId,
            },
          },
          update: {
            completed,
            auraEarned,
            note,
          },
          create: {
            date,
            routineItemId: itemId,
            completed,
            auraEarned,
            note,
          },
        });
      }
    }

    // 4. Check-ins e Observações diárias
    const checkins = rawData.checkins || {};
    const dailyNotes = rawData.notes || {};
    const checkinDates = new Set([
      ...Object.keys(checkins),
      ...Object.keys(dailyNotes),
    ]);

    for (const date of checkinDates) {
      const ci = checkins[date] || {};
      const obs = dailyNotes[date] || '';

      await prisma.dailyCheckin.upsert({
        where: { date },
        update: {
          mood: ci.mood || undefined,
          energy: ci.energy != null ? Number(ci.energy) : undefined,
          observation: obs ? String(obs).trim() : undefined,
        },
        create: {
          date,
          mood: ci.mood || '',
          energy: ci.energy != null ? Number(ci.energy) : null,
          observation: obs ? String(obs).trim() : '',
        },
      });
    }

    // 5. Progress (Avaliações físicas)
    if (Array.isArray(rawData.progress)) {
      for (const p of rawData.progress) {
        if (!p.date) continue;
        const id = p.id || `assess_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
        await prisma.physicalAssessment.upsert({
          where: { id },
          update: {
            date: p.date,
            pushups: p.pushups != null ? Number(p.pushups) : null,
            abs: p.abs != null ? Number(p.abs) : null,
            plankSeconds: p.plank != null ? Number(p.plank) : null,
            height: p.height != null ? Number(p.height) : null,
            weight: p.weight != null ? Number(p.weight) : null,
            observation: p.note ? String(p.note).trim() : '',
          },
          create: {
            id,
            date: p.date,
            pushups: p.pushups != null ? Number(p.pushups) : null,
            abs: p.abs != null ? Number(p.abs) : null,
            plankSeconds: p.plank != null ? Number(p.plank) : null,
            height: p.height != null ? Number(p.height) : null,
            weight: p.weight != null ? Number(p.weight) : null,
            observation: p.note ? String(p.note).trim() : '',
          },
        });
      }
    }

    // 6. Special Missions (Desafios especiais)
    if (Array.isArray(rawData.specialMissions)) {
      for (const s of rawData.specialMissions) {
        if (!s.title || !s.dueDate) continue;
        const id = s.id || `chal_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
        await prisma.challenge.upsert({
          where: { id },
          update: {
            title: String(s.title).trim(),
            dueDate: s.dueDate,
            rank: s.rank || 'B',
            auraReward: Number(s.aura) || 15,
            note: s.note ? String(s.note).trim() : '',
            completed: !!s.done,
            completedAt: s.completedAt || null,
            createdAt: s.createdAt || '2026-09-21',
          },
          create: {
            id,
            title: String(s.title).trim(),
            dueDate: s.dueDate,
            rank: s.rank || 'B',
            auraReward: Number(s.aura) || 15,
            note: s.note ? String(s.note).trim() : '',
            completed: !!s.done,
            completedAt: s.completedAt || null,
            createdAt: s.createdAt || '2026-09-21',
          },
        });
      }
    }

    // 7. Week Plans
    if (rawData.weekPlans && typeof rawData.weekPlans === 'object') {
      for (const [weekStart, plan] of Object.entries(rawData.weekPlans)) {
        if (!plan) continue;
        await prisma.weekPlan.upsert({
          where: { weekStart },
          update: {
            plannedAt: plan.plannedAt || weekStart,
            itemCount: Number(plan.itemCount) || 0,
            confirmed: true,
          },
          create: {
            weekStart,
            plannedAt: plan.plannedAt || weekStart,
            itemCount: Number(plan.itemCount) || 0,
            confirmed: true,
          },
        });
      }
    }

    // 8. Aura bonus global
    if (rawData.auraBonus) {
      await prisma.appSettings.update({
        where: { id: 1 },
        data: {
          auraBonus: Number(rawData.auraBonus) || 0,
        },
      });
    }

    console.log('[MIGRATION] Dados importados com sucesso!');
    const updatedState = await getFullState();
    return res.json({
      success: true,
      message: 'Dados importados com sucesso.',
      state: updatedState,
    });
  } catch (error) {
    console.error('[MIGRATION ERROR]:', error);
    return res.status(500).json({ error: 'Erro ao importar dados do localStorage.' });
  }
});

module.exports = router;
