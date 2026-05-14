# ==============================================================================
# TalentAI Frontend — Production Dockerfile
# Multi-stage: node build → nginx serve
# ==============================================================================

# ── Stage 1: build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --silent

COPY . .

# Pass build-time API URL (override via docker-compose build args)
ARG VITE_API_BASE_URL=http://localhost:8000/api
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

RUN npm run build


# ── Stage 2: serve with nginx ─────────────────────────────────────────────────
FROM nginx:1.25-alpine AS runtime

# Remove default config
RUN rm /etc/nginx/conf.d/default.conf

COPY nginx.conf /etc/nginx/conf.d/app.conf

COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD wget -qO- http://localhost/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
