/**
 * NutricionService.js
 * Capa de Servicio — Lógica de Negocio Pura
 * Materia: Laboratorio de Software I (POO en JS)
 *
 * Equivalente JS del motor lógico que se practica en Java.
 * Esta clase NO conoce Express, NO conoce PostgreSQL.
 * Solo recibe datos y devuelve cálculos.
 */
class NutricionService {

  // Factores de actividad (Mifflin-St Jeor)
  static FACTORES_ACTIVIDAD = {
    sedentario:  1.2,
    leve:        1.375,
    moderado:    1.55,
    activo:      1.725,
    muy_activo:  1.9,
  };

  // Ajuste calórico según objetivo
  static AJUSTE_OBJETIVO = {
    perder:    -500,   // Déficit moderado seguro
    mantener:     0,
    ganar:      300,   // Superávit moderado
  };

  // Límite de déficit seguro (no bajar de esto para evitar daños)
  static MIN_CALORIAS_SEGURAS = 1200;

  /**
   * Calcula la Tasa Metabólica Basal (TMB)
   * Fórmula Mifflin-St Jeor (más precisa que Harris-Benedict)
   * @param {number} peso_kg
   * @param {number} altura_cm
   * @param {number} edad
   * @param {string} genero - 'M' | 'F' | 'O'
   * @returns {number} TMB en kcal
   */
  static calcularTMB(peso_kg, altura_cm, edad, genero) {
    const base = (10 * peso_kg) + (6.25 * altura_cm) - (5 * edad);
    return genero === 'M' ? base + 5 : base - 161;
  }

  /**
   * Calcula el Gasto Energético Diario Total (TDEE)
   * @param {number} tmb
   * @param {string} nivel_actividad
   * @returns {number} TDEE en kcal
   */
  static calcularTDEE(tmb, nivel_actividad) {
    const factor = this.FACTORES_ACTIVIDAD[nivel_actividad] || 1.2;
    return Math.round(tmb * factor);
  }

  /**
   * Calcula la meta calórica según el objetivo del usuario
   * Lanza error si el déficit resultante es peligroso
   * @param {number} tdee
   * @param {string} objetivo
   * @returns {number} Calorías meta diarias
   */
  static calcularMetaCalorica(tdee, objetivo) {
    const ajuste = this.AJUSTE_OBJETIVO[objetivo] || 0;
    const meta   = tdee + ajuste;

    if (meta < this.MIN_CALORIAS_SEGURAS) {
      throw new Error(
        `La meta calculada (${meta} kcal) es peligrosamente baja. ` +
        `El mínimo seguro es ${this.MIN_CALORIAS_SEGURAS} kcal. ` +
        `Consultá a un nutricionista.`
      );
    }
    return meta;
  }

  /**
   * Calcula el Índice de Masa Corporal (IMC)
   * @param {number} peso_kg
   * @param {number} altura_cm
   * @returns {{ imc: number, categoria: string, color: string }}
   */
  static calcularIMC(peso_kg, altura_cm) {
    const altura_m = altura_cm / 100;
    const imc = peso_kg / (altura_m * altura_m);

    let categoria, color;
    if      (imc < 18.5) { categoria = 'Bajo peso';          color = 'info'; }
    else if (imc < 25)   { categoria = 'Peso normal';         color = 'success'; }
    else if (imc < 30)   { categoria = 'Sobrepeso';           color = 'warning'; }
    else if (imc < 35)   { categoria = 'Obesidad grado I';    color = 'danger'; }
    else if (imc < 40)   { categoria = 'Obesidad grado II';   color = 'danger'; }
    else                 { categoria = 'Obesidad grado III';  color = 'danger'; }

    return { imc: +imc.toFixed(1), categoria, color };
  }

  /**
   * Calcula todos los datos nutricionales del perfil de una vez
   * @param {object} usuario - { peso_kg, altura_cm, edad, genero, nivel_actividad, objetivo }
   * @returns {object} Resultado completo del perfil nutricional
   */
  static calcularPerfilCompleto(usuario) {
    const { peso_kg, altura_cm, edad, genero, nivel_actividad, objetivo } = usuario;

    if (!peso_kg || !altura_cm || !edad || !genero) {
      return null;
    }

    const tmb  = this.calcularTMB(peso_kg, altura_cm, edad, genero);
    const tdee = this.calcularTDEE(tmb, nivel_actividad);
    const meta = this.calcularMetaCalorica(tdee, objetivo || 'mantener');
    const imc  = this.calcularIMC(peso_kg, altura_cm);

    return {
      tmb:   Math.round(tmb),
      tdee,
      meta_calorica:     meta,
      deficit_o_superavit: meta - tdee,
      ...imc,
    };
  }

  /**
   * Calcula los macros recomendados en gramos dado un total calórico
   * Distribución estándar: 30% prot / 40% carbs / 30% grasas
   * @param {number} calorias
   * @returns {{ proteinas_g, carbos_g, grasas_g }}
   */
  static calcularMacrosRecomendados(calorias) {
    return {
      proteinas_g: Math.round((calorias * 0.30) / 4),  // 4 kcal/g
      carbos_g:    Math.round((calorias * 0.40) / 4),  // 4 kcal/g
      grasas_g:    Math.round((calorias * 0.30) / 9),  // 9 kcal/g
    };
  }
}

module.exports = NutricionService;
