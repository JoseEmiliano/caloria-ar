/**
 * UsuarioRepository.js
 * Capa de Repositorio — Acceso a Datos
 * Materia: Laboratorio de Software I (POO + Arquitectura en capas)
 *
 * ÚNICA clase que habla con la tabla 'usuarios'.
 * Controllers y Services NUNCA escriben SQL directo.
 */
const pool = require('../db/pool');

class UsuarioRepository {

  async findByEmail(email) {
    const { rows } = await pool.query(
      'SELECT * FROM usuarios WHERE email = $1',
      [email.toLowerCase().trim()]
    );
    return rows[0] || null;
  }

  async findById(id) {
    const { rows } = await pool.query(
      `SELECT id, email, nombre, peso_kg, altura_cm, edad, genero,
              nivel_actividad, objetivo, meta_calorica,
              acepto_terminos, created_at
       FROM usuarios WHERE id = $1`,
      [id]
    );
    return rows[0] || null;
  }

  async create({ email, passwordHash, nombre }) {
    const { rows } = await pool.query(
      `INSERT INTO usuarios (email, password_hash, nombre)
       VALUES ($1, $2, $3)
       RETURNING id, email, nombre`,
      [email.toLowerCase().trim(), passwordHash, nombre || null]
    );
    return rows[0];
  }

  async updatePerfil(id, campos) {
    const {
      nombre, peso_kg, altura_cm, edad, genero,
      nivel_actividad, objetivo, meta_calorica,
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
        acepto_terminos = COALESCE($9,  acepto_terminos),
        acepto_terminos_fecha = CASE WHEN $9 = TRUE AND acepto_terminos = FALSE
                                     THEN NOW() ELSE acepto_terminos_fecha END
      WHERE id = $10
      RETURNING id, email, nombre, peso_kg, altura_cm, edad, genero,
                nivel_actividad, objetivo, meta_calorica, acepto_terminos
    `, [nombre, peso_kg, altura_cm, edad, genero, nivel_actividad, objetivo, meta_calorica, acepto_terminos, id]);

    return rows[0];
  }
}

module.exports = new UsuarioRepository();
