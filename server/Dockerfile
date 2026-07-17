FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

ENV CINEBOARD_API_PORT=3000
ENV CINEBOARD_DB_PATH=/data/cineboard.db

EXPOSE 3000

CMD ["npm", "run", "start"]
