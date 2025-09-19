# 🚀 LED BOM Generator - Deployment Guide

## Quick Deploy to Railway (Recommended)

### Step 1: Prepare Your Repository
1. Push your code to GitHub
2. Make sure all files are committed

### Step 2: Deploy to Railway
1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub
3. Click "New Project" → "Deploy from GitHub repo"
4. Select your LED BOM Generator repository
5. Railway will automatically detect it's a Python app

### Step 3: Configure Environment Variables
In Railway dashboard:
1. Go to your project → Variables tab
2. Add these environment variables:
   - `OPENAI_API_KEY` = your OpenAI API key
   - `FLASK_ENV` = production

### Step 4: Connect Custom Domain
1. In Railway dashboard → Settings → Domains
2. Add your GoDaddy domain
3. Railway will provide DNS records to add to GoDaddy

### Step 5: Update GoDaddy DNS
In your GoDaddy DNS management:
1. Add a CNAME record:
   - Name: `www` (or subdomain like `bom`)
   - Value: `your-app.railway.app`
2. Add an A record:
   - Name: `@` (root domain)
   - Value: Railway's IP (provided in dashboard)

## Alternative: Deploy to Render

### Step 1: Create Render Account
1. Go to [render.com](https://render.com)
2. Sign up with GitHub

### Step 2: Deploy Web Service
1. Click "New" → "Web Service"
2. Connect your GitHub repository
3. Configure:
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `python app.py`
   - **Environment:** Python 3

### Step 3: Set Environment Variables
In Render dashboard:
- `OPENAI_API_KEY` = your OpenAI API key
- `FLASK_ENV` = production

### Step 4: Custom Domain
1. Go to Settings → Custom Domains
2. Add your domain
3. Update GoDaddy DNS with provided records

## Alternative: DigitalOcean App Platform

### Step 1: Create App
1. Go to [DigitalOcean App Platform](https://cloud.digitalocean.com/apps)
2. Create new app from GitHub

### Step 2: Configure
- **Source:** Your GitHub repo
- **Type:** Web Service
- **Build Command:** `pip install -r requirements.txt`
- **Run Command:** `python app.py`

### Step 3: Environment Variables
Add in App Platform:
- `OPENAI_API_KEY`
- `FLASK_ENV` = production

## Cost Comparison

| Platform | Free Tier | Paid Tier | Ease |
|----------|-----------|-----------|------|
| Railway | $5 credit | $5/month | ⭐⭐⭐⭐⭐ |
| Render | 750 hrs/month | $7/month | ⭐⭐⭐⭐ |
| DigitalOcean | None | $5-12/month | ⭐⭐⭐ |
| VPS | None | $4-6/month | ⭐⭐ |

## Post-Deployment Checklist

- [ ] Test login with admin/LotusAdmin
- [ ] Test model search functionality
- [ ] Test P.O. number input
- [ ] Test PDF export
- [ ] Verify HTTPS is working
- [ ] Test on mobile devices
- [ ] Set up monitoring (optional)

## Troubleshooting

### Common Issues:
1. **App won't start:** Check environment variables
2. **Database errors:** Ensure Excel file is in project root
3. **PDF export fails:** Check ReportLab installation
4. **Domain not working:** Verify DNS records in GoDaddy

### Support:
- Railway: [docs.railway.app](https://docs.railway.app)
- Render: [render.com/docs](https://render.com/docs)
- DigitalOcean: [docs.digitalocean.com](https://docs.digitalocean.com)
