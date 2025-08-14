# Vercel Deployment Troubleshooting

## 🚨 404 Error After Deployment

### **Common Causes and Solutions:**

#### **1. File Structure Issues**
**Problem**: Files not in correct locations
**Solution**: Ensure all files are in the root of your repository:
```
wild-trivia/
├── index.html
├── app.jsx
├── components.jsx
├── server.js
├── package.json
└── vercel.json
```

#### **2. Vercel Configuration Issues**
**Problem**: `vercel.json` not routing correctly
**Solution**: Use this simplified configuration:
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
      "src": "/(.*)",
      "dest": "/server.js"
    }
  ]
}
```

#### **3. Server.js Route Issues**
**Problem**: Server not handling root route
**Solution**: Ensure server.js has these routes:
```javascript
// Serve index.html for root path
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Handle all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});
```

#### **4. Build Failures**
**Problem**: Dependencies not installing
**Solution**: Check `package.json` has correct dependencies:
```json
{
  "dependencies": {
    "express": "^4.18.2"
  }
}
```

## 🔍 **Debugging Steps:**

### **Step 1: Check Vercel Logs**
1. Go to Vercel Dashboard
2. Click on your project
3. Go to "Functions" tab
4. Check for error messages

### **Step 2: Check Build Logs**
1. Go to "Deployments" tab
2. Click on latest deployment
3. Check "Build Logs" for errors

### **Step 3: Test Locally**
```bash
# Test locally first
npm install
node server.js
# Should work at http://localhost:8080
```

### **Step 4: Check File Permissions**
Ensure all files are readable:
- `index.html`: 644
- `server.js`: 644
- `package.json`: 644

## 🛠️ **Quick Fixes:**

### **Fix 1: Redeploy with Updated Files**
1. Update your GitHub repository with the fixed files
2. Vercel will auto-redeploy
3. Check the new deployment

### **Fix 2: Manual Redeploy**
1. Go to Vercel Dashboard
2. Click "Redeploy" on your project
3. Wait for completion

### **Fix 3: Check Repository**
1. Verify all files are in GitHub
2. Ensure repository is public
3. Check file names are correct

## 📋 **Common Error Messages:**

### **"Function not found"**
- Check `vercel.json` routes
- Ensure `server.js` exists
- Verify build completed

### **"Module not found"**
- Check `package.json` dependencies
- Ensure `npm install` runs
- Verify Node.js version

### **"404 Not Found"**
- Check file paths in server.js
- Verify `index.html` exists
- Check route configuration

## 🎯 **Working Configuration:**

### **Files Required:**
```
wild-trivia/
├── index.html          # Main HTML file
├── app.jsx             # React app
├── components.jsx      # React components
├── server.js           # Express server
├── package.json        # Dependencies
└── vercel.json         # Vercel config
```

### **Working vercel.json:**
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
      "src": "/(.*)",
      "dest": "/server.js"
    }
  ]
}
```

### **Working server.js routes:**
```javascript
// API routes
app.post('/api', (req, res) => {
  // API logic here
});

// Serve index.html for root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Handle all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});
```

## 🆘 **Still Having Issues?**

### **Contact Support:**
1. **Vercel Support**: Available in dashboard
2. **GitHub Issues**: Check existing issues
3. **Community**: Vercel Discord/Forums

### **Alternative Deployment:**
If Vercel continues to have issues:
1. Try **Railway** (similar to Vercel)
2. Try **Render** (simple deployment)
3. Use **Heroku** (more control)

## ✅ **Success Checklist:**

- [ ] All files uploaded to GitHub
- [ ] Repository is public
- [ ] `vercel.json` configured correctly
- [ ] `server.js` has proper routes
- [ ] `package.json` has dependencies
- [ ] Build completes successfully
- [ ] No errors in Vercel logs
- [ ] Game loads at your Vercel URL
