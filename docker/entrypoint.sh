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

if [ -f package-lock.json ]; then
	echo "Attempting clean install (npm ci)..."
	if npm ci; then
		echo "Clean install successful."
	else
		echo " Error :npm ci failed due to lockfile mismatch! Falling back to standard npm install..."
		npm install
	fi
	else
		echo "No lockfile found. Running npm install..."
		npm install
	fi


exec "$@"
