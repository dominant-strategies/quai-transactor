FROM node:19.8.1-alpine AS build

RUN mkdir -p /app
WORKDIR /app

COPY . /app
RUN rm -rf /app/node_modules

RUN npm ci

CMD ["node", "index.js"]
