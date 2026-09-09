#!/bin/sh
set -eu
: "${DB_POSTGRESDB_HOST:?Set the Managed Postgres connection variables}"
: "${DB_POSTGRESDB_PASSWORD:?Set the Managed Postgres connection variables}"
: "${N8N_ENCRYPTION_KEY:?Set a stable encryption key before the first start}"
: "${N8N_INSTANCE_OWNER_EMAIL:?Set the owner email}"
: "${N8N_INSTANCE_OWNER_PASSWORD_HASH:?Set the owner bcrypt password hash}"
export DB_TYPE=postgresdb
export N8N_INSTANCE_OWNER_MANAGED_BY_ENV=true
export N8N_LISTEN_ADDRESS=0.0.0.0
export N8N_PORT="${PORT:-5678}"
export N8N_HOST="${N8N_HOST:-${LIZARD_PUBLIC_DOMAIN:-}}"
: "${N8N_HOST:?Set N8N_HOST to the public hostname from lizard domain}"
export N8N_PROTOCOL=https
export WEBHOOK_URL="https://${N8N_HOST}/"
export N8N_EDITOR_BASE_URL="https://${N8N_HOST}/"
export N8N_PROXY_HOPS="${N8N_PROXY_HOPS:-1}"
export GENERIC_TIMEZONE="${GENERIC_TIMEZONE:-UTC}"
export TZ="${TZ:-UTC}"
export N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS=true
export N8N_DIAGNOSTICS_ENABLED=false
export N8N_VERSION_NOTIFICATIONS_ENABLED=false
exec /docker-entrypoint.sh "$@"
