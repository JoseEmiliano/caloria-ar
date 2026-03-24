const express = require('express');
const pool    = require('../db/pool');
const auth    = require('../middleware/auth');
const router  = express.Router();

router.get('/diario', auth, async (req, res, next) => {
  try {
    const fecha = req.query.fecha || new Date().toISOString().split('T')[0];
    const { rows: [reg] } = await pool.query(
      'SELECT * FROM registro_agua WHERE usuario_id = $1 AND fecha = $2',
      [req.user.id, fecha]
    );
    res.json(reg || { cantidad_vasos: 0, meta_vasos: 8 });
  } catch (err) { next(err); }
});

router.post('/ajustar', auth, async (req, res, next) => {
  try {
    const { incremento, fecha } = req.body;
    const fechaLog = fecha || new Date().toISOString().split('T')[0];

    const { rows: [reg] } = await pool.query(
      `INSERT INTO registro_agua (usuario_id, fecha, cantidad_vasos)
       VALUES ($1, $2, CASE WHEN $3 > 0 THEN 1 ELSE 0 END)
       ON CONFLICT (usuario_id, fecha) 
       DO UPDATE SET cantidad_vasos = GREATEST(0, registro_agua.cantidad_vasos + $3)
       RETURNING *`,
      [req.user.id, fechaLog, incremento]
    );
    res.json(reg);
  } catch (err) { next(err); }
});

module.exports = router;
