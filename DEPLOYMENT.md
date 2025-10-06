# Deployment Guide for citizenshiptracker.ca

This guide covers the complete setup process for deploying the Canadian Citizenship Tracker with HTTPS support using your custom domain `citizenshiptracker.ca`.

## Prerequisites

- Hetzner server with Docker and Docker Compose installed
- Domain `citizenshiptracker.ca` purchased from GoDaddy
- SSH access to your server
- Email address for Let's Encrypt certificate registration

## 1. Domain Configuration

### Configure DNS Records in GoDaddy

1. Log into your GoDaddy account
2. Go to DNS Management for `citizenshiptracker.ca`
3. Add/update the following DNS records:

```
Type: A
Name: @
Value: 5.161.237.59
TTL: 1 Hour

Type: A  
Name: www
Value: 5.161.237.59
TTL: 1 Hour
```

**Note**: DNS propagation can take up to 48 hours, but usually completes within a few hours.

## 2. Server Setup

### Initial Server Preparation

1. SSH into your Hetzner server:
```bash
ssh your-username@5.161.237.59
```

2. Update the system:
```bash
sudo apt update && sudo apt upgrade -y
```

3. Install required packages:
```bash
sudo apt install -y docker.io docker-compose curl openssl
sudo systemctl enable docker
sudo systemctl start docker
sudo usermod -aG docker $USER
```

4. Log out and back in for Docker group changes to take effect.

### Create Deployment Directory

```bash
sudo mkdir -p /opt/citizenship-tracker
sudo chown $USER:$USER /opt/citizenship-tracker
cd /opt/citizenship-tracker
```

### Clone Repository Files

```bash
# Clone the repository or copy the necessary files
git clone https://github.com/jab-creator/canadian-citizen-progression.git .
# Or manually copy: docker-compose.prod.yml, nginx/, scripts/
```

## 3. SSL Certificate Setup

### Configure Email for Let's Encrypt

Edit the initialization script with your email:

```bash
nano scripts/init-letsencrypt.sh
```

Change this line:
```bash
email="your-email@example.com" # Replace with your email
```

To your actual email address:
```bash
email="your-actual-email@domain.com"
```

### Run SSL Initialization

```bash
# Make sure you're in /opt/citizenship-tracker
cd /opt/citizenship-tracker

# Run the Let's Encrypt initialization script
./scripts/init-letsencrypt.sh
```

This script will:
- Generate DH parameters for enhanced security
- Create temporary certificates
- Start Nginx
- Request real certificates from Let's Encrypt
- Reload Nginx with the new certificates

## 4. Firewall Configuration

Configure UFW to allow HTTP and HTTPS traffic:

```bash
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw --force enable
```

## 5. Start the Application

```bash
cd /opt/citizenship-tracker
docker-compose -f docker-compose.prod.yml up -d
```

Check that all services are running:
```bash
docker-compose -f docker-compose.prod.yml ps
```

## 6. Verify Deployment

### Test HTTP to HTTPS Redirect
```bash
curl -I http://citizenshiptracker.ca
# Should return 301 redirect to HTTPS
```

### Test HTTPS
```bash
curl -I https://citizenshiptracker.ca
# Should return 200 OK
```

### Check SSL Certificate
```bash
openssl s_client -connect citizenshiptracker.ca:443 -servername citizenshiptracker.ca
```

## 7. Set Up Automatic Certificate Renewal

Create a cron job for automatic certificate renewal:

```bash
crontab -e
```

Add this line to run renewal twice daily:
```bash
0 12,0 * * * cd /opt/citizenship-tracker && ./scripts/renew-certs.sh >> /var/log/letsencrypt-renewal.log 2>&1
```

## 8. GitHub Actions Configuration

The repository is already configured with GitHub Actions for automatic deployment. Ensure these secrets are set in your GitHub repository:

- `SSH_HOST`: 5.161.237.59
- `SSH_PORT`: 22 (or your custom SSH port)
- `SSH_USER`: your server username
- `SSH_KEY`: your private SSH key

## 9. Monitoring and Maintenance

### View Logs
```bash
# Application logs
docker-compose -f docker-compose.prod.yml logs citizenship-tracker

# Nginx logs
docker-compose -f docker-compose.prod.yml logs nginx

# Certificate renewal logs
tail -f /var/log/letsencrypt-renewal.log
```

### Update Application
The application updates automatically via GitHub Actions when you push to the main branch. You can also manually update:

```bash
cd /opt/citizenship-tracker
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d
```

### Backup SSL Certificates
```bash
sudo tar -czf letsencrypt-backup-$(date +%Y%m%d).tar.gz -C /opt/citizenship-tracker certbot/
```

## 10. Troubleshooting

### Common Issues

**DNS not resolving:**
- Check DNS propagation: `nslookup citizenshiptracker.ca`
- Wait for DNS propagation (up to 48 hours)

**SSL certificate issues:**
- Check certificate status: `docker-compose -f docker-compose.prod.yml run --rm certbot certificates`
- Renew manually: `docker-compose -f docker-compose.prod.yml run --rm certbot renew`

**Application not accessible:**
- Check container status: `docker-compose -f docker-compose.prod.yml ps`
- Check logs: `docker-compose -f docker-compose.prod.yml logs`
- Verify firewall: `sudo ufw status`

**502 Bad Gateway:**
- Usually indicates the application container is not running
- Check application health: `docker-compose -f docker-compose.prod.yml exec citizenship-tracker curl -f http://localhost:8000`

### Health Checks

```bash
# Check all services
docker-compose -f docker-compose.prod.yml ps

# Test application directly
curl http://localhost:8000

# Test through Nginx
curl -k https://localhost

# Check certificate expiry
openssl x509 -in certbot/conf/live/citizenshiptracker.ca/fullchain.pem -text -noout | grep "Not After"
```

## 11. Security Considerations

- SSL certificates are automatically renewed
- Nginx is configured with security headers
- Rate limiting is enabled
- DH parameters are generated for enhanced security
- Only necessary ports are exposed

## 12. Performance Optimization

The current setup includes:
- Gzip compression
- Static file caching
- HTTP/2 support
- Connection keep-alive
- Proper buffer settings

## Support

For issues with the deployment:
1. Check the troubleshooting section above
2. Review container logs
3. Verify DNS and firewall settings
4. Ensure all required files are present

Your site should now be accessible at:
- https://citizenshiptracker.ca
- https://www.citizenshiptracker.ca

Both HTTP requests will automatically redirect to HTTPS.