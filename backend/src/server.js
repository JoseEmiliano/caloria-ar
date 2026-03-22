require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');
const path    = require('path'); // <-- Necesario para manejar rutas de carpetas

const app  = express();
const PORT = process.env.PORT || 3000;

// ─── Middlewares de Seguridad y Base ──────────────────
app.use(helmet({
  contentSecurityPolicy: false, // Desactivado para que no bloquee los estilos y fuentes de tu HTML
}));
app.use(cors());
app.use(express.json());

// ─── 1. SERVIR EL FRONTEND (Archivos Estáticos) ───────
// Como server.js está en /src, usamos '..' para subir un nivel y entrar a /public
app.use(express.static(path.join(__dirname, '..', 'public')));

// ─── 2. RUTAS DE LA API ───────────────────────────────
app.use('/api/auth',      require('./routes/auth.routes'));
app.use('/api/usuarios',  require('./routes/usuarios.routes'));
app.use('/api/alimentos', require('./routes/alimentos.routes'));
app.use('/api/logs',      require('./routes/logs.routes'));
app.use('/api/peso',      require('./routes/peso.routes'));

// ─── 3. HEALTH CHECK ──────────────────────────────────
app.get('/health', (_req, res) =>
  res.json({ status: 'ok', version: '2.0', timestamp: new Date().toISOString() })
);

// ─── 4. MANEJO DE RUTAS (SPA Fallback) ────────────────
// Si la ruta NO empieza con /api y no es un archivo estático, 
// mandamos el index.html para que el Frontend se encargue.
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'Ruta de API no encontrada' });
  }
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// ─── 5. MANEJO DE ERRORES ─────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('[ERROR]', err.message);
  res.status(err.status || 500).json({ error: err.message || 'Error interno' });
});

// ─── Inicio del Servidor ──────────────────────────────
app.listen(PORT, () => {
  console.log(`[SERVER] Caloria-AR v2 → http://localhost:${PORT}`);
  console.log(`[ENV]    ${process.env.NODE_ENV || 'development'}`);
});
