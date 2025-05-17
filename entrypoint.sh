#!/bin/sh

# Replace environment variable in config
envsubst < /app/config.template.json > /usr/share/nginx/html/config.json

# Start NGINX (to serve your static files)
exec nginx -g 'daemon off;'
