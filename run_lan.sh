#!/usr/bin/env bash
# Share your local game with people on the same network (e.g. the 42 cluster).
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

# 0. Find this machine's IP on the local network.
#    Linux: ask which source address would be used to reach the internet.
#    macOS has no `ip` command, so find the network interface used for
#    the internet (e.g. en0) and ask for its address instead.
if command -v ip > /dev/null; then
  LAN_IP=$(ip -4 route get 1.1.1.1 | awk '{for(i=1;i<=NF;i++) if($i=="src") print $(i+1)}')
else
  IFACE=$(route -n get 1.1.1.1 | awk '/interface:/ {print $2}')
  LAN_IP=$(ipconfig getifaddr "$IFACE")
fi
if [ -z "$LAN_IP" ]; then
  echo "Couldn't find your local IP. Are you connected to a network?"
  exit 1
fi

# 1. Make sure Docker is running, then build and start the whole stack
#    in the background (-d). If it's already up, this just keeps it running.
if ! docker info > /dev/null 2>&1; then
  echo "Docker isn't running. Open Docker Desktop and try again."
  exit 1
fi
docker compose up -d --build || exit 1

# 2. When the script ends (Ctrl+C), switch back to localhost.
trap 'use_urls $LOCAL_SOCKET $LOCAL_ORIGINS' EXIT

# 3. Point the app at our LAN IP, so other machines' browsers
#    connect to the match engine on this machine, not their own.
use_urls "http://$LAN_IP:4000" "$LOCAL_ORIGINS,http://$LAN_IP:3000"

# 4. Wait until the web app answers, so the link works when you share it.
#    curl fails while the container is still starting, so keep retrying.
echo "Waiting for the web app to start..."
until curl -s -o /dev/null http://localhost:3000; do sleep 2; done

echo "Both players open: http://$LAN_IP:3000"
# keep running until Ctrl+C
while true; do sleep 1; done
