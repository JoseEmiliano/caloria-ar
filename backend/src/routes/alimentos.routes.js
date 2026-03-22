// alimentos.routes.js
const express = require('express');
const axios   = require('axios');
const auth    = require('../middleware/auth');
const router  = express.Router();

function mapProducto(p) {
  const n = p.nutriments || {};
  return {
    foodApiId:         p.code || p._id,
    nombre:            p.product_name_es || p.product_name || 'Sin nombre',
    marca:             p.brands || null,
    calorias_100g:     +(n['energy-kcal_100g'] || n['energy-kcal'] || 0).toFixed(1),
    proteinas_100g:    +(n.proteins_100g       || 0).toFixed(1),
    carbohidratos_100g:+(n.carbohydrates_100g  || 0).toFixed(1),
    grasas_100g:       +(n.fat_100g            || 0).toFixed(1),
  };
}

router.get('/buscar', auth, async (req, res, next) => {
  try {
    const q = req.query.q?.trim();
    if (!q || q.length < 2) return res.status(400).json({ error: 'Ingresá al menos 2 caracteres' });

    const response = await axios.get('https://world.openfoodfacts.org/cgi/search.pl', {
      params: { search_terms: q, search_simple: 1, action: 'process', json: 1, page_size: 15,
                fields: 'code,product_name,product_name_es,brands,nutriments', lc: 'es' },
      timeout: 8000,
    });

    const resultados = (response.data.products || [])
      .filter(p => p.nutriments?.['energy-kcal_100g'])
      .map(mapProducto);

    res.json({ resultados, total: resultados.length });
  } catch (err) {
    if (err.code === 'ECONNABORTED') return res.status(504).json({ error: 'Tiempo de espera agotado' });
    next(err);
  }
});

module.exports = router;
