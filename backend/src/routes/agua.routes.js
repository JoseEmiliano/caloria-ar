const express = require('express');
const pool    = require('../db/pool'); // CORREGIDO
const auth    = require('../middleware/auth');
const router  = express.Router();

router.get('/diario', auth, async (req, res, next) => {
  try {
    const fecha = req.query.fecha || new Date().toISOString().split('T')[0];
    const query = `
      SELECT rd.total_agua_ml, u.meta_agua_ml, rd.id AS registro_diario_id
      FROM usuarios u
      LEFT JOIN registro_diario rd ON rd.usuario_id = u.id AND rd.fecha = $2
      WHERE u.id = $1
    `;
    const { rows: [data] } = await pool.query(query, [req.user.id, fecha]);
    res.json(data || { total_agua_ml: 0, meta_agua_ml: 2000 });
  } catch (err) { next(err); }
});

router.post('/ajustar', auth, async (req, res, next) => {
  try {
    const { incremento_ml, registro_diario_id } = req.body;
    if (incremento_ml > 0) {
      await pool.query(
        'INSERT INTO entradas_agua (usuario_id, registro_diario_id, cantidad_ml) VALUES ($1, $2, $3)',
        [req.user.id, registro_diario_id, incremento_ml]
      );
    } else {
      await pool.query(
        `DELETE FROM entradas_agua WHERE id IN (
          SELECT id FROM entradas_agua WHERE usuario_id = $1 AND registro_diario_id = $2 
          ORDER BY created_at DESC LIMIT 1
        )`, [req.user.id, registro_diario_id]
      );
    }
    const { rows: [act] } = await pool.query('SELECT total_agua_ml FROM registro_diario WHERE id = $1', [registro_diario_id]);
    res.json({ success: true, total_agua_ml: act ? act.total_agua_ml : 0 });
  } catch (err) { next(err); }
});

module.exports = router;
