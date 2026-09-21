const express = require('express');
const { verifyCredentials } = require('../services/authService');

const router = express.Router();

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Informe usuário e senha.' });
    }

    const user = await verifyCredentials(username, password);
    if (!user) {
      return res.status(401).json({ error: 'Usuário ou senha incorretos.' });
    }

    // Regenerate session ID upon login for security (prevents session fixation)
    req.session.regenerate((err) => {
      if (err) {
        console.error('[AUTH ERROR] Erro ao regenerar sessão:', err);
        return res.status(500).json({ error: 'Erro interno ao iniciar sessão.' });
      }

      req.session.userId = user.id;
      req.session.username = user.username;

      req.session.save((saveErr) => {
        if (saveErr) {
          console.error('[AUTH ERROR] Erro ao salvar sessão:', saveErr);
          return res.status(500).json({ error: 'Erro ao persistir sessão.' });
        }

        return res.json({
          username: user.username,
          authenticated: true,
        });
      });
    });
  } catch (error) {
    console.error('[AUTH ERROR]:', error);
    return res.status(500).json({ error: 'Erro no processamento do login.' });
  }
});

router.post('/logout', (req, res) => {
  if (req.session) {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: 'Erro ao encerrar sessão.' });
      }
      res.clearCookie('tutu.sid', { path: '/' });
      return res.json({ message: 'Sessão encerrada com sucesso.', authenticated: false });
    });
  } else {
    return res.json({ message: 'Nenhuma sessão ativa.', authenticated: false });
  }
});

router.get('/me', (req, res) => {
  if (req.session && req.session.userId) {
    return res.json({
      username: req.session.username,
      authenticated: true,
    });
  }
  return res.status(401).json({
    error: 'Não autenticado.',
    authenticated: false,
  });
});

module.exports = router;
