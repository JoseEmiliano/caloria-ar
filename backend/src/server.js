require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');
const path    = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;

// ─── Middlewares de Seguridad y Base ──────────────────
app.use(helmet({
  contentSecurityPolicy: false, // Necesario para cargar scripts externos como el de la cámara (ZXing/html5-qrcode)
}));
app.use(cors());
app.use(express.json());

// ─── 1. SERVIR EL FRONTEND (Archivos Estáticos) ───────
// Asegúrate de que tu carpeta de frontend se llame 'public' o cambia el nombre aquí
app.use(express.static(path.join(__dirname, '..', 'public')));

// ─── 2. RUTAS DE LA API ───────────────────────────────
app.use('/api/auth',      require('./routes/auth.routes'));
app.use('/api/usuarios',  require('./routes/usuarios.routes'));
app.use('/api/alimentos', require('./routes/alimentos.routes'));
app.use('/api/logs',      require('./routes/logs.routes'));
app.use('/api/peso',      require('./routes/peso.routes'));

// NUEVAS RUTAS PARA LAS MEJORAS (Agua, Ejercicio y Escáner):
app.use('/api/ejercicio', require('./routes/ejercicio.routes'));
app.use('/api/agua',      require('./routes/agua.routes'));
// Nota: La ruta de escaneo de barras la incluiremos dentro de alimentos.routes o una nueva
// Si prefieres una ruta dedicada: app.use('/api/productos', require('./routes/productos.routes'));

// ─── 3. HEALTH CHECK ──────────────────────────────────
app.get('/health', (_req, res) =>
  res.json({ 
    status: 'ok', 
    version: '3.0', // Saltamos a la 3.0 por el soporte de catálogo y escáner
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development'
  })
);

// ─── 4. MANEJO DE RUTAS (SPA Fallback) ────────────────
// Esto permite que si recargas la página en una ruta de React/JS puro, no de 404
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'Ruta de API no encontrada' });
  }
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// ─── 5. MANEJO DE ERRORES GLOBAL ──────────────────────
app.use((err, _req, res, _next) => {
  console.error('[SERVER-ERROR]', err.stack);
  res.status(err.status || 500).json({ 
    error: err.message || 'Error interno del servidor',
    code: err.code || 'INTERNAL_ERROR'
  });
});

// ─── Inicio del Servidor ──────────────────────────────
app.listen(PORT, () => {
  console.log(`[SERVER] Caloria-AR v3.0 (Full Stack: Agua, Ejercicio, Scanner)`);
  console.log(`[READY] Corriendo en: http://localhost:${PORT}`);
});
