#!/bin/sh
set -eu

umask 077

APP_PORT_HTTP="${APP_PORT_HTTP:-8080}"
APP_PORT_HTTPS="${APP_PORT_HTTPS:-8443}"
PUBLIC_HTTPS_PORT="${PUBLIC_HTTPS_PORT:-$APP_PORT_HTTPS}"
APP_DATA_DIR="${APP_DATA_DIR:-/var/www/data}"
CERT_DIR="${CERT_DIR:-/var/www/certs}"
DB_PATH="${DB_PATH:-${APP_DATA_DIR}/auth.db}"
TLS_CERT_PATH="${TLS_CERT_PATH:-${CERT_DIR}/server.crt}"
TLS_KEY_PATH="${TLS_KEY_PATH:-${CERT_DIR}/server.key}"
SECRET_FILE="${APP_DATA_DIR}/runtime-secrets.env"

mkdir -p "${APP_DATA_DIR}" "${CERT_DIR}"

if [ ! -f "${SECRET_FILE}" ]; then
  {
    printf 'PEPPER_SECRET=%s\n' "$(openssl rand -hex 32)"
    printf 'ENCRYPTION_KEY=%s\n' "$(openssl rand -hex 32)"
  } > "${SECRET_FILE}"
fi

set -a
. "${SECRET_FILE}"
set +a

if [ ! -f "${TLS_CERT_PATH}" ] || [ ! -f "${TLS_KEY_PATH}" ]; then
  openssl req \
    -x509 \
    -nodes \
    -newkey rsa:2048 \
    -sha256 \
    -days 365 \
    -subj "/CN=localhost" \
    -keyout "${TLS_KEY_PATH}" \
    -out "${TLS_CERT_PATH}" >/dev/null 2>&1
fi

if [ "${PUBLIC_HTTPS_PORT}" = "443" ]; then
  PUBLIC_HTTPS_SUFFIX=""
else
  PUBLIC_HTTPS_SUFFIX=":${PUBLIC_HTTPS_PORT}"
fi

export APP_PORT_HTTP APP_PORT_HTTPS PUBLIC_HTTPS_PORT PUBLIC_HTTPS_SUFFIX
export APP_DATA_DIR DB_PATH CERT_DIR TLS_CERT_PATH TLS_KEY_PATH
export PEPPER_SECRET ENCRYPTION_KEY

cat > /etc/apache2/ports.conf <<EOF
Listen ${APP_PORT_HTTP}
<IfModule ssl_module>
    Listen ${APP_PORT_HTTPS}
</IfModule>
<IfModule mod_gnutls.c>
    Listen ${APP_PORT_HTTPS}
</IfModule>
EOF

envsubst '${APP_PORT_HTTP} ${PUBLIC_HTTPS_SUFFIX}' \
  < /etc/apache2/sites-available/http-redirect.conf.template \
  > /etc/apache2/sites-available/http-redirect.conf

envsubst '${APP_PORT_HTTPS} ${TLS_CERT_PATH} ${TLS_KEY_PATH}' \
  < /etc/apache2/sites-available/app-ssl.conf.template \
  > /etc/apache2/sites-available/app-ssl.conf

a2ensite http-redirect app-ssl >/dev/null
chown -R www-data:www-data "${APP_DATA_DIR}" "${CERT_DIR}"

exec "$@"
