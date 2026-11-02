# One container: the Node server serves the built web app and the API on $PORT.
FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/core/package.json packages/core/
COPY apps/server/package.json apps/server/
COPY candivision-roleplay/package.json candivision-roleplay/
RUN npm ci
COPY . .
RUN npm run build -w @roleplay/web

FROM node:22-slim
WORKDIR /app
# SQLite lives on the instance disk; the ready-built library is reloaded from seeds on every boot.
ENV NODE_ENV=production PORT=8080 DB_PATH=/tmp/roleplay.db
COPY --from=build /app /app
USER node
EXPOSE 8080
CMD ["npm", "run", "start", "-w", "@roleplay/server"]
