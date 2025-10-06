# Quick Start Guide - citizenshiptracker.ca

## 🎯 What You Need to Do

### 1. Configure DNS (Do This First!)
In your GoDaddy account, set these DNS records for `citizenshiptracker.ca`:

```
Type: A, Name: @, Value: 5.161.237.59
Type: A, Name: www, Value: 5.161.237.59
```

**⏰ Wait for DNS propagation (1-48 hours)**

### 2. Run on Your Hetzner Server

SSH into your server and run these commands:

```bash
# Download and run the server setup script
curl -sSL https://raw.githubusercontent.com/jab-creator/canadian-citizen-progression/main/scripts/server-setup.sh | bash

# Log out and back in for Docker group changes
exit
# SSH back in

# Navigate to deployment directory
cd /opt/citizenship-tracker

# Edit the email in the SSL setup script
nano scripts/init-letsencrypt.sh
# Change: email="your-email@example.com"
# To your actual email address

# Initialize SSL certificates
./scripts/init-letsencrypt.sh

# Start the application
docker-compose -f docker-compose.prod.yml up -d

# Check everything is working
./scripts/health-check.sh
```

### 3. Verify It's Working

- Visit: https://citizenshiptracker.ca
- Check HTTP redirect: http://citizenshiptracker.ca (should redirect to HTTPS)
- Both should show your citizenship tracker app with a valid SSL certificate

## 🔄 Automatic Updates

Your site will automatically update when you push changes to the GitHub repository main branch.

## 📞 Need Help?

Check the full [DEPLOYMENT.md](DEPLOYMENT.md) guide for detailed instructions and troubleshooting.

## ✅ That's It!

Your site should now be live at https://citizenshiptracker.ca with automatic HTTPS and certificate renewal!