# Vercel Deployment Guide

## Prerequisites
1. Vercel account (sign up at https://vercel.com)
2. MongoDB Atlas account (or your MongoDB connection string)
3. Firebase project with service account credentials
4. Git repository (GitHub, GitLab, or Bitbucket)

## Deployment Steps

### 1. Push Your Code to Git
```bash
git add .
git commit -m "Ready for Vercel deployment"
git push origin main
```

### 2. Deploy to Vercel

#### Option A: Via Vercel Dashboard (Recommended)
1. Go to https://vercel.com/dashboard
2. Click **"Add New Project"**
3. Import your Git repository
4. Configure the project:
   - **Framework Preset**: Other
   - **Root Directory**: `./` (leave as default)
   - **Build Command**: Leave empty (no build needed)
   - **Output Directory**: Leave empty
   - **Install Command**: `npm install`
5. Click **"Deploy"**

#### Option B: Via Vercel CLI
```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel

# Deploy to production
vercel --prod
```

### 3. Set Environment Variables

**IMPORTANT**: After deployment, go to **Project Settings → Environment Variables** and add:

#### Required Environment Variables:

1. **MONGODB_URI**
   - **Value**: Your MongoDB connection string
   - **Example**: `mongodb+srv://username:password@cluster.mongodb.net/malwa_event`
   - **Environment**: Production, Preview, Development (select all)

2. **FIREBASE_SERVICE_ACCOUNT** (Option 1 - Recommended)
   - **Value**: Your entire Firebase service account JSON as a string
   - **How to get**: 
     - Go to Firebase Console → Project Settings → Service Accounts
     - Click "Generate new private key"
     - Copy the entire JSON content
     - Paste it as a single-line string (remove line breaks)
   - **Environment**: Production, Preview, Development (select all)

   **OR** use individual variables (Option 2):

3. **FIREBASE_PROJECT_ID**
   - **Value**: Your Firebase project ID
   - **Environment**: Production, Preview, Development

4. **FIREBASE_PRIVATE_KEY**
   - **Value**: Your Firebase private key (keep the `\n` characters)
   - **Environment**: Production, Preview, Development

5. **FIREBASE_CLIENT_EMAIL**
   - **Value**: Your Firebase client email
   - **Environment**: Production, Preview, Development

6. **NODE_ENV** (Optional)
   - **Value**: `production`
   - **Environment**: Production only

### 4. Redeploy After Setting Environment Variables

After adding environment variables, you need to redeploy:
- Go to **Deployments** tab
- Click the **"..."** menu on the latest deployment
- Select **"Redeploy"**

Or trigger a new deployment by pushing a commit:
```bash
git commit --allow-empty -m "Trigger redeploy"
git push
```

## Project Structure

```
Malwa_event/
├── api/
│   └── index.js          # Vercel serverless function entry point
├── backend/
│   ├── config/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   └── utils/
├── index.html            # Frontend (served as static file)
├── package.json
└── vercel.json           # Vercel configuration
```

## How It Works

1. **API Routes** (`/api/*`):
   - Handled by `api/index.js` serverless function
   - Routes: `/api/register`, `/api/otp/generate`, `/api/otp/validate`

2. **Frontend** (`/`):
   - `index.html` is served as a static file
   - All other routes redirect to `index.html`

3. **Serverless Functions**:
   - Each API request triggers a serverless function
   - MongoDB connection is cached for performance
   - Functions have a 30-second timeout

## Verification

After deployment:

1. **Check Health Endpoint**:
   - Visit: `https://your-project.vercel.app/api/health`
   - Should return: `{"status":"ok","timestamp":"..."}`

2. **Check Database Info**:
   - Visit: `https://your-project.vercel.app/api/debug/db-info`
   - Should show database connection status and sample data

3. **Test Registration**:
   - Visit: `https://your-project.vercel.app`
   - Fill the registration form
   - Complete OTP verification
   - Check MongoDB Compass for saved data

## Important Notes

### MongoDB Atlas Configuration
- Ensure your MongoDB Atlas cluster allows connections from anywhere (0.0.0.0/0)
- Or add Vercel's IP ranges to your whitelist
- Check MongoDB Atlas → Network Access → IP Access List

### Firebase Configuration
- Make sure Firebase Phone Authentication is enabled
- Add your Vercel domain to Firebase authorized domains
- Firebase Console → Authentication → Settings → Authorized domains

### CORS Configuration
- The API allows all origins in production (configured in `api/index.js`)
- For production, you may want to restrict CORS to your domain

### Rate Limiting
- OTP endpoints: 3 requests per 15 minutes per IP
- Registration endpoint: 5 requests per 15 minutes per IP
- Adjust in `backend/routes/otp.js` and `backend/routes/registration.js` if needed

### Cold Starts
- First request after inactivity may take longer (cold start)
- Subsequent requests are faster (warm start)
- MongoDB connection is cached to reduce latency

## Troubleshooting

### "MongoDB connection failed"
- Check `MONGODB_URI` environment variable is set correctly
- Verify MongoDB Atlas network access allows Vercel IPs
- Check MongoDB connection string format

### "Firebase Admin initialization error"
- Verify `FIREBASE_SERVICE_ACCOUNT` or individual Firebase env vars are set
- Check Firebase service account JSON is valid
- Ensure private key has `\n` characters preserved

### "404 Not Found" for API routes
- Check `vercel.json` routes configuration
- Verify `api/index.js` exists and exports the Express app
- Check deployment logs in Vercel dashboard

### "Function timeout"
- Default timeout is 30 seconds (configured in `vercel.json`)
- For longer operations, consider upgrading Vercel plan
- Check MongoDB queries are optimized

### Data not appearing in MongoDB
- Check database name in connection string matches what you're viewing
- Collection name is `registrations` (plural, lowercase)
- Verify environment variables are set for the correct environment (Production/Preview)

## Custom Domain (Optional)

1. Go to **Project Settings → Domains**
2. Add your custom domain
3. Follow DNS configuration instructions
4. Update Firebase authorized domains with your custom domain

## Monitoring

- Check **Vercel Dashboard → Functions** for execution logs
- Monitor **Vercel Dashboard → Analytics** for performance
- Check **MongoDB Atlas → Monitoring** for database metrics

## Support

If you encounter issues:
1. Check Vercel deployment logs
2. Check browser console for frontend errors
3. Verify all environment variables are set
4. Test API endpoints directly using curl or Postman

