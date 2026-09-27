FROM oven/bun:alpine

WORKDIR /home/pubsub-ws

COPY package.json ./
COPY bun.lock ./
COPY backend.js ./

RUN bun install

CMD ["bun", "start"]