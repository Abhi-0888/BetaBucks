import dotenv from 'dotenv';
dotenv.config();

const requiredEnvVars = ['MONGO_URI', 'JWT_SECRET'];

export const validateEnv = () => {
  const missing = requiredEnvVars.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    console.error(`❌ Missing required environment variables: ${missing.join(', ')}`);
    process.exit(1);
  }
  console.log('✅ Environment variables validated');
};

export const env = {
  PORT: process.env.PORT || 5000,
  MONGO_URI: process.env.MONGO_URI,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRE: process.env.JWT_EXPIRE || '7d',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
  NODE_ENV: process.env.NODE_ENV || 'development',
  YAHOO_FINANCE_BASE_URL: process.env.YAHOO_FINANCE_BASE_URL || 'https://query1.finance.yahoo.com',
  DEFAULT_STOCKS: process.env.DEFAULT_STOCKS?.split(',') || [
    'RELIANCE.NS', 'TCS.NS', 'INFY.NS', 'HDFCBANK.NS', 'ICICIBANK.NS',
    'WIPRO.NS', 'SBIN.NS', 'TATAPOWER.NS', 'TATASTEEL.NS', 'HINDUNILVR.NS',
    'BAJFINANCE.NS', 'ADANIENT.NS', 'MARUTI.NS', 'SUNPHARMA.NS', 'ONGC.NS',
    'POWERGRID.NS', 'COALINDIA.NS', 'NTPC.NS', 'LT.NS', 'AXISBANK.NS'
  ],
  isDevelopment: () => process.env.NODE_ENV === 'development',
  isProduction: () => process.env.NODE_ENV === 'production',
};

export default env;
