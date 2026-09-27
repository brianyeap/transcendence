#!/usr/bin/env bash
# Share your local game over the internet with ngrok.
# Starts the Docker stack for you, so you only need this one command.
# Press Ctrl+C to stop sharing and go back to localhost.
# The containers keep running afterwards; stop them with: docker compose down

cd "$(dirname "$0")" # run from the repo root

LOCAL_SOCKET=http://localhost:4000
LOCAL_ORIGINS=http://localhost:3000,http://localhost:3003,http://localhost:3300

# Write a socket URL and allowed origins into .env.local, then restart
# the containers so they read the new values.
# -i.bak creates a backup of the original file, which we delete after.
use_urls() {
  sed -i.bak \
    -e "s|^NEXT_PUBLIC_SOCKET_URL=.*|NEXT_PUBLIC_SOCKET_URL=$1|" \
    -e "s|^SOCKET_ALLOWED_ORIGINS=.*|SOCKET_ALLOWED_ORIGINS=$2|" \
    .env.local
  rm .env.local.bak
  docker compose up -d --force-recreate --no-deps socket web
}

# 0. Make sure Docker is running, then build and start the whole stack
#    in the background (-d). If it's already up, this just keeps it running.
if ! docker info > /dev/null 2>&1; then
  echo "Docker isn't running. Open Docker Desktop and try again."
  exit 1
fi
docker compose up -d --build || exit 1

# 1. Start the tunnels in the background.
#    First config = ngrok's own file (has your authtoken), second = our tunnels.
ngrok start --all --config "$(ngrok config check | sed 's/.* at //')" --config ngrok.yml --log=false &
NGROK_PID=$!

# 2. When the script ends (Ctrl+C), stop ngrok and switch back to localhost.
trap 'kill $NGROK_PID; use_urls $LOCAL_SOCKET $LOCAL_ORIGINS' EXIT

# 3. Give ngrok a moment, then ask it for the public URLs.
sleep 3
TUNNELS=$(curl -s http://localhost:4040/api/tunnels)
WEB_URL=$(echo "$TUNNELS" | jq -r '.tunnels[] | select(.name=="web") | .public_url')
SOCKET_URL=$(echo "$TUNNELS" | jq -r '.tunnels[] | select(.name=="socket") | .public_url')

# 4. Point the app at the tunnels.
use_urls "$SOCKET_URL" "$LOCAL_ORIGINS,$WEB_URL"

# 5. Wait until the web app answers, so the link works when you share it.
#    curl fails while the container is still starting, so keep retrying.
echo "Waiting for the web app to start..."
until curl -s -o /dev/null http://localhost:3000; do sleep 2; done

echo "Both players open: $WEB_URL"
wait # keep running until Ctrl+C
