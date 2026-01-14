# Luna Deployment Guide

Complete guide for deploying Luna PWA to production.

---

## Prerequisites

1. Firebase project configured with:
   - Authentication (Email + Google)
   - Firestore Database
   - Storage
2. Environment variables set in `.env.local`
3. Build passes: `npm run build`

---

## Option 1: Deploy to Vercel (Recommended)

### Step 1: Push to GitHub

```bash
cd "G:\documents vault\luna"
git add .
git commit -m "Luna PWA - ready for deployment"
git remote add origin https://github.com/YOUR_USERNAME/luna.git
git push -u origin main
```

### Step 2: Connect to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Click **"Add New Project"**
3. Import your GitHub repository
4. Add environment variables:
   - `NEXT_PUBLIC_FIREBASE_API_KEY`
   - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
   - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
   - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
   - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
   - `NEXT_PUBLIC_FIREBASE_APP_ID`
5. Click **Deploy**

### Step 3: Configure Firebase

Add your Vercel domain to Firebase:
1. Go to Firebase Console → Authentication → Settings
2. Add `your-app.vercel.app` to Authorized Domains

---

## Option 2: Deploy to Netlify

### Step 1: Build Command

Create `netlify.toml`:

```toml
[build]
  command = "npm run build"
  publish = ".next"

[[plugins]]
  package = "@netlify/plugin-nextjs"
```

### Step 2: Deploy

```bash
npm install -g netlify-cli
netlify login
netlify init
netlify deploy --prod
```

### Step 3: Add Environment Variables

In Netlify dashboard:
Site Settings → Build & Deploy → Environment Variables

Add all `NEXT_PUBLIC_FIREBASE_*` variables.

---

## Option 3: Self-Host (VPS/Docker)

### Dockerfile

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000
CMD ["node", "server.js"]
```

### Build & Run

```bash
docker build -t luna .
docker run -p 3000:3000 --env-file .env.local luna
```

---

## Post-Deployment Checklist

- [ ] Test login (Email + Google)
- [ ] Test document upload
- [ ] Test trade entry
- [ ] Test PWA installation ("Add to Home Screen")
- [ ] Test offline mode (disable network, check cached docs)
- [ ] Verify Firebase security rules are deployed

---

## Firebase Security Rules Deployment

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize (select Firestore and Storage)
firebase init

# Deploy rules
firebase deploy --only firestore:rules,storage:rules
```

---

## Custom Domain (Optional)

### Vercel
1. Go to Project Settings → Domains
2. Add your domain
3. Update DNS records as shown

### Netlify
1. Go to Site Settings → Domain Management
2. Add custom domain
3. Follow DNS configuration steps

---

## Monitoring

Consider adding:
- **Firebase Analytics** - User behavior tracking
- **Sentry** - Error monitoring
- **Vercel Analytics** - Performance metrics

---

Your Luna PWA is now live! 🌙
