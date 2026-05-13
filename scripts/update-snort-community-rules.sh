#!/bin/sh
set -eu

RULE_DIR="${1:-security/snort/rules}"
RULE_URL="${SNORT_COMMUNITY_RULES_URL:-https://www.snort.org/downloads/community/snort3-community-rules.tar.gz}"
OUTPUT_FILE="${RULE_DIR}/community.rules"
TMP_DIR="$(mktemp -d)"
ARCHIVE_FILE="${TMP_DIR}/community-rules.tar.gz"

log() {
  printf 'snort:update-rules: %s\n' "$*"
}

cleanup() {
  rm -rf "${TMP_DIR}"
}
trap cleanup EXIT INT TERM

if ! command -v curl >/dev/null 2>&1; then
  echo "curl is required to download Snort community rules." >&2
  exit 1
fi

log "rule directory: ${RULE_DIR}"
log "source URL: ${RULE_URL}"

mkdir -p "${RULE_DIR}"

log "downloading community rules archive..."
curl -fsSL "${RULE_URL}" -o "${ARCHIVE_FILE}"

archive_size="$(wc -c < "${ARCHIVE_FILE}" | tr -d ' ')"
log "downloaded archive: ${archive_size} bytes"

if command -v sha256sum >/dev/null 2>&1; then
  archive_sha256="$(sha256sum "${ARCHIVE_FILE}" | awk '{print $1}')"
  log "archive sha256: ${archive_sha256}"
fi

log "extracting archive..."
tar -xzf "${ARCHIVE_FILE}" -C "${TMP_DIR}"

rule_file_count="$(find "${TMP_DIR}" -type f -name '*.rules' | wc -l | tr -d ' ')"
log "discovered ${rule_file_count} .rules file(s)"

if [ "${rule_file_count}" -eq 0 ]; then
  echo "No .rules files found in downloaded archive." >&2
  exit 1
fi

log "rule files:"
find "${TMP_DIR}" -type f -name '*.rules' -print | sed "s#${TMP_DIR}/#  - #"

log "writing merged community rules to ${OUTPUT_FILE}"
find "${TMP_DIR}" -type f -name '*.rules' -exec cat {} \; > "${OUTPUT_FILE}"

output_lines="$(wc -l < "${OUTPUT_FILE}" | tr -d ' ')"
output_bytes="$(wc -c < "${OUTPUT_FILE}" | tr -d ' ')"
enabled_rules="$(grep -Ec '^[[:space:]]*(alert|block|drop|pass|reject)[[:space:]]' "${OUTPUT_FILE}" || true)"

log "output file: ${OUTPUT_FILE}"
log "output size: ${output_bytes} bytes"
log "output lines: ${output_lines}"
log "enabled rule lines: ${enabled_rules}"
log "done"
