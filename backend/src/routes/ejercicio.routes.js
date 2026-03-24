const express = require('express');
const pool    = require('../db/pool'); // CORREGIDO
const auth    = require('../middleware/auth');
const router  = express.Router();

router.post('/', auth, async (req, res, next) => {
  try {
    const { actividad, met, duracion, registro_diario_id } = req.body;
    const { rows: [u] } = await pool.query('SELECT peso_kg FROM usuarios WHERE id = $1', [req.user.id]);
    const peso = u?.peso_kg || 70; 
    const quemadas = (met * peso * (duracion / 60)).toFixed(2);

    const { rows: [reg] } = await pool.query(
      `INSERT INTO entradas_ejercicio (usuario_id, registro_diario_id, nombre_actividad, duracion_minutos, calorias_quemadas)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [req.user.id, registro_diario_id, actividad, duracion, quemadas]
    );
    res.status(201).json(reg);
  } catch (err) { next(err); }
});

router.get('/diario/:registro_diario_id', auth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM entradas_ejercicio WHERE usuario_id = $1 AND registro_diario_id = $2 ORDER BY created_at DESC',
      [req.user.id, req.params.registro_diario_id]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

module.exports = router;
