#!/bin/sh
set -eu

umask 077

APP_PORT_HTTP="${APP_PORT_HTTP:-8080}"
APP_PORT_HTTPS="${APP_PORT_HTTPS:-8443}"
PUBLIC_HTTPS_PORT="${PUBLIC_HTTPS_PORT:-$APP_PORT_HTTPS}"
APP_DATA_DIR="${APP_DATA_DIR:-/var/www/data}"
CERT_DIR="${CERT_DIR:-/var/www/certs}"
DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-3306}"
DB_NAME="${DB_NAME:-${MYSQL_DATABASE:-kamsis_auth}}"
DB_USER="${DB_USER:-${MYSQL_APP_USER:-kamsis_app}}"
MYSQL_DATA_DIR="${MYSQL_DATA_DIR:-/var/lib/mysql}"
MYSQL_DATABASE="${MYSQL_DATABASE:-$DB_NAME}"
MYSQL_APP_USER="${MYSQL_APP_USER:-$DB_USER}"
MYSQL_PORT="${MYSQL_PORT:-3306}"
MYSQL_SOCKET="${MYSQL_SOCKET:-/var/run/mysqld/mysqld.sock}"
MYSQL_PID_FILE="${MYSQL_PID_FILE:-/var/run/mysqld/mysqld.pid}"
TLS_CERT_PATH="${TLS_CERT_PATH:-${CERT_DIR}/server.crt}"
TLS_KEY_PATH="${TLS_KEY_PATH:-${CERT_DIR}/server.key}"
SECRET_FILE="${APP_DATA_DIR}/runtime-secrets.env"

validate_mysql_identifier() {
  value="$1"
  label="$2"

  case "$value" in
    ''|*[!A-Za-z0-9_]*)
      echo "$label must use only letters, numbers, or underscores." >&2
      exit 1
      ;;
  esac
}

mkdir -p "${APP_DATA_DIR}" "${CERT_DIR}" "${MYSQL_DATA_DIR}" /var/run/mysqld

validate_mysql_identifier "${DB_NAME}" "DB_NAME"
validate_mysql_identifier "${DB_USER}" "DB_USER"
validate_mysql_identifier "${MYSQL_DATABASE}" "MYSQL_DATABASE"
validate_mysql_identifier "${MYSQL_APP_USER}" "MYSQL_APP_USER"

if [ ! -f "${SECRET_FILE}" ]; then
  {
    printf 'PEPPER_SECRET=%s\n' "$(openssl rand -hex 32)"
    printf 'ENCRYPTION_KEY=%s\n' "$(openssl rand -hex 32)"
    printf 'MYSQL_ROOT_PASSWORD=%s\n' "$(openssl rand -hex 24)"
    printf 'MYSQL_APP_PASSWORD=%s\n' "$(openssl rand -hex 24)"
  } > "${SECRET_FILE}"
fi

set -a
. "${SECRET_FILE}"
set +a

DB_PASSWORD="${DB_PASSWORD:-${MYSQL_APP_PASSWORD}}"

if [ ! -f "${TLS_CERT_PATH}" ] || [ ! -f "${TLS_KEY_PATH}" ]; then
  openssl req \
    -x509 \
    -nodes \
    -newkey rsa:2048 \
    -sha256 \
    -days 365 \
    -subj "/CN=localhost" \
    -addext "subjectAltName=DNS:localhost,IP:127.0.0.1" \
    -addext "basicConstraints=critical,CA:FALSE" \
    -addext "keyUsage=critical,digitalSignature,keyEncipherment" \
    -addext "extendedKeyUsage=serverAuth" \
    -keyout "${TLS_KEY_PATH}" \
    -out "${TLS_CERT_PATH}" >/dev/null 2>&1
fi

if [ "${PUBLIC_HTTPS_PORT}" = "443" ]; then
  PUBLIC_HTTPS_SUFFIX=""
else
  PUBLIC_HTTPS_SUFFIX=":${PUBLIC_HTTPS_PORT}"
fi

export APP_PORT_HTTP APP_PORT_HTTPS PUBLIC_HTTPS_PORT PUBLIC_HTTPS_SUFFIX
export APP_DATA_DIR CERT_DIR TLS_CERT_PATH TLS_KEY_PATH
export DB_HOST DB_PORT DB_NAME DB_USER DB_PASSWORD
export MYSQL_DATA_DIR MYSQL_DATABASE MYSQL_APP_USER MYSQL_PORT MYSQL_SOCKET MYSQL_PID_FILE
export PEPPER_SECRET ENCRYPTION_KEY MYSQL_ROOT_PASSWORD MYSQL_APP_PASSWORD

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
chown -R mysql:mysql "${MYSQL_DATA_DIR}" /var/run/mysqld

MYSQL_BOOTSTRAP_REQUIRED=0
if [ ! -d "${MYSQL_DATA_DIR}/mysql" ]; then
  MYSQL_BOOTSTRAP_REQUIRED=1
  mysqld --initialize-insecure --user=mysql --datadir="${MYSQL_DATA_DIR}"
fi

mysqld \
  --user=mysql \
  --datadir="${MYSQL_DATA_DIR}" \
  --socket="${MYSQL_SOCKET}" \
  --pid-file="${MYSQL_PID_FILE}" \
  --port="${MYSQL_PORT}" \
  --bind-address=127.0.0.1 \
  --console &
MYSQLD_PID=$!

attempts=0
until mysqladmin --protocol=socket --socket="${MYSQL_SOCKET}" ping --silent >/dev/null 2>&1; do
  attempts=$((attempts + 1))
  if [ "${attempts}" -ge 60 ]; then
    echo "MySQL failed to become ready in time." >&2
    exit 1
  fi
  sleep 1
done

if [ "${MYSQL_BOOTSTRAP_REQUIRED}" -eq 1 ]; then
  mysql --protocol=socket --socket="${MYSQL_SOCKET}" -uroot <<EOF
ALTER USER 'root'@'localhost' IDENTIFIED BY '${MYSQL_ROOT_PASSWORD}';
CREATE DATABASE IF NOT EXISTS \`${MYSQL_DATABASE}\`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '${MYSQL_APP_USER}'@'localhost' IDENTIFIED BY '${MYSQL_APP_PASSWORD}';
CREATE USER IF NOT EXISTS '${MYSQL_APP_USER}'@'127.0.0.1' IDENTIFIED BY '${MYSQL_APP_PASSWORD}';
GRANT ALL PRIVILEGES ON \`${MYSQL_DATABASE}\`.* TO '${MYSQL_APP_USER}'@'localhost';
GRANT ALL PRIVILEGES ON \`${MYSQL_DATABASE}\`.* TO '${MYSQL_APP_USER}'@'127.0.0.1';
FLUSH PRIVILEGES;
EOF
else
  mysql --protocol=socket --socket="${MYSQL_SOCKET}" -uroot "-p${MYSQL_ROOT_PASSWORD}" <<EOF
CREATE DATABASE IF NOT EXISTS \`${MYSQL_DATABASE}\`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '${MYSQL_APP_USER}'@'localhost' IDENTIFIED BY '${MYSQL_APP_PASSWORD}';
CREATE USER IF NOT EXISTS '${MYSQL_APP_USER}'@'127.0.0.1' IDENTIFIED BY '${MYSQL_APP_PASSWORD}';
ALTER USER '${MYSQL_APP_USER}'@'localhost' IDENTIFIED BY '${MYSQL_APP_PASSWORD}';
ALTER USER '${MYSQL_APP_USER}'@'127.0.0.1' IDENTIFIED BY '${MYSQL_APP_PASSWORD}';
GRANT ALL PRIVILEGES ON \`${MYSQL_DATABASE}\`.* TO '${MYSQL_APP_USER}'@'localhost';
GRANT ALL PRIVILEGES ON \`${MYSQL_DATABASE}\`.* TO '${MYSQL_APP_USER}'@'127.0.0.1';
FLUSH PRIVILEGES;
EOF
fi

"$@" &
APACHE_PID=$!

cleanup() {
  if kill -0 "${APACHE_PID}" 2>/dev/null; then
    apache2ctl -k graceful-stop >/dev/null 2>&1 || kill "${APACHE_PID}" >/dev/null 2>&1 || true
  fi

  if mysqladmin --protocol=socket --socket="${MYSQL_SOCKET}" -uroot "-p${MYSQL_ROOT_PASSWORD}" ping --silent >/dev/null 2>&1; then
    mysqladmin --protocol=socket --socket="${MYSQL_SOCKET}" -uroot "-p${MYSQL_ROOT_PASSWORD}" shutdown >/dev/null 2>&1 || true
  elif kill -0 "${MYSQLD_PID}" 2>/dev/null; then
    kill "${MYSQLD_PID}" >/dev/null 2>&1 || true
  fi
}

trap 'cleanup; exit 0' INT TERM

while :; do
  if ! kill -0 "${APACHE_PID}" 2>/dev/null; then
    wait "${APACHE_PID}"
    APACHE_STATUS=$?
    break
  fi

  if ! kill -0 "${MYSQLD_PID}" 2>/dev/null; then
    wait "${MYSQLD_PID}"
    APACHE_STATUS=$?
    break
  fi

  sleep 1
done

cleanup
exit "${APACHE_STATUS}"
