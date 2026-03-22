// logs.routes.js — Registro de ingestas diarias
const express = require('express');
const pool    = require('../db/pool');
const auth    = require('../middleware/auth');
const router  = express.Router();

// POST /api/logs — Registrar una ingesta
router.post('/', auth, async (req, res, next) => {
  try {
    const { tipo_ingesta, nombre_alimento, marca, foodApiId,
            calorias_100g, proteinas_100g, carbohidratos_100g,
            grasas_100g, cantidad_gramos, fecha } = req.body;

    if (!nombre_alimento || !calorias_100g || !cantidad_gramos) {
      return res.status(400).json({ error: 'Faltan: nombre_alimento, calorias_100g, cantidad_gramos' });
    }

    const fechaLog = fecha || new Date().toISOString().split('T')[0];

    // Obtener o crear el registro diario del día (UPSERT)
    const { rows: [diario] } = await pool.query(`
      INSERT INTO registro_diario (usuario_id, fecha)
      VALUES ($1, $2)
      ON CONFLICT (usuario_id, fecha) DO UPDATE SET fecha = EXCLUDED.fecha
      RETURNING id
    `, [req.user.id, fechaLog]);

    // Insertar la entrada
    const { rows: [entrada] } = await pool.query(`
      INSERT INTO entradas_alimentos
        (registro_diario_id, usuario_id, tipo_ingesta, food_api_id, nombre_alimento, marca,
         calorias_100g, proteinas_100g, carbohidratos_100g, grasas_100g, cantidad_gramos)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      RETURNING *
    `, [
      diario.id, req.user.id,
      tipo_ingesta || 'snack',
      foodApiId || null, nombre_alimento, marca || null,
      calorias_100g, proteinas_100g || 0, carbohidratos_100g || 0, grasas_100g || 0,
      cantidad_gramos,
    ]);

    res.status(201).json(entrada);
  } catch (err) { next(err); }
});

// GET /api/logs/diario?fecha=YYYY-MM-DD
router.get('/diario', auth, async (req, res, next) => {
  try {
    const fecha = req.query.fecha || new Date().toISOString().split('T')[0];

    const { rows: entradas } = await pool.query(`
      SELECT ea.*, rd.fecha
      FROM entradas_alimentos ea
      JOIN registro_diario rd ON rd.id = ea.registro_diario_id
      WHERE ea.usuario_id = $1 AND rd.fecha = $2
      ORDER BY ea.created_at ASC
    `, [req.user.id, fecha]);

    const { rows: [usuario] } = await pool.query(
      'SELECT meta_calorica FROM usuarios WHERE id = $1', [req.user.id]
    );

    const totalCal   = entradas.reduce((s, e) => s + +e.calorias_totales, 0);
    const metaCal    = usuario?.meta_calorica || 2000;
    const porTipo    = {};
    for (const e of entradas) {
      if (!porTipo[e.tipo_ingesta]) porTipo[e.tipo_ingesta] = [];
      porTipo[e.tipo_ingesta].push(e);
    }

    res.json({
      fecha,
      total_calorias:    +totalCal.toFixed(1),
      meta_calorica:     metaCal,
      calorias_restantes: +(metaCal - totalCal).toFixed(1),
      total_proteinas:   +entradas.reduce((s, e) => s + (e.proteinas_100g * e.cantidad_gramos / 100), 0).toFixed(1),
      total_carbos:      +entradas.reduce((s, e) => s + (e.carbohidratos_100g * e.cantidad_gramos / 100), 0).toFixed(1),
      total_grasas:      +entradas.reduce((s, e) => s + (e.grasas_100g * e.cantidad_gramos / 100), 0).toFixed(1),
      por_tipo:          porTipo,
      entradas,
    });
  } catch (err) { next(err); }
});

// DELETE /api/logs/:id
router.delete('/:id', auth, async (req, res, next) => {
  try {
    const { rowCount } = await pool.query(
      'DELETE FROM entradas_alimentos WHERE id = $1 AND usuario_id = $2',
      [req.params.id, req.user.id]
    );
    if (!rowCount) return res.status(404).json({ error: 'Registro no encontrado' });
    res.json({ message: 'Eliminado correctamente' });
  } catch (err) { next(err); }
});

module.exports = router;
