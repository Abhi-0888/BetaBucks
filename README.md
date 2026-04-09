# NidhiKosh - Real-Time Stock Market Simulator

A full-stack MERN web application that replicates the experience of live stock trading using real market prices from the National Stock Exchange of India (NSE) — with zero financial risk.

## 🚀 Features

- **Virtual Trading**: Start with ₹1,00,000 virtual balance
- **Live NSE Prices**: Real-time stock prices via Yahoo Finance API
- **Real-Time Updates**: WebSocket-powered live price ticks every 15 seconds
- **Portfolio Tracking**: Live P&L calculations with unrealized gains/losses
- **Leaderboard**: Compete with other traders ranked by portfolio value
- **Trade Analytics**: P&L charts, win rate, best/worst trades
- **Beautiful UI**: Modern dark-themed interface with Tailwind CSS
- **Mobile Responsive**: Fully responsive design for all devices

## 🏗️ Tech Stack

### Backend
- Node.js + Express.js
- MongoDB + Mongoose
- Socket.io for real-time communication
- JWT authentication
- Yahoo Finance API for live NSE data

### Frontend
- React 18 + Vite
- Tailwind CSS
- React Query for state management
- Recharts for data visualization
- Socket.io client

## 📁 Project Structure

```
NidhiKosh/
├── server/                 # Backend
│   ├── config/            # DB config, env validation
│   ├── controllers/       # Business logic
│   ├── middleware/        # Auth, validation, rate limiting
│   ├── models/           # Mongoose schemas
│   ├── routes/           # API routes
│   ├── services/         # Yahoo Finance, Leaderboard services
│   ├── socket/           # Socket.io handlers
│   ├── utils/            # Trade calculations
│   ├── workers/          # Price ingestion worker
│   ├── scripts/          # DB seeding
│   ├── app.js           # Express app setup
│   └── server.js         # Server entry point
│
└── client/                # Frontend
    ├── src/
    │   ├── api/          # API functions
    │   ├── components/   # UI components
    │   ├── context/      # Auth & Socket contexts
    │   ├── hooks/        # Custom React hooks
    │   ├── pages/        # Page components
    │   └── utils/        # Formatters
    └── index.html
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- MongoDB Atlas account (free tier works)

### 1. Clone and Setup

```bash
# Navigate to project
cd NidhiKosh
```

### 2. Backend Setup

```bash
cd server

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Edit .env with your values:
# MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/nidhikosh
# JWT_SECRET=your_super_secret_key
# FRONTEND_URL=http://localhost:5173

# Seed the database with default stocks
npm run seed

# Start the server
npm run dev
```

The backend will start on `http://localhost:5000`

### 3. Frontend Setup

```bash
cd client

# Install dependencies
npm install

# Start the dev server
npm run dev
```

The frontend will start on `http://localhost:5173`

## 📊 Default Stocks (NIFTY 50)

The app includes 20 top NIFTY 50 stocks:
- RELIANCE.NS, TCS.NS, INFY.NS, HDFCBANK.NS, ICICIBANK.NS
- WIPRO.NS, SBIN.NS, TATAMOTORS.NS, TATASTEEL.NS, HINDUNILVR.NS
- BAJFINANCE.NS, ADANIENT.NS, MARUTI.NS, SUNPHARMA.NS, ONGC.NS
- POWERGRID.NS, COALINDIA.NS, NTPC.NS, LT.NS, AXISBANK.NS

## 🔌 API Endpoints

### Auth
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/reset-balance` - Reset balance to ₹1,00,000

### Market
- `GET /api/market/stocks` - Get all stocks
- `GET /api/market/stocks/:symbol` - Get stock detail
- `GET /api/market/stocks/:symbol/history` - Get price history
- `GET /api/market/search?q=query` - Search stocks
- `GET /api/market/nifty50` - Get NIFTY 50 stocks
- `GET /api/market/sectors` - Get sector data

### Trading
- `POST /api/trade/buy` - Buy stock
- `POST /api/trade/sell` - Sell stock
- `GET /api/trade/history` - Get trade history

### Portfolio
- `GET /api/portfolio` - Get holdings
- `GET /api/portfolio/summary` - Get portfolio summary
- `GET /api/portfolio/allocation` - Get sector allocation

### Leaderboard
- `GET /api/leaderboard` - Get top users
- `GET /api/leaderboard/me` - Get my rank

### Analytics
- `GET /api/analytics/pnl` - Get P&L chart data
- `GET /api/analytics/trades` - Get trade statistics

## 🔐 Environment Variables

### Backend (.env)
```env
PORT=5000
MONGO_URI=mongodb+srv://...
JWT_SECRET=your_jwt_secret
JWT_EXPIRE=7d
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
YAHOO_FINANCE_BASE_URL=https://query1.finance.yahoo.com
```

### Frontend (.env)
```env
VITE_API_URL=http://localhost:5000
VITE_SOCKET_URL=http://localhost:5000
```

## 🎯 Key Features Implemented

### Phase 1: Project Setup ✅
- Express server with middleware
- MongoDB connection
- React + Vite frontend
- Tailwind CSS configuration

### Phase 2: Authentication ✅
- JWT-based auth
- Password hashing with bcrypt
- Protected routes
- Login/Register pages

### Phase 3: Market Data ✅
- Yahoo Finance integration
- 20 NIFTY 50 stocks seeded
- Price ingestion worker (15s interval)
- REST API for market data

### Phase 4: Real-Time Layer ✅
- Socket.io WebSocket server
- Live price updates broadcast
- Portfolio update notifications
- Trade confirmation events
- Market status (open/closed)

### Phase 5: Trading Engine ✅
- Buy/Sell order processing
- Atomic balance updates
- Portfolio tracking
- Transaction history
- Weighted average cost calculation
- Realized P&L on sells

### Phase 6: Portfolio & Analytics ✅
- Holdings view with live P&L
- Portfolio summary
- Sector allocation (pie chart)
- P&L over time chart
- Trade statistics
- Best/worst trade tracking

### Phase 7: Leaderboard ✅
- User ranking by portfolio value
- Top traders list
- My rank display
- Percentile calculation
- Real-time leaderboard updates (60s)

### Phase 8: Security & Polish ✅
- Helmet.js for security headers
- CORS configuration
- Rate limiting
- Input validation with Joi
- Error handling middleware
- Mobile responsive design

## 🚀 Deployment

### Backend (Render)
1. Push to GitHub
2. Connect to Render
3. Add environment variables
4. Deploy

### Frontend (Vercel)
1. Push to GitHub
2. Connect to Vercel
3. Set build command: `npm run build`
4. Set output directory: `dist`
5. Add environment variables
6. Deploy

## 📱 Mobile App

The frontend is fully responsive and works as a PWA. To use on mobile:
1. Open the deployed URL in your mobile browser
2. Add to home screen
3. Use like a native app

## 🎨 Design Highlights

- Dark theme with emerald accents
- Glass morphism effects
- Smooth animations
- Real-time price flash indicators
- Color-coded P&L (green/red)
- Responsive tables and charts

## 📝 License

MIT License - Feel free to use and modify!

## 🙏 Credits

- Market data from Yahoo Finance
- Icons from Lucide React
- Charts from Recharts
- UI powered by Tailwind CSS

---

**Trade virtual money. Feel real markets. Learn everything.**

Built with ❤️ using the MERN stack + Socket.io
