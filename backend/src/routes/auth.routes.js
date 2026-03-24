// backend/src/routes/auth.routes.js
const express  = require('express');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const usuarioRepo = require('../repositories/UsuarioRepository'); // Esto es lo que vamos a ver después
const router   = express.Router();

router.post('/register', async (req, res, next) => {
  try {
    // Ajustado: el frontend manda 'pass', aquí lo recibimos como tal
    const { email, pass, nombre } = req.body; 
    
    if (!email || !pass) return res.status(400).json({ error: 'Email y contraseña requeridos' });
    if (pass.length < 8)  return res.status(400).json({ error: 'Contraseña mínimo 8 caracteres' });

    const existe = await usuarioRepo.findByEmail(email);
    if (existe) return res.status(409).json({ error: 'El email ya está registrado' });

    const passwordHash = await bcrypt.hash(pass, 10);
    
    // Pasamos los datos al repositorio
    const usuario = await usuarioRepo.create({ email, passwordHash, nombre });
    const token   = _signToken(usuario);

    res.status(201).json({ token, usuario: _sanitize(usuario) });
  } catch (err) { next(err); }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, pass } = req.body;
    if (!email || !pass) return res.status(400).json({ error: 'Email y contraseña requeridos' });

    const usuario = await usuarioRepo.findByEmail(email);
    
    if (!usuario || !(await bcrypt.compare(pass, usuario.password_hash))) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    const token = _signToken(usuario);
    res.json({ token, usuario: _sanitize(usuario) });
  } catch (err) { next(err); }
});

function _signToken(u) {
  return jwt.sign(
    { id: u.id, email: u.email }, 
    process.env.JWT_SECRET || 'secret_unpaz', 
    { expiresIn: '7d' }
  );
}

function _sanitize(u) {
  return { id: u.id, email: u.email, nombre: u.nombre, acepto_terminos: u.acepto_terminos };
}

module.exports = router;
