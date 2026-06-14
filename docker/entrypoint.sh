#!/bin/sh
set -eu

cd /app

needs_install=0

if [ ! -d node_modules ]; then
  needs_install=1
elif [ ! -f node_modules/.package-lock.json ]; then
  needs_install=1
elif [ package-lock.json -nt node_modules/.package-lock.json ]; then
  needs_install=1
elif [ package.json -nt node_modules/.package-lock.json ]; then
  needs_install=1
fi

if [ "$needs_install" -eq 1 ]; then
  echo "Installing npm dependencies..."
  if [ -f package-lock.json ]; then
    npm ci
  else
    npm install
  fi
fi

exec "$@"
