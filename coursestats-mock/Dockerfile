FROM node:24-alpine

WORKDIR /usr/src/app

COPY package*.json .npmrc ./

RUN npm ci --omit=dev

COPY . .

EXPOSE 8000

USER node

CMD ["node", "src/index.js"]
