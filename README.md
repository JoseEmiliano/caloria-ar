# 🥗 Caloria·AR v2.0

> Sistema web responsivo para monitoreo nutricional localizado y control de peso — Argentina  
> Proyecto académico — Analista de Sistemas · UNPAZ

---

## 📋 Enunciado del Problema

Las personas en Argentina que desean controlar su peso y alimentación se enfrentan a tres obstáculos:

1. **Datos no localizados** — Las apps dominantes no reconocen productos argentinos (alfajores, mate, cortes de carne).
2. **Sin historial temporal** — No permiten analizar la evolución de peso en períodos diario/semanal/mensual/trimestral.
3. **Registro fragmentado** — No distinguen breaks/snacks de las comidas principales, generando abandono.

**Solución:** Caloria·AR consume Open Food Facts en tiempo real, almacena un historial relacional en PostgreSQL y expone una SPA responsiva mobile-first con JWT.

---

## 🏗️ Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────┐
│  Cliente (Browser / Celular)                            │
│  HTML + Vanilla JS · SPA · JWT en localStorage          │
└────────────────────┬────────────────────────────────────┘
                     │ HTTPS → Nginx (reverse proxy)
┌────────────────────▼────────────────────────────────────┐
│  Backend · Node.js + Express (Puerto 3000)              │
│  ┌──────────┐  ┌──────────┐  ┌────────────────────┐    │
│  │Controllers│→│ Services │→│   Repositories      │    │
│  │(HTTP/Res) │  │(Lógica)  │  │   (SQL/Pool)       │    │
│  └──────────┘  └──────────┘  └──────────┬─────────┘    │
└─────────────────────────────────────────┼───────────────┘
                                          │ SQL
┌─────────────────────────────────────────▼───────────────┐
│  PostgreSQL 16 · Docker Volume persistente              │
│  usuarios · registro_peso · registro_diario             │
│  entradas_alimentos                                     │
└────────────────────────────────────────┬────────────────┘
                                         │ HTTP/REST
                              ┌──────────▼──────────┐
                              │  Open Food Facts API │
                              │  (Búsqueda en tiempo │
                              │   real · Sin key)    │
                              └─────────────────────┘
```

---

## 🎓 Materias cubiertas

| Materia | Concepto aplicado | Archivo |
|---|---|---|
| **BD1 y BD2** | Normalización 3FN, FK, triggers, `DATE_TRUNC` | `init.sql`, `peso.routes.js` |
| **Lab. Software I** | POO en JS, Arquitectura en Capas (MVC) | `NutricionService.js`, `UsuarioController.js`, `UsuarioRepository.js` |
| **POO Java** | Interfaces, Clases abstractas, Herencia, Polimorfismo, Excepciones | `java-engine/src/` |
| **Ingeniería de Software I** | Historias de usuario, casos de uso, diagramas | Este README |
| **Ing. Soft. II** (próxima) | Patrones de diseño (Repository, Service Layer), testing | Estructura de carpetas |
| **Lab. Soft. II** (próxima) | CI/CD, Docker multi-stage, despliegue GCP | `Dockerfile`, `docker-compose.yml` |

---

## 📂 Estructura de Carpetas

```
caloria-ar-v2/
├── frontend/
│   └── index.html              # SPA completa (HTML + CSS + JS)
│
├── backend/
│   ├── src/
│   │   ├── controllers/        # Capa HTTP — solo req/res
│   │   │   └── UsuarioController.js
│   │   ├── services/           # Lógica de negocio pura
│   │   │   └── NutricionService.js
│   │   ├── repositories/       # Acceso a datos — solo SQL
│   │   │   └── UsuarioRepository.js
│   │   ├── routes/             # Endpoints REST
│   │   │   ├── auth.routes.js
│   │   │   ├── usuarios.routes.js
│   │   │   ├── alimentos.routes.js
│   │   │   ├── logs.routes.js
│   │   │   └── peso.routes.js
│   │   ├── middleware/
│   │   │   └── auth.js         # Verificación JWT
│   │   ├── db/
│   │   │   ├── init.sql        # Schema PostgreSQL completo
│   │   │   └── pool.js         # Pool de conexiones
│   │   └── server.js
│   ├── Dockerfile
│   └── package.json
│
├── java-engine/                # Motor lógico para materia POO
│   └── src/com/caloria/
│       ├── interfaces/Calculable.java
│       ├── model/Usuario.java  # Clase abstracta
│       ├── model/UsuarioSedentario.java
│       ├── model/UsuarioModerado.java
│       ├── exceptions/DeficitPeligrosoException.java
│       └── Main.java
│
├── nginx/nginx.conf
├── docker-compose.yml
├── .env.example
└── .gitignore
```

---

## 🔌 API REST — Endpoints

```
POST   /api/auth/register         Registro de usuario
POST   /api/auth/login            Login → devuelve JWT

GET    /api/usuarios/me           Perfil + TDEE calculado
PATCH  /api/usuarios/me           Actualizar perfil físico

GET    /api/alimentos/buscar?q=   Búsqueda en Open Food Facts

POST   /api/logs                  Registrar ingesta
GET    /api/logs/diario?fecha=    Resumen calórico del día
DELETE /api/logs/:id              Eliminar entrada

POST   /api/peso                  Registrar peso + IMC auto
GET    /api/peso?periodo=         Historial (diario/semanal/mensual/trimestral)
DELETE /api/peso/:fecha           Eliminar registro de peso

GET    /health                    Health check (Docker / GCP)
```

---

## 🖥️ Setup Local (WSL2 + Docker)

### Requisitos previos
```bash
# Verificar que tenés Docker y Docker Compose
docker --version        # >= 24.x
docker compose version  # >= 2.x
```

### Paso 1 — Clonar / descomprimir
```bash
cd ~/labsoft
unzip caloria-ar-v2.zip
cd caloria-ar-v2
```

### Paso 2 — Configurar variables de entorno
```bash
cp .env.example .env
nano .env
```

Editá estos valores:
```env
DB_PASSWORD=una_password_segura_tuya
JWT_SECRET=un_string_aleatorio_largo_minimo_32_chars
```

### Paso 3 — Levantar todo
```bash
docker compose up --build -d
```

Esto levanta 3 containers:
- `caloria_db`    → PostgreSQL en puerto 5432
- `caloria_app`   → Node.js en puerto 3000
- `caloria_nginx` → Nginx en puerto 80

### Paso 4 — Verificar
```bash
# Health check
curl http://localhost/health

# Logs en tiempo real
docker compose logs -f app

# Ver containers corriendo
docker compose ps
```

### Abrir en el navegador
```
http://localhost
```

### Comandos útiles de desarrollo
```bash
docker compose down           # Detener todo
docker compose down -v        # Detener + borrar volumen DB (reset completo)
docker compose restart app    # Reiniciar solo el backend
docker compose exec db psql -U caloria_user -d caloria_db   # Conectar a PostgreSQL
```

---

## ☕ Motor Java (Eclipse — Materia POO)

```bash
# Importar en Eclipse:
# File → Import → Existing Projects into Workspace
# Seleccionar carpeta: java-engine/

# O compilar desde terminal:
cd java-engine/src
javac -d ../bin com/caloria/**/*.java com/caloria/*.java
java -cp ../bin com.caloria.Main
```

Salida esperada:
```
══════════════════════════════════════════
      CALORIA-AR · Motor Java v2.0        
══════════════════════════════════════════

Usuario[ana@test.com | 65.0kg | 162cm | 30 años | Actividad: Sedentario]
  TMB:    1407 kcal
  TDEE:   1688 kcal (Sedentario)
  Meta:   1188 kcal (objetivo: perder)
  ⚠️  La meta calculada (1188 kcal) es peligrosamente baja...

Usuario[leo@test.com | 80.0kg | 178cm | 25 años | Actividad: Moderado]
  TMB:    1858 kcal
  TDEE:   2880 kcal (Moderado 3-5 días/semana)
  Meta:   2880 kcal (objetivo: mantener)
  IMC:    25.2 → Sobrepeso
```

---

## 🚀 Deploy a GitHub + GCP + EasyPanel

### Fase 1 — Subir a GitHub

```bash
cd ~/labsoft/caloria-ar-v2

# Inicializar repositorio
git init
git add .
git commit -m "feat: Caloria-AR v2.0 — sistema nutricional completo"

# Crear repo en GitHub (desde github.com → New repository)
# Nombre sugerido: caloria-ar

# Conectar y subir
git remote add origin https://github.com/TU_USUARIO/caloria-ar.git
git branch -M main
git push -u origin main
```

### Fase 2 — Configurar subdominio en GestionCloud

En tu proveedor DNS (donde administrás gestioncloud.com.ar):

| Campo | Valor |
|-------|-------|
| Tipo  | A |
| Nombre | `calorias` |
| Valor | `IP_PUBLICA_DE_TU_GCP` |
| TTL   | 300 |

Resultado: `https://calorias.gestioncloud.com.ar`

### Fase 3 — Deploy en EasyPanel (GCP)

1. **Entrá a tu EasyPanel** → `https://panel.gestioncloud.com.ar`

2. **Crear proyecto** → "New Project" → Nombre: `caloria-ar`

3. **Crear servicio PostgreSQL**:
   - Services → Add Service → PostgreSQL
   - Nombre: `caloria-db`
   - Anotá: host, usuario, password, nombre de BD

4. **Crear servicio App**:
   - Services → Add Service → App
   - Source: GitHub → seleccioná `caloria-ar`
   - Build path: `/backend`
   - Dockerfile path: `backend/Dockerfile`

5. **Variables de entorno** (pestaña Environment):
   ```
   NODE_ENV=production
   PORT=3000
   DB_HOST=caloria-db     ← nombre del servicio postgres en EasyPanel
   DB_PORT=5432
   DB_NAME=caloria_db
   DB_USER=caloria_user
   DB_PASSWORD=tu_password_segura
   JWT_SECRET=tu_secret_de_produccion_muy_largo
   JWT_EXPIRES=7d
   ```

6. **Dominio y SSL**:
   - Pestaña "Domains" → Add Domain
   - Domain: `calorias.gestioncloud.com.ar`
   - ✅ Enable HTTPS (Let's Encrypt) → automático y gratuito

7. **Servir el frontend estático**:
   - En EasyPanel crear un segundo servicio tipo "Static Site"
   - Source: misma repo → directorio `/frontend`
   - Domain: mismo subdominio → EasyPanel lo ruteará

8. **Inicializar la BD**:
   ```bash
   # Desde EasyPanel → Terminal del container de Postgres
   psql -U caloria_user -d caloria_db -f /path/to/init.sql
   ```
   O copiar el contenido de `init.sql` y ejecutarlo en la terminal SQL de EasyPanel.

### Fase 4 — Verificar en producción

```bash
curl https://calorias.gestioncloud.com.ar/health
# → {"status":"ok","version":"2.0"}
```

---

## 🔄 Flujo de actualizaciones (post-deploy)

```bash
# En tu máquina local: hacés cambios, los committeás
git add .
git commit -m "fix: mejorar búsqueda de alimentos"
git push origin main

# EasyPanel detecta el push (webhook) y redespliega automáticamente
# Sin downtime · En ~60 segundos el cambio está en producción
```

---

## 🧪 Pruebas manuales con curl

```bash
# Registrarse
curl -X POST http://localhost/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"yo@test.com","password":"Test1234!","nombre":"Mi nombre"}'

# Login
curl -X POST http://localhost/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"yo@test.com","password":"Test1234!"}'
# Copiá el token de la respuesta ↓

# Buscar alimento
curl "http://localhost/api/alimentos/buscar?q=manzana" \
  -H "Authorization: Bearer TU_TOKEN"

# Registrar peso
curl -X POST http://localhost/api/peso \
  -H "Authorization: Bearer TU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"peso_kg": 74.5}'
```

---

## 🔮 Mejoras planificadas (Trabajo de Campo)

| Feature | Tecnología | Estado |
|---------|------------|--------|
| Caché de búsquedas frecuentes | Redis | Planificado |
| Gráficos de tendencia calórica | Chart.js adicional | Planificado |
| Modo nutricionista (multi-paciente) | Multitenancy PostgreSQL | Futuro |
| Escáner de código de barras | QuaggaJS / BarcodeDetector API | Futuro |
| Notificaciones recordatorio | Web Push API | Futuro |
| Exportar reporte PDF/CSV | pdfkit / csv-writer | Futuro |

---

## 📄 Disclaimer Médico

Esta aplicación es una herramienta informativa. Los cálculos de TMB, TDEE, IMC y déficit calórico son estimaciones basadas en fórmulas estadísticas promedio y **no reemplazan** la consulta con un médico o nutricionista matriculado.

---

*Proyecto académico — Analista de Sistemas · UNPAZ · 2025*
