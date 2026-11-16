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

FROM node:26-slim
WORKDIR /app
COPY package.json package-lock.json ./
COPY shared ./shared
COPY server/package.json ./server/
COPY web/package.json ./web/
RUN npm ci --omit=dev
COPY server/index.ts ./server/
COPY server/src ./server/src
COPY --from=web-build /app/web/dist ./web/dist
WORKDIR /app/server
ENV PORT=8888
ENV WEB_DIST=/app/web/dist
EXPOSE 8888
USER node
CMD ["node", "index.ts"]
