FROM node:22-alpine

WORKDIR /app

# install socket io
COPY package.json ./
RUN npm install

# copy from host to container workdir, putting it after install so build is faster.
COPY server.js ./

EXPOSE 4000

CMD ["node", "server.js"]
