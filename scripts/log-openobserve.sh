#!/usr/bin/env bash
# Envía un evento del pipeline a OpenObserve (HTTP/JSON) -> stream "cicd_events".
# Uso: scripts/log-openobserve.sh <evento> <status> [mensaje]
# Variables requeridas: OO_URL, OO_USER, OO_PASSWORD
# Variables de GitHub Actions usadas: GITHUB_SHA, GITHUB_REF_NAME, GITHUB_ACTOR,
#   GITHUB_REPOSITORY, GITHUB_RUN_ID, GITHUB_WORKFLOW, GITHUB_SERVER_URL
# Nunca rompe el pipeline: si OpenObserve no responde solo imprime una advertencia.
set -uo pipefail

EVENT="${1:?evento requerido}"
STATUS="${2:?status requerido}"
MESSAGE="${3:-}"

PAYLOAD=$(jq -n \
  --arg event "$EVENT" \
  --arg status "$STATUS" \
  --arg message "$MESSAGE" \
  --arg commit "${GITHUB_SHA:-local}" \
  --arg branch "${GITHUB_REF_NAME:-local}" \
  --arg actor "${GITHUB_ACTOR:-local}" \
  --arg repo "${GITHUB_REPOSITORY:-local}" \
  --arg workflow "${GITHUB_WORKFLOW:-local}" \
  --arg run_id "${GITHUB_RUN_ID:-0}" \
  --arg run_url "${GITHUB_SERVER_URL:-}/${GITHUB_REPOSITORY:-}/actions/runs/${GITHUB_RUN_ID:-0}" \
  '[{event:$event, status:$status, message:$message, commit:$commit, branch:$branch,
     actor:$actor, repository:$repo, workflow:$workflow, run_id:$run_id, run_url:$run_url,
     service:"api-usuarios-productos"}]')

HTTP_CODE=$(curl -sS -m 20 -o /tmp/oo_response.txt -w '%{http_code}' \
  -u "${OO_USER}:${OO_PASSWORD}" \
  -H 'Content-Type: application/json' \
  -X POST "${OO_URL%/}/api/default/cicd_events/_json" \
  -d "$PAYLOAD") || HTTP_CODE="000"

if [[ "$HTTP_CODE" == "200" ]]; then
  echo "OpenObserve <- ${EVENT} (${STATUS}) registrado"
else
  echo "::warning::No se pudo registrar '${EVENT}' en OpenObserve (HTTP ${HTTP_CODE})"
  cat /tmp/oo_response.txt 2>/dev/null || true
fi
exit 0
