# The web app, built for production.
# The image compiles the app once (`next build`); the container then only
# serves it (`next start`). No hot reload, so for day-to-day coding run
# `npm run dev` outside Docker instead.
FROM node:22-alpine

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1

# 1. Install dependencies first. This layer is cached, so it only re-runs
#    when package.json or package-lock.json change.
COPY package.json package-lock.json ./
RUN npm ci

# 2. Copy the source code (.dockerignore keeps out node_modules, .next and
#    every .env file).
COPY . .

# 3. Build. `next build` reads .env.local to fill in the NEXT_PUBLIC_* values.
#    The file is mounted only for this one command (a build "secret", set up
#    in docker-compose.yml), so it never ends up inside the image.
RUN --mount=type=secret,id=env_local,target=/app/.env.local npm run build

# 4. Serve the finished build on all interfaces (the proxy reaches it as web:3000).
ENV NODE_ENV=production
EXPOSE 3000
CMD ["npm", "start", "--", "--hostname", "0.0.0.0"]
