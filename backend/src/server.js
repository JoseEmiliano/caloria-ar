require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');
const path    = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, '..', 'public')));

app.use('/api/auth',      require('./routes/auth.routes'));
app.use('/api/usuarios',  require('./routes/usuarios.routes'));
app.use('/api/alimentos', require('./routes/alimentos.routes'));
app.use('/api/logs',      require('./routes/logs.routes'));
app.use('/api/peso',      require('./routes/peso.routes'));

app.get('/health', (req, res) => res.json({ status: 'ok', version: '2.0' }));

app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) return res.status(404).json({ error: 'Not found' });
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.use((err, req, res, next) => {
  console.error('[ERROR]', err.message);
  res.status(err.status || 500).json({ error: err.message || 'Error interno' });
});

app.listen(PORT, () => console.log(`[SERVER] Caloria-AR v2 en puerto ${PORT}`));
