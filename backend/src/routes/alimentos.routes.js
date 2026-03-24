const express = require('express');
const axios   = require('axios');
const pool    = require('../db/pool');
const auth    = require('../middleware/auth');
const router  = express.Router();

// GET /api/alimentos/buscar (Búsqueda por texto - existente)
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

    if (resultados.length < 10) {
      try {
        const r = await axios.get('https://world.openfoodfacts.org/cgi/search.pl', {
          params: { 
            search_terms: q, search_simple: 1, action: 'process', json: 1,
            page_size: 12, fields: 'code,product_name,product_name_es,brands,nutriments', lc: 'es' 
          },
          headers: { 'User-Agent': 'CaloriaAR - ProyectoUNPAZ - v2.1' },
          timeout: 6000,
        });

        const externos = (r.data.products || [])
          .filter(p => p.nutriments?.['energy-kcal_100g'])
          .map(p => ({
            food_api_id: p.code,
            nombre: p.product_name_es || p.product_name || 'Sin nombre',
            marca: p.brands || 'Genérico',
            calorias_100g:      +(p.nutriments['energy-kcal_100g']||0).toFixed(1),
            proteinas_100g:     +(p.nutriments.proteins_100g||0).toFixed(1),
            carbohidratos_100g: +(p.nutriments.carbohydrates_100g||0).toFixed(1),
            grasas_100g:        +(p.nutriments.fat_100g||0).toFixed(1),
            origen: 'openfoodfacts',
          }));
        resultados.push(...externos);
      } catch (apiErr) { console.error('[API ERROR]:', apiErr.message); }
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

// NUEVA RUTA: GET /api/alimentos/barcode/:code (Para el Escáner)
router.get('/barcode/:code', auth, async (req, res, next) => {
  try {
    const { code } = req.params;
    console.log(`[SCAN] Buscando código: ${code}`);

    const r = await axios.get(`https://world.openfoodfacts.org/api/v2/product/${code}.json`, {
      params: { fields: 'code,product_name,product_name_es,brands,nutriments
