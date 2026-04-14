# NidhiKosh — High-Fidelity NSE Stock Market Simulator

> _"Nidhi" (treasure) + "Kosh" (vault)_ — A data-dense, never-sleeping market terminal.

A full-stack MERN application that simulates live NSE trading with institutional-grade data: VWAP, market depth, circuit limits, sector heatmaps, intraday candles, and a **Living Dashboard** that serves frozen post-market snapshots when markets close — so the screen is never empty.

## 🚀 Features

### Core Trading
- **Virtual Trading**: Start with ₹1,00,000 virtual balance
- **Live NSE Prices**: Real-time stock prices via Yahoo Finance API + simulated fallback
- **Real-Time Updates**: WebSocket-powered live price ticks every 15 seconds
- **Portfolio Tracking**: Live P&L calculations with unrealized gains/losses
- **Leaderboard**: Compete with other traders ranked by portfolio value

### NidhiKosh — Advanced Data Layer
- **VWAP (Volume Weighted Average Price)**: Calculated per-session from tick data
- **Market Depth**: Top 5 Bid/Ask with order counts and quantity bars
- **Circuit Limits**: ±20% upper/lower circuit prices for each stock
- **Turnover & Volume**: Cumulative session turnover in INR, avg daily volume comparison
- **Intraday Candles**: 1-minute and 5-minute OHLCV candles frozen after close
- **Official Close**: Weighted average of last 30 minutes (NSE-style)
- **EMA 50/200**: Exponential moving average overlays

### Living Dashboard
- **Market Status Banner**: PRE_OPEN / LIVE / POST_CLOSE / CLOSED with IST clock
- **Frozen Snapshot Mode**: When market is closed, serves last session's complete data
- **Index Cards**: Simulated NIFTY 50 / BANK NIFTY with advance/decline bars
- **Sector Heatmap**: Color-coded sector performance grid
- **Vyuha Movers**: Top Gainers, Losers, Volume Shockers (>200% avg vol), Value Leaders
- **Market Breadth Gauge**: Advance/Decline ratio with sentiment indicator
- **Scrolling Price Ticker**: Saffron-glowing real-time ticker ribbon

### TradingView Charts
- **Lightweight Charts**: Candlestick + Volume histogram + VWAP overlay
- **Multi-Timeframe**: 1D, 5D, 1M, 3M, 6M, 1Y range selectors
- **Price Range Bar**: Visual current-price position between day low/high
- **Responsive**: Auto-resize on window changes

### Sanskrit-Cyber Aesthetic
- **Saffron Gold + Deep Void**: Dark theme with `#ff9933` saffron accents
- **Grid Pattern Background**: Subtle saffron grid lines
- **Glow Borders**: Cards with animated saffron glow effects
- **JetBrains Mono**: Monospace font for all numerical data
- **Phase Badges**: Color-coded market phase indicators

## 🏗️ Tech Stack

### Backend
- **Node.js + Express.js** — REST API + WebSocket server
- **MongoDB + Mongoose** — Expanded Stock model + MarketSnapshot model
- **Socket.io** — Real-time price updates + market status broadcast
- **JWT authentication** — Secure user sessions
- **Yahoo Finance API** — Live NSE data with simulated fallback
- **Market Status Service** — IST timezone, NSE holidays, trading phases
- **Snapshot Service** — Auto-capture at 15:45 IST, upsert to MongoDB

### Frontend
- **React 18 + Vite** — Fast HMR development
- **TailwindCSS** — Custom NidhiKosh theme with saffron palette
- **React Query** — Data fetching with auto-refetch
- **TradingView Lightweight Charts** — Candlestick + VWAP + Volume
- **Lucide React** — Icon library
- **Socket.io Client** — Live price + market status updates

## 📁 Project Structure

```
NidhiKosh/
├── server/
│   ├── config/              # DB config, env validation
│   ├── controllers/         # market (+ heatmap, movers, breadth, snapshot)
│   ├── middleware/          # Auth, validation, rate limiting
│   ├── models/
│   │   ├── Stock.model.js   # Extended: VWAP, depth, candles, circuits, turnover
│   │   └── MarketSnapshot.model.js  # NEW: Full session state at close
│   ├── routes/              # market routes (+ /status, /snapshot, /heatmap, /movers, /breadth)
│   ├── services/
│   │   ├── yahooFinance.service.js   # Enhanced: VWAP engine, depth sim, candle builder
│   │   ├── marketStatus.service.js   # NEW: IST phases, holidays, frozen mode
│   │   └── snapshot.service.js       # NEW: Capture + serve market snapshots
│   ├── socket/              # Socket.io handlers
│   ├── workers/             # Price ingestion + snapshot trigger at 15:45 IST
│   └── server.js
│
└── client/
    ├── src/
    │   ├── api/market.api.js      # Extended: status, snapshot, heatmap, movers, breadth
    │   ├── pages/
    │   │   ├── dashboard/Dashboard.jsx  # NidhiKosh Living Dashboard
    │   │   └── market/StockDetail.jsx   # TradingView chart + depth + circuits
    │   ├── context/SocketContext.jsx     # marketStatus via WebSocket
    │   └── index.css                    # Sanskrit-Cyber theme styles
    ├── tailwind.config.js              # Saffron palette, vyuha colors, glow animations
    └── index.html
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- MongoDB (local or Atlas)

### Backend
```bash
cd server
npm install
# Create .env with MONGO_URI, JWT_SECRET, FRONTEND_URL
npm run dev
```
Server starts on `http://localhost:5000`

### Frontend
```bash
cd client
npm install
npm run dev
```
Client starts on `http://localhost:5173`

## 🔌 API Endpoints

### Auth
- `POST /api/auth/register` — Register
- `POST /api/auth/login` — Login
- `GET /api/auth/me` — Current user
- `PUT /api/auth/reset-balance` — Reset to ₹1L

### Market (Core)
- `GET /api/market/stocks` — All stocks (paginated)
- `GET /api/market/stocks/:symbol` — Full detail (VWAP, depth, candles, circuits)
- `GET /api/market/stocks/:symbol/history` — OHLCV history for charts
- `GET /api/market/search?q=query` — Search stocks
- `GET /api/market/nifty50` — NIFTY 50 stocks
- `GET /api/market/sectors` — Sector summary

### Market (NidhiKosh)
- `GET /api/market/status` — Market phase, IST time, frozen mode flag
- `GET /api/market/snapshot` — Latest MarketSnapshot (indices, breadth, heatmap, movers)
- `GET /api/market/heatmap` — Live sector heatmap with per-stock breakdown
- `GET /api/market/movers` — Top gainers/losers/volume shockers/value leaders
- `GET /api/market/breadth` — Advance/decline ratio + sentiment
- `POST /api/market/snapshot/capture` — Force snapshot capture (admin)

### Trading
- `POST /api/trade/buy` — Buy stock
- `POST /api/trade/sell` — Sell stock
- `GET /api/trade/history` — Trade history

### Portfolio
- `GET /api/portfolio` — Holdings
- `GET /api/portfolio/summary` — Portfolio summary
- `GET /api/portfolio/allocation` — Sector allocation

### Leaderboard & Analytics
- `GET /api/leaderboard` — Top users
- `GET /api/leaderboard/me` — My rank
- `GET /api/analytics/pnl` — P&L chart data
- `GET /api/analytics/trades` — Trade statistics

## 🔐 Environment Variables

### Backend (.env)
```env
PORT=5000
MONGO_URI=mongodb+srv://...
JWT_SECRET=your_jwt_secret
JWT_EXPIRE=7d
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
```

### Frontend (.env)
```env
VITE_API_URL=http://localhost:5000
VITE_SOCKET_URL=http://localhost:5000
```

## 📊 Stock Universe (20 NIFTY 50 Stocks)

RELIANCE, TCS, INFY, HDFCBANK, ICICIBANK, WIPRO, SBIN, TATAPOWER, TATASTEEL, HINDUNILVR, BAJFINANCE, ADANIENT, MARUTI, SUNPHARMA, ONGC, POWERGRID, COALINDIA, NTPC, LT, AXISBANK

## 🎨 Design System

| Token | Color | Usage |
|-------|-------|-------|
| `saffron` | `#ff9933` | Primary accent, borders, glows |
| `primary-400` | `#facc15` | Gold highlights, gradient text |
| `dark-900` | `#0a0e1a` | Background |
| `dark-800` | `#131b2e` | Card surfaces |
| `profit` | `#22c55e` | Positive change |
| `loss` | `#ef4444` | Negative change |
| `accent-400` | `#2dd4bf` | Cyber teal secondary |

## 📝 License

MIT License

## 🙏 Credits

- Market data: Yahoo Finance API
- Charts: [TradingView Lightweight Charts](https://github.com/nickaknudson/lightweight-charts)
- Icons: Lucide React
- UI: TailwindCSS
- Fonts: Inter + JetBrains Mono

---

**NidhiKosh — The market never sleeps. Neither does the dashboard.**

Built with the MERN stack + Socket.io + TradingView Lightweight Charts
