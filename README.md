# Wild Trivia - Multiplayer Trivia Game

A real-time multiplayer trivia game built with React, Node.js, and Express.

## Features

- 🎮 Real-time multiplayer gameplay
- 🎯 Multiple trivia categories from OpenTDB
- ⏱️ Configurable question timers
- 🏆 Live leaderboards and results
- 🎨 Modern, responsive UI with Tailwind CSS
- ⌨️ Keyboard shortcuts (1-4 for A-D answers)

## Quick Start

### Option 1: Simple Upload (Recommended)

1. **Upload all files** to your web server's public directory
2. **Start the Node.js server**:
   ```bash
   npm install
   node server.js
   ```
3. **Access the game** at `http://yourdomain.com:8080`

### Option 2: Using PM2 (Production)

1. **Install PM2 globally**:
   ```bash
   npm install -g pm2
   ```

2. **Start the server with PM2**:
   ```bash
   pm2 start server.js --name "wild-trivia"
   pm2 save
   pm2 startup
   ```

### Option 3: Using Docker

1. **Build and run with Docker**:
   ```bash
   docker build -t wild-trivia .
   docker run -p 3000:3000 wild-trivia
   ```

## File Structure

```
wild-trivia/
├── index.html          # Main HTML file
├── app.jsx             # React application logic
├── components.jsx      # React components and utilities
├── server.js           # Node.js/Express server
├── package.json        # Dependencies and scripts
├── README.md           # This file
└── data/               # Game data storage (auto-created)
```

## Configuration

### Environment Variables

- `PORT`: Server port (default: 3000)
- `NODE_ENV`: Environment mode (development/production)

### Customization

- **Game Settings**: Modify constants in `components.jsx`
- **Styling**: Edit Tailwind classes in `app.jsx` and `components.jsx`
- **API Endpoints**: Update API URLs in `components.jsx`

## API Endpoints

- `POST /api?action=joinOrCreate` - Join or create a game room
- `POST /api?action=getRoom` - Get current room state
- `POST /api?action=updateRoom` - Update room settings/answers
- `POST /api?action=nukeRoom` - End game and clear room

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Troubleshooting

### Common Issues

1. **Port already in use**:
   ```bash
   # Change port in server.js or use:
   PORT=8081 node server.js
   ```

2. **CORS errors**: The server is configured for same-origin requests

3. **Data persistence**: Game data is stored in `./data/` directory

### Logs

Check server logs for errors:
```bash
# If using PM2:
pm2 logs wild-trivia

# If running directly:
node server.js
```

## Development

### Local Development

1. **Clone and install**:
   ```bash
   npm install
   ```

2. **Start development server**:
   ```bash
   node server.js
   ```

3. **Access at**: `http://localhost:8080`

### Building for Production

The app is already optimized for production. For additional optimizations:

1. **Minify JavaScript** (optional):
   ```bash
   npm install -g terser
   terser app.jsx -o app.min.jsx
   terser components.jsx -o components.min.jsx
   ```

2. **Compress static assets** (optional):
   ```bash
   npm install -g gzip-cli
   gzip index.html app.jsx components.jsx
   ```

## License

MIT License - feel free to use and modify as needed.

## Support

For issues or questions, check the troubleshooting section above or create an issue in the repository.
