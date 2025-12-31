# AWS Staging Deployment Guide - Core PTO

## Prerequisites

1. **AWS Account** with appropriate permissions
2. **AWS CLI** installed and configured
3. **Node.js 18+** installed
4. **Git** installed
5. **Domain name** (optional, for custom domain)

## Architecture Overview

- **Frontend**: AWS S3 + CloudFront (Static hosting)
- **Backend**: AWS EC2 or Elastic Beanstalk
- **Database**: Amazon RDS PostgreSQL (or keep Neon)
- **File Storage**: AWS S3 for sick note uploads
- **DNS**: Route 53 (optional)

---

## Option 1: Quick Deploy with EC2 (Recommended for Staging)

### Step 1: Launch EC2 Instance

```bash
# 1. Log into AWS Console
# 2. Go to EC2 Dashboard
# 3. Click "Launch Instance"

# Instance Configuration:
Name: core-pto-staging
AMI: Ubuntu Server 22.04 LTS
Instance Type: t3.medium (2 vCPU, 4GB RAM)
Key Pair: Create new or use existing
Security Group: Create new with these rules:
  - SSH (22): Your IP
  - HTTP (80): Anywhere (0.0.0.0/0)
  - HTTPS (443): Anywhere (0.0.0.0/0)
  - Custom TCP (4000): Your IP (for testing)
  - Custom TCP (8082): Anywhere (for frontend)
Storage: 30 GB gp3
```

### Step 2: Connect to EC2 Instance

```bash
# Download your .pem key file
chmod 400 your-key.pem

# Connect via SSH
ssh -i your-key.pem ubuntu@YOUR_EC2_PUBLIC_IP
```

### Step 3: Install Dependencies on EC2

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version
npm --version

# Install PM2 (Process Manager)
sudo npm install -g pm2

# Install Git
sudo apt install -y git

# Install Nginx (Reverse Proxy)
sudo apt install -y nginx
```

### Step 4: Clone and Setup Your Application

```bash
# Create app directory
sudo mkdir -p /var/www/core-pto
sudo chown -R ubuntu:ubuntu /var/www/core-pto
cd /var/www/core-pto

# Clone your repository
git clone <YOUR_GIT_REPO_URL> .
# OR upload files via SCP:
# scp -i your-key.pem -r C:\Users\leslie.chasinda\Downloads\automation-sync-efficiency/* ubuntu@YOUR_EC2_IP:/var/www/core-pto/

# Install backend dependencies
cd /var/www/core-pto/server
npm install --production

# Install frontend dependencies
cd /var/www/core-pto
npm install
```

### Step 5: Configure Environment Variables

```bash
# Create backend .env file
cd /var/www/core-pto/server
nano .env
```

Add this content:
```env
# Database (Neon or RDS)
DATABASE_URL=postgresql://user:password@host:5432/database?sslmode=require

# JWT Secret
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Google Sheets API
GOOGLE_CLIENT_ID=your-google-client-id-here
GOOGLE_CLIENT_SECRET=your-google-client-secret-here
ABSENTEEISM_SPREADSHEET_ID=your-spreadsheet-id-here

# Server Configuration
PORT=4000
NODE_ENV=production

# File Upload Path
UPLOAD_PATH=/var/www/core-pto/server/uploads
```

Save and exit (Ctrl+X, Y, Enter)

### Step 6: Build Frontend

```bash
cd /var/www/core-pto

# Create production .env file
nano .env
```

Add:
```env
VITE_API_URL=http://YOUR_EC2_PUBLIC_IP:4000
```

```bash
# Build frontend
npm run build

# This creates a 'dist' folder with static files
```

### Step 7: Start Backend with PM2

```bash
cd /var/www/core-pto/server

# Start backend with PM2
pm2 start index.js --name core-pto-backend

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Follow the command it outputs

# Check status
pm2 status
pm2 logs core-pto-backend
```

### Step 8: Configure Nginx

```bash
# Create Nginx configuration
sudo nano /etc/nginx/sites-available/core-pto
```

Add this content:
```nginx
server {
    listen 80;
    server_name YOUR_EC2_PUBLIC_IP;  # Or your domain name

    # Frontend - Serve static files from dist
    location / {
        root /var/www/core-pto/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API - Proxy to Node.js
    location /api {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Uploads - Serve uploaded files
    location /uploads {
        alias /var/www/core-pto/server/uploads;
    }
}
```

```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/core-pto /etc/nginx/sites-enabled/

# Remove default site
sudo rm /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

### Step 9: Setup File Upload Directory

```bash
# Create uploads directory with correct permissions
sudo mkdir -p /var/www/core-pto/server/uploads
sudo chown -R ubuntu:ubuntu /var/www/core-pto/server/uploads
sudo chmod 755 /var/www/core-pto/server/uploads
```

### Step 10: Test Deployment

```bash
# Check backend is running
curl http://localhost:4000/api/notifications

# Check PM2 status
pm2 status

# View logs
pm2 logs core-pto-backend --lines 50
```

**Access your application:**
- Frontend: `http://YOUR_EC2_PUBLIC_IP`
- Backend API: `http://YOUR_EC2_PUBLIC_IP/api`

---

## Option 2: Deploy with AWS Elastic Beanstalk (More Automated)

### Step 1: Install EB CLI

```bash
pip install awsebcli --upgrade --user
```

### Step 2: Initialize Elastic Beanstalk

```bash
cd C:\Users\leslie.chasinda\Downloads\automation-sync-efficiency

# Initialize EB
eb init

# Configuration:
Region: us-east-1 (or your preferred)
Application name: core-pto
Platform: Node.js
Platform version: Node.js 18
SSH: Yes, create new key pair
```

### Step 3: Create Environment

```bash
eb create core-pto-staging --single

# This will:
# - Create environment
# - Deploy your application
# - Setup load balancer
# - Create CloudWatch logs
```

### Step 4: Configure Environment Variables

```bash
eb setenv DATABASE_URL=<your-database-url> JWT_SECRET=<your-secret>
```

### Step 5: Deploy Updates

```bash
# After making changes
eb deploy

# View logs
eb logs

# SSH into instance
eb ssh
```

---

## Option 3: Serverless with AWS Lambda + S3 (Advanced)

### Frontend: S3 + CloudFront

```bash
# Build frontend
npm run build

# Create S3 bucket
aws s3 mb s3://core-pto-staging-frontend

# Upload build files
aws s3 sync dist/ s3://core-pto-staging-frontend --acl public-read

# Enable static website hosting
aws s3 website s3://core-pto-staging-frontend --index-document index.html

# Create CloudFront distribution (optional)
aws cloudfront create-distribution --origin-domain-name core-pto-staging-frontend.s3.amazonaws.com
```

### Backend: Lambda + API Gateway

This requires significant refactoring to make the Express app serverless-compatible.

---

## Database Options

### Option A: Keep Neon (Easiest)
- No changes needed
- Already configured in your `.env`

### Option B: Amazon RDS PostgreSQL

```bash
# 1. Create RDS instance in AWS Console
# 2. Choose PostgreSQL
# 3. Free tier or db.t3.micro
# 4. Update DATABASE_URL in .env
```

---

## Security Hardening for Production

### 1. Enable HTTPS with Let's Encrypt

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificate (replace with your domain)
sudo certbot --nginx -d staging.yourcompany.com

# Auto-renewal is configured automatically
```

### 2. Configure Firewall

```bash
# Enable UFW
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

### 3. Secure Environment Variables

```bash
# Never commit .env files
# Use AWS Secrets Manager for production:

# Install AWS SDK
npm install @aws-sdk/client-secrets-manager

# Store secrets
aws secretsmanager create-secret \
  --name core-pto/staging \
  --secret-string '{"DATABASE_URL":"...","JWT_SECRET":"..."}'
```

### 4. Setup Monitoring

```bash
# Install CloudWatch agent
wget https://s3.amazonaws.com/amazoncloudwatch-agent/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb
sudo dpkg -i amazon-cloudwatch-agent.deb

# Configure logging
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl -a fetch-config -m ec2 -s
```

---

## CI/CD Pipeline with GitHub Actions

Create `.github/workflows/deploy-staging.yml`:

```yaml
name: Deploy to AWS Staging

on:
  push:
    branches: [staging]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
    
    - name: Install dependencies
      run: |
        npm install
        cd server && npm install
    
    - name: Build frontend
      run: npm run build
    
    - name: Deploy to EC2
      uses: appleboy/ssh-action@master
      with:
        host: ${{ secrets.EC2_HOST }}
        username: ubuntu
        key: ${{ secrets.EC2_SSH_KEY }}
        script: |
          cd /var/www/core-pto
          git pull origin staging
          npm install
          npm run build
          cd server && npm install
          pm2 restart core-pto-backend
```

---

## Maintenance Commands

```bash
# View backend logs
pm2 logs core-pto-backend

# Restart backend
pm2 restart core-pto-backend

# Stop backend
pm2 stop core-pto-backend

# View system resources
htop

# Check disk space
df -h

# Check Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Update application
cd /var/www/core-pto
git pull
npm install
npm run build
cd server && npm install
pm2 restart core-pto-backend
```

---

## Troubleshooting

### Backend not starting
```bash
pm2 logs core-pto-backend --lines 100
# Check for port conflicts
sudo lsof -i :4000
```

### Database connection errors
```bash
# Test database connection
cd /var/www/core-pto/server
node -e "require('dotenv').config(); console.log(process.env.DATABASE_URL)"
```

### Frontend not loading
```bash
# Check Nginx configuration
sudo nginx -t
# View Nginx logs
sudo tail -f /var/log/nginx/error.log
```

### File upload errors
```bash
# Check permissions
ls -la /var/www/core-pto/server/uploads
# Fix permissions
sudo chown -R ubuntu:ubuntu /var/www/core-pto/server/uploads
```

---

## Cost Estimates (AWS Staging)

- **EC2 t3.medium**: ~$30/month
- **RDS db.t3.micro**: ~$15/month (or use Neon free tier)
- **S3 Storage**: ~$1/month
- **CloudFront**: ~$1/month (low traffic)
- **Data Transfer**: ~$5/month

**Total: ~$52/month** (or ~$37/month with Neon)

---

## Quick Start Checklist

- [ ] Launch EC2 instance
- [ ] Connect via SSH
- [ ] Install Node.js, PM2, Nginx
- [ ] Upload application files
- [ ] Configure `.env` files
- [ ] Build frontend (`npm run build`)
- [ ] Start backend with PM2
- [ ] Configure Nginx
- [ ] Test application
- [ ] Setup SSL certificate (optional)
- [ ] Configure firewall
- [ ] Setup monitoring

---

## Support

For issues or questions:
- Check PM2 logs: `pm2 logs`
- Check Nginx logs: `sudo tail -f /var/log/nginx/error.log`
- Review this guide's troubleshooting section
- Contact DevOps team

**Your Staging URL will be:** `http://YOUR_EC2_PUBLIC_IP`
