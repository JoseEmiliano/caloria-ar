const express = require('express');
const pool    = require('../db/pool');
const auth    = require('../middleware/auth');
const router  = express.Router();

router.post('/', auth, async (req, res, next) => {
  try {
    const { actividad, met, duracion, fecha } = req.body;
    const fechaLog = fecha || new Date().toISOString().split('T')[0];

    const { rows: [u] } = await pool.query('SELECT peso_kg FROM usuarios WHERE id = $1', [req.user.id]);
    const peso = u.peso_kg || 70; 

    const quemadas = (met * peso * (duracion / 60)).toFixed(2);

    const { rows: [reg] } = await pool.query(
      `INSERT INTO registro_ejercicio (usuario_id, actividad, met_valor, duracion_minutos, calorias_quemadas, fecha)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [req.user.id, actividad, met, duracion, quemadas, fechaLog]
    );
    res.status(201).json(reg);
  } catch (err) { next(err); }
});

router.get('/diario', auth, async (req, res, next) => {
  try {
    const fecha = req.query.fecha || new Date().toISOString().split('T')[0];
    const { rows } = await pool.query(
      'SELECT * FROM registro_ejercicio WHERE usuario_id = $1 AND fecha = $2',
      [req.user.id, fecha]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

router.delete('/:id', auth, async (req, res, next) => {
  try {
    await pool.query('DELETE FROM registro_ejercicio WHERE id = $1 AND usuario_id = $2', [req.params.id, req.user.id]);
    res.json({ message: 'Ejercicio eliminado' });
  } catch (err) { next(err); }
});

module.exports = router;
