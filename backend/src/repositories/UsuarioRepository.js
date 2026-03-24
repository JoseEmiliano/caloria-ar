/**
 * UsuarioRepository.js
 * Capa de Repositorio — Acceso a Datos
 * Actualizado para v3.0 (Metas de Agua y Registro Completo)
 */
const pool = require('../db/pool');

class UsuarioRepository {

  async findByEmail(email) {
    if (!email) return null;
    const { rows } = await pool.query(
      'SELECT * FROM usuarios WHERE email = $1',
      [email.toLowerCase().trim()]
    );
    return rows[0] || null;
  }

  async findById(id) {
    const { rows } = await pool.query(
      `SELECT id, email, nombre, peso_kg, altura_cm, edad, genero,
              nivel_actividad, objetivo, meta_calorica, meta_agua_ml,
              acepto_terminos, created_at
       FROM usuarios WHERE id = $1`,
      [id]
    );
    return rows[0] || null;
  }

  async create({ email, passwordHash, nombre }) {
    // Definimos valores por defecto para nuevos usuarios (v3.0)
    const metaCaloricaDefault = 2000;
    const metaAguaDefault = 2000; // 2 Litros

    const { rows } = await pool.query(
      `INSERT INTO usuarios (
        email, 
        password_hash, 
        nombre, 
        meta_calorica, 
        meta_agua_ml, 
        acepto_terminos, 
        acepto_terminos_fecha
      )
      VALUES ($1, $2, $3, $4, $5, TRUE, NOW())
      RETURNING id, email, nombre, meta_calorica, meta_agua_ml`,
      [
        email.toLowerCase().trim(), 
        passwordHash, 
        nombre || 'Nuevo Usuario',
        metaCaloricaDefault,
        metaAguaDefault
      ]
    );
    return rows[0];
  }

  async updatePerfil(id, campos) {
    const {
      nombre, peso_kg, altura_cm, edad, genero,
      nivel_actividad, objetivo, meta_calorica, meta_agua_ml,
      acepto_terminos
    } = campos;

    const { rows } = await pool.query(`
      UPDATE usuarios SET
        nombre          = COALESCE($1,  nombre),
        peso_kg         = COALESCE($2,  peso_kg),
        altura_cm       = COALESCE($3,  altura_cm),
        edad            = COALESCE($4,  edad),
        genero          = COALESCE($5,  genero),
        nivel_actividad = COALESCE($6,  nivel_actividad),
        objetivo        = COALESCE($7,  objetivo),
        meta_calorica   = COALESCE($8,  meta_calorica),
        meta_agua_ml    = COALESCE($9,  meta_agua_ml),
        acepto_terminos = COALESCE($10, acepto_terminos),
        acepto_terminos_fecha = CASE 
          WHEN $10 = TRUE AND (acepto_terminos = FALSE OR acepto_terminos IS NULL)
          THEN NOW() ELSE acepto_terminos_fecha END
      WHERE id = $11
      RETURNING id, email, nombre, peso_kg, altura_cm, edad, genero,
                nivel_actividad, objetivo, meta_calorica, meta_agua_ml, acepto_terminos
    `, [
      nombre, peso_kg, altura_cm, edad, genero, 
      nivel_actividad, objetivo, meta_calorica, meta_agua_ml, 
      acepto_terminos, id
    ]);

    return rows[0];
  }
}

module.exports = new UsuarioRepository();
