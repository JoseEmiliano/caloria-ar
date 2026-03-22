/**
 * peso.routes.js
 * Módulo de registro de peso e historial
 * Aplica: GROUP BY DATE_TRUNC para análisis temporal (BD1 y BD2)
 */
const express  = require('express');
const pool     = require('../db/pool');
const auth     = require('../middleware/auth');
const NutricionService = require('../services/NutricionService');
const router   = express.Router();

// POST /api/peso — Registrar peso del día
router.post('/', auth, async (req, res, next) => {
  try {
    const { peso_kg, notas, fecha } = req.body;
    if (!peso_kg || peso_kg <= 0) {
      return res.status(400).json({ error: 'El peso debe ser mayor a 0' });
    }

    // Traer altura para calcular IMC
    const userQ = await pool.query('SELECT altura_cm FROM usuarios WHERE id = $1', [req.user.id]);
    const altura_cm = userQ.rows[0]?.altura_cm;
    const imcData   = altura_cm ? NutricionService.calcularIMC(peso_kg, altura_cm) : null;

    const { rows } = await pool.query(`
      INSERT INTO registro_peso (usuario_id, peso_kg, imc, notas, fecha)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (usuario_id, fecha)
      DO UPDATE SET peso_kg = $2, imc = $3, notas = $4
      RETURNING *
    `, [
      req.user.id, peso_kg,
      imcData?.imc || null,
      notas || null,
      fecha || new Date().toISOString().split('T')[0]
    ]);

    res.status(201).json({ ...rows[0], ...(imcData || {}) });
  } catch (err) { next(err); }
});

// GET /api/peso?periodo=semanal|mensual|trimestral|diario
// Aplica DATE_TRUNC de PostgreSQL para agrupar por período
router.get('/', auth, async (req, res, next) => {
  try {
    const periodo = req.query.periodo || 'mensual';

    // Mapa de período a truncado SQL y rango de fechas
    const config = {
      diario:      { trunc: 'day',   dias: 30  },
      semanal:     { trunc: 'week',  dias: 84  },
      mensual:     { trunc: 'month', dias: 180 },
      trimestral:  { trunc: 'month', dias: 365 },
    };
    const { trunc, dias } = config[periodo] || config.mensual;

    // Query con GROUP BY DATE_TRUNC para promedios por período
    // Concepto clave de BD2: funciones de ventana y agregación temporal
    const { rows } = await pool.query(`
      SELECT
        DATE_TRUNC($1, fecha)       AS periodo_inicio,
        AVG(peso_kg)::DECIMAL(5,2)  AS peso_promedio,
        MIN(peso_kg)                AS peso_minimo,
        MAX(peso_kg)                AS peso_maximo,
        COUNT(*)                    AS registros,
        AVG(imc)::DECIMAL(5,2)      AS imc_promedio
      FROM registro_peso
      WHERE usuario_id = $2
        AND fecha >= CURRENT_DATE - INTERVAL '1 day' * $3
      GROUP BY DATE_TRUNC($1, fecha)
      ORDER BY periodo_inicio ASC
    `, [trunc, req.user.id, dias]);

    // También devolver los registros individuales para el gráfico diario
    const { rows: individuales } = await pool.query(`
      SELECT fecha, peso_kg, imc, notas
      FROM registro_peso
      WHERE usuario_id = $1
        AND fecha >= CURRENT_DATE - INTERVAL '1 day' * $2
      ORDER BY fecha ASC
    `, [req.user.id, dias]);

    // Variación total: primer registro vs último
    const variacion = individuales.length >= 2
      ? +(individuales.at(-1).peso_kg - individuales[0].peso_kg).toFixed(2)
      : 0;

    res.json({ periodo, agrupado: rows, registros: individuales, variacion });
  } catch (err) { next(err); }
});

// DELETE /api/peso/:fecha
router.delete('/:fecha', auth, async (req, res, next) => {
  try {
    const { rowCount } = await pool.query(
      'DELETE FROM registro_peso WHERE usuario_id = $1 AND fecha = $2',
      [req.user.id, req.params.fecha]
    );
    if (!rowCount) return res.status(404).json({ error: 'Registro no encontrado' });
    res.json({ message: 'Registro eliminado' });
  } catch (err) { next(err); }
});

module.exports = router;
