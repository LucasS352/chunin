FROM node:22-alpine
WORKDIR /app

RUN apk add --no-cache openssl

COPY package*.json ./
RUN npm ci --omit=dev

COPY prisma ./prisma
RUN npx prisma generate

COPY src ./src
COPY public ./public

EXPOSE 3000

USER node

CMD ["sh", "-c", "npx prisma migrate deploy && node src/server.js"]
