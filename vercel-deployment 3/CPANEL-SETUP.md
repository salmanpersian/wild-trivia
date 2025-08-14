# Wild Trivia - cPanel Deployment Guide (No Terminal Required)

## 🚀 Quick Setup for cPanel (No Terminal/SSH Needed)

### Step 1: Check Your Hosting Plan
First, check if your hosting plan supports Node.js applications:
1. Look for **Node.js Selector** or **Node.js Apps** in your cPanel
2. If you don't see it, contact your hosting provider to enable Node.js support

### Step 2: Upload Files

#### Option A: cPanel File Manager
1. **Upload all files** from this folder to your cPanel's `public_html` directory
2. **Or create a subdirectory** like `trivia` and upload there

#### Option B: FTP Upload (Recommended for large files)
1. **Get FTP credentials** from your cPanel:
   - Go to cPanel → **FTP Accounts**
   - Note your FTP hostname, username, and password
2. **Use an FTP client** (FileZilla, WinSCP, Cyberduck):
   - Host: Your FTP hostname
   - Username: Your FTP username
   - Password: Your FTP password
   - Port: 21 (default)
3. **Upload files** to `public_html/trivia/` (or your preferred directory)
4. **Set file permissions**:
   - Directories: 755
   - Files: 644
   - `start-server.sh`: 755 (executable)

### Step 3: Using cPanel Node.js Selector (Recommended)

#### Option A: cPanel Node.js App Manager
1. In cPanel, find **Node.js Selector** or **Node.js Apps**
2. Click **Create Application**
3. Fill in the details:
   - **Node.js version**: 16 or higher
   - **Application mode**: Production
   - **Application root**: `/public_html/trivia` (or your upload path)
   - **Application URL**: `yourdomain.com/trivia` (or your preferred path)
   - **Application startup file**: `server.js`
   - **Passenger port**: 8080 (or any available port)
4. Click **Create**

#### Option B: If Node.js Selector is not available
Contact your hosting provider and ask them to:
1. Enable Node.js support for your hosting plan
2. Install Node.js 16 or higher
3. Configure your application to run `server.js`

### Step 4: Alternative - Static File Hosting
If Node.js is not available, you can still host the frontend files:

#### Upload Static Files Only:
- `index.html`
- `app.jsx` 
- `components.jsx`

#### Access via:
- `http://yourdomain.com/trivia/index.html`

**Note**: The multiplayer features won't work without the Node.js backend.

## 🔧 Manual Setup (If Terminal/SSH is Available Later)

### Using Terminal/SSH
```bash
# Navigate to your directory
cd public_html/trivia

# Install dependencies
npm install

# Start server
node server.js

# Or use the startup script
./start-server.sh
```

### Using PM2 (if available)
```bash
npm install -g pm2
pm2 start server.js --name "wild-trivia"
pm2 save
pm2 startup
```

## 📁 File Structure
```
public_html/trivia/
├── index.html          # Main HTML file
├── app.jsx             # React application
├── components.jsx      # React components
├── server.js           # Node.js server
├── package.json        # Dependencies
├── start-server.sh     # Startup script
└── data/               # Game data (auto-created)
```

## ⚙️ Configuration

### Change Port (if 8080 is busy)
Edit `server.js` line 8:
```javascript
const PORT = process.env.PORT ? Number(process.env.PORT) : 8080;
```
Change `8080` to any available port.

### Environment Variables
Set in cPanel Node.js App Manager or via hosting provider.

## 🔍 Troubleshooting

### No Node.js Support
- **Contact your hosting provider** to enable Node.js
- **Upgrade your hosting plan** if needed
- **Consider VPS hosting** for full control

### Port Issues
- **Port 8080 busy**: Change port in `server.js`
- **Permission denied**: Contact hosting provider

### Common Issues
- **Node.js not found**: Request Node.js 16+ from hosting provider
- **Version too old**: Ask hosting provider to update Node.js
- **Application won't start**: Check error logs in cPanel

## 📞 Hosting Provider Support

### What to Ask Your Hosting Provider:
1. "Do you support Node.js applications?"
2. "Can you enable Node.js for my hosting plan?"
3. "What Node.js version do you support?"
4. "How do I deploy a Node.js application?"
5. "Can you help me set up my Node.js app?"

### Popular Hosting Providers with Node.js Support:
- **HostGator**: Node.js Selector in cPanel
- **Bluehost**: Node.js Apps in cPanel
- **A2 Hosting**: Node.js support available
- **SiteGround**: Node.js support on higher plans
- **DigitalOcean**: Full VPS control
- **Heroku**: Specialized for Node.js apps

## 🎮 Game Features
- Real-time multiplayer trivia
- Multiple categories
- Live leaderboards
- Keyboard shortcuts (1-4 for answers)
- Responsive design

## 💡 Alternative Solutions

### If Node.js is not available:
1. **Use a different hosting provider** that supports Node.js
2. **Deploy to a Node.js platform** like Heroku, Vercel, or Railway
3. **Use a VPS** for full control
4. **Contact your hosting provider** to upgrade your plan
