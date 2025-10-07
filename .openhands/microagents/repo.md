# Canadian Citizenship Tracker Repository

## Purpose

This repository contains a web application that helps Canadian permanent residents track their progress towards citizenship eligibility. The app calculates the required 1,095 days of physical presence in Canada over a 5-year period, manages travel history, and provides real-time countdown to eligibility dates.

**Live Site**: https://citizenshiptracker.ca

## General Setup

### Technology Stack
- **Frontend**: Pure HTML5, CSS3, and vanilla JavaScript (no frameworks)
- **Backend**: Python HTTP server (for static file serving)
- **Deployment**: Docker containers with Nginx reverse proxy
- **SSL**: Let's Encrypt certificates with automatic renewal
- **CI/CD**: GitHub Actions for automated deployment

### Architecture
- **Client-side application**: All data processing happens in the browser
- **Local storage**: User data persists in browser localStorage (no server database)
- **Static hosting**: Simple Python HTTP server serves static files
- **Reverse proxy**: Nginx handles SSL termination and routing
- **Containerized**: Docker Compose orchestrates multiple services

## Repository Structure

```
/
├── index.html              # Main application HTML
├── script.js              # Core application logic and calculations
├── styles.css             # Responsive CSS styling
├── Dockerfile             # Container definition for the app
├── docker-compose.yml     # Development environment setup
├── docker-compose.prod.yml # Production deployment configuration
├── README.md              # User documentation and features
├── DEPLOYMENT.md          # Complete server setup guide
├── QUICK_START.md         # Simplified deployment instructions
├── .github/workflows/
│   └── deploy.yml         # CI/CD pipeline for automated deployment
├── nginx/
│   └── nginx.conf         # Reverse proxy configuration with SSL
└── scripts/
    ├── init-letsencrypt.sh    # SSL certificate initialization
    ├── renew-certs.sh         # Certificate renewal automation
    ├── health-check.sh        # Service monitoring script
    ├── server-setup.sh        # Complete server preparation
    └── fix-docker-setup.sh    # Docker conflict resolution
```

### Key Files
- **`index.html`**: Single-page application with dashboard, trip management, and settings
- **`script.js`**: CitizenshipTracker class with calculation logic, data management, and UI interactions
- **`styles.css`**: Modern responsive design with gradient cards and animations
- **`nginx.conf`**: Production-ready reverse proxy with security headers and SSL configuration

## CI/CD Pipeline

### GitHub Actions Workflow (`.github/workflows/deploy.yml`)

**Trigger**: Push to `main` branch or manual dispatch

**Pipeline Steps**:
1. **Build & Push**: 
   - Builds Docker image from Dockerfile
   - Tags with commit SHA and `latest`
   - Pushes to GitHub Container Registry (ghcr.io)

2. **Deploy**:
   - SSH into production server (Hetzner)
   - Pulls latest Docker image
   - Zero-downtime deployment using Docker Compose
   - Health check via HTTP request through Nginx
   - Nginx reload to pick up changes
   - Cleanup of old Docker images

**Required Secrets**:
- `SSH_HOST`: Server IP address
- `SSH_PORT`: SSH port (typically 22)
- `SSH_USER`: Server username
- `SSH_KEY`: Private SSH key for authentication
- `GITHUB_TOKEN`: Automatically provided for container registry access

### Deployment Features
- **Zero-downtime**: Uses Docker Compose to replace containers without service interruption
- **Health checks**: Verifies application is responding before completing deployment
- **Automatic SSL**: Let's Encrypt certificates with auto-renewal
- **Security**: Nginx security headers, rate limiting, and HTTPS enforcement
- **Monitoring**: Health check scripts and service status verification

### Production Environment
- **Domain**: citizenshiptracker.ca (with www subdomain support)
- **SSL**: Multi-domain Let's Encrypt certificate
- **Server**: Hetzner VPS with Docker and Docker Compose
- **Reverse Proxy**: Nginx with security hardening
- **Certificate Renewal**: Automated via cron jobs

## Development Workflow

1. **Local Development**: Open `index.html` directly or use `python -m http.server`
2. **Testing**: Use Docker Compose for local testing with `docker-compose up`
3. **Deployment**: Push to `main` branch triggers automatic deployment
4. **Monitoring**: Use provided health check scripts to verify service status