# Environment Variables Configuration

## Backend Environment Variables (server/.env)

```bash
# Database Configuration
MONGODB_URI=mongodb://localhost:27017/smart-sos
# For MongoDB Atlas: mongodb+srv://username:password@cluster.mongodb.net/smart-sos

# Authentication
JWT_SECRET=your-super-secret-key-change-this-in-production
# Use: openssl rand -base64 32

# Server Configuration
PORT=5000
NODE_ENV=development
# NODE_ENV can be: development, production

# Email Configuration (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Twilio SMS Configuration (Optional - for production)
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_NUMBER=+1234567890

# Error Tracking (Optional)
SENTRY_DSN=https://your-sentry-url

# CORS Configuration
CORS_ORIGIN=http://localhost:19006
# For production: https://your-app-domain.com
```

### Backend Variable Descriptions

| Variable | Required | Type | Description | Example |
|----------|----------|------|-------------|---------|
| `MONGODB_URI` | Yes | String | MongoDB connection string | mongodb://localhost:27017/smart-sos |
| `JWT_SECRET` | Yes | String | Secret key for JWT signing | `openssl rand -base64 32` |
| `PORT` | No | Number | Server port (default: 5000) | 5000 |
| `NODE_ENV` | No | String | Environment type | development, production |
| `SMTP_HOST` | No | String | Email SMTP host | smtp.gmail.com |
| `SMTP_PORT` | No | Number | Email SMTP port | 587 |
| `SMTP_USER` | No | String | Email username | your@email.com |
| `SMTP_PASS` | No | String | Email password/app token | xxxxx |
| `TWILIO_ACCOUNT_SID` | No | String | Twilio account ID | AC... |
| `TWILIO_AUTH_TOKEN` | No | String | Twilio auth token | your-token |
| `TWILIO_PHONE_NUMBER` | No | String | Twilio phone number | +1234567890 |
| `SENTRY_DSN` | No | String | Sentry error tracking URL | https://... |
| `CORS_ORIGIN` | No | String | Allowed origin for CORS | http://localhost:19006 |

---

## Frontend Environment Variables (client/.env)

```bash
# API Configuration
EXPO_PUBLIC_API_URL=http://localhost:5000/api
# For physical device: http://YOUR_MACHINE_IP:5000/api
# For production: https://api.your-app.com

# Analytics (Optional)
EXPO_PUBLIC_FIREBASE_API_KEY=your-firebase-key
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project-id

# Error Tracking (Optional)
EXPO_PUBLIC_SENTRY_DSN=https://your-sentry-url

# App Configuration (Optional)
EXPO_PUBLIC_APP_ENV=development
# development, staging, production

# Feature Flags (Optional)
EXPO_PUBLIC_ENABLE_ANALYTICS=true
EXPO_PUBLIC_ENABLE_CRASH_REPORTING=true
```

### Frontend Variable Descriptions

| Variable | Required | Type | Description | Example |
|----------|----------|------|-------------|---------|
| `EXPO_PUBLIC_API_URL` | Yes | String | Backend API URL | http://localhost:5000/api |
| `EXPO_PUBLIC_FIREBASE_API_KEY` | No | String | Firebase API key | AIzaS... |
| `EXPO_PUBLIC_FIREBASE_PROJECT_ID` | No | String | Firebase project ID | my-project |
| `EXPO_PUBLIC_SENTRY_DSN` | No | String | Sentry error tracking | https://... |
| `EXPO_PUBLIC_APP_ENV` | No | String | Environment type | development |
| `EXPO_PUBLIC_ENABLE_ANALYTICS` | No | Boolean | Enable analytics | true/false |
| `EXPO_PUBLIC_ENABLE_CRASH_REPORTING` | No | Boolean | Enable crash reporting | true/false |

---

## Setup Instructions

### Backend Setup

1. **Copy template file**
   ```bash
   cd server
   cp .env.example .env
   ```

2. **Edit .env with your values**
   ```bash
   nano .env  # or use your preferred editor
   ```

3. **Generate JWT_SECRET**
   ```bash
   # On macOS/Linux
   openssl rand -base64 32
   
   # On Windows (PowerShell)
   [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes((New-Guid).Guid + (New-Guid).Guid))
   ```

4. **Configure MongoDB**
   - Local: Use default `mongodb://localhost:27017/smart-sos`
   - Atlas: Get connection string from MongoDB Atlas

5. **Verify connection**
   ```bash
   npm run dev
   # Should see: "MongoDB connected successfully"
   ```

---

### Frontend Setup

1. **Copy template file**
   ```bash
   cd client
   cp .env.example .env
   ```

2. **Update API URL based on setup**
   - **Local development**: `http://localhost:5000/api`
   - **Physical device**: `http://YOUR_MACHINE_IP:5000/api`
   - **Production**: `https://your-domain.com/api`
   
   Find your IP:
   ```bash
   # macOS/Linux
   ifconfig | grep "inet "
   
   # Windows
   ipconfig | findstr "IPv4"
   ```

3. **Verify connection**
   ```bash
   npm start
   # Should connect to backend successfully
   ```

---

## Production Deployment

### Backend Production Variables

```bash
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/smart-sos
JWT_SECRET=<strong-random-string-from-openssl>
PORT=5000
NODE_ENV=production
CORS_ORIGIN=https://your-app-domain.com
TWILIO_ACCOUNT_SID=<production-account-id>
TWILIO_AUTH_TOKEN=<production-auth-token>
TWILIO_PHONE_NUMBER=<verified-phone>
SENTRY_DSN=<your-sentry-url>
```

**Where to set:**
- **Heroku**: `heroku config:set VARIABLE=value`
- **Railway**: Dashboard environment variables
- **AWS**: Systems Manager Parameter Store or Secrets Manager
- **Docker**: Docker compose .env file

### Frontend Production Variables

```bash
EXPO_PUBLIC_API_URL=https://api.your-app.com
EXPO_PUBLIC_FIREBASE_API_KEY=<production-key>
EXPO_PUBLIC_FIREBASE_PROJECT_ID=<production-project>
EXPO_PUBLIC_SENTRY_DSN=<your-sentry-url>
EXPO_PUBLIC_APP_ENV=production
EXPO_PUBLIC_ENABLE_ANALYTICS=true
EXPO_PUBLIC_ENABLE_CRASH_REPORTING=true
```

---

## Security Best Practices

### JWT_SECRET
✅ DO:
- Use strong random string (32+ characters)
- Store securely (never commit to git)
- Change in production
- Rotate periodically

❌ DON'T:
- Use simple/predictable strings
- Commit to repository
- Share with others
- Hardcode in code

### API_URL
✅ DO:
- Use environment variables
- Update per environment
- Use HTTPS in production
- Verify domain ownership

❌ DON'T:
- Hardcode URLs
- Mix development/production URLs
- Share URLs with sensitive data
- Use HTTP in production

### Sensitive Credentials
✅ DO:
- Use .env files (git ignored)
- Use secrets management tools
- Rotate credentials periodically
- Log with care (don't log URLs)

❌ DON'T:
- Commit .env to git
- Log sensitive data
- Share credentials
- Use weak passwords

---

## GitHub Actions / CI/CD

### Example: Deploy With Environment Variables

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v2
      
      - name: Deploy to Heroku
        env:
          HEROKU_API_KEY: ${{ secrets.HEROKU_API_KEY }}
          HEROKU_APP_NAME: smart-sos-api
        run: |
          npm run build
          git push https://git.heroku.com/$HEROKU_APP_NAME.git main
```

---

## Troubleshooting

### "Invalid MONGODB_URI"
- Check syntax: `mongodb://user:pass@host:port/database`
- Verify credentials are correct
- Ensure network access is allowed (MongoDB Atlas)
- Check IP whitelist

### "Invalid JWT_SECRET"
- Ensure variable is set
- Check for null/undefined
- Verify no spaces or special characters causing issues
- Regenerate with openssl

### "Cannot reach API server"
- Verify `EXPO_PUBLIC_API_URL` is correct
- Check backend is running
- Verify network connectivity
- Check firewall rules
- For physical device: use correct IP address

### "API returns 403 Forbidden"
- Check CORS_ORIGIN is set correctly
- Verify request origin matches
- Check API domain in browser console

---

## Reference Variables

### Development Environment
```bash
# Backend
MONGODB_URI=mongodb://localhost:27017/smart-sos
JWT_SECRET=dev-key-12345
PORT=5000
NODE_ENV=development
CORS_ORIGIN=http://localhost:19006

# Frontend
EXPO_PUBLIC_API_URL=http://localhost:5000/api
```

### Staging Environment
```bash
# Backend
MONGODB_URI=mongodb+srv://user:**@staging-cluster.mongodb.net/smart-sos
JWT_SECRET=<secure-staging-secret>
PORT=5000
NODE_ENV=production
CORS_ORIGIN=https://staging.your-app.com

# Frontend
EXPO_PUBLIC_API_URL=https://api-staging.your-app.com
```

### Production Environment
```bash
# Backend
MONGODB_URI=mongodb+srv://user:**@prod-cluster.mongodb.net/smart-sos
JWT_SECRET=<secure-production-secret>
PORT=5000
NODE_ENV=production
CORS_ORIGIN=https://your-app.com

# Frontend
EXPO_PUBLIC_API_URL=https://api.your-app.com
```

---

## Tools for Generating Secrets

### Generate JWT_SECRET
```bash
# One-liner
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Or use openssl
openssl rand -hex 32
openssl rand -base64 32
```

### Generate App Secret
```bash
# Using Node
node -e "console.log(require('crypto').randomBytes(24).toString('base64'))"
```

---

## Checklist Before Production

- [ ] JWT_SECRET is strong and unique
- [ ] MONGODB_URI points to production database
- [ ] NODE_ENV=production is set
- [ ] CORS_ORIGIN matches your domain
- [ ] EXPO_PUBLIC_API_URL is production URL
- [ ] All .env files are in .gitignore
- [ ] Sensitive data is never logged
- [ ] Error messages don't expose sensitive info
- [ ] HTTPS is enabled on backend
- [ ] Database backups are configured

---

**Version**: 1.0.0  
**Last Updated**: March 2, 2024
