#!/bin/sh
set -e

if [ ! -f /certs/grafana.crt ] || [ ! -f /certs/grafana.key ]; then
  echo "Generating self-signed certificate for Grafana..."
  apk add --no-cache openssl
  openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /certs/grafana.key \
    -out /certs/grafana.crt \
    -subj "/CN=localhost"
else
  echo "Certificate already exists — skipping generation."
fi

chmod 644 /certs/grafana.key /certs/grafana.crt