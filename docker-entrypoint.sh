#!/bin/sh
set -eu

umask 077

APP_DATA_DIR="${APP_DATA_DIR:-/app/data}"
CERT_DIR="${CERT_DIR:-/app/certs}"
SECRET_FILE="${APP_DATA_DIR}/runtime-secrets.env"
TLS_CERT_PATH="${TLS_CERT_PATH:-${CERT_DIR}/server.crt}"
TLS_KEY_PATH="${TLS_KEY_PATH:-${CERT_DIR}/server.key}"

mkdir -p "${APP_DATA_DIR}" "${CERT_DIR}"

if [ ! -f "${SECRET_FILE}" ]; then
  SESSION_SECRET="$(openssl rand -hex 32)"
  PEPPER_SECRET="$(openssl rand -hex 32)"
  ENCRYPTION_KEY="$(openssl rand -hex 32)"
  {
    printf 'SESSION_SECRET=%s\n' "${SESSION_SECRET}"
    printf 'PEPPER_SECRET=%s\n' "${PEPPER_SECRET}"
    printf 'ENCRYPTION_KEY=%s\n' "${ENCRYPTION_KEY}"
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
    -out "${TLS_CERT_PATH}"
fi

exec node src/server.js

