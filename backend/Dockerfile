FROM node:20-alpine

WORKDIR /app
COPY package*.json ./

ENV NODE_ENV=production

RUN npm install --production

COPY . .

RUN mkdir -p data && chmod 777 data

EXPOSE 5000
CMD ["node", "server.js"]
