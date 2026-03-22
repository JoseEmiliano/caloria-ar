// alimentos.routes.js v2
const express = require('express');
const axios   = require('axios');
const pool    = require('../db/pool');
const auth    = require('../middleware/auth');
const router  = express.Router();

router.get('/buscar', auth, async (req, res, next) => {
  try {
    const q = req.query.q?.trim();
    if (!q || q.length < 2) return res.status(400).json({ error: 'Minimo 2 caracteres' });

    const { rows: propios } = await pool.query(
      `SELECT id::text AS food_api_id, nombre, marca,
              calorias_100g, proteinas_100g, carbohidratos_100g, grasas_100g, 'propio' AS origen
       FROM alimentos_usuario WHERE usuario_id = $1 AND lower(nombre) LIKE lower($2) LIMIT 5`,
      [req.user.id, '%' + q + '%']
    );

    const { rows: locales } = await pool.query(
      `SELECT food_api_id, nombre, marca,
              calorias_100g, proteinas_100g, carbohidratos_100g, grasas_100g, origen
       FROM alimentos_base
       WHERE lower(nombre) LIKE lower($1) OR lower(COALESCE(marca,'')) LIKE lower($1)
       ORDER BY nombre ASC LIMIT 20`,
      ['%' + q + '%']
    );

    const resultados = [...propios, ...locales];

    if (locales.length < 5) {
      try {
        const r = await axios.get('https://world.openfoodfacts.org/cgi/search.pl', {
          params: { search_terms: q, search_simple: 1, action: 'process', json: 1,
                    page_size: 8, fields: 'code,product_name,product_name_es,brands,nutriments', lc: 'es' },
          timeout: 4000,
        });
        (r.data.products || []).filter(p => p.nutriments?.['energy-kcal_100g']).forEach(p => {
          resultados.push({
            food_api_id: p.code,
            nombre: p.product_name_es || p.product_name || 'Sin nombre',
            marca: p.brands || null,
            calorias_100g:      +(p.nutriments['energy-kcal_100g']||0).toFixed(1),
            proteinas_100g:     +(p.nutriments.proteins_100g||0).toFixed(1),
            carbohidratos_100g: +(p.nutriments.carbohydrates_100g||0).toFixed(1),
            grasas_100g:        +(p.nutriments.fat_100g||0).toFixed(1),
            origen: 'openfoodfacts',
          });
        });
      } catch (_) {}
    }

    const vistos = new Set();
    const unicos = resultados.filter(r => {
      const k = r.nombre?.toLowerCase();
      if (vistos.has(k)) return false;
      vistos.add(k); return true;
    });

    res.json({ resultados: unicos, total: unicos.length });
  } catch (err) { next(err); }
});

router.get('/propios', auth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM alimentos_usuario WHERE usuario_id = $1 ORDER BY nombre ASC',
      [req.user.id]
    );
    res.json({ alimentos: rows, total: rows.length });
  } catch (err) { next(err); }
});

router.post('/propios', auth, async (req, res, next) => {
  try {
    const { nombre, marca, calorias_100g, proteinas_100g, carbohidratos_100g, grasas_100g } = req.body;
    if (!nombre || !calorias_100g) return res.status(400).json({ error: 'Nombre y calorias requeridos' });
    const { rows: [a] } = await pool.query(
      `INSERT INTO alimentos_usuario
         (usuario_id,nombre,marca,calorias_100g,proteinas_100g,carbohidratos_100g,grasas_100g)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [req.user.id, nombre.trim(), marca?.trim()||null,
       calorias_100g, proteinas_100g||0, carbohidratos_100g||0, grasas_100g||0]
    );
    res.status(201).json(a);
  } catch (err) { next(err); }
});

router.delete('/propios/:id', auth, async (req, res, next) => {
  try {
    const { rowCount } = await pool.query(
      'DELETE FROM alimentos_usuario WHERE id = $1 AND usuario_id = $2',
      [req.params.id, req.user.id]
    );
    if (!rowCount) return res.status(404).json({ error: 'No encontrado' });
    res.json({ message: 'Eliminado' });
  } catch (err) { next(err); }
});

module.exports = router;
