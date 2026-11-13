FROM oven/bun:1.4.4-slim AS build
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun build ./index.ts --target=bun --outdir=dist

FROM oven/bun:1.4.4-slim
WORKDIR /app
COPY --from=build /app/dist ./dist
ENV PORT=6701
EXPOSE 6701
USER bun
CMD ["bun", "dist/index.js"]
