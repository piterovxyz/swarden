FROM node:26-slim
WORKDIR /app
COPY server/package.json server/index.ts ./
COPY server/src ./src
ENV PORT=6701
EXPOSE 6701
USER node
CMD ["node", "index.ts"]
