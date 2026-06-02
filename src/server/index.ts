/**
 * ============================================================================
 *  SERVIDOR BACKEND — Sistema Eléctrico Futuro v2
 * ============================================================================
 *  Express server que expone la API de simulación.
 *  Ejecutable con: npm run server (tsx src/server/index.ts)
 * ============================================================================
 */

import express from 'express';
import cors from 'cors';
import { simulateRoute } from './routes/simulate';
import { weatherRoute } from './routes/weather';
import { scenariosRoute } from './routes/scenarios';

const app = express();
const PORT = parseInt(process.env.PORT || '4000', 10);

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// ─── Health checks ──────────────────────────────────────────────────────────
const inicio = Date.now();

app.get('/healthz', (_req, res) => {
  res.json({
    status: 'ok',
    uptime: Math.round((Date.now() - inicio) / 1000),
    version: '2.0.0',
  });
});

app.get('/readyz', (_req, res) => {
  res.json({ status: 'ready', timestamp: new Date().toISOString() });
});

// ─── API Routes ─────────────────────────────────────────────────────────────
app.use('/api', simulateRoute);
app.use('/api', weatherRoute);
app.use('/api', scenariosRoute);

// ─── Start ──────────────────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[server] Sistema Eléctrico Futuro v2 — Puerto ${PORT}`);
  console.log(`[server] Health: http://localhost:${PORT}/healthz`);
  console.log(`[server] API:    http://localhost:${PORT}/api/`);
});
