# Runs the @quote-engine/api workspace package. Built from the monorepo root because npm
# workspaces need the root package.json + package-lock.json + sibling packages present to
# resolve the @quote-engine/engine dependency.
FROM node:24-bookworm-slim

# Puppeteer needs a real Chromium at runtime (for PDF export). Skip its own ~300MB bundled
# download and use Debian's chromium package instead, which pulls in its own required shared
# libraries via apt — avoids the missing-library failures that a bare Puppeteer binary hits on
# a slim base image.
ENV PUPPETEER_SKIP_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
    NODE_ENV=production

RUN apt-get update && apt-get install -y --no-install-recommends chromium \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY . .
RUN npm ci

WORKDIR /app/packages/api
EXPOSE 8080
ENV PORT=8080

# Runs the TypeScript source directly via tsx (same as local dev's "start" script) rather than
# a separate compile step — @quote-engine/engine's package.json points its "main" at raw .ts
# source, which only tsx's on-the-fly transpilation resolves; a plain `node` + prebuilt-JS
# approach fails to import it (this is exactly what broke the first Vercel deploy attempt).
CMD ["npx", "tsx", "src/server.ts"]
