# SkyBZM Web Control Panel

Modern React-based control panel for SkyBZM Hypixel Skyblock Bot.

## ✨ Features

- 🎨 Beautiful pastel color scheme
- 🌓 Dark/Light theme toggle
- 📊 Real-time bot statistics
- 🎮 Bot control (Start/Stop/Restart)
- ⚙️ General configuration
- 🌐 Proxy configuration with authentication
- 💰 Advanced flip configurations:
  - 🏪 NPC Flip (minSpread, item, forceSellAfter)
  - 🐱 Kat Flip (useKatFlower, pet)
  - 🔨 Craft Flip (3x3 Minecraft-style crafting grid)
  - ⚒️ Forge Flip (item selection)

## 🚀 Development

```bash
# Install dependencies
npm install

# Start development server (with hot reload)
npm run dev

# Access at http://localhost:3000
```

## 📦 Production Build

```bash
# Build for production
npm run build

# Output will be in dist/ directory
# The Express server will automatically serve from dist/
```

## 🏗️ Project Structure

```
public/
├── src/
│   ├── components/
│   │   ├── ui/              # Reusable UI components (Button, Input, Card, etc.)
│   │   ├── layout/          # Layout components (Sidebar, Header)
│   │   └── sections/        # Page sections (BotControl, Stats, Config, Flips)
│   ├── contexts/            # React contexts (Theme, Auth)
│   ├── pages/               # Main pages (Login, Dashboard)
│   ├── styles/              # Global styles
│   ├── App.jsx              # Root component
│   └── main.jsx             # Entry point
├── dist/                    # Production build output
├── index.html               # HTML template
├── package.json
└── vite.config.js           # Vite configuration
```

## 🎨 Design System

### Colors (Light Theme)
- Primary: `#fb7185` (Rose)
- Secondary: `#c084fc` (Purple)
- Tertiary: `#60a5fa` (Blue)
- Success: `#86efac` (Green)
- Warning: `#fcd34d` (Yellow)
- Error: `#fca5a5` (Red)

### Colors (Dark Theme)
- Automatically adapts with proper contrast

## 🔌 API Integration

The app communicates with the Express backend through these endpoints:

- `POST /api/login` - Authentication
- `GET /api/config` - Get configuration
- `PUT /api/account/:index` - Update account config
- `POST /api/account/:index/flips` - Create flip config
- `PATCH /api/account/:index/flips/:flipIndex` - Toggle flip
- `DELETE /api/account/:index/flips/:flipIndex` - Delete flip
- `PATCH /api/account/:index/flips/:flipIndex/config` - Update flip config
- `POST /api/bot/:index/start` - Start bot
- `POST /api/bot/:index/stop` - Stop bot
- `POST /api/bot/:index/restart` - Restart bot
- `GET /api/bot/:index/status` - Get bot status
- `GET /api/bot/:index/stats` - Get bot statistics
- `GET /api/bot/:index/logs` - Get bot activity logs

## 🛠️ Technologies

- **React 18** - UI framework
- **Vite** - Build tool
- **CSS Variables** - Theming
- **Express** - Backend API

## 📝 Notes

- Sell timeout is now in **minutes** (converted from ms in backend)
- Proxy configuration supports username and password authentication
- Each flip type has its own specialized configuration UI
- Craft flip uses a 3x3 grid similar to Minecraft crafting
- All configurations are saved to the backend in real-time

## 🎯 Future Improvements

- [ ] Add flip performance analytics
- [ ] Add multi-account dashboard view
- [ ] Add export/import configuration
- [ ] Add bot activity timeline
- [ ] Add notification system
