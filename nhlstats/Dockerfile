FROM node:24-alpine

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm ci --omit=dev

COPY . .

EXPOSE 3001

USER node

CMD ["npm", "start"]
