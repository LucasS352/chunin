const prisma = require('../db');

async function getFullState() {
  const settings = (await prisma.appSettings.findFirst({ where: { id: 1 } })) || {
    projectName: 'Tutu (Arthur)',
    age: 12,
    startDate: '2026-09-21',
    endDate: '2026-11-21',
    baselinePushups: 20,
    baselineAbs: 100,
    baselinePlank: 126,
    baselineHeight: 150.0,
    baselineWeight: 50.4,
    baselineNote: 'Marco Zero do projeto.',
    auraBonus: 0,
    historyFilter: '7',
  };

  const allRoutineItems = await prisma.routineItem.findMany({
    orderBy: { time: 'asc' },
  });

  const activeRoutine = [];
  const archivedRoutine = [];

  for (const item of allRoutineItems) {
    const formatted = {
      id: item.id,
      title: item.title,
      time: item.time,
      category: item.category,
      rank: item.rank,
      aura: item.auraReward,
      days: item.daysOfWeek,
      note: item.note || '',
      fixed: item.isFixed,
      createdAt: item.createdAt,
    };
    if (item.archivedAt) {
      archivedRoutine.push({
        ...formatted,
        archivedAt: item.archivedAt,
      });
    } else {
      activeRoutine.push(formatted);
    }
  }

  const missionRecords = await prisma.missionRecord.findMany();
  const completions = {};
  const auraLedger = {};
  const missionNotes = {};

  for (const m of missionRecords) {
    if (!completions[m.date]) completions[m.date] = {};
    completions[m.date][m.routineItemId] = m.completed;

    if (m.completed) {
      auraLedger[`${m.date}|${m.routineItemId}`] = m.auraEarned;
    }

    if (m.note) {
      if (!missionNotes[m.date]) missionNotes[m.date] = {};
      missionNotes[m.date][m.routineItemId] = m.note;
    }
  }

  const allCheckins = await prisma.dailyCheckin.findMany();
  const checkins = {};
  const notes = {};

  for (const c of allCheckins) {
    checkins[c.date] = {
      mood: c.mood || '',
      energy: c.energy != null ? c.energy : null,
    };
    if (c.observation) {
      notes[c.date] = c.observation;
    }
  }

  const progressRecords = await prisma.physicalAssessment.findMany({
    orderBy: { date: 'asc' },
  });

  const progress = progressRecords.map((p) => ({
    id: p.id,
    date: p.date,
    pushups: p.pushups,
    abs: p.abs,
    plank: p.plankSeconds,
    height: p.height,
    weight: p.weight,
    note: p.observation || '',
  }));

  const specialMissionsRecords = await prisma.challenge.findMany({
    orderBy: { dueDate: 'asc' },
  });

  const specialMissions = specialMissionsRecords.map((s) => ({
    id: s.id,
    title: s.title,
    dueDate: s.dueDate,
    rank: s.rank,
    aura: s.auraReward,
    note: s.note || '',
    done: s.completed,
    createdAt: s.createdAt,
    completedAt: s.completedAt || undefined,
  }));

  const weekPlanRecords = await prisma.weekPlan.findMany();
  const weekPlans = {};
  for (const w of weekPlanRecords) {
    weekPlans[w.weekStart] = {
      plannedAt: w.plannedAt,
      itemCount: w.itemCount,
    };
  }

  return {
    profile: {
      name: settings.projectName,
      age: settings.age,
      height: settings.baselineHeight,
      weight: settings.baselineWeight,
      startDate: settings.startDate,
      endDate: settings.endDate,
    },
    baseline: {
      date: settings.startDate,
      pushups: settings.baselinePushups,
      abs: settings.baselineAbs,
      plank: settings.baselinePlank,
      height: settings.baselineHeight,
      weight: settings.baselineWeight,
      note: settings.baselineNote,
    },
    routine: activeRoutine,
    archivedRoutine,
    completions,
    auraLedger,
    missionNotes,
    notes,
    checkins,
    progress,
    specialMissions,
    weekPlans,
    historyFilter: settings.historyFilter === 'all' ? 'all' : Number(settings.historyFilter) || 7,
    auraBonus: settings.auraBonus || 0,
    serverTime: new Date().toISOString(),
  };
}

module.exports = {
  getFullState,
};
