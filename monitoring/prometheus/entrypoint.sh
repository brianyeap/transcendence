#!/bin/sh

# if envsubst fails, exit the script immediately
set -e
envsubst < /etc/prometheus/prometheus.template.yml > /etc/prometheus/prometheus.yml
exec /bin/prometheus "$@"