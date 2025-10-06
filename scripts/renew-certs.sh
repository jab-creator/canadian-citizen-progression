#!/bin/bash

# Renew Let's Encrypt certificates and reload nginx
# This script should be run via cron job twice daily

set -e

echo "### Renewing Let's Encrypt certificates ..."
docker compose -f docker-compose.prod.yml run --rm certbot renew

echo "### Reloading nginx ..."
docker compose -f docker-compose.prod.yml exec nginx nginx -s reload

echo "### Certificate renewal complete!"