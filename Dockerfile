FROM node:20-bullseye

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY . .

RUN mkdir -p /app/data /app/server/uploads/avatars

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000
ENV DB_PATH=/app/data/balacubaco.db

CMD ["node", "server/index.js"]
