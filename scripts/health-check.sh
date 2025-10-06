#!/bin/bash

# Health check script for citizenshiptracker.ca
# Checks the status of all services and SSL certificate

set -e

echo "🏥 Health Check for citizenshiptracker.ca"
echo "=========================================="

# Check if we're in the right directory
if [ ! -f "docker-compose.prod.yml" ]; then
    echo "❌ Error: docker-compose.prod.yml not found. Please run from /opt/citizenship-tracker"
    exit 1
fi

# Check Docker services
echo "🐳 Checking Docker services..."
docker compose -f docker-compose.prod.yml ps

# Check application health
echo ""
echo "🔍 Checking application health..."
if docker compose -f docker-compose.prod.yml exec -T citizenship-tracker curl -f http://localhost:8000 >/dev/null 2>&1; then
    echo "✅ Application is healthy"
else
    echo "❌ Application health check failed"
fi

# Check Nginx configuration
echo ""
echo "🌐 Checking Nginx configuration..."
if docker compose -f docker-compose.prod.yml exec nginx nginx -t >/dev/null 2>&1; then
    echo "✅ Nginx configuration is valid"
else
    echo "❌ Nginx configuration has errors"
fi

# Check HTTP to HTTPS redirect
echo ""
echo "🔄 Checking HTTP to HTTPS redirect..."
if curl -s -I http://citizenshiptracker.ca | grep -q "301\|302"; then
    echo "✅ HTTP to HTTPS redirect is working"
else
    echo "❌ HTTP to HTTPS redirect is not working"
fi

# Check HTTPS accessibility
echo ""
echo "🔒 Checking HTTPS accessibility..."
if curl -s -I https://citizenshiptracker.ca | grep -q "200 OK"; then
    echo "✅ HTTPS site is accessible"
else
    echo "❌ HTTPS site is not accessible"
fi

# Check SSL certificate
echo ""
echo "📜 Checking SSL certificate..."
if [ -f "certbot/conf/live/citizenshiptracker.ca/fullchain.pem" ]; then
    expiry=$(openssl x509 -in certbot/conf/live/citizenshiptracker.ca/fullchain.pem -text -noout | grep "Not After" | cut -d: -f2-)
    echo "✅ SSL certificate found"
    echo "   Expires: $expiry"
    
    # Check if certificate expires in less than 30 days
    if openssl x509 -in certbot/conf/live/citizenshiptracker.ca/fullchain.pem -checkend 2592000 >/dev/null 2>&1; then
        echo "✅ Certificate is valid for more than 30 days"
    else
        echo "⚠️  Certificate expires within 30 days - renewal needed"
    fi
else
    echo "❌ SSL certificate not found"
fi

# Check disk usage
echo ""
echo "💾 Checking disk usage..."
df -h / | tail -1 | awk '{print "   Root partition: " $5 " used (" $3 "/" $2 ")"}'

# Check memory usage
echo ""
echo "🧠 Checking memory usage..."
free -h | grep "Mem:" | awk '{print "   Memory: " $3 "/" $2 " used (" int($3/$2*100) "%)"}'

echo ""
echo "🎉 Health check complete!"