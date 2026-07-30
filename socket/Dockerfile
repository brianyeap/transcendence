FROM node:22-alpine

WORKDIR /app

# install socket io
COPY package.json ./
RUN npm install

# copy from host to container workdir, putting it after install so build is faster.
# COPY . picks up server.js AND its local modules (engine-math.js); node_modules
# is excluded via .dockerignore so the image uses the freshly installed deps.
COPY . ./

EXPOSE 4000

CMD ["node", "server.js"]
