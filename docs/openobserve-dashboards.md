# Dashboards y alertas en OpenObserve (RF-05 y RF-06)

Entra a `http://<IP_EC2>:5080` con el correo y contraseña de `OO_USER` / `OO_PASSWORD`.

> Los nombres exactos de streams/métricas dependen de la versión de OpenObserve y del Collector.
> Antes de armar cada panel revisa **Streams → Metrics** y confirma el nombre. Los de abajo son los esperados
> (los puntos se convierten en guion bajo).

## 1. Dónde verás cada cosa

| Qué | Dónde en OpenObserve | Stream |
|---|---|---|
| Eventos del pipeline (tests, build, deploy) | Logs | `cicd_events` |
| Logs de la aplicación | Logs | `default` (filtra `service_name = 'api-usuarios-productos'`) |
| Trazas HTTP + consultas SQL | Traces | `default` |
| Métricas de la app y del servidor | Metrics / Dashboards | nombre de cada métrica |

## 2. Dashboard "Pipeline CI/CD" (logs)

Tipo de panel con SQL sobre el stream `cicd_events`:

- **Ejecuciones por estado** (donut):
  `SELECT status, count(*) AS total FROM "cicd_events" WHERE event = 'tests_finished' GROUP BY status`
- **Historial** (tabla):
  `SELECT _timestamp, event, status, branch, actor, commit, run_url FROM "cicd_events" ORDER BY _timestamp DESC LIMIT 50`
- **Despliegues completados** (número):
  `SELECT count(*) FROM "cicd_events" WHERE event = 'deploy_completed' AND status = 'success'`
- **Despliegues bloqueados** (número):
  `SELECT count(*) FROM "cicd_events" WHERE event = 'deploy_blocked'`

## 3. Dashboard "Aplicación" (métricas OTLP)

Panel PromQL (o SQL sobre el stream de la métrica):

- **Peticiones por segundo por endpoint:**
  `sum by (http_route) (rate(http_server_requests_total[1m]))`
- **Tasa de error HTTP:**
  `sum(rate(http_server_errors_total[1m])) / sum(rate(http_server_requests_total[1m]))`
- **Latencia promedio por endpoint (ms):**
  `sum by (http_route) (rate(http_server_request_duration_ms_sum[1m])) / sum by (http_route) (rate(http_server_request_duration_ms_count[1m]))`
- **Peticiones por status code:**
  `sum by (http_status_code) (increase(http_server_requests_total[5m]))`

Cada punto lleva `http_route`, `http_method`, `http_status_code` y timestamp (requisito RF-04).

## 4. Dashboard "Infraestructura EC2" (RF-05)

| Panel | PromQL esperado |
|---|---|
| CPU % | `avg(system_cpu_utilization{state!="idle"}) * 100` o `100 - avg(rate(system_cpu_time{state="idle"}[1m])) * 100` |
| RAM % | `system_memory_utilization{state="used"} * 100` |
| Ancho de banda entrada (bytes/s) | `sum(rate(node_network_receive_bytes_total{device!="lo"}[1m]))` |
| Ancho de banda salida (bytes/s) | `sum(rate(node_network_transmit_bytes_total{device!="lo"}[1m]))` |
| Temperatura (°C) | `node_hwmon_temp_celsius` o `node_thermal_zone_temp` |
| Carga | `system_cpu_load_average_1m` |

**Sobre la temperatura:** las instancias EC2 son máquinas virtuales y normalmente NO exponen sensores
(`/sys/class/hwmon` vacío). Si el panel sale sin datos, es una limitación de AWS y no del pipeline.
Opciones para el reporte: (a) usar un tipo `*.metal`, que sí expone sensores; (b) documentar la limitación y
mostrar que la métrica está configurada y se recolecta en cuanto el sensor existe; (c) en la laptop/PC local
con `node-exporter` sí aparece, y sirve como evidencia de que la recolección funciona.

## 5. Alertas operativas (RF-06)

Alerts → Add alert (destino: correo o webhook de Slack/Discord, el que prefieras):

| Alerta | Tipo | Condición |
|---|---|---|
| Pruebas fallidas | Logs (SQL) | `SELECT * FROM "cicd_events" WHERE event = 'tests_finished' AND status = 'failure'` — cada 1 min, umbral ≥ 1 |
| Despliegue fallido | Logs (SQL) | `... WHERE event = 'deploy_completed' AND status = 'failure'` |
| Errores 5xx en la app | Logs (SQL) | `SELECT * FROM "default" WHERE severity = 'ERROR'` — umbral ≥ 3 en 5 min |
| CPU alta | Métrica (PromQL) | CPU % > 80 durante 5 min |
| RAM alta | Métrica (PromQL) | RAM % > 85 durante 5 min |

Para provocar la alerta de errores 5xx durante la demostración:

```bash
for i in $(seq 1 10); do curl -s http://<IP_EC2>:3000/api/health/error > /dev/null; done
```

## 6. Ver trazas

Traces → stream `default` → elige `api-usuarios-productos`. Cada traza muestra el span HTTP, los spans de
Express/Nest y, dentro, los spans `pg.query` con el SQL ejecutado. Para ver una con base de datos, llama
`GET /api/products` (con token) o `GET /api/health`.
