#!/usr/bin/env bash
set -euo pipefail

readonly base_url="${1:-http://127.0.0.1:3000}"
readonly headers="$(mktemp)"
trap 'rm -f "$headers"' EXIT

curl --fail --silent --show-error --dump-header "$headers" --output /dev/null "$base_url/login"

assert_header() {
  local name="$1"
  local expected="$2"
  local actual
  actual="$(awk -F': *' -v wanted="$name" 'tolower($1) == tolower(wanted) {sub(/\r$/, "", $2); print $2}' "$headers" | tail -1)"
  if [[ "$actual" != "$expected" ]]; then
    printf 'Expected %s: %s; received: %s\n' "$name" "$expected" "${actual:-<missing>}" >&2
    exit 1
  fi
}

assert_header 'Content-Security-Policy' "frame-ancestors 'none'"
assert_header 'Permissions-Policy' 'camera=(), geolocation=(), microphone=(), payment=(), usb=()'
assert_header 'Referrer-Policy' 'strict-origin-when-cross-origin'
assert_header 'X-Content-Type-Options' 'nosniff'
assert_header 'X-Frame-Options' 'DENY'

printf 'HTTP security header assertions passed.\n'
