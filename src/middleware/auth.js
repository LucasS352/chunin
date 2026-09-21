function requireAuth(req, res, next) {
  if (req.session && req.session.userId) {
    return next();
  }
  return res.status(401).json({
    error: 'Não autorizado. Faça login para continuar.',
    authenticated: false,
  });
}

function requirePageAuth(req, res, next) {
  if (req.session && req.session.userId) {
    return next();
  }
  return res.redirect('/login');
}

function redirectIfAuthenticated(req, res, next) {
  if (req.session && req.session.userId) {
    return res.redirect('/');
  }
  return next();
}

module.exports = {
  requireAuth,
  requirePageAuth,
  redirectIfAuthenticated,
};
