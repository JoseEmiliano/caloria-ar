require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(cors());
app.use(express.json());

// ─── Rutas ────────────────────────────────────────────
app.use('/api/auth',      require('./routes/auth.routes'));
app.use('/api/usuarios',  require('./routes/usuarios.routes'));
app.use('/api/alimentos', require('./routes/alimentos.routes'));
app.use('/api/logs',      require('./routes/logs.routes'));
app.use('/api/peso',      require('./routes/peso.routes'));

// ─── Health check ─────────────────────────────────────
app.get('/health', (_req, res) =>
  res.json({ status: 'ok', version: '2.0', timestamp: new Date().toISOString() })
);

app.use((_req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));

app.use((err, _req, res, _next) => {
  console.error('[ERROR]', err.message);
  res.status(err.status || 500).json({ error: err.message || 'Error interno' });
});

app.listen(PORT, () => {
  console.log(`[SERVER] Caloria-AR v2 → http://localhost:${PORT}`);
  console.log(`[ENV]    ${process.env.NODE_ENV || 'development'}`);
});
