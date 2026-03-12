# 🚀 SkyBZM Web Dashboard - Setup Guide

## Quick Start

### 1. Install Dependencies

Navigate to the web directory and install all required packages:

```bash
cd src/web
npm install
```

This will install:
- React 18
- React Router v6
- Vite
- Axios
- Lucide React icons
- Recharts
- And all dev dependencies

### 2. Development Mode

For development with hot module replacement (HMR):

```bash
npm run dev
```

Or use the helper script:

```bash
./start-dev.sh
```

The development server will start on `http://localhost:7392` and automatically proxy API requests to the backend.

**Note:** Make sure the SkyBZM bot is running on port 7392 before starting the dev server.

### 3. Production Build

To create an optimized production build:

```bash
npm run build
```

This creates a `dist/` folder with all optimized files ready for deployment.

### 4. Running in Production

After building, simply start the bot from the root directory:

```bash
cd ../..  # Go back to SkyBZM root
npm start
```

The Express server will automatically serve the built files from `src/web/dist/`.

Access the dashboard at `http://localhost:7392` or `http://your-ip:7392`.

## 📋 Prerequisites

- Node.js 16 or higher
- npm (comes with Node.js)
- SkyBZM bot configured and ready to run

## 🎯 Features Overview

### Dashboard (`/`)
- Overview of all configured bots
- Real-time status indicators
- Quick statistics (total bots, connected bots, etc.)
- Start/Stop/Restart controls per bot
- Click on any bot card to view details

### Bot Details (`/bot/:username`)
- Detailed statistics for individual bots
- Real-time activity log
- Profit history timeline
- Full bot control (start/stop/restart)
- Auto-refreshing data

### Settings (`/settings`)
- Configuration guide
- Documentation for all config options
- Links to GitHub repository

## 🎨 Customization

### Changing Colors

Edit `src/web/src/styles/globals.css` to customize the color palette:

```css
:root {
  --color-primary: #A78BFA;    /* Change primary color */
  --color-secondary: #93C5FD;  /* Change secondary color */
  /* ... and more */
}
```

### Adjusting Refresh Rates

Edit `src/web/src/utils/hooks.js` to change auto-refresh intervals:

```javascript
export function useBots(refreshInterval = 2000) {  // Change 2000 to desired ms
  // ...
}
```

### Modifying Animations

All animations are defined in `src/web/src/styles/globals.css`. You can:
- Change animation duration
- Modify animation easing
- Add new animations
- Disable animations by setting `animation: none`

## 🔧 Troubleshooting

### Port Already in Use

If port 7392 is already occupied:

1. Edit `src/web/vite.config.js`:
   ```javascript
   server: {
     port: 7393,  // Change to different port
     // ...
   }
   ```

2. Also update `src/web/server.js` if needed

### Build Errors

Clear cache and reinstall:

```bash
rm -rf node_modules package-lock.json dist
npm install
npm run build
```

### API Connection Issues

1. Check that the bot backend is running
2. Open browser DevTools (F12) and check Console for errors
3. Verify the API base URL in `src/web/src/api/client.js`

### Module Not Found Errors

Make sure you're in the correct directory:

```bash
pwd  # Should show .../SkyBZM/src/web
```

If in wrong directory, navigate to web folder:

```bash
cd src/web
```

## 📁 Directory Structure

```
src/web/
├── dist/                 # Production build (created by npm run build)
├── node_modules/         # Dependencies (created by npm install)
├── public/               # Static files
├── src/                  # Source code
│   ├── api/             # API client
│   ├── components/      # React components
│   ├── pages/           # Page components
│   ├── styles/          # Global styles
│   └── utils/           # Utilities and hooks
├── index.html           # HTML entry point
├── package.json         # Dependencies and scripts
├── vite.config.js       # Vite configuration
├── server.js            # Express server
├── .gitignore           # Git ignore rules
├── start-dev.sh         # Development helper script
└── README.md            # Documentation
```

## 🔄 Development Workflow

1. **Make Changes** - Edit files in `src/web/src/`
2. **Auto-Reload** - Vite will automatically reload the page
3. **Test** - Verify changes in the browser
4. **Build** - Run `npm run build` when ready for production
5. **Deploy** - Restart the bot to serve the new build

## 🐛 Known Issues

- Some statistics show "Coming Soon" (backend integration pending)
- Configuration editing in UI not implemented (must edit config.json manually)
- Charts not yet implemented (Recharts installed but not used)

## 📈 Future Enhancements

- [ ] WebSocket for real-time updates (instead of polling)
- [ ] Interactive configuration editor
- [ ] Profit and money flow charts
- [ ] Export data functionality
- [ ] Dark/Light theme toggle
- [ ] Bot logs viewer
- [ ] Notification system

## 🆘 Getting Help

1. Check the browser console (F12) for error messages
2. Review the README.md in `src/web/`
3. Check the WEB_REDESIGN_COMPLETE.md for detailed documentation
4. Open an issue on GitHub if you encounter bugs

## ✅ Checklist

Before running the dashboard:

- [ ] Node.js 16+ installed
- [ ] In the correct directory (`src/web`)
- [ ] Dependencies installed (`npm install`)
- [ ] Bot backend running
- [ ] Port 7392 available
- [ ] config.json exists in root directory

## 🎉 You're Ready!

The dashboard should now be accessible at:
- **Development:** http://localhost:7392 (with HMR)
- **Production:** http://localhost:7392 (optimized build)
- **Network:** http://your-ip:7392 (accessible from other devices)

Enjoy managing your SkyBZM bots with the beautiful new interface! 🚀
