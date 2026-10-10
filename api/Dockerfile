FROM node:20-alpine

RUN apk add --no-cache openssl

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma
RUN npm ci --legacy-peer-deps

COPY tsconfig.json ./
COPY src ./src
RUN npx tsc

EXPOSE 3000
CMD ["node", "dist/index.js"]
