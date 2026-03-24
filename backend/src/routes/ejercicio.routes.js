const express = require('express');
const pool    = require('../config/db'); // Ajustado a tu estructura
const auth    = require('../middleware/auth');
const router  = express.Router();

// ─── 1. REGISTRAR ACTIVIDAD FÍSICA ──────────────────────────
router.post('/', auth, async (req, res, next) => {
  try {
    const { actividad, met, duracion, registro_diario_id } = req.body;

    if (!registro_diario_id) {
      return res.status(400).json({ error: 'Se requiere registro_diario_id' });
    }

    // Obtenemos el peso real del usuario para el cálculo preciso de MET
    const { rows: [u] } = await pool.query('SELECT peso_kg FROM usuarios WHERE id = $1', [req.user.id]);
    const peso = u?.peso_kg || 70; 

    // Fórmula: Calorías = MET * Peso(kg) * (Duración(min) / 60)
    const calorias_quemadas = (met * peso * (duracion / 60)).toFixed(2);

    const query = `
      INSERT INTO entradas_ejercicio 
        (usuario_id, registro_diario_id, nombre_actividad, duracion_minutos, calorias_quemadas)
      VALUES ($1, $2, $3, $4, $5) 
      RETURNING *
    `;

    const { rows: [reg] } = await pool.query(query, [
      req.user.id, 
      registro_diario_id, 
      actividad, 
      duracion, 
      calorias_quemadas
    ]);

    // El Trigger 'trg_sync_total_ejercicio' ya sumó esto a 'total_calorias_quemadas' en registro_diario.
    res.status(201).json(reg);
  } catch (err) { next(err); }
});

// ─── 2. OBTENER LISTADO DEL DÍA ─────────────────────────────
router.get('/diario/:registro_diario_id', auth, async (req, res, next) => {
  try {
    const { registro_diario_id } = req.params;

    const query = `
      SELECT * FROM entradas_ejercicio 
      WHERE usuario_id = $1 AND registro_diario_id = $2
      ORDER BY created_at DESC
    `;
    
    const { rows } = await pool.query(query, [req.user.id, registro_diario_id]);
    res.json(rows);
  } catch (err) { next(err); }
});

// ─── 3. ELIMINAR EJERCICIO ──────────────────────────────────
router.delete('/:id', auth, async (req, res, next) => {
  try {
    // Al borrar, el trigger también restará las calorías del total diario automáticamente
    const { rows } = await pool.query(
      'DELETE FROM entradas_ejercicio WHERE id = $1 AND usuario_id = $2 RETURNING *', 
      [req.params.id, req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Ejercicio no encontrado' });
    }

    res.json({ message: 'Ejercicio eliminado y totales actualizados' });
  } catch (err) { next(err); }
});

module.exports = router;
