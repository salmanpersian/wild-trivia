# Wild Trivia - Vercel Deployment Guide

## 🚀 Step-by-Step Vercel Deployment

### Step 1: Create GitHub Repository

1. **Go to GitHub**: `https://github.com`
2. **Sign up/Login** to your GitHub account
3. **Create new repository**:
   - Click "New repository"
   - Name: `wild-trivia`
   - Make it **Public** (Vercel free tier requirement)
   - Don't initialize with README
   - Click "Create repository"

### Step 2: Upload Files to GitHub

#### Option A: Using GitHub Web Interface
1. **Go to your new repository**
2. **Click "uploading an existing file"**
3. **Drag and drop** all files from the `vercel-deployment` folder:
   - `index.html`
   - `app.jsx`
   - `components.jsx`
   - `server.js`
   - `package.json`
   - `vercel.json`
4. **Add commit message**: "Initial commit"
5. **Click "Commit changes"**

#### Option B: Using Git (if you have Git installed)
```bash
# Clone your repository
git clone https://github.com/yourusername/wild-trivia.git
cd wild-trivia

# Copy all files from vercel-deployment folder
cp -r ../vercel-deployment/* .

# Add and commit files
git add .
git commit -m "Initial commit"
git push origin main
```

### Step 3: Deploy on Vercel

1. **Go to Vercel**: `https://vercel.com`
2. **Sign up/Login** with your GitHub account
3. **Click "New Project"**
4. **Import your repository**:
   - Find `wild-trivia` in the list
   - Click "Import"
5. **Configure project**:
   - **Project Name**: `wild-trivia` (or any name you want)
   - **Framework Preset**: Other
   - **Root Directory**: `./` (leave as default)
   - **Build Command**: Leave empty (or `npm run build`)
   - **Output Directory**: Leave empty
   - **Install Command**: `npm install`
6. **Click "Deploy"**

### Step 4: Wait for Deployment

- Vercel will automatically:
  - Install dependencies (`npm install`)
  - Build your project
  - Deploy to a live URL
- **Deployment time**: 1-3 minutes
- You'll see a success message with your URL

### Step 5: Access Your Game

- **Your game URL**: `https://wild-trivia-xxxxx.vercel.app`
- **Share with friends** to play together!
- **Custom domain**: You can add your own domain later

## 🔧 Configuration Details

### Vercel Configuration (`vercel.json`)
```json
{
  "version": 2,
  "builds": [
    {
      "src": "server.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/server.js"
    },
    {
      "src": "/(.*)",
      "dest": "/$1"
    }
  ]
}
```

### Package Configuration (`package.json`)
- **Dependencies**: Express.js for the server
- **Scripts**: Start and build commands
- **Node version**: 16 or higher

## 🎮 Game Features

Your deployed game includes:
- ✅ Real-time multiplayer trivia
- ✅ Multiple categories
- ✅ Live leaderboards
- ✅ Keyboard shortcuts (1-4 for answers)
- ✅ Responsive design
- ✅ Auto-deployment on code changes

## 🔄 Automatic Updates

### How to Update Your Game:
1. **Edit files** in your GitHub repository
2. **Commit changes**
3. **Vercel automatically redeploys** in 1-2 minutes
4. **No manual deployment needed!**

### Example Update Process:
```bash
# Edit files locally
# Push to GitHub
git add .
git commit -m "Update game features"
git push origin main

# Vercel automatically redeploys!
```

## 📊 Vercel Dashboard

### Monitor Your App:
1. **Go to Vercel Dashboard**
2. **Click on your project**
3. **View**:
   - Deployment status
   - Performance metrics
   - Error logs
   - Custom domains

### Useful Dashboard Features:
- **Analytics**: Track visitors and performance
- **Functions**: Monitor serverless functions
- **Settings**: Configure environment variables
- **Domains**: Add custom domains

## 🚨 Troubleshooting

### Common Issues:

#### **Build Failed**
- Check `package.json` has correct dependencies
- Verify `vercel.json` configuration
- Check Vercel logs for specific errors

#### **Game Not Loading**
- Verify all files are uploaded to GitHub
- Check browser console for errors
- Ensure `index.html` is in the root directory

#### **API Errors**
- Check `server.js` is properly configured
- Verify routes in `vercel.json`
- Check Vercel function logs

#### **Deployment Stuck**
- Cancel and redeploy
- Check GitHub repository is public
- Verify repository has all required files

## 💡 Pro Tips

### **Best Practices:**
1. **Keep repository public** (Vercel free tier requirement)
2. **Use descriptive commit messages**
3. **Test locally** before pushing to GitHub
4. **Monitor Vercel dashboard** for issues

### **Performance Optimization:**
- Vercel automatically optimizes your app
- CDN distribution for fast loading
- Automatic HTTPS
- Edge functions for better performance

### **Custom Domain Setup:**
1. **Go to Vercel Dashboard**
2. **Click on your project**
3. **Go to Settings → Domains**
4. **Add your custom domain**
5. **Update DNS records** as instructed

## 🆘 Need Help?

### **Vercel Support:**
- **Documentation**: `https://vercel.com/docs`
- **Community**: `https://github.com/vercel/vercel/discussions`
- **Support**: Available in dashboard

### **GitHub Support:**
- **Documentation**: `https://docs.github.com`
- **Community**: `https://github.com/community`

## 🎉 Success!

Once deployed, your Wild Trivia game will be:
- ✅ Live and accessible worldwide
- ✅ Auto-updating on code changes
- ✅ Fast and reliable
- ✅ Free to host (Vercel free tier)
- ✅ Ready for multiplayer gaming!

**Share your game URL with friends and start playing!**
