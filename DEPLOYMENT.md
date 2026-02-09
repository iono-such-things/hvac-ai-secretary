# Production Deployment Guide

Complete guide to deploy HVAC AI Secretary to your server.

## Server Requirements

- Ubuntu 20.04+ or similar Linux
- Root or sudo access
- At least 1GB RAM
- Node.js 18+
- PostgreSQL 14+
- Nginx

## Step-by-Step Deployment

### 1. Initial Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Install Nginx
sudo apt install -y nginx

# Install PM2 (process manager)
sudo npm install -g pm2
```

### 2. Setup PostgreSQL Database

```bash
# Switch to postgres user
sudo -u postgres psql

# In PostgreSQL shell:
CREATE DATABASE hvac_crm;
CREATE USER hvacuser WITH ENCRYPTED PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE hvac_crm TO hvacuser;
\q

# Import schema
sudo -u postgres psql -d hvac_crm -f /path/to/hvac-crm-schema.sql
```

### 3. Clone and Setup Application

```bash
# Create app directory
sudo mkdir -p /var/www/hvac-ai
cd /var/www/hvac-ai

# Clone repository (or upload files)
git clone https://github.com/dutchiono/hvac-ai-secretary.git .

# Install dependencies
npm install --production

# Create .env file
cp env.example .env
nano .env  # Edit with your credentials
```

### 4. Configure Environment (.env)

```env
NODE_ENV=production
PORT=3001

DB_HOST=localhost
DB_PORT=5432
DB_NAME=hvac_crm
DB_USER=hvacuser
DB_PASSWORD=your_secure_password

TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_PHONE_NUMBER=+1234567890

BUSINESS_NAME=Your HVAC Company
BUSINESS_PHONE=+1234567890
BUSINESS_EMAIL=contact@yourhvac.com

FRONTEND_URL=https://yourdomain.com
```

### 5. Start Application with PM2

```bash
# Start the app
pm2 start server.js --name hvac-ai

# Enable startup on boot
pm2 startup systemd
pm2 save

# Check status
pm2 status
pm2 logs hvac-ai
```

### 6. Configure Nginx Reverse Proxy

```bash
# Create Nginx configuration
sudo nano /etc/nginx/sites-available/hvac-ai
```

Add this configuration:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # API Backend
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Frontend (Chat Widget)
    location / {
        root /var/www/hvac-ai;
        try_files $uri $uri/ /chat-widget.html;
    }
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/hvac-ai /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 7. Setup SSL with Let's Encrypt

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal is configured automatically
```

### 8. Configure Firewall

```bash
sudo ufw allow 'Nginx Full'
sudo ufw allow OpenSSH
sudo ufw enable
```

### 9. Test Deployment

```bash
# Check if API is running
curl http://localhost:3001/health

# Check if Nginx is serving
curl https://yourdomain.com

# Check PM2 status
pm2 status

# View logs
pm2 logs hvac-ai
```

## Monitoring

### View Application Logs

```bash
# Real-time logs
pm2 logs hvac-ai

# Last 100 lines
pm2 logs hvac-ai --lines 100

# Error logs only
pm2 logs hvac-ai --err
```

### PM2 Monitoring

```bash
# Process info
pm2 info hvac-ai

# Resource usage
pm2 monit

# Web dashboard (optional)
pm2 plus
```

## Maintenance

### Restart Application

```bash
pm2 restart hvac-ai
```

### Update Code

```bash
cd /var/www/hvac-ai
git pull origin main
npm install --production
pm2 restart hvac-ai
```

### Database Backup

```bash
# Create backup
pg_dump -U hvacuser hvac_crm > backup_$(date +%Y%m%d).sql

# Restore backup
psql -U hvacuser hvac_crm < backup_20240209.sql
```

## Troubleshooting

### Application won't start

```bash
# Check logs
pm2 logs hvac-ai --err

# Check database connection
psql -U hvacuser -d hvac_crm -c "SELECT 1"

# Verify .env file
cat /var/www/hvac-ai/.env
```

### Database connection errors

```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Check PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-*.log

# Test connection
psql -U hvacuser -d hvac_crm
```

### Nginx errors

```bash
# Check Nginx status
sudo systemctl status nginx

# Test configuration
sudo nginx -t

# View error logs
sudo tail -f /var/log/nginx/error.log
```

## Security Checklist

- [ ] Change default PostgreSQL password
- [ ] Use strong SESSION_SECRET in .env
- [ ] Enable firewall (ufw)
- [ ] Setup SSL certificate
- [ ] Disable root SSH login
- [ ] Setup automated backups
- [ ] Enable fail2ban (optional)
- [ ] Keep system updated

## Performance Optimization

### Enable PostgreSQL Query Optimization

```bash
sudo nano /etc/postgresql/14/main/postgresql.conf

# Adjust these values based on your server RAM:
shared_buffers = 256MB
effective_cache_size = 1GB
work_mem = 10MB
maintenance_work_mem = 128MB
```

### PM2 Cluster Mode (for high traffic)

```bash
pm2 start server.js --name hvac-ai -i max
```

## Quick Commands Reference

```bash
# Restart app
pm2 restart hvac-ai

# View logs
pm2 logs hvac-ai

# Reload Nginx
sudo systemctl reload nginx

# Backup database
pg_dump -U hvacuser hvac_crm > backup.sql

# Check disk space
df -h

# Check memory
free -h

# Check CPU
htop
```

## Support

If you encounter issues during deployment, check:
1. PM2 logs: `pm2 logs hvac-ai`
2. Nginx logs: `/var/log/nginx/error.log`
3. PostgreSQL logs: `/var/log/postgresql/`

For help: dutchiono@gmail.com
