FROM --platform=$BUILDPLATFORM node:26-slim AS web-build
WORKDIR /app
COPY package.json package-lock.json ./
COPY server/package.json ./server/
COPY web/package.json ./web/
COPY shared/package.json ./shared/
RUN npm ci
COPY shared ./shared
COPY web ./web
RUN npm run build -w web

FROM caddy:2-alpine AS web
COPY docker/Caddyfile /etc/caddy/Caddyfile
COPY --from=web-build /app/web/dist /srv
EXPOSE 80

FROM node:26-slim AS server
WORKDIR /app
COPY shared ./shared
COPY server/package.json server/index.ts ./server/
COPY server/src ./server/src
RUN mkdir -p node_modules/@swarden && ln -s /app/shared node_modules/@swarden/shared
WORKDIR /app/server
ENV PORT=6701
EXPOSE 6701
USER node
CMD ["node", "index.ts"]
