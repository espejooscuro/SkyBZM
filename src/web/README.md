# SkyBZM Web Dashboard

Modern, pastel-themed web interface for managing SkyBZM Hypixel Skyblock bazaar flipping bots.

## Features

- 🎨 **Beautiful Pastel Design** - Modern UI with smooth animations and gradients
- 📊 **Real-time Monitoring** - Live bot status updates and statistics
- 🎯 **Bot Management** - Start, stop, and restart bots from the web interface
- 📈 **Profit Tracking** - View profit history and activity logs for each bot
- 🔄 **Auto-refresh** - Data automatically updates every few seconds
- 📱 **Responsive Design** - Works on desktop, tablet, and mobile devices

## Tech Stack

- **React 18** - Modern React with hooks
- **Vite** - Fast build tool and development server
- **Lucide React** - Beautiful icon library
- **Recharts** - Charting library (prepared for future use)
- **CSS3** - Custom animations and pastel color palette

## Development

### Prerequisites

- Node.js 16+ installed
- SkyBZM bot running on port 7392

### Installation

```bash
cd src/web
npm install
```

### Development Mode

Start the development server with hot reload:

```bash
npm run dev
```

The dev server will run on `http://localhost:7392` and proxy API requests to the backend.

### Production Build

Build the production-ready files:

```bash
npm run build
```

This will create a `dist/` folder with optimized files that can be served by the Express server.

## Project Structure

```
src/web/
├── public/           # Static files
│   └── index.html    # HTML entry point
├── src/
│   ├── api/          # API client and methods
│   │   └── client.js
│   ├── components/   # Reusable UI components
│   │   ├── Button.jsx
│   │   ├── Card.jsx
│   │   ├── BotCard.jsx
│   │   ├── StatCard.jsx
│   │   └── StatusBadge.jsx
│   ├── pages/        # Page components
│   │   ├── Dashboard.jsx
│   │   ├── BotDetail.jsx
│   │   └── Settings.jsx
│   ├── styles/       # Global styles
│   │   └── globals.css
│   ├── utils/        # Utilities and hooks
│   │   └── hooks.js
│   ├── App.jsx       # Root component
│   └── main.jsx      # Entry point
├── server.js         # Express server
├── package.json
├── vite.config.js
└── README.md

## API Endpoints

The web interface communicates with the bot backend through these endpoints:

- `GET /api/health` - Health check
- `GET /api/bots` - List all bots
- `GET /api/bots/:username` - Get bot details
- `POST /api/bots/:username/start` - Start a bot
- `POST /api/bots/:username/stop` - Stop a bot
- `POST /api/bots/:username/restart` - Restart a bot
- `GET /api/bots/:username/activity` - Get activity logs
- `GET /api/bots/:username/profits` - Get profit history
- `GET /api/bots/:username/money-flow` - Get money flow data
- `GET /api/config` - Get configuration
- `PUT /api/config` - Update configuration
- `PUT /api/bots/:username/config` - Update bot configuration

## Customization

### Colors

Edit `src/styles/globals.css` to customize the color palette. The current theme uses:

- **Primary:** Soft Purple (#A78BFA)
- **Secondary:** Soft Blue (#93C5FD)
- **Success:** Soft Green (#86EFAC)
- **Warning:** Soft Yellow (#FDE047)
- **Danger:** Soft Red (#FCA5A5)
- **Info:** Soft Cyan (#A5F3FC)

### Animations

All animations are defined in `globals.css` using CSS keyframes. You can modify or add new animations as needed.

### Refresh Intervals

Each hook in `src/utils/hooks.js` has a configurable refresh interval. Default intervals:

- Bot list: 2 seconds
- Bot details: 2 seconds
- Activity logs: 3 seconds
- Profit history: 3 seconds

## Production Deployment

1. Build the frontend:
   ```bash
   npm run build
   ```

2. The `dist/` folder will be automatically served by the Express server when you start the bot.

3. Access the dashboard at `http://localhost:7392`

## Troubleshooting

### Port Already in Use

If port 7392 is already in use, you can change it in `vite.config.js` and `server.js`.

### API Connection Issues

Make sure the bot backend is running and accessible. Check the browser console for detailed error messages.

### Build Errors

Clear the cache and reinstall dependencies:

```bash
rm -rf node_modules package-lock.json dist
npm install
npm run build
```

## Future Features

- [ ] Real-time WebSocket updates
- [ ] Profit charts and analytics
- [ ] Configuration editor in the UI
- [ ] Multiple flip type support in UI
- [ ] Bot logs viewer
- [ ] Dark/Light theme toggle
- [ ] Export data functionality

## License

This project is part of SkyBZM and follows the same license.
```
