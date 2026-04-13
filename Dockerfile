FROM node:24-alpine

RUN apk add --no-cache openssl

WORKDIR /app

ENV NODE_ENV=production \
    APP_HOST=0.0.0.0 \
    APP_PORT_HTTP=8080 \
    APP_PORT_HTTPS=8443 \
    APP_DATA_DIR=/app/data \
    CERT_DIR=/app/certs \
    DB_PATH=/app/data/auth.db \
    TLS_CERT_PATH=/app/certs/server.crt \
    TLS_KEY_PATH=/app/certs/server.key

COPY package*.json ./
RUN npm ci --omit=dev

COPY public ./public
COPY src ./src
COPY docker-entrypoint.sh ./docker-entrypoint.sh

RUN mkdir -p /app/data /app/certs \
  && chmod +x /app/docker-entrypoint.sh \
  && chown -R node:node /app

USER node

EXPOSE 8080 8443
VOLUME ["/app/data", "/app/certs"]

CMD ["./docker-entrypoint.sh"]

