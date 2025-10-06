#!/bin/bash

# Server setup script for citizenshiptracker.ca
# Run this script on your Hetzner server to prepare for deployment

set -e

echo "🚀 Setting up server for citizenshiptracker.ca deployment..."

# Update system
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install required packages
echo "🔧 Installing required packages..."
sudo apt install -y docker.io docker-compose curl openssl git ufw

# Enable and start Docker
echo "🐳 Setting up Docker..."
sudo systemctl enable docker
sudo systemctl start docker
sudo usermod -aG docker $USER

# Configure firewall
echo "🔥 Configuring firewall..."
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw --force enable

# Create deployment directory
echo "📁 Creating deployment directory..."
sudo mkdir -p /opt/citizenship-tracker
sudo chown $USER:$USER /opt/citizenship-tracker

# Clone repository
echo "📥 Cloning repository..."
cd /opt/citizenship-tracker
git clone https://github.com/jab-creator/canadian-citizen-progression.git .

# Make scripts executable
chmod +x scripts/*.sh

echo "✅ Server setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit scripts/init-letsencrypt.sh and update the email address"
echo "2. Ensure your domain DNS is pointing to this server (5.161.237.59)"
echo "3. Run: ./scripts/init-letsencrypt.sh"
echo "4. Run: docker-compose -f docker-compose.prod.yml up -d"
echo ""
echo "⚠️  You may need to log out and back in for Docker group changes to take effect."