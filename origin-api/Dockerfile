FROM node:22-bookworm-slim AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
COPY schemas ./schemas
COPY registry ./registry
RUN npm run build

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist
COPY registry ./registry
COPY schemas ./schemas
COPY .env.production.example ./.env.production.example

EXPOSE 3000

CMD ["node", "dist/src/cloud/server.js"]
