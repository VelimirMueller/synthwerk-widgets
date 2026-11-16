# syntax=docker/dockerfile:1.7
# Widget host image (widgets#32): unprivileged nginx serves every version in releases.json under
# /widgets/v<X.Y.Z>/. The build downloads each bundle from its GitHub Release and checks size and
# integrity against releases.json (scripts/release/fetch.ts); a mismatch fails the build.
#   docker build .                          # published image (deploy.yml): released versions only
#   docker build --build-arg SOURCE=source .  # test image (scripts/image-smoke.sh): also the local
#                                             # build under its version, when it is not released yet
# The running container needs no network, no capability and no writable path except /tmp.

# release (default) or source. Only the stage it names is built.
ARG SOURCE=release

FROM node:24.18.0-alpine3.24@sha256:a0b9bf06e4e6193cf7a0f58816cc935ff8c2a908f81e6f1a95432d679c54fbfd AS node
WORKDIR /w
COPY releases.json ./
COPY scripts/release/ scripts/release/

FROM node AS bundles-release
RUN node scripts/release/fetch.ts --lock releases.json --out /out

# Test images only: build the bundles like CI does (pnpm build), then serve them under their version.
FROM node AS bundles-source
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY vendor/ vendor/
RUN pnpm install --frozen-lockfile
COPY tsconfig.json vite.config.ts ./
COPY src/ src/
COPY public/ public/
RUN pnpm run build \
 && node scripts/release/sri.ts \
 && node scripts/release/fetch.ts --lock releases.json --out /out --dist dist

FROM bundles-${SOURCE} AS bundles

# The commit goes into the /healthz answer. Only hex is accepted: it lands in the nginx config.
FROM node AS conf
ARG COMMIT=0000000
COPY image/nginx.conf /conf/default.conf
RUN echo "$COMMIT" | grep -Eqx '[0-9a-f]{7,40}' \
 && sed -i "s/@COMMIT@/$COMMIT/" /conf/default.conf

FROM nginxinc/nginx-unprivileged:1.31.7-alpine3.24-slim@sha256:a8cb0f33d51fa107c96fd2bd3a71aaf564ec131e9d2bdf8700944f0ed8b170d7
COPY --from=conf /conf/default.conf /etc/nginx/conf.d/default.conf
COPY --from=bundles /out/widgets/ /usr/share/nginx/html/widgets/
USER 101
EXPOSE 8080
# wget is in the base image (busybox).
HEALTHCHECK --interval=30s --timeout=3s CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1
# Start nginx directly: the entrypoint scripts of the base image edit files in /etc/nginx.
# Supported run mode: read-only root, uid 101, tmpfs /tmp (synthwerk-infra compose.yaml).
ENTRYPOINT ["nginx", "-g", "daemon off;"]
