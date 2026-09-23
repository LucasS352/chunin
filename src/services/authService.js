const bcrypt = require('bcryptjs');
const prisma = require('../db');

const FIXED_SCHOOL_ID = 'school-fixed';
const SCHOOL_DAYS = [1, 2, 3, 4, 5];
const START_DATE = '2026-09-21';
const END_DATE = '2026-11-21';

async function initUserAndSettings() {
  const username = (process.env.APP_USERNAME || 'tutu').trim();
  const rawPassword = (process.env.APP_PASSWORD || '1234').trim();

  // 1. Ensure user exists
  const existingUser = await prisma.user.findUnique({
    where: { username },
  });

  if (!existingUser) {
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(rawPassword, saltRounds);
    await prisma.user.create({
      data: {
        username,
        passwordHash,
      },
    });
    console.log(`[AUTH] Usuário inicial '${username}' criado com sucesso.`);
  } else if (!(await bcrypt.compare(rawPassword, existingUser.passwordHash))) {
    const passwordHash = await bcrypt.hash(rawPassword, 12);
    await prisma.user.update({
      where: { id: existingUser.id },
      data: { passwordHash },
    });
    console.log(`[AUTH] Senha do usuário '${username}' sincronizada com APP_PASSWORD.`);
  }

  // 2. Ensure AppSettings exists
  const settings = await prisma.appSettings.findFirst({
    where: { id: 1 },
  });

  if (!settings) {
    await prisma.appSettings.create({
      data: {
        id: 1,
        projectName: 'Tutu (Arthur)',
        age: 12,
        startDate: START_DATE,
        endDate: END_DATE,
        baselinePushups: 20,
        baselineAbs: 100,
        baselinePlank: 126,
        baselineHeight: 150.0,
        baselineWeight: 50.4,
        baselineNote: 'Marco Zero do projeto.',
        auraBonus: 0,
        historyFilter: '7',
      },
    });
    console.log('[INIT] Configurações e Marco Zero inicializados.');
  }

  // 3. Ensure fixed school item exists in routine
  const existingSchool = await prisma.routineItem.findUnique({
    where: { id: FIXED_SCHOOL_ID },
  });

  if (!existingSchool) {
    await prisma.routineItem.create({
      data: {
        id: FIXED_SCHOOL_ID,
        title: 'Escola',
        time: '07:00',
        category: 'escola',
        rank: 'A',
        auraReward: 15,
        daysOfWeek: SCHOOL_DAYS,
        note: 'Missão fixa nos dias de aula. Ajuste o horário se precisar.',
        isFixed: true,
        createdAt: START_DATE,
      },
    });
    console.log('[INIT] Missão fixa da Escola inicializada.');
  }
}

async function verifyCredentials(username, password) {
  if (!username || !password) return null;
  const cleanUsername = String(username).trim();
  const cleanPassword = String(password).trim();

  const user = await prisma.user.findUnique({
    where: { username: cleanUsername },
  });

  if (!user) return null;

  const valid = await bcrypt.compare(cleanPassword, user.passwordHash);
  if (!valid) return null;

  return {
    id: user.id,
    username: user.username,
  };
}

module.exports = {
  initUserAndSettings,
  verifyCredentials,
  START_DATE,
  END_DATE,
  FIXED_SCHOOL_ID,
  SCHOOL_DAYS,
};
