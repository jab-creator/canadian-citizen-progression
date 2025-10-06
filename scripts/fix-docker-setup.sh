#!/bin/bash

# Fix Docker installation conflicts and complete server setup
# Run this script to resolve the containerd.io conflict

set -e

echo "🔧 Fixing Docker installation conflicts..."

# Check if Docker is already working
if docker --version >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
    echo "✅ Docker and Docker Compose are already installed and working!"
else
    echo "🐳 Fixing Docker installation..."
    
    # Remove conflicting packages
    sudo apt remove -y containerd containerd.io docker.io docker-doc docker-compose podman-docker containerd runc || true
    
    # Clean up any remaining Docker files
    sudo apt autoremove -y
    sudo apt autoclean
    
    # Install Docker using the official Docker repository (which is already configured)
    sudo apt update
    sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
fi

# Ensure Docker service is running
sudo systemctl enable docker
sudo systemctl start docker

# Add user to docker group
sudo usermod -aG docker $USER

# Install other required packages
echo "📦 Installing additional required packages..."
sudo apt install -y curl openssl git ufw

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
if [ -d ".git" ]; then
    echo "Repository already exists, pulling latest changes..."
    git pull origin main
else
    git clone https://github.com/jab-creator/canadian-citizen-progression.git .
fi

# Make scripts executable
chmod +x scripts/*.sh

echo "✅ Setup complete!"
echo ""
echo "⚠️  IMPORTANT: You need to log out and back in for Docker group changes to take effect."
echo ""
echo "Next steps:"
echo "1. Log out and SSH back in"
echo "2. Edit scripts/init-letsencrypt.sh and update the email address"
echo "3. Run: cd /opt/citizenship-tracker && ./scripts/init-letsencrypt.sh"
echo "4. Run: docker compose -f docker-compose.prod.yml up -d"