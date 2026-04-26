# BetaBucks - Complete Technical Guide

## 📋 Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Data Flow Diagram](#data-flow-diagram)
3. [Backend Architecture](#backend-architecture)
4. [Frontend Architecture](#frontend-architecture)
5. [Database Models](#database-models)
6. [External APIs](#external-apis)
7. [Core Functions Reference](#core-functions-reference)
8. [Trade Execution Flow](#trade-execution-flow)
9. [Real-time System](#real-time-system)
10. [Market Hours System](#market-hours-system)
11. [Authentication Flow](#authentication-flow)
12. [API Endpoints](#api-endpoints)
13. [Utility Functions](#utility-functions)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              CLIENT (React)                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │   Dashboard  │  │    Market    │  │  Portfolio   │  │    Auth      │ │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘ │
│                                                                          │
│  React Context: AuthContext, SocketContext                              │
│  React Query: usePortfolio, useLeaderboard                              │
│  Custom Hooks: useLivePrice, useAuth                                     │
│  API Layer: axiosInstance (interceptors)                                │
└─────────────────────────────────────────────────────────────────────────┘
                                    │ HTTP/WebSocket
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           SERVER (Node.js/Express)                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │   Routes     │  │ Controllers  │  │   Services   │  │   Workers    │ │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘ │
│                                                                          │
│  Middleware: auth, rateLimiter, errorHandler, validate                  │
│  Socket.io: Real-time price updates, trade confirmations                │
│  External APIs: Yahoo Finance                                          │
└─────────────────────────────────────────────────────────────────────────┘
                                    │ Mongoose
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         DATABASE (MongoDB)                               │
│                                                                          │
│  Collections: Users, Stocks, Portfolios, Transactions                    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow Diagram

### 1. User Login Flow
```
User enters credentials
        │
        ▼
POST /api/auth/login (auth.controller.js::loginUser)
        │
        ├──► Verify password using bcrypt.compare()
        │
        ├──► Generate JWT token (jwt.sign)
        │
        └──► Return { token, user }
        │
        ▼
Store token in localStorage (AuthContext.jsx::login)
        │
        ▼
Set Authorization header on all requests (axiosInstance.js)
```

### 2. Stock Price Update Flow
```
PriceIngestionWorker (priceIngestion.worker.js)
        │
        ├──► Runs every 10 seconds (market hours only)
        │
        ├──► Fetches from Yahoo Finance API (yahooFinance.service.js::fetchBatchQuotes)
        │
        ├──► Updates Stock collection in MongoDB
        │
        └──► Emits 'price_update' via Socket.io
                    │
                    ▼
        Client receives via SocketContext.jsx
                    │
                    ├──► Updates React Query cache
                    ├──► Triggers useLivePrice hook
                    └──► UI shows price flash animation
```

### 3. Buy Stock Flow
```
User clicks Buy
        │
        ▼
POST /api/trade/buy (trade.routes.js)
        │
        ├──► verifyJWT middleware (auth.middleware.js)
        ├──► tradeLimiter middleware (rateLimiter.middleware.js)
        └──► validate middleware
        │
        ▼
buyStock controller (trade.controller.js)
        │
        ├──► Check market hours (marketStatus.service.js::isMarketOpen)
        │
        ├──► Fetch fresh price (yahooFinance.service.js::fetchSingleQuote)
        │
        ├──► Calculate total cost (tradeCalculations.js::calcBuyCost)
        │
        ├──► Atomic balance check & deduction (User.findOneAndUpdate)
        │
        ├──► Create Transaction document
        │
        ├──► Update/Create Portfolio (calcNewAvgCost for new average)
        │
        └──► Emit trade_confirmed via socket
        │
        ▼
Invalidate React Query cache (usePortfolio hook)
        │
        ▼
UI updates: Balance decreases, Holdings update
```

---

## Backend Architecture

### Directory Structure
```
server/
├── app.js                    # Express app configuration
├── server.js                 # Entry point, starts HTTP + Socket.io
├── config/
│   ├── db.js                 # MongoDB connection
│   └── env.js                # Environment variables
├── controllers/              # Business logic layer
│   ├── auth.controller.js    # Authentication
│   ├── market.controller.js  # Market data
│   ├── trade.controller.js   # Buy/Sell operations
│   ├── portfolio.controller.js
│   ├── leaderboard.controller.js
│   └── analytics.controller.js
├── models/                   # Mongoose schemas
│   ├── User.model.js
│   ├── Stock.model.js
│   ├── Portfolio.model.js
│   ├── Transaction.model.js
│   └── index.js             # Barrel export
├── routes/                   # Route definitions
│   ├── auth.routes.js
│   ├── market.routes.js
│   ├── trade.routes.js
│   └── portfolio.routes.js
├── middleware/              # Express middleware
│   ├── auth.middleware.js     # JWT verification
│   ├── rateLimiter.middleware.js
│   ├── errorHandler.middleware.js
│   └── validate.middleware.js
├── services/                 # Business services
│   ├── yahooFinance.service.js   # External API
│   ├── marketStatus.service.js   # Trading hours
│   └── leaderboard.service.js
├── utils/                    # Helper functions
│   ├── tradeCalculations.js  # P&L, cost calculations
│   ├── ApiResponse.js        # Response formatters
│   └── ApiError.js           # Error handling
├── socket/                   # Socket.io handlers
│   └── socket.handler.js
└── workers/                  # Background jobs
    ├── priceIngestion.worker.js
    └── stockSeeder.worker.js
```

---

## Database Models

### 1. User Model (`server/models/User.model.js`)

**Purpose:** Stores user accounts, authentication, and virtual balance.

**Schema:**
```javascript
{
  _id: ObjectId,
  email: String (unique, required),
  name: String (required),
  passwordHash: String (required),
  virtualBalance: Number (default: 100000),
  isActive: Boolean (default: true),
  role: String (enum: ['user', 'admin'], default: 'user'),
  createdAt: Date,
  updatedAt: Date
}
```

**Methods:**
- `comparePassword(candidatePassword)` - Async, uses bcrypt.compare()
- `getTotalPortfolioValue()` - Calculates from Portfolio collection

**Pre-save Hook:**
```javascript
userSchema.pre('save', async function(next) {
  if (this.isModified('passwordHash')) {
    this.passwordHash = await bcrypt.hash(this.passwordHash, 10);
  }
  next();
});
```

---

### 2. Stock Model (`server/models/Stock.model.js`)

**Purpose:** Stores current stock prices and market data.

**Schema:**
```javascript
{
  _id: ObjectId,
  symbol: String (unique, uppercase, index),
  shortName: String,
  sector: String,
  currentPrice: Number,
  previousClose: Number,
  change: Number,
  changePercent: Number,
  dayHigh: Number,
  dayLow: Number,
  volume: Number,
  marketCap: Number,
  pe: Number,
  pb: Number,
  marketDepth: {
    bids: [{ price: Number, qty: Number, orders: Number }],
    asks: [{ price: Number, qty: Number, orders: Number }],
    totalBuyQty: Number,
    totalSellQty: Number
  },
  lastUpdated: Date (index)
}
```

**Indexes:**
- `symbol` - Unique lookup
- `lastUpdated` - For fetching recently updated
- `sector` + `currentPrice` - For filtering/sorting

---

### 3. Portfolio Model (`server/models/Portfolio.model.js`)

**Purpose:** Tracks user's stock holdings with average cost calculation.

**Schema:**
```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: 'User', index),
  symbol: String (index),
  quantity: Number (default: 0),
  averageCostPrice: Number (default: 0),
  totalInvested: Number (default: 0),
  sector: String,
  createdAt: Date,
  updatedAt: Date
}
```

**Compound Index:** `{ userId: 1, symbol: 1 }` - Unique (one entry per user per stock)

**Methods:**
```javascript
// Calculate new weighted average after buy
calculateNewAverageCost(oldQty, oldAvg, newQty, newPrice) {
  if (oldQty === 0) return newPrice;
  const totalValue = (oldQty * oldAvg) + (newQty * newPrice);
  return totalValue / (oldQty + newQty);
}

// Calculate unrealized P&L
calculateUnrealizedPnL(currentMarketPrice) {
  const marketValue = this.quantity * currentMarketPrice;
  const investedValue = this.quantity * this.averageCostPrice;
  return {
    unrealizedPnL: marketValue - investedValue,
    unrealizedPnLPercent: ((marketValue - investedValue) / investedValue) * 100
  };
}
```

---

### 4. Transaction Model (`server/models/Transaction.model.js`)

**Purpose:** Records all buy/sell trades for history and analytics.

**Schema:**
```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: 'User', index),
  symbol: String,
  type: String (enum: ['BUY', 'SELL']),
  quantity: Number,
  pricePerShare: Number,
  totalAmount: Number,
  balanceBefore: Number,
  balanceAfter: Number,
  realisedPnL: Number,        // Only for SELL
  status: String (enum: ['EXECUTED', 'PENDING', 'CANCELLED', 'FAILED']),
  executedAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

**Static Methods:**
```javascript
// Get trading statistics with aggregation pipeline
getTradeStats(userId) {
  return this.aggregate([
    { $match: { userId: ObjectId(userId) } },
    {
      $group: {
        _id: null,
        totalTrades: { $sum: 1 },
        buyCount: { $sum: { $cond: [{ $eq: ['$type', 'BUY'] }, 1, 0] } },
        sellCount: { $sum: { $cond: [{ $eq: ['$type', 'SELL'] }, 1, 0] } },
        profitableSells: { $sum: { 
          $cond: [{ $and: [{ $eq: ['$type', 'SELL'] }, { $gt: ['$realisedPnL', 0] }] }, 1, 0] 
        }},
        totalRealisedPnL: { $sum: { 
          $cond: [{ $eq: ['$type', 'SELL'] }, '$realisedPnL', 0] 
        }}
      }
    }
  ]);
}
```

---

## External APIs

### Yahoo Finance API (`server/services/yahooFinance.service.js`)

**Purpose:** Fetch real-time stock prices for NSE (National Stock Exchange) stocks.

**Endpoints Used:**
```
https://query1.finance.yahoo.com/v8/finance/chart/{SYMBOL}?interval=1d&range=1d

Examples:
- RELIANCE.NS  (Reliance Industries)
- TCS.NS       (Tata Consultancy Services)
- ^NSEI        (NIFTY 50 Index)
- ^NSEBANK     (Bank NIFTY Index)
```

**Functions:**

#### `fetchBatchQuotes(symbols)`
```javascript
// Input: ['RELIANCE.NS', 'TCS.NS', 'INFY.NS']
// Output: Array of quote objects

const fetchBatchQuotes = async (symbols) => {
  const results = [];
  
  for (const symbol of symbols) {
    for (const baseUrl of YAHOO_BASE_URLS) {
      try {
        const url = `${baseUrl}/v8/finance/chart/${symbol}?interval=1d&range=1d`;
        const response = await axios.get(url, { timeout: 5000 });
        
        const result = response.data.chart.result?.[0];
        if (!result) continue;
        
        const meta = result.meta;
        
        results.push({
          symbol,
          currentPrice: meta.regularMarketPrice,
          previousClose: meta.previousClose,
          change: meta.regularMarketPrice - meta.previousClose,
          changePercent: ((meta.regularMarketPrice - meta.previousClose) / meta.previousClose) * 100,
          dayHigh: meta.regularMarketDayHigh,
          dayLow: meta.regularMarketDayLow,
          volume: meta.regularMarketVolume,
        });
        
        break; // Success, move to next symbol
      } catch (error) {
        continue; // Try next base URL
      }
    }
  }
  
  return results;
};
```

#### `fetchSingleQuote(symbol)`
Same as above but for single stock. Called during trade execution to get most current price.

#### Fallback Simulation
If Yahoo Finance fails, uses stored base prices with random walk simulation:
```javascript
const updatePrice = (symbol) => {
  const stock = STOCK_DATA[symbol];
  const prev = currentPrices.get(symbol) || stock.basePrice;
  
  // Random walk with mean reversion
  const drift = (stock.basePrice - prev) * 0.001;
  const volatility = stock.volatility * prev;
  const change = (Math.random() - 0.5) * volatility + drift;
  
  let newPrice = prev + change;
  newPrice = Math.max(newPrice, stock.basePrice * 0.7);  // Floor
  newPrice = Math.min(newPrice, stock.basePrice * 1.3);  // Ceiling
  
  return Math.round(newPrice * 100) / 100;
};
```

---

## Core Functions Reference

### Authentication Functions

#### `generateToken(userId)` - `server/middleware/auth.middleware.js`
```javascript
import jwt from 'jsonwebtoken';

export const generateToken = (userId) => {
  return jwt.sign(
    { id: userId },
    env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};
```
**Returns:** JWT string (encoded header.payload.signature)

---

#### `verifyJWT(req, res, next)` - `server/middleware/auth.middleware.js`
```javascript
export const verifyJWT = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token' });
    }
    
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, env.JWT_SECRET);
    
    const user = await User.findById(decoded.id).select('-passwordHash');
    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: 'Invalid user' });
    }
    
    req.user = user;
    req.userId = user._id;
    next();
    
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expired' });
    }
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
};
```

---

### Market Status Functions

#### `getMarketPhase()` - `server/services/marketStatus.service.js`
```javascript
export const getMarketPhase = () => {
  const ist = getISTNow();
  const istMinutes = ist.hours * 60 + ist.minutes;
  const day = ist.day;
  
  // Check if weekend
  if (day === 0 || day === 6) return MarketPhase.CLOSED;
  
  // Market hours in IST (9:15 AM - 3:30 PM)
  const MARKET_OPEN = 9 * 60 + 15;    // 555 minutes
  const MARKET_CLOSE = 15 * 60 + 30;  // 930 minutes
  
  if (istMinutes >= PRE_OPEN_START && istMinutes < MARKET_OPEN) {
    return MarketPhase.PRE_OPEN;
  }
  if (istMinutes >= MARKET_OPEN && istMinutes < MARKET_CLOSE) {
    return MarketPhase.OPEN;
  }
  if (istMinutes >= MARKET_CLOSE && istMinutes < POST_CLOSE_END) {
    return MarketPhase.POST_CLOSE;
  }
  
  return MarketPhase.CLOSED;
};
```

**Phases:**
- `PRE_OPEN`: 9:00 AM - 9:15 AM IST
- `OPEN`: 9:15 AM - 3:30 PM IST
- `POST_CLOSE`: 3:30 PM - 3:45 PM IST
- `CLOSED`: All other times + weekends

---

#### `isMarketOpen()`
```javascript
export const isMarketOpen = () => {
  return getMarketPhase() === MarketPhase.OPEN;
};
```

Used in `trade.controller.js` to block trades outside market hours.

---

### Trade Calculation Functions

#### `calcBuyCost(quantity, pricePerShare)` - `server/utils/tradeCalculations.js`
```javascript
export const calcBuyCost = (quantity, pricePerShare) => {
  const grossAmount = quantity * pricePerShare;
  const brokerage = Math.min(grossAmount * 0.0005, 20);  // 0.05% max ₹20
  const stt = grossAmount * 0.001;  // Securities Transaction Tax 0.1%
  const gst = (brokerage + 0) * 0.18;  // GST 18%
  const sebiCharges = grossAmount * 0.000001;  // SEBI charges
  const stampDuty = grossAmount * 0.00015;  // Stamp duty
  
  return {
    grossAmount,
    brokerage,
    stt,
    gst,
    sebiCharges,
    stampDuty,
    totalCost: grossAmount + brokerage + stt + gst + sebiCharges + stampDuty
  };
};
```

---

#### `calcNewAvgCost(oldQty, oldAvg, newQty, newPrice)`
```javascript
export const calcNewAvgCost = (oldQty, oldAvg, newQty, newPrice) => {
  if (oldQty === 0) return newPrice;
  
  const oldValue = oldQty * oldAvg;
  const newValue = newQty * newPrice;
  const totalQty = oldQty + newQty;
  
  return (oldValue + newValue) / totalQty;
};
```

**Example:**
- Held: 10 shares @ ₹100 = ₹1000
- Buy: 5 more @ ₹120 = ₹600
- New average: (1000 + 600) / 15 = ₹106.67

---

#### `calcRealisedPnL(sellPrice, avgCost, quantity)`
```javascript
export const calcRealisedPnL = (sellPrice, avgCost, quantity) => {
  return (sellPrice - avgCost) * quantity;
};
```

**Example:**
- Average cost: ₹100
- Sell price: ₹120
- Quantity: 10
- Realized P&L: (120 - 100) × 10 = ₹200 profit

---

#### `calcUnrealisedPnL(currentPrice, avgCost, quantity)`
```javascript
export const calcUnrealisedPnL = (currentPrice, avgCost, quantity) => {
  return (currentPrice - avgCost) * quantity;
};
```

---

#### `formatINR(amount)`
```javascript
export const formatINR = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};
// Result: ₹1,23,456.78
```

---

## Trade Execution Flow

### Buy Stock Flow

```javascript
// 1. Route receives request
// POST /api/trade/buy
// Body: { symbol: "RELIANCE.NS", quantity: 10 }

// 2. Middleware chain
verifyJWT → tradeLimiter → validate

// 3. Controller: buyStock (server/controllers/trade.controller.js)
export const buyStock = asyncHandler(async (req, res) => {
  const { symbol, quantity } = req.body;
  const userId = req.userId;
  
  // 4. Check market hours
  if (!isMarketOpen()) {
    return res.status(400).json({
      success: false,
      message: `Market is ${getMarketPhase()}. Trading allowed 9:15 AM - 3:30 PM IST`
    });
  }
  
  // 5. Validate quantity
  if (quantity < 1 || quantity > 10000) {
    return res.status(400).json({
      success: false,
      message: 'Quantity must be between 1 and 10,000'
    });
  }
  
  // 6. Get current stock data
  const stock = await Stock.findOne({ symbol: symbol.toUpperCase() });
  if (!stock) {
    return res.status(404).json({ success: false, message: 'Stock not found' });
  }
  
  // 7. Fetch fresh price from Yahoo Finance
  const freshQuote = await fetchSingleQuote(symbol.toUpperCase());
  const livePrice = freshQuote?.currentPrice || stock.currentPrice;
  
  // 8. Calculate costs
  const costs = calcBuyCost(quantity, livePrice);
  
  // 9. Atomic balance check and deduction
  const updatedUser = await User.findOneAndUpdate(
    { 
      _id: userId, 
      virtualBalance: { $gte: costs.totalCost }  // Ensure sufficient balance
    },
    { 
      $inc: { virtualBalance: -costs.totalCost }  // Atomic decrement
    },
    { new: true, session }
  );
  
  if (!updatedUser) {
    return res.status(400).json({ success: false, message: 'Insufficient balance' });
  }
  
  // 10. Get or create portfolio entry
  let portfolio = await Portfolio.findOne({ userId, symbol });
  
  if (portfolio) {
    // Update existing holding with new average cost
    const newAvgCost = calcNewAvgCost(
      portfolio.quantity,
      portfolio.averageCostPrice,
      quantity,
      livePrice
    );
    
    portfolio.quantity += quantity;
    portfolio.averageCostPrice = newAvgCost;
    portfolio.totalInvested += costs.totalCost;
    await portfolio.save();
  } else {
    // Create new portfolio entry
    portfolio = await Portfolio.create({
      userId,
      symbol,
      quantity,
      averageCostPrice: livePrice,
      totalInvested: costs.totalCost,
      sector: stock.sector
    });
  }
  
  // 11. Record transaction
  const transaction = await Transaction.create({
    userId,
    symbol,
    type: 'BUY',
    quantity,
    pricePerShare: livePrice,
    totalAmount: costs.totalCost,
    balanceBefore: updatedUser.virtualBalance + costs.totalCost,
    balanceAfter: updatedUser.virtualBalance,
    status: 'EXECUTED',
    executedAt: new Date()
  });
  
  // 12. Emit real-time confirmation
  emitTradeConfirmation(userId, {
    type: 'BUY',
    symbol,
    qty: quantity,
    price: livePrice,
    total: costs.totalCost
  });
  
  // 13. Send response
  res.status(200).json({
    success: true,
    data: {
      transaction,
      portfolio,
      remainingBalance: updatedUser.virtualBalance,
      costs
    },
    message: `Successfully bought ${quantity} shares of ${symbol}`
  });
});
```

---

### Sell Stock Flow

```javascript
export const sellStock = asyncHandler(async (req, res) => {
  const { symbol, quantity } = req.body;
  const userId = req.userId;
  
  // 1. Check market hours
  if (!isMarketOpen()) {
    return res.status(400).json({
      success: false,
      message: `Market is ${getMarketPhase()}`
    });
  }
  
  // 2. Verify holdings
  const portfolio = await Portfolio.findOne({ userId, symbol });
  if (!portfolio || portfolio.quantity < quantity) {
    return res.status(400).json({
      success: false,
      message: `You only hold ${portfolio?.quantity || 0} shares`
    });
  }
  
  // 3. Get live price
  const freshQuote = await fetchSingleQuote(symbol.toUpperCase());
  const sellPrice = freshQuote?.currentPrice;
  
  // 4. Calculate proceeds and P&L
  const proceeds = quantity * sellPrice;
  const realisedPnL = calcRealisedPnL(sellPrice, portfolio.averageCostPrice, quantity);
  
  // 5. Credit balance
  await User.findByIdAndUpdate(userId, {
    $inc: { virtualBalance: proceeds }
  });
  
  // 6. Update portfolio
  portfolio.quantity -= quantity;
  portfolio.totalInvested -= (portfolio.averageCostPrice * quantity);
  
  if (portfolio.quantity === 0) {
    portfolio.isActive = false;
    portfolio.averageCostPrice = 0;
    portfolio.totalInvested = 0;
  }
  await portfolio.save();
  
  // 7. Record transaction with realised P&L
  const transaction = await Transaction.create({
    userId,
    symbol,
    type: 'SELL',
    quantity,
    pricePerShare: sellPrice,
    totalAmount: proceeds,
    balanceBefore: user.virtualBalance,
    balanceAfter: user.virtualBalance + proceeds,
    realisedPnL,
    status: 'EXECUTED'
  });
  
  // 8. Emit confirmation with P&L
  emitTradeConfirmation(userId, {
    type: 'SELL',
    symbol,
    qty: quantity,
    price: sellPrice,
    pnl: realisedPnL
  });
  
  res.status(200).json({
    success: true,
    data: { transaction, portfolio, realisedPnL },
    message: `Sold ${quantity} shares of ${symbol} ${realisedPnL >= 0 ? 'at profit' : 'at loss'}`
  });
});
```

---

## Real-time System

### Socket.io Architecture

**Server-side (`server/socket/socket.handler.js`):**

```javascript
let io = null;

export const initializeSocket = (socketIo) => {
  io = socketIo;
  
  io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);
    
    // Authenticate socket with JWT
    socket.on('authenticate', async (data) => {
      const { token } = data;
      const decoded = jwt.verify(token, env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      
      if (!user) {
        socket.emit('auth_error', { message: 'Invalid user' });
        return;
      }
      
      // Join user's personal room
      socket.join(user._id.toString());
      socket.userId = user._id.toString();
      socket.emit('authenticated', { success: true });
    });
    
    // Subscribe to stock updates
    socket.on('subscribe_stock', (data) => {
      const { symbol } = data;
      socket.join(`stock:${symbol}`);
    });
    
    // Unsubscribe
    socket.on('unsubscribe_stock', (data) => {
      socket.leave(`stock:${data.symbol}`);
    });
    
    // Subscribe to leaderboard
    socket.on('subscribe_leaderboard', () => {
      socket.join('leaderboard');
    });
    
    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`);
    });
  });
};

// Emit functions called from controllers/workers
export const emitPriceUpdate = (symbol, data) => {
  io.to(`stock:${symbol}`).emit('price_update', { symbol, ...data });
};

export const emitTradeConfirmation = (userId, data) => {
  io.to(userId.toString()).emit('trade_confirmed', data);
};

export const emitPortfolioUpdate = (userId) => {
  io.to(userId.toString()).emit('portfolio_update');
};

export const emitLeaderboardUpdate = () => {
  io.to('leaderboard').emit('leaderboard_update');
};
```

---

**Client-side (`client/src/context/SocketContext.jsx`):**

```javascript
const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const { isAuthenticated } = useAuth();
  
  useEffect(() => {
    // Connect to server
    const newSocket = io(SOCKET_URL, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
    
    setSocket(newSocket);
    
    // Connection events
    newSocket.on('connect', () => {
      setIsConnected(true);
      
      // Authenticate if logged in
      const token = localStorage.getItem('token');
      if (token) {
        newSocket.emit('authenticate', { token });
      }
    });
    
    newSocket.on('disconnect', () => {
      setIsConnected(false);
    });
    
    // Trade confirmations
    newSocket.on('trade_confirmed', (data) => {
      const message = data.type === 'BUY'
        ? `Bought ${data.qty} shares of ${data.symbol}`
        : `Sold ${data.qty} shares of ${data.symbol} (P&L: ₹${data.pnl?.toFixed(2)})`;
      
      toast.success(message);
    });
    
    newSocket.on('trade_error', (error) => {
      toast.error(error.message);
    });
    
    return () => newSocket.close();
  }, []);
  
  // Subscribe functions
  const subscribeToStock = useCallback((symbol) => {
    if (socket) socket.emit('subscribe_stock', { symbol });
  }, [socket]);
  
  const unsubscribeFromStock = useCallback((symbol) => {
    if (socket) socket.emit('unsubscribe_stock', { symbol });
  }, [socket]);
  
  const subscribeToLeaderboard = useCallback(() => {
    if (socket) socket.emit('subscribe_leaderboard');
  }, [socket]);
  
  return (
    <SocketContext.Provider value={{
      socket,
      isConnected,
      subscribeToStock,
      unsubscribeFromStock,
      subscribeToLeaderboard
    }}>
      {children}
    </SocketContext.Provider>
  );
};
```

---

### Price Ingestion Worker

**File:** `server/workers/priceIngestion.worker.js`

**Purpose:** Background job that fetches stock prices every 10 seconds during market hours.

```javascript
const STOCK_SYMBOLS = [
  'RELIANCE.NS', 'TCS.NS', 'INFY.NS', 'HDFCBANK.NS',
  'ICICIBANK.NS', 'WIPRO.NS', 'SBIN.NS', 'TATAPOWER.NS',
  'TATASTEEL.NS', 'HINDUNILVR.NS', 'BAJFINANCE.NS',
  'ADANIENT.NS', 'MARUTI.NS', 'SUNPHARMA.NS',
  'ONGC.NS', 'POWERGRID.NS', 'COALINDIA.NS',
  'NTPC.NS', 'LT.NS', 'AXISBANK.NS'
];

const fetchAndUpdatePrices = async () => {
  // Skip if market is closed
  if (!isMarketOpen() && !shouldServeFrozenData()) {
    console.log('Market closed. Skipping price fetch.');
    return;
  }
  
  try {
    // Fetch all quotes
    const quotes = await fetchBatchQuotes(STOCK_SYMBOLS);
    
    // Update database and emit updates
    for (const quote of quotes) {
      // Update Stock document
      await Stock.findOneAndUpdate(
        { symbol: quote.symbol },
        {
          currentPrice: quote.currentPrice,
          previousClose: quote.previousClose,
          change: quote.change,
          changePercent: quote.changePercent,
          dayHigh: quote.dayHigh,
          dayLow: quote.dayLow,
          volume: quote.volume,
          lastUpdated: new Date()
        }
      );
      
      // Emit to subscribed clients
      emitPriceUpdate(quote.symbol, {
        price: quote.currentPrice,
        change: quote.change,
        changePercent: quote.changePercent,
        dayHigh: quote.dayHigh,
        dayLow: quote.dayLow,
        volume: quote.volume,
        timestamp: Date.now()
      });
    }
    
    console.log(`Updated ${quotes.length} stock prices`);
    
  } catch (error) {
    console.error('Price update failed:', error);
  }
};

// Run immediately and every 10 seconds
fetchAndUpdatePrices();
setInterval(fetchAndUpdatePrices, 10000);
```

---

## Market Hours System

### IST Time Handling

**Function:** `getISTNow()` - `server/services/marketStatus.service.js`

```javascript
export const getISTNow = () => {
  const now = new Date();
  
  // Convert to IST (UTC+5:30)
  const istString = now.toLocaleString('en-US', {
    timeZone: 'Asia/Kolkata',
    hour12: false
  });
  
  const [datePart, timePart] = istString.split(', ');
  const [month, day, year] = datePart.split('/').map(Number);
  const [hours, minutes, seconds] = timePart.split(':').map(Number);
  
  return {
    year,
    month,
    day,
    hours,
    minutes,
    seconds,
    date: new Date(year, month - 1, day, hours, minutes, seconds)
  };
};
```

---

### Trading Day Check

```javascript
const isTradingDay = (istDate) => {
  const day = istDate.getDay();
  return day !== 0 && day !== 6;  // Not Sunday(0) or Saturday(6)
};
```

---

### Market Phase Detection

```javascript
const MarketPhase = {
  PRE_OPEN: 'PRE_OPEN',      // 9:00 - 9:15 AM
  OPEN: 'OPEN',              // 9:15 AM - 3:30 PM
  POST_CLOSE: 'POST_CLOSE',  // 3:30 - 3:45 PM
  CLOSED: 'CLOSED'           // All other times
};

const MARKET_OPEN = 9 * 60 + 15;   // 555 minutes from midnight
const MARKET_CLOSE = 15 * 60 + 30; // 930 minutes from midnight
const PRE_OPEN_START = 9 * 60;      // 540 minutes (9:00 AM)
const POST_CLOSE_END = 15 * 60 + 45; // 945 minutes (3:45 PM)

export const getMarketPhase = () => {
  const ist = getISTNow();
  
  if (!isTradingDay(ist.date)) {
    return MarketPhase.CLOSED;
  }
  
  const minutes = ist.hours * 60 + ist.minutes;
  
  if (minutes >= PRE_OPEN_START && minutes < MARKET_OPEN) {
    return MarketPhase.PRE_OPEN;
  }
  if (minutes >= MARKET_OPEN && minutes < MARKET_CLOSE) {
    return MarketPhase.OPEN;
  }
  if (minutes >= MARKET_CLOSE && minutes < POST_CLOSE_END) {
    return MarketPhase.POST_CLOSE;
  }
  
  return MarketPhase.CLOSED;
};
```

---

### Market Status API Response

```javascript
// GET /api/market/status
{
  "success": true,
  "data": {
    "isOpen": true,
    "phase": "OPEN",
    "currentTime": "2026-04-23T11:30:00+05:30",
    "nextPhase": "POST_CLOSE",
    "nextPhaseAt": "15:30",
    "marketHours": {
      "open": "09:15",
      "close": "15:30"
    }
  }
}
```

---

## Authentication Flow

### Registration Flow

```
User submits form (name, email, password)
           │
           ▼
POST /api/auth/register
           │
           ├──► validate middleware (check required fields, email format)
           │
           ├──► Check if email exists (User.findOne({ email }))
           │
           ├──► Hash password (bcrypt.hash(password, 10))
           │
           ├──► Create user (User.create({ name, email, passwordHash }))
           │
           └──► Generate JWT (generateToken(user._id))
           │
           ▼
Return { success: true, token, user }
           │
           ▼
Store in localStorage (AuthContext.jsx::register)
           │
           ▼
Redirect to /dashboard
```

---

### Login Flow

```
User submits form (email, password)
           │
           ▼
POST /api/auth/login
           │
           ├──► Find user by email
           │
           ├──► Compare password (user.comparePassword(password))
           │     └──► bcrypt.compare(candidate, hash)
           │
           ├──► Check if user.isActive
           │
           └──► Generate JWT
           │
           ▼
Return { success: true, token, user }
           │
           ▼
Store in localStorage (token, user)
           │
           ▼
Set axios default Authorization header
           │
           ▼
Redirect to /dashboard
```

---

### Protected Route Verification

```
User navigates to /dashboard
           │
           ▼
ProtectedRoute component (App.jsx)
           │
           ├──► Check isAuthenticated from AuthContext
           │     └──► !!user (true if user object exists)
           │
           ├──► If not authenticated
           │     └──► <Navigate to="/login" replace />
           │
           └──► If authenticated
                └──► Render Dashboard
           │
           ▼
Dashboard API calls include Authorization: Bearer {token} header
           │
           ▼
verifyJWT middleware (server)
           │
           ├──► Extract token from Authorization header
           │
           ├──► jwt.verify(token, JWT_SECRET)
           │
           ├──► Find user by decoded.id
           │
           └──► Attach req.userId, req.user
           │
           ▼
Controller executes with authenticated user context
```

---

## API Endpoints

### Authentication
| Method | Endpoint | Middleware | Controller | Description |
|--------|----------|------------|------------|-------------|
| POST | /api/auth/register | validate | registerUser | Create new account |
| POST | /api/auth/login | validate | loginUser | Authenticate user |
| GET | /api/auth/me | verifyJWT | getCurrentUser | Get logged-in user |
| PUT | /api/auth/reset-balance | verifyJWT | resetBalance | Reset to ₹1,00,000 |

---

### Market Data
| Method | Endpoint | Controller | Description |
|--------|----------|------------|-------------|
| GET | /api/market/stocks | getAllStocks | List all stocks with prices |
| GET | /api/market/stocks/:symbol | getStockDetail | Single stock detail |
| GET | /api/market/snapshot | getMarketSnapshot | NIFTY 50, Bank NIFTY indices |
| GET | /api/market/status | getMarketStatus | Current market phase |
| GET | /api/market/search?q= | searchStocks | Search by symbol/name |
| GET | /api/market/trending | getTrendingStocks | Top gainers/losers |

---

### Trading
| Method | Endpoint | Middleware | Controller | Description |
|--------|----------|------------|------------|-------------|
| POST | /api/trade/buy | verifyJWT, tradeLimiter, validate | buyStock | Purchase shares |
| POST | /api/trade/sell | verifyJWT, tradeLimiter, validate | sellStock | Sell shares |
| GET | /api/trade/history | verifyJWT | getTransactionHistory | Past trades |

---

### Portfolio
| Method | Endpoint | Middleware | Controller | Description |
|--------|----------|------------|------------|-------------|
| GET | /api/portfolio | verifyJWT | getHoldings | Current holdings |
| GET | /api/portfolio/summary | verifyJWT | getPortfolioSummary | Stats & totals |
| GET | /api/portfolio/allocation | verifyJWT | getAllocation | Sector breakdown |

---

### Leaderboard
| Method | Endpoint | Controller | Description |
|--------|----------|------------|-------------|
| GET | /api/leaderboard?limit= | getLeaderboard | Top users by portfolio value |
| GET | /api/leaderboard/me | verifyJWT | getMyRank | Current user's rank |

---

## Utility Functions

### API Response Helpers

**File:** `server/utils/ApiResponse.js`

```javascript
class ApiResponse {
  constructor(statusCode, data, message = "Success") {
    this.statusCode = statusCode;
    this.data = data;
    this.message = message;
    this.success = statusCode < 400;
  }
}

// Usage in controllers
res.status(200).json(new ApiResponse(200, result, "Stocks fetched"));
```

---

### Error Classes

**File:** `server/utils/ApiError.js`

```javascript
class ApiError extends Error {
  constructor(statusCode, message, errors = [], stack = "") {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.success = false;
    
    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

// Usage
throw new ApiError(400, "Insufficient balance");
```

---

### Async Handler

**File:** `server/middleware/errorHandler.middleware.js`

```javascript
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Usage - eliminates try-catch boilerplate
export const buyStock = asyncHandler(async (req, res) => {
  // Async code - errors automatically caught and passed to error handler
});
```

---

### Frontend Axios Instance

**File:** `client/src/api/axiosInstance.js`

```javascript
const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' }
});

// Request interceptor - attach token
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle errors
axiosInstance.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const status = error.response?.status;
    
    if (status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    
    if (status === 429) {
      toast.error('Too many requests. Please slow down.');
    }
    
    return Promise.reject(error);
  }
);
```

---

### Number Formatting

**File:** `server/utils/tradeCalculations.js` & `client/src/utils/formatters.js`

```javascript
// Format as INR currency
export const formatINR = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2
  }).format(amount);
};
// ₹1,23,45,678.90

// Format large numbers
export const formatLargeNumber = (num) => {
  if (num >= 10000000) return `₹${(num / 10000000).toFixed(2)}Cr`;
  if (num >= 100000) return `₹${(num / 100000).toFixed(2)}L`;
  if (num >= 1000) return `₹${(num / 1000).toFixed(2)}K`;
  return `₹${num.toFixed(2)}`;
};
// ₹1.25Cr, ₹50.75L, ₹10.5K
```

---

## Key Design Decisions

### 1. Why MongoDB?
- Flexible schema for evolving stock data
- Native JSON compatibility with JavaScript
- Easy horizontal scaling for high-frequency updates
- Aggregation pipeline for complex analytics

### 2. Why Socket.io over WebSocket?
- Automatic reconnection handling
- Room-based subscriptions (efficient filtering)
- Fallback to HTTP long-polling
- Built-in authentication support

### 3. Why Yahoo Finance?
- Free tier available
- No API key required for basic usage
- Comprehensive NSE stock coverage
- Real-time price data

### 4. Atomic Updates Pattern
```javascript
// Balance check and deduction in one operation
await User.findOneAndUpdate(
  { _id: userId, virtualBalance: { $gte: cost } },  // Condition
  { $inc: { virtualBalance: -cost } },               // Atomic decrement
  { new: true }
);
```
Prevents race conditions where two simultaneous trades could overdraw.

### 5. React Query for State Management
- Automatic caching
- Background refetching
- Optimistic updates
- Stale-while-revalidate pattern

---

## File Locations Quick Reference

| Feature | File Path |
|---------|-----------|
| **Models** | `server/models/*.model.js` |
| **Controllers** | `server/controllers/*.controller.js` |
| **Routes** | `server/routes/*.routes.js` |
| **Middleware** | `server/middleware/*.middleware.js` |
| **Services** | `server/services/*.service.js` |
| **Utils** | `server/utils/*.js` |
| **React Context** | `client/src/context/*.jsx` |
| **Custom Hooks** | `client/src/hooks/*.js` |
| **API Layer** | `client/src/api/*.api.js` |
| **Pages** | `client/src/pages/*/*.jsx` |

---

*This guide covers all major technical aspects of the BetaBucks project. Each section can be referenced during viva for detailed explanations.*
