# Frontend container: builds and checks the static site without a running
# backend.
#
# The site is prerendered at build time and fetches the projects from the API
# during the build. To keep the container hermetic, the build stage starts the
# stub API (stub/server.mjs, fixtures in stub/fixtures) and points the build at
# it, so the same commit always produces the same dist/.
#
# PUBLIC_API_BASE_URL and SITE_URL are build-time values read from the
# environment. They are never baked into the image: the build stage reads them
# at build time and the runtime stage serves whatever was generated.
#
# Targets:
#   docker build -t ajn-portfolio-frontend:ci .
#   docker run --rm ajn-portfolio-frontend:ci pnpm check
#   docker run --rm ajn-portfolio-frontend:ci pnpm build
#
# The default target is `runtime`: nginx serving the generated static site.

# ---------------------------------------------------------------------------
# Shared base: pnpm pinned through the `packageManager` field in package.json.
# ---------------------------------------------------------------------------
FROM node:22-alpine AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app

# ---------------------------------------------------------------------------
# Dependencies: installed once and reused by the later stages.
# ---------------------------------------------------------------------------
FROM base AS deps

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# ---------------------------------------------------------------------------
# Check stage: the source tree with the toolchain installed.
#
# This is the stage the acceptance criteria use: it can run `pnpm check` and
# `pnpm build` on demand, against the stub, with no backend running.
# ---------------------------------------------------------------------------
FROM deps AS check

COPY . .

ENV STUB_PORT=5239
ENV PUBLIC_API_BASE_URL="http://127.0.0.1:5239"

# ---------------------------------------------------------------------------
# Build stage: type-check and build the static site against the stub.
# ---------------------------------------------------------------------------
FROM check AS build

# The canonical origin used for canonical links, the sitemap and robots.txt.
ARG SITE_URL="https://ajn-portfolio.vercel.app"
ENV SITE_URL=$SITE_URL

# Start the stub, wait for it to answer, then check and build against it.
# The build is the only consumer, so the stub dies with this stage.
RUN set -eu; \
    node stub/server.mjs & \
    stub_pid=$!; \
    trap 'kill $stub_pid 2>/dev/null || true' EXIT; \
    \
    echo "Waiting for the stub API to answer..."; \
    i=0; \
    until node -e "fetch('http://127.0.0.1:5239/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"; do \
      i=$((i+1)); \
      if [ "$i" -ge 30 ]; then echo "The stub API did not start in time." >&2; exit 1; fi; \
      sleep 1; \
    done; \
    echo "Stub API is up. Running pnpm check..."; \
    pnpm check; \
    echo "Running pnpm build..."; \
    pnpm build

# ---------------------------------------------------------------------------
# Runtime stage: serve the generated static output.
# ---------------------------------------------------------------------------
FROM nginx:1.27-alpine AS runtime

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://127.0.0.1/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
