FROM node:20-alpine AS base
WORKDIR /app

# Install dependencies
COPY package*.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/server/package.json packages/server/
COPY packages/client/package.json packages/client/
RUN npm ci

# Copy source
COPY . .

# Build shared
RUN npm run build -w packages/shared 2>/dev/null || true

# Build client
FROM base AS client-build
RUN npm run build -w packages/client

# Server image
FROM node:20-alpine AS server
WORKDIR /app
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/packages/shared ./packages/shared
COPY --from=base /app/packages/server ./packages/server
COPY --from=base /app/package*.json ./
EXPOSE 3001
CMD ["npx", "tsx", "packages/server/src/index.ts"]

# Client image
FROM node:20-alpine AS client
WORKDIR /app
COPY --from=client-build /app/packages/client/.next ./packages/client/.next
COPY --from=client-build /app/packages/client/public ./packages/client/public
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/packages/client/package.json ./packages/client/
COPY --from=base /app/package*.json ./
EXPOSE 3000
CMD ["npx", "next", "start", "-p", "3000", "--dir", "packages/client"]
