FROM node:24-alpine AS build

ARG DATA_MODE=sample
ENV DATA_MODE=$DATA_MODE

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN --mount=type=secret,id=tmdb_token,required=false \
    if [ "$DATA_MODE" = "real" ]; then \
      test -s /run/secrets/tmdb_token || { echo "TMDB API Read Token BuildKit secret is required in real mode" >&2; exit 1; }; \
      TMDB_API_READ_TOKEN="$(cat /run/secrets/tmdb_token)" npm run generate:data; \
    else \
      npm run generate:data; \
    fi
RUN npm run validate:data \
    && npm run lint \
    && npm run format:check \
    && npm run test:run \
    && npm run build

FROM nginx:1.29-alpine AS runtime

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --spider http://127.0.0.1/ || exit 1
