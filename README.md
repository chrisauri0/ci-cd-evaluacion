# CI/CD + Observabilidad (NestJS · pnpm · Playwright · GitHub Actions · AWS EC2 · OpenObserve)

Sistema con **Login**, **CRUD de Usuarios** y **CRUD de Productos**. Cada `git push` a `main` ejecuta las pruebas
Playwright (API + UI); solo si todas pasan se construye la imagen, se despliega por SSH a EC2 y se registra todo en
OpenObserve junto con logs, métricas y trazas de la app y los recursos del servidor.

```
git push ─► GitHub Actions ─► Playwright (API+UI) ──fallo──► evento "deploy_blocked" ─► OpenObserve   (sin SSH)
                                   │ pasa
                                   ▼
                       build + push Docker Hub ─► SSH EC2 ─► docker compose up -d ─► evento "deploy_completed"

EC2:  api ─OTLP─► otel-collector ─OTLP─► openobserve (:5080)
      node-exporter + hostmetrics ─► otel-collector      (CPU, RAM, red, temperatura)
```

## 1. Entorno local en NixOS

```bash
nix develop                      # Node 22, pnpm, navegadores de Playwright, docker-compose, awscli...
pnpm install                     # genera pnpm-lock.yaml  (HAY QUE COMMITEARLO: Docker y CI lo exigen)
# La versión de Playwright debe coincidir con la de nixpkgs (el shellHook la imprime):
pnpm add -D @playwright/test@<versión que imprimió nix develop>

docker compose -f docker-compose.dev.yml up -d     # PostgreSQL local
OTEL_SDK_DISABLED=true pnpm start:dev              # http://localhost:3000   admin@demo.com / Admin123!
pnpm build && pnpm test:e2e                        # pruebas (levanta la API compilada solas)
pnpm test:report                                   # reporte HTML (para capturas del reporte)
```

## 2. Preparar AWS EC2 (una sola vez)

1. Instancia **Ubuntu 24.04**, mínimo **t3.small** (recomendado t3.medium: OpenObserve + Postgres + app), 20 GB.
2. Security Group (entrada): `22` (tu IP), `3000` (app), `5080` (OpenObserve). El `5080` debe ser alcanzable
   desde GitHub Actions para que el pipeline registre eventos (en la práctica: `0.0.0.0/0`).
3. Instalar Docker:
   ```bash
   ssh -i llave.pem ubuntu@<IP>
   curl -fsSL https://get.docker.com | sudo sh && sudo usermod -aG docker $USER && exit
   ```
4. Opcional pero recomendado: asigna una **Elastic IP** para que la IP no cambie.

## 3. Secrets de GitHub (Settings → Secrets and variables → Actions)

| Secret | Valor |
|---|---|
| `DOCKERHUB_USERNAME` / `DOCKERHUB_TOKEN` | usuario y access token de Docker Hub (repo público `cicd-observability-api`) |
| `EC2_HOST` / `EC2_USER` / `EC2_SSH_KEY` | IP pública, `ubuntu`, contenido completo del `.pem` |
| `DB_PASS` | contraseña de PostgreSQL de producción |
| `JWT_SECRET` | cadena larga aleatoria (`openssl rand -hex 32`) |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | admin inicial de la app (p. ej. `admin@demo.com` / `Admin123!`) |
| `OO_URL` | `http://<IP_EC2>:5080` |
| `OO_USER` / `OO_PASSWORD` | credenciales root de OpenObserve (correo + contraseña de 8+ caracteres) |

## 4. Demostración (criterios de aceptación)

**Commit con error intencional** — rompe algo visible, por ejemplo en `public/index.html` cambia el texto
`Iniciar sesión` por `Entrar`, o en `src/products/products.controller.ts` devuelve `500` en `findAll`:
```bash
git commit -am "fix: error intencional" && git push
```
Resultado: Playwright falla → eventos `tests_finished/failure` y `deploy_blocked` en OpenObserve → los jobs
`build` y `deploy` quedan *skipped* (no se abre el SSH).

**Commit válido** — revierte el error y haz push: pruebas OK → imagen → SSH → `deploy_completed` en OpenObserve.

## 5. Dashboards, trazas y alertas

Ver [`docs/openobserve-dashboards.md`](docs/openobserve-dashboards.md).

## 6. Estructura

```
src/            API NestJS (auth, users, products, health) + telemetry/ (logger, métricas HTTP) + tracing.ts
public/         Frontend (login + CRUD) sin framework
tests/          Playwright: api/ (contratos HTTP) y ui/ (navegador)
scripts/        log-openobserve.sh (eventos del pipeline)
docker-compose.yml          stack de producción (app, postgres, openobserve, collector, node-exporter)
otel-collector-config.yaml  receptores OTLP/hostmetrics/prometheus -> OpenObserve
.github/workflows/ci-cd.yml pipeline
flake.nix                   entorno de desarrollo para NixOS
```

## 7. Endpoints

| Método | Ruta | Acceso |
|---|---|---|
| POST | `/api/auth/login` | público |
| GET | `/api/auth/me` | autenticado |
| GET/POST/PUT/DELETE | `/api/users[/:id]` | admin |
| GET | `/api/products[/:id]` | autenticado |
| POST/PUT/DELETE | `/api/products[/:id]` | admin |
| GET | `/api/health` · `/api/health/error` | público (el segundo devuelve 500 a propósito) |
