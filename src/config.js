const INSECURE_SESSION_SECRETS = new Set([
  'fallback_dev_secret_change_in_prod',
  'segredo_super_secreto_do_tutu_chunin_2026_will_of_fire',
]);

function validateProductionConfig(env = process.env) {
  if (env.NODE_ENV !== 'production') return;

  const appPassword = String(env.APP_PASSWORD || '').trim();
  const adminPassword = String(env.ADMIN_PASSWORD || '').trim();
  const sessionSecret = String(env.SESSION_SECRET || '').trim();
  const errors = [];

  if (appPassword.length < 8 || appPassword === '1234') {
    errors.push('APP_PASSWORD deve ter pelo menos 8 caracteres e não pode usar a senha padrão.');
  }
  if (!adminPassword) {
    errors.push('ADMIN_PASSWORD é obrigatória.');
  }
  if (adminPassword && adminPassword === appPassword) {
    errors.push('ADMIN_PASSWORD deve ser diferente de APP_PASSWORD.');
  }
  if (sessionSecret.length < 32 || INSECURE_SESSION_SECRETS.has(sessionSecret)) {
    errors.push('SESSION_SECRET deve ser uma chave aleatória com pelo menos 32 caracteres.');
  }

  if (errors.length) {
    throw new Error(`Configuração insegura para produção:\n- ${errors.join('\n- ')}`);
  }
}

module.exports = { validateProductionConfig };
