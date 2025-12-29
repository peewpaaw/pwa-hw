FROM node:20-bookworm AS client-build
WORKDIR /app/client
COPY client/package.json client/package-lock.json ./
RUN npm ci
COPY client .
RUN npm run build

FROM node:20-bookworm AS server-build
WORKDIR /app/server
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev
COPY server .
COPY --from=client-build /app/client/dist ./public

FROM node:20-bookworm
WORKDIR /app/server
ENV NODE_ENV=production
ENV PORT=3000
ENV PUBLIC_DIR=/app/server/public
ENV DATA_DIR=/data
COPY --from=server-build /app/server ./
EXPOSE 3000
CMD ["node", "index.js"]

