-- ═══════════════════════════════════════════════════════════
-- Caloria-AR v2 · Schema PostgreSQL
-- Entidad-Relación normalizado (3FN)
-- Materias: Bases de Datos 1 y 2 - UNPAZ
-- ═══════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── ENUM TYPES ──────────────────────────────────────────────
CREATE TYPE genero_tipo      AS ENUM ('M', 'F', 'O');
CREATE TYPE actividad_tipo   AS ENUM ('sedentario','leve','moderado','activo','muy_activo');
CREATE TYPE ingesta_tipo     AS ENUM ('desayuno','almuerzo','merienda','cena','snack');
CREATE TYPE objetivo_tipo    AS ENUM ('perder','mantener','ganar');

-- ─── TABLA: usuarios ─────────────────────────────────────────
-- Almacena los datos de autenticación y perfil físico del usuario.
-- Decisión de diseño: calorie_goal se calcula server-side (TDEE * factor_objetivo)
-- y se cachea aquí para evitar recálculos en cada request.
CREATE TABLE IF NOT EXISTS usuarios (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  email                 VARCHAR(255)  NOT NULL UNIQUE,
  password_hash         VARCHAR(255)  NOT NULL,
  nombre                VARCHAR(100),
  peso_kg               DECIMAL(5,2),
  altura_cm             DECIMAL(5,2),
  edad                  INT,
  genero                genero_tipo,
  nivel_actividad       actividad_tipo DEFAULT 'sedentario',
  objetivo              objetivo_tipo  DEFAULT 'mantener',
  meta_calorica         INT,           -- TDEE ajustado según objetivo
  acepto_terminos       BOOLEAN       NOT NULL DEFAULT FALSE,
  acepto_terminos_fecha TIMESTAMP,
  created_at            TIMESTAMP     NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMP     NOT NULL DEFAULT NOW()
);

-- ─── TABLA: registro_peso ────────────────────────────────────
-- Historial de peso para análisis diario/semanal/mensual/trimestral.
-- Permite calcular tendencias con GROUP BY date_trunc() en PostgreSQL.
-- Una entrada por día por usuario (restricción UNIQUE compuesta).
CREATE TABLE IF NOT EXISTS registro_peso (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id  UUID         NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  peso_kg     DECIMAL(5,2) NOT NULL,
  imc         DECIMAL(5,2),            -- Calculado server-side y cacheado
  notas       TEXT,
  fecha       DATE         NOT NULL DEFAULT CURRENT_DATE,
  created_at  TIMESTAMP    NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_peso_usuario_fecha UNIQUE (usuario_id, fecha)
);

-- ─── TABLA: registro_diario ──────────────────────────────────
-- Agrupa todas las ingestas de un usuario en un día dado.
-- Permite consultas de tipo "resumen del día" eficientemente.
CREATE TABLE IF NOT EXISTS registro_diario (
  id                        UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id                UUID    NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  fecha                     DATE    NOT NULL DEFAULT CURRENT_DATE,
  total_calorias_consumidas DECIMAL(8,2) DEFAULT 0,
  CONSTRAINT uq_diario_usuario_fecha UNIQUE (usuario_id, fecha)
);

-- ─── TABLA: entradas_alimentos ───────────────────────────────
-- Guarda los macros del alimento EN EL MOMENTO del registro.
-- Decisión: no FK a una tabla de alimentos para preservar el historial
-- aunque el producto cambie en Open Food Facts (integridad del historial).
CREATE TABLE IF NOT EXISTS entradas_alimentos (
  id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  registro_diario_id  UUID         NOT NULL REFERENCES registro_diario(id) ON DELETE CASCADE,
  usuario_id          UUID         NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  tipo_ingesta        ingesta_tipo NOT NULL DEFAULT 'snack',
  food_api_id         VARCHAR(100),         -- Barcode/ID de Open Food Facts (nullable)
  nombre_alimento     VARCHAR(200) NOT NULL,
  marca               VARCHAR(100),
  calorias_100g       DECIMAL(7,2) NOT NULL,
  proteinas_100g      DECIMAL(7,2) NOT NULL DEFAULT 0,
  carbohidratos_100g  DECIMAL(7,2) NOT NULL DEFAULT 0,
  grasas_100g         DECIMAL(7,2) NOT NULL DEFAULT 0,
  cantidad_gramos     DECIMAL(7,2) NOT NULL DEFAULT 100,
  -- Calorías totales de esta entrada (calculadas y guardadas para queries rápidas)
  calorias_totales    DECIMAL(7,2) GENERATED ALWAYS AS
                        (ROUND((calorias_100g * cantidad_gramos / 100), 2)) STORED,
  created_at          TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- ─── ÍNDICES ─────────────────────────────────────────────────
-- Optimizan los queries más frecuentes del sistema
CREATE INDEX IF NOT EXISTS idx_entradas_usuario_fecha
  ON entradas_alimentos(usuario_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_registro_peso_usuario_fecha
  ON registro_peso(usuario_id, fecha DESC);

CREATE INDEX IF NOT EXISTS idx_diario_usuario_fecha
  ON registro_diario(usuario_id, fecha DESC);

-- ─── TRIGGER: actualizar updated_at ──────────────────────────
CREATE OR REPLACE FUNCTION fn_update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_usuarios_updated_at
  BEFORE UPDATE ON usuarios
  FOR EACH ROW EXECUTE FUNCTION fn_update_updated_at();

-- ─── TRIGGER: sincronizar total del registro diario ──────────
-- Cada vez que se inserta/borra una entrada, recalcula el total del día.
CREATE OR REPLACE FUNCTION fn_sync_total_diario()
RETURNS TRIGGER AS $$
DECLARE v_reg_id UUID; v_usuario_id UUID; v_fecha DATE;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_reg_id := OLD.registro_diario_id; v_usuario_id := OLD.usuario_id;
  ELSE
    v_reg_id := NEW.registro_diario_id; v_usuario_id := NEW.usuario_id;
  END IF;

  SELECT fecha INTO v_fecha FROM registro_diario WHERE id = v_reg_id;

  UPDATE registro_diario
  SET total_calorias_consumidas = COALESCE(
    (SELECT SUM(calorias_totales) FROM entradas_alimentos WHERE registro_diario_id = v_reg_id), 0
  )
  WHERE id = v_reg_id;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_total_diario
  AFTER INSERT OR UPDATE OR DELETE ON entradas_alimentos
  FOR EACH ROW EXECUTE FUNCTION fn_sync_total_diario();

-- ─── DATOS INICIALES (solo desarrollo) ───────────────────────
-- Contraseña: Test1234!
INSERT INTO usuarios (email, password_hash, nombre, peso_kg, altura_cm, edad, genero, nivel_actividad, objetivo, meta_calorica, acepto_terminos, acepto_terminos_fecha)
VALUES (
  'test@caloria.ar',
  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lHHi',
  'Usuario de prueba', 75, 175, 28, 'M', 'moderado', 'perder', 1900,
  TRUE, NOW()
) ON CONFLICT (email) DO NOTHING;
