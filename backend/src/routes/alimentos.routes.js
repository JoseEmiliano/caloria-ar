// alimentos.routes.js - V2 ESTABLE
const express = require('express');
const axios   = require('axios');
const pool    = require('../db/pool'); 
const auth    = require('../middleware/auth');
const router  = express.Router();

router.get('/buscar', auth, async (req, res, next) => {
  try {
    const q = req.query.q?.trim();
    if (!q || q.length < 2) return res.status(400).json({ error: 'Mínimo 2 caracteres' });

    // 1. Buscar en base local (alimentos_base y alimentos_usuario)
    const querySQL = `
      SELECT id::text AS food_api_id, nombre, marca, calorias_100g, proteinas_100g, carbohidratos_100g, grasas_100g, 'propio' AS origen
      FROM alimentos_usuario WHERE usuario_id = $1 AND lower(nombre) LIKE lower($2)
      UNION ALL
      SELECT food_api_id, nombre, marca, calorias_100g, proteinas_100g, carbohidratos_100g, grasas_100g, origen
      FROM alimentos_base WHERE lower(nombre) LIKE lower($2) OR lower(COALESCE(marca,'')) LIKE lower($2)
      LIMIT 25
    `;
    const { rows: resultadosLocales } = await pool.query(querySQL, [req.user.id, '%' + q + '%']);

    // 2. Si hay pocos resultados locales, buscar en Open Food Facts
    if (resultadosLocales.length < 5) {
      try {
        const r = await axios.get('https://world.openfoodfacts.org/cgi/search.pl', {
          params: { search_terms: q, action: 'process', json: 1, page_size: 10, fields: 'code,product_name,product_name_es,brands,nutriments', lc: 'es' },
          headers: { 'User-Agent': 'CaloriaAR-v2' },
          timeout: 4000
        });
        const externos = (r.data.products || []).filter(p => p.nutriments?.['energy-kcal_100g']).map(p => ({
          food_api_id: p.code,
          nombre: p.product_name_es || p.product_name || 'Sin nombre',
          marca: p.brands || 'Genérico',
          calorias_100g: +(p.nutriments['energy-kcal_100g']||0).toFixed(1),
          proteinas_100g: +(p.nutriments.proteins_100g||0).toFixed(1),
          carbohidratos_100g: +(p.nutriments.carbohydrates_100g||0).toFixed(1),
          grasas_100g: +(p.nutriments.fat_100g||0).toFixed(1),
          origen: 'openfoodfacts'
        }));
        resultadosLocales.push(...externos);
      } catch (err) { console.error('Error API:', err.message); }
    }

    // Eliminar duplicados por nombre
    const vistos = new Set();
    const unicos = resultadosLocales.filter(r => {
      const k = r.nombre.toLowerCase();
      if (vistos.has(k)) return false;
      vistos.add(k); return true;
    });

    res.json({ resultados: unicos });
  } catch (err) { next(err); }
});

module.exports = router;
