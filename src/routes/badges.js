const crypto = require('crypto');
const express = require('express');
const prisma = require('../db');
const { getFullState } = require('../services/stateService');

const router = express.Router();
const ADMIN_WINDOW_MS = 10 * 60 * 1000;

function isAdminUnlocked(req) {
  return Number(req.session?.badgeAdminUntil || 0) > Date.now();
}

function passwordsMatch(candidate, expected) {
  const candidateHash = crypto.createHash('sha256').update(String(candidate || '')).digest();
  const expectedHash = crypto.createHash('sha256').update(String(expected || '')).digest();
  return crypto.timingSafeEqual(candidateHash, expectedHash);
}

function requireBadgeAdmin(req, res, next) {
  if (isAdminUnlocked(req)) return next();
  return res.status(403).json({ error: 'Área do Sensei bloqueada. Informe a senha administrativa.' });
}

function cleanBadgeInput(body) {
  const emoji = String(body.emoji || '').trim();
  const title = String(body.title || '').trim();
  const description = String(body.description || '').trim();

  if (!emoji || Array.from(emoji).length > 8) {
    return { error: 'Escolha um emoji curto para a insígnia.' };
  }
  if (!title || title.length > 50) {
    return { error: 'O nome da insígnia deve ter entre 1 e 50 caracteres.' };
  }
  if (description.length > 140) {
    return { error: 'A descrição pode ter no máximo 140 caracteres.' };
  }

  return { emoji, title, description };
}

router.get('/admin-status', (req, res) => {
  return res.json({
    configured: Boolean(String(process.env.ADMIN_PASSWORD || '').trim()),
    unlocked: isAdminUnlocked(req),
    expiresAt: isAdminUnlocked(req) ? Number(req.session.badgeAdminUntil) : null,
  });
});

router.post('/unlock', (req, res) => {
  const expected = String(process.env.ADMIN_PASSWORD || '').trim();
  if (!expected) {
    return res.status(503).json({ error: 'Defina ADMIN_PASSWORD no servidor para editar insígnias.' });
  }
  if (!passwordsMatch(req.body.password, expected)) {
    return res.status(403).json({ error: 'Senha do Sensei incorreta.' });
  }

  req.session.badgeAdminUntil = Date.now() + ADMIN_WINDOW_MS;
  return req.session.save((error) => {
    if (error) return res.status(500).json({ error: 'Não foi possível desbloquear a área do Sensei.' });
    return res.json({ success: true, unlocked: true, expiresAt: req.session.badgeAdminUntil });
  });
});

router.post('/lock', (req, res) => {
  delete req.session.badgeAdminUntil;
  return req.session.save(() => res.json({ success: true, unlocked: false }));
});

router.post('/', requireBadgeAdmin, async (req, res) => {
  try {
    const input = cleanBadgeInput(req.body);
    if (input.error) return res.status(400).json({ error: input.error });

    const last = await prisma.badge.findFirst({ orderBy: { sortOrder: 'desc' } });
    await prisma.badge.create({
      data: { ...input, sortOrder: (last?.sortOrder || 0) + 10 },
    });
    return res.json({ success: true, state: await getFullState() });
  } catch (error) {
    console.error('[BADGE CREATE ERROR]:', error);
    return res.status(500).json({ error: 'Erro ao criar insígnia.' });
  }
});

router.put('/:id', requireBadgeAdmin, async (req, res) => {
  try {
    const input = cleanBadgeInput(req.body);
    if (input.error) return res.status(400).json({ error: input.error });

    await prisma.badge.update({ where: { id: req.params.id }, data: input });
    return res.json({ success: true, state: await getFullState() });
  } catch (error) {
    console.error('[BADGE UPDATE ERROR]:', error);
    return res.status(500).json({ error: 'Erro ao atualizar insígnia.' });
  }
});

router.delete('/:id', requireBadgeAdmin, async (req, res) => {
  try {
    await prisma.badge.delete({ where: { id: req.params.id } });
    return res.json({ success: true, state: await getFullState() });
  } catch (error) {
    console.error('[BADGE DELETE ERROR]:', error);
    return res.status(500).json({ error: 'Erro ao remover insígnia.' });
  }
});

module.exports = router;
