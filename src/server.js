require('dotenv').config();
const express = require('express');
const path = require('path');
const helmet = require('helmet');
const session = require('express-session');
const PgSession = require('connect-pg-simple')(session);
const rateLimit = require('express-rate-limit');
const { Pool } = require('pg');

const authRouter = require('./routes/auth');
const stateRouter = require('./routes/state');
const routineRouter = require('./routes/routine');
const missionsRouter = require('./routes/missions');
const assessmentsRouter = require('./routes/assessments');
const checkinsRouter = require('./routes/checkins');
const challengesRouter = require('./routes/challenges');
const syncRouter = require('./routes/sync');

const { requireAuth, requirePageAuth, redirectIfAuthenticated } = require('./middleware/auth');
const { initUserAndSettings } = require('./services/authService');

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================================
// Security Middleware
// ============================================================
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
        imgSrc: ["'self'", 'data:', 'blob:'],
        connectSrc: ["'self'"],
        workerSrc: ["'self'"],
        manifestSrc: ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

// Trust reverse proxy (for Portainer/nginx)
app.set('trust proxy', 1);

// ============================================================
// Body Parsers
// ============================================================
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// ============================================================
// Session Store (PostgreSQL)
// ============================================================
const pgPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false,
});

app.use(
  session({
    store: new PgSession({
      pool: pgPool,
      tableName: 'session',
      createTableIfMissing: true,
    }),
    name: 'tutu.sid',
    secret: process.env.SESSION_SECRET || 'fallback_dev_secret_change_in_prod',
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      // Keeps localhost HTTP usable and still sets Secure behind an HTTPS proxy.
      secure: 'auto',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 dias
    },
  })
);

// ============================================================
// Rate Limiting for Auth Endpoint
// ============================================================
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 20, // 20 tentativas
  message: { error: 'Muitas tentativas de login. Aguarde alguns minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

// ============================================================
// Static Files
// ============================================================
app.use(express.static(path.join(__dirname, '..', 'public')));

// ============================================================
// Page Routes
// ============================================================

// /login => redirect to / if already authenticated
app.get('/login', redirectIfAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'login.html'));
});

// / => redirect to /login if not authenticated
app.get('/', requirePageAuth, (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// ============================================================
// API Routes
// ============================================================
app.use('/api/auth/login', loginLimiter); // Rate limit on login
app.use('/api/auth', authRouter);

// All data routes require authentication
app.use('/api/state', requireAuth, stateRouter);
app.use('/api/routine', requireAuth, routineRouter);
app.use('/api/missions', requireAuth, missionsRouter);
app.use('/api/assessments', requireAuth, assessmentsRouter);
app.use('/api/checkins', requireAuth, checkinsRouter);
app.use('/api/challenges', requireAuth, challengesRouter);
app.use('/api/sync', requireAuth, syncRouter);

// ============================================================
// Health Check
// ============================================================
app.get('/health', async (req, res) => {
  try {
    await pgPool.query('SELECT 1');
    return res.json({ status: 'ok', timestamp: new Date().toISOString() });
  } catch {
    return res.status(503).json({ status: 'error', timestamp: new Date().toISOString() });
  }
});

// ============================================================
// Fallback: redirect everything else to login
// ============================================================
app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Rota não encontrada.' });
  }
  if (req.session && req.session.userId) {
    return res.redirect('/');
  }
  return res.redirect('/login');
});

// ============================================================
// Start Server
// ============================================================
async function start() {
  try {
    // Run Prisma migrations via CLI (handled in Dockerfile entrypoint)
    // Then init the default user and settings
    await initUserAndSettings();
    app.listen(PORT, () => {
      console.log(`\n🔥 Tutu — Caminho Chūnin`);
      console.log(`   Servidor rodando em http://localhost:${PORT}`);
      console.log(`   Ambiente: ${process.env.NODE_ENV || 'development'}\n`);
    });
  } catch (error) {
    console.error('[FATAL] Erro ao iniciar o servidor:', error);
    process.exit(1);
  }
}

start();
