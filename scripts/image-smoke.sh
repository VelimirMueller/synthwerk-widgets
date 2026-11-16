#!/usr/bin/env bash
# Smoke test of the widget host image (widgets#32). Run after `pnpm build && node scripts/release/sri.ts`.
# Builds the test image (SOURCE=source: the image builds the bundles itself), starts it like the
# stack does (read-only root, no capabilities, uid 101, tmpfs /tmp), then checks:
# - each bundle of dist/release.json: status 200, the five host headers, the same bytes and integrity
#   as the CI build (the build is reproducible);
# - an unknown version, another path and a POST: no bundle, no cache header.
set -euo pipefail

cd "$(dirname "$0")/.."
image=synthwerk-widgets:smoke
name=synthwerk-widgets-smoke
port=${SMOKE_PORT:-18087}
tmp=$(mktemp -d)
trap 'docker rm -f "$name" >/dev/null 2>&1 || true; rm -rf "$tmp"' EXIT

fail() { echo "FAIL: $*" >&2; exit 1; }

[ -f dist/release.json ] || fail "dist/release.json is missing: run pnpm build && node scripts/release/sri.ts first"

docker build --build-arg SOURCE=source --build-arg COMMIT="$(git rev-parse HEAD)" -t "$image" .
docker run -d --name "$name" --read-only --cap-drop ALL --security-opt no-new-privileges:true \
  --tmpfs /tmp -p "127.0.0.1:$port:8080" "$image" >/dev/null

base="http://127.0.0.1:$port"
for _ in $(seq 1 30); do
  curl -fsS "$base/healthz" >/dev/null 2>&1 && break
  sleep 1
done
curl -fsS "$base/healthz" | grep -q '"status":"ok"' || fail "/healthz does not answer"
[ "$(docker exec "$name" id -u)" = 101 ] || fail "nginx does not run as uid 101"

# header <file> <name>: the value of one response header, without the CR.
header() { grep -i "^$2:" "$1" | head -n 1 | cut -d: -f2- | sed 's/^ //; s/\r$//'; }

version=$(node -p "require('./dist/release.json').version")
while read -r path integrity; do
  code=$(curl -sS -D "$tmp/h" -o "$tmp/body" -w '%{http_code}' "$base$path")
  [ "$code" = 200 ] || fail "$path answers $code"
  [ "$(header "$tmp/h" Content-Type)" = "text/javascript" ] || fail "$path Content-Type"
  [ "$(header "$tmp/h" Cache-Control)" = "public, max-age=31536000, immutable" ] || fail "$path Cache-Control"
  [ "$(header "$tmp/h" Access-Control-Allow-Origin)" = "*" ] || fail "$path Access-Control-Allow-Origin"
  [ "$(header "$tmp/h" Cross-Origin-Resource-Policy)" = "cross-origin" ] || fail "$path Cross-Origin-Resource-Policy"
  [ "$(header "$tmp/h" X-Content-Type-Options)" = "nosniff" ] || fail "$path X-Content-Type-Options"
  got="sha384-$(openssl dgst -sha384 -binary "$tmp/body" | openssl base64 -A)"
  [ "$got" = "$integrity" ] || fail "$path: image serves $got, CI built $integrity"
  # A compressed answer must decode to the same bytes (SRI checks the decoded body).
  curl -sS --compressed -H 'Accept-Encoding: gzip' -o "$tmp/gz" "$base$path"
  cmp -s "$tmp/body" "$tmp/gz" || fail "$path: the gzip answer decodes to other bytes"
  code=$(curl -sS -I -o /dev/null -w '%{http_code}' "$base$path")
  [ "$code" = 200 ] || fail "HEAD $path answers $code"
  echo "ok $path $got"
done < <(node -e "for (const b of require('./dist/release.json').bundles) console.log(b.path, b.integrity)")

for path in "/widgets/v0.0.0/synthwerk-chat.js" "/widgets/v$version/" "/widgets/v$version/release.json" "/"; do
  code=$(curl -sS -D "$tmp/h" -o /dev/null -w '%{http_code}' "$base$path")
  [ "$code" = 404 ] || fail "$path answers $code, not 404"
  [ -z "$(header "$tmp/h" Cache-Control)" ] || fail "$path: a 404 carries a cache header"
done
code=$(curl -sS -o /dev/null -w '%{http_code}' -X POST "$base/widgets/v$version/synthwerk-chat.js")
[ "$code" = 403 ] || fail "POST answers $code, not 403"
echo "ok unknown paths 404, POST 403"
