# FTP Upload Guide for Wild Trivia

## 🚀 FTP Upload Instructions

### Step 1: Get FTP Credentials from cPanel

1. **Login to cPanel**
2. **Find FTP Accounts** section
3. **Note your credentials**:
   - **FTP Hostname**: Usually `yourdomain.com` or `ftp.yourdomain.com`
   - **Username**: Your FTP username
   - **Password**: Your FTP password
   - **Port**: 21 (default)

### Step 2: Choose an FTP Client

#### **Free FTP Clients:**
- **FileZilla** (Windows/Mac/Linux): `https://filezilla-project.org`
- **WinSCP** (Windows): `https://winscp.net`
- **Cyberduck** (Mac): `https://cyberduck.io`
- **cPanel File Manager** (Web-based, no download needed)

#### **Recommended: FileZilla**
- Free and reliable
- Works on all platforms
- Easy to use interface

### Step 3: Connect and Upload

#### **Using FileZilla:**
1. **Download and install** FileZilla
2. **Open FileZilla**
3. **Enter connection details**:
   - Host: `yourdomain.com` (or your FTP hostname)
   - Username: Your FTP username
   - Password: Your FTP password
   - Port: 21
4. **Click "Quickconnect"**
5. **Navigate to** `public_html/` directory
6. **Create folder** called `trivia` (if needed)
7. **Upload all files** from the `wild-trivia-cpanel` folder

#### **Using cPanel File Manager:**
1. **Go to cPanel → File Manager**
2. **Navigate to** `public_html/`
3. **Create folder** called `trivia`
4. **Upload files** one by one or use "Upload" button

### Step 4: Set File Permissions

#### **Important Permissions:**
- **Directories**: 755 (rwxr-xr-x)
- **Files**: 644 (rw-r--r--)
- **start-server.sh**: 755 (executable)

#### **How to Set Permissions:**

**In FileZilla:**
1. Right-click on file/folder
2. Select "File permissions"
3. Enter the permission number (755 or 644)

**In cPanel File Manager:**
1. Right-click on file/folder
2. Select "Change Permissions"
3. Check/uncheck boxes to set permissions

### Step 5: Verify Upload

#### **Check these files are uploaded:**
```
public_html/trivia/
├── index.html          ✓
├── app.jsx             ✓
├── components.jsx      ✓
├── server.js           ✓
├── package.json        ✓
├── start-server.sh     ✓
├── CPANEL-SETUP.md     ✓
├── HOSTING-ALTERNATIVES.md ✓
└── FTP-SETUP.md        ✓
```

## 🔧 After FTP Upload

### Option A: If Node.js is Available
1. **Contact your hosting provider** to enable Node.js
2. **Ask them to run**:
   ```bash
   cd public_html/trivia
   npm install
   node server.js
   ```

### Option B: Use cPanel Node.js Selector
1. **Look for Node.js Selector** in cPanel
2. **Create new application**
3. **Set startup file** to `server.js`

### Option C: Static File Hosting
If Node.js is not available:
1. **Access via**: `http://yourdomain.com/trivia/index.html`
2. **Note**: Multiplayer features won't work

## 🚨 Important Notes

### **FTP Upload Limitations:**
- **FTP only uploads files** - it doesn't run Node.js
- **You still need Node.js support** from your hosting provider
- **FTP is just for file transfer** - not for running applications

### **What FTP Upload Does:**
✅ Uploads all your files to the server
✅ Makes files accessible via web
❌ Does NOT install Node.js
❌ Does NOT run your server
❌ Does NOT start your application

### **What You Still Need:**
1. **Node.js support** from your hosting provider
2. **Someone to run** `npm install` and `node server.js`
3. **Port access** for your application

## 💡 Pro Tips

### **FTP Best Practices:**
1. **Use SFTP** if available (more secure than FTP)
2. **Keep backup** of your files locally
3. **Test upload** with a small file first
4. **Check file permissions** after upload
5. **Use compression** for large files

### **Troubleshooting:**
- **Connection failed**: Check hostname and credentials
- **Upload failed**: Check disk space and permissions
- **Files not showing**: Check file permissions (644)
- **Scripts not running**: Check executable permissions (755)

## 🆘 Need Help?

### **FTP Issues:**
- Check your hosting provider's FTP documentation
- Verify credentials in cPanel
- Try different FTP client

### **Node.js Issues:**
- Contact your hosting provider
- Ask about Node.js support
- Consider alternative hosting (see HOSTING-ALTERNATIVES.md)

### **File Permission Issues:**
- Set directories to 755
- Set files to 644
- Set scripts to 755

## 📞 Next Steps

After FTP upload:
1. **Contact your hosting provider** about Node.js
2. **Check if Node.js Selector** is available in cPanel
3. **Consider alternative hosting** if Node.js is not supported
4. **Use static hosting** as temporary solution
