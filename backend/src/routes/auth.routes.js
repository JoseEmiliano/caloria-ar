// auth.routes.js
const express  = require('express');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const usuarioRepo = require('../repositories/UsuarioRepository');
const router   = express.Router();

router.post('/register', async (req, res, next) => {
  try {
    const { email, password, nombre } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email y contraseña requeridos' });
    if (password.length < 8)  return res.status(400).json({ error: 'Contraseña mínimo 8 caracteres' });

    const existe = await usuarioRepo.findByEmail(email);
    if (existe) return res.status(409).json({ error: 'El email ya está registrado' });

    const passwordHash = await bcrypt.hash(password, 10);
    const usuario      = await usuarioRepo.create({ email, passwordHash, nombre });
    const token        = _signToken(usuario);

    res.status(201).json({ token, usuario: _sanitize(usuario) });
  } catch (err) { next(err); }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email y contraseña requeridos' });

    const usuario = await usuarioRepo.findByEmail(email);
    if (!usuario || !(await bcrypt.compare(password, usuario.password_hash))) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    const token = _signToken(usuario);
    res.json({ token, usuario: _sanitize(usuario) });
  } catch (err) { next(err); }
});

function _signToken(u) {
  return jwt.sign({ id: u.id, email: u.email }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES || '7d' });
}
function _sanitize(u) {
  return { id: u.id, email: u.email, nombre: u.nombre, acepto_terminos: u.acepto_terminos };
}

module.exports = router;
