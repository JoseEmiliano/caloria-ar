/**
 * UsuarioController.js
 * Capa de Controlador — Solo HTTP (req/res)
 * Materia: Laboratorio de Software I (Patrón MVC / Capas)
 *
 * NO contiene lógica de negocio (eso es del Service).
 * NO contiene SQL (eso es del Repository).
 * Solo orquesta y devuelve respuestas HTTP.
 */
const usuarioRepo    = require('../repositories/UsuarioRepository');
const NutricionService = require('../services/NutricionService');

class UsuarioController {

  // GET /api/usuarios/me
  async getMe(req, res, next) {
    try {
      const usuario = await usuarioRepo.findById(req.user.id);
      if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });

      const perfil = NutricionService.calcularPerfilCompleto(usuario);
      res.json({ ...usuario, perfil });

    } catch (err) { next(err); }
  }

  // PATCH /api/usuarios/me
  async updateMe(req, res, next) {
    try {
      const { nombre, peso_kg, altura_cm, edad, genero, nivel_actividad, objetivo, acepto_terminos } = req.body;

      // Calcular meta calórica automáticamente si hay datos suficientes
      let meta_calorica;
      if (peso_kg && altura_cm && edad && genero) {
        try {
          const perfil = NutricionService.calcularPerfilCompleto({
            peso_kg, altura_cm, edad, genero,
            nivel_actividad: nivel_actividad || 'sedentario',
            objetivo:        objetivo        || 'mantener',
          });
          meta_calorica = perfil.meta_calorica;
        } catch (calcErr) {
          return res.status(400).json({ error: calcErr.message });
        }
      }

      const actualizado = await usuarioRepo.updatePerfil(req.user.id, {
        nombre, peso_kg, altura_cm, edad, genero,
        nivel_actividad, objetivo, meta_calorica, acepto_terminos,
      });

      const perfil = NutricionService.calcularPerfilCompleto(actualizado);
      res.json({ ...actualizado, perfil });

    } catch (err) { next(err); }
  }
}

module.exports = new UsuarioController();
