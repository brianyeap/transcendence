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
    if [ -f package-lock.json ]; then
        echo "Installing npm dependencies with npm ci..."

        if npm ci; then
            echo "Clean install successful."
        else
            echo "npm ci failed due to lockfile mismatch. Falling back to npm install..."
            npm install
        fi
    else
        echo "No lockfile found. Running npm install..."
        npm install
    fi
fi

exec "$@"