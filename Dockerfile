FROM node:26-slim
WORKDIR /app
COPY package.json index.ts ./
COPY src ./src
ENV PORT=6701
EXPOSE 6701
USER node
CMD ["node", "index.ts"]
