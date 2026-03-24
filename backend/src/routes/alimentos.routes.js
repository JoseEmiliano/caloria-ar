const express = require('express');
const axios   = require('axios');
const pool    = require('../db/pool'); // CORREGIDO
const auth    = require('../middleware/auth');
const router  = express.Router();

// ─── 1. BÚSQUEDA POR TEXTO (Mejorada con Catálogo) ────────────────
router.get('/buscar', auth, async (req, res, next) => {
  try {
    const q = req.query.q?.trim();
    if (!q || q.length < 2) return res.status(400).json({ error: 'Mínimo 2 caracteres para buscar' });

    const querySQL = `
      SELECT codigo_barras AS food_api_id, nombre_alimento AS nombre, marca, 
             calorias_100g, proteinas_100g, carbohidratos_100g, grasas_100g, 'catalogo' AS origen
      FROM catalogo_productos 
      WHERE lower(nombre_alimento) LIKE lower($1) OR lower(COALESCE(marca,'')) LIKE lower($1)
      UNION ALL
      SELECT food_api_id, nombre, marca, calorias_100g, proteinas_100g, carbohidratos_100g, grasas_100g, origen
      FROM alimentos_base
      WHERE lower(nombre) LIKE lower($1)
      LIMIT 25
    `;
    
    const { rows: resultadosLocales } = await pool.query(querySQL, ['%' + q + '%']);

    if (resultadosLocales.length < 5) {
      try {
        const r = await axios.get('https://world.openfoodfacts.org/cgi/search.pl', {
          params: { 
            search_terms: q, search_simple: 1, action: 'process', json: 1, 
            page_size: 10, fields: 'code,product_name,product_name_es,brands,nutriments', lc: 'es' 
          },
          headers: { 'User-Agent': 'CaloriaAR-Scanner-v3.0' },
          timeout: 5000
        });

        const externos = (r.data.products || [])
          .filter(p => p.nutriments?.['energy-kcal_100g'])
          .map(p => ({
            food_api_id: p.code,
            nombre: p.product_name_es || p.product_name || 'Sin nombre',
            marca: p.brands || 'Genérico',
            calorias_100g:  +(p.nutriments['energy-kcal_100g']||0).toFixed(1),
            proteinas_100g: +(p.nutriments.proteins_100g||0).toFixed(1),
            carbohidratos_100g: +(p.nutriments.carbohydrates_100g||0).toFixed(1),
            grasas_100g:    +(p.nutriments.fat_100g||0).toFixed(1),
            origen: 'openfoodfacts'
          }));
        resultadosLocales.push(...externos);
      } catch (apiErr) { console.error('[API SEARCH ERROR]:', apiErr.message); }
    }
    res.json({ resultados: resultadosLocales });
  } catch (err) { next(err); }
});

// ─── 2. ESCÁNER DE CÓDIGO DE BARRAS ──────────────────────────────
router.get('/barcode/:code', auth, async (req, res, next) => {
  try {
    const { code } = req.params;
    const { rows } = await pool.query('SELECT * FROM catalogo_productos WHERE codigo_barras = $1', [code]);

    if (rows.length > 0) return res.json(rows[0]);

    const r = await axios.get(`https://world.openfoodfacts.org/api/v2/product/${code}.json`, {
      params: { fields: 'code,product_name,product_name_es,brands,nutriments' },
      timeout: 5000
    });

    if (r.data.status === 1 && r.data.product) {
      const p = r.data.product;
      const n = p.nutriments || {};
      const nuevoProducto = {
        codigo_barras: p.code,
        nombre: p.product_name_es || p.product_name || 'Producto Desconocido',
        marca: p.brands || 'S/M',
        calorias:  +(n['energy-kcal_100g'] || 0).toFixed(1),
        proteinas: +(n.proteins_100g || 0).toFixed(1),
        carbos:    +(n.carbohydrates_100g || 0).toFixed(1),
        grasas:    +(n.fat_100g || 0).toFixed(1)
      };

      await pool.query(
        `INSERT INTO catalogo_productos 
         (codigo_barras, nombre_alimento, marca, calorias_100g, proteinas_100g, carbohidratos_100g, grasas_100g, fuente_datos)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'openfoodfacts') ON CONFLICT DO NOTHING`,
        [nuevoProducto.codigo_barras, nuevoProducto.nombre, nuevoProducto.marca, 
         nuevoProducto.calorias, nuevoProducto.proteinas, nuevoProducto.carbos, nuevoProducto.grasas]
      );
      return res.json(nuevoProducto);
    }
    res.status(404).json({ error: 'No encontrado' });
  } catch (err) { next(err); }
});

module.exports = router;
