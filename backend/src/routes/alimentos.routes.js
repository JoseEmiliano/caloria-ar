// alimentos.routes.js v2 - CORREGIDO
const express = require('express');
const axios   = require('axios');
const pool    = require('../db/pool');
const auth    = require('../middleware/auth');
const router  = express.Router();

router.get('/buscar', auth, async (req, res, next) => {
  try {
    const q = req.query.q?.trim();
    if (!q || q.length < 2) return res.status(400).json({ error: 'Minimo 2 caracteres' });

    // 1. Buscar en alimentos creados por el usuario
    const { rows: propios } = await pool.query(
      `SELECT id::text AS food_api_id, nombre, marca,
              calorias_100g, proteinas_100g, carbohidratos_100g, grasas_100g, 'propio' AS origen
       FROM alimentos_usuario WHERE usuario_id = $1 AND lower(nombre) LIKE lower($2) LIMIT 5`,
      [req.user.id, '%' + q + '%']
    );

    // 2. Buscar en la base de datos local (alimentos_base)
    const { rows: locales } = await pool.query(
      `SELECT food_api_id, nombre, marca,
              calorias_100g, proteinas_100g, carbohidratos_100g, grasas_100g, origen
       FROM alimentos_base
       WHERE lower(nombre) LIKE lower($1) OR lower(COALESCE(marca,'')) LIKE lower($1)
       ORDER BY nombre ASC LIMIT 20`,
      ['%' + q + '%']
    );

    const resultados = [...propios, ...locales];

    // 3. Si hay pocos resultados locales, consultar la API externa
    if (resultados.length < 10) { // Aumentamos el umbral para enriquecer la búsqueda
      try {
        console.log(`[API] Consultando Open Food Facts para: "${q}"`);
        
        const r = await axios.get('https://world.openfoodfacts.org/cgi/search.pl', {
          params: { 
            search_terms: q, 
            search_simple: 1, 
            action: 'process', 
            json: 1,
            page_size: 12, 
            fields: 'code,product_name,product_name_es,brands,nutriments', 
            lc: 'es' 
          },
          headers: {
            // REQUISITO: La API de OFF pide identificarse para evitar bloqueos
            'User-Agent': 'CaloriaAR - ProyectoUNPAZ - v2.0'
          },
          timeout: 6000, // Aumentamos a 6s para redes de nube
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
        console.log(`[API] Éxito: ${externos.length} productos añadidos.`);

      } catch (apiErr) {
        // IMPORTANTE: Ya no silenciamos el error para poder debuguear en EasyPanel
        console.error('[API ERROR]:', apiErr.message);
      }
    }

    // 4. Eliminar duplicados por nombre
    const vistos = new Set();
    const unicos = resultados.filter(r => {
      const k = r.nombre?.toLowerCase();
      if (vistos.has(k)) return false;
      vistos.add(k); return true;
    });

    res.json({ resultados: unicos, total: unicos.length });
  } catch (err) { next(err); }
});

// ... resto de rutas (propios POST/DELETE) se mantienen igual ...
