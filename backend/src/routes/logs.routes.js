// logs.routes.js - V2 ESTABLE
const express = require('express');
const pool    = require('../db/pool');
const auth    = require('../middleware/auth');
const router  = express.Router();

router.post('/', auth, async (req, res, next) => {
  try {
    const { tipo_ingesta, nombre_alimento, marca, foodApiId, calorias_100g, proteinas_100g, carbohidratos_100g, grasas_100g, cantidad_gramos, fecha } = req.body;
    const fechaLog = fecha || new Date().toISOString().split('T')[0];

    const { rows: [diario] } = await pool.query(`
      INSERT INTO registro_diario (usuario_id, fecha) VALUES ($1, $2)
      ON CONFLICT (usuario_id, fecha) DO UPDATE SET fecha = EXCLUDED.fecha RETURNING id
    `, [req.user.id, fechaLog]);

    const { rows: [entrada] } = await pool.query(`
      INSERT INTO entradas_alimentos (registro_diario_id, usuario_id, tipo_ingesta, food_api_id, nombre_alimento, marca, calorias_100g, proteinas_100g, carbohidratos_100g, grasas_100g, cantidad_gramos)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *
    `, [diario.id, req.user.id, tipo_ingesta || 'snack', foodApiId, nombre_alimento, marca, calorias_100g, proteinas_100g, carbohidratos_100g, grasas_100g, cantidad_gramos]);

    res.status(201).json(entrada);
  } catch (err) { next(err); }
});

router.get('/diario', auth, async (req, res, next) => {
  try {
    const fecha = req.query.fecha || new Date().toISOString().split('T')[0];
    const { rows: entradas } = await pool.query(`
      SELECT ea.* FROM entradas_alimentos ea
      JOIN registro_diario rd ON rd.id = ea.registro_diario_id
      WHERE ea.usuario_id = $1 AND rd.fecha = $2 ORDER BY ea.created_at ASC
    `, [req.user.id, fecha]);

    const { rows: [u] } = await pool.query('SELECT meta_calorica FROM usuarios WHERE id = $1', [req.user.id]);
    const meta = u?.meta_calorica || 2000;
    const total = entradas.reduce((s, e) => s + +e.calorias_totales, 0);

    const porTipo = {};
    entradas.forEach(e => {
      if (!porTipo[e.tipo_ingesta]) porTipo[e.tipo_ingesta] = [];
      porTipo[e.tipo_ingesta].push(e);
    });

    res.json({
      fecha, total_calorias: +total.toFixed(1), meta_calorica: meta, calorias_restantes: +(meta - total).toFixed(1),
      total_proteinas: +entradas.reduce((s, e) => s + (e.proteinas_100g * e.cantidad_gramos / 100), 0).toFixed(1),
      total_carbos: +entradas.reduce((s, e) => s + (e.carbohidratos_100g * e.cantidad_gramos / 100), 0).toFixed(1),
      total_grasas: +entradas.reduce((s, e) => s + (e.grasas_100g * e.cantidad_gramos / 100), 0).toFixed(1),
      por_tipo: porTipo, entradas
    });
  } catch (err) { next(err); }
});

router.delete('/:id', auth, async (req, res, next) => {
  try {
    await pool.query('DELETE FROM entradas_alimentos WHERE id = $1 AND usuario_id = $2', [req.params.id, req.user.id]);
    res.json({ message: 'Eliminado' });
  } catch (err) { next(err); }
});

module.exports = router;
