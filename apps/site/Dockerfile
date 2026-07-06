FROM node:20-bookworm-slim AS base

RUN corepack enable && corepack prepare pnpm@10.6.0 --activate

WORKDIR /app

# Copy workspace config for dependency caching
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json ./
COPY apps/site/package.json apps/site/

# Install dependencies (site is a leaf app with no workspace deps)
RUN pnpm install --frozen-lockfile --filter site...

# Copy source
COPY apps/site/ apps/site/

# NEXT_PUBLIC_ vars must be available at build time
ARG NEXT_PUBLIC_APP_URL=https://app.hitlist.fm
ARG NEXT_PUBLIC_SITE_URL=https://hitlist.fm
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL

RUN pnpm --filter site build

WORKDIR /app/apps/site

EXPOSE 3002

CMD ["pnpm", "start"]
