import mongoose from 'mongoose';
import Stock from '../models/Stock.model.js';
import env from '../config/env.js';

// Default NIFTY 50 stocks with realistic initial prices (April 2024)
const defaultStocks = [
  { symbol: 'RELIANCE.NS', shortName: 'Reliance Industries Ltd', sector: 'Energy', exchange: 'NSE', currentPrice: 2950, marketCap: 1995000 },
  { symbol: 'TCS.NS', shortName: 'Tata Consultancy Services', sector: 'IT', exchange: 'NSE', currentPrice: 4250, marketCap: 1558000 },
  { symbol: 'INFY.NS', shortName: 'Infosys Ltd', sector: 'IT', exchange: 'NSE', currentPrice: 1480, marketCap: 612000 },
  { symbol: 'HDFCBANK.NS', shortName: 'HDFC Bank Ltd', sector: 'Banking', exchange: 'NSE', currentPrice: 1520, marketCap: 1150000 },
  { symbol: 'ICICIBANK.NS', shortName: 'ICICI Bank Ltd', sector: 'Banking', exchange: 'NSE', currentPrice: 1080, marketCap: 760000 },
  { symbol: 'WIPRO.NS', shortName: 'Wipro Ltd', sector: 'IT', exchange: 'NSE', currentPrice: 465, marketCap: 243000 },
  { symbol: 'SBIN.NS', shortName: 'State Bank of India', sector: 'Banking', exchange: 'NSE', currentPrice: 890, marketCap: 794000 },
  { symbol: 'TATAPOWER.NS', shortName: 'Tata Power Company Ltd', sector: 'Utilities', exchange: 'NSE', currentPrice: 410, marketCap: 131000 },
  { symbol: 'TATASTEEL.NS', shortName: 'Tata Steel Ltd', sector: 'Metals', exchange: 'NSE', currentPrice: 168, marketCap: 209000 },
  { symbol: 'HINDUNILVR.NS', shortName: 'Hindustan Unilever Ltd', sector: 'FMCG', exchange: 'NSE', currentPrice: 2320, marketCap: 543000 },
  { symbol: 'BAJFINANCE.NS', shortName: 'Bajaj Finance Ltd', sector: 'Finance', exchange: 'NSE', currentPrice: 7020, marketCap: 439000 },
  { symbol: 'ADANIENT.NS', shortName: 'Adani Enterprises Ltd', sector: 'Conglomerate', exchange: 'NSE', currentPrice: 3340, marketCap: 380000 },
  { symbol: 'MARUTI.NS', shortName: 'Maruti Suzuki India Ltd', sector: 'Auto', exchange: 'NSE', currentPrice: 12750, marketCap: 382000 },
  { symbol: 'SUNPHARMA.NS', shortName: 'Sun Pharmaceutical Ltd', sector: 'Pharma', exchange: 'NSE', currentPrice: 1780, marketCap: 426000 },
  { symbol: 'ONGC.NS', shortName: 'ONGC Ltd', sector: 'Energy', exchange: 'NSE', currentPrice: 278, marketCap: 350000 },
  { symbol: 'POWERGRID.NS', shortName: 'Power Grid Corporation Ltd', sector: 'Utilities', exchange: 'NSE', currentPrice: 335, marketCap: 312000 },
  { symbol: 'COALINDIA.NS', shortName: 'Coal India Ltd', sector: 'Mining', exchange: 'NSE', currentPrice: 460, marketCap: 283000 },
  { symbol: 'NTPC.NS', shortName: 'NTPC Ltd', sector: 'Utilities', exchange: 'NSE', currentPrice: 390, marketCap: 375000 },
  { symbol: 'LT.NS', shortName: 'Larsen & Toubro Ltd', sector: 'Infrastructure', exchange: 'NSE', currentPrice: 3680, marketCap: 507000 },
  { symbol: 'AXISBANK.NS', shortName: 'Axis Bank Ltd', sector: 'Banking', exchange: 'NSE', currentPrice: 1120, marketCap: 345000 },
];

const seedStocks = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing stocks (optional - comment out if you want to keep existing)
    await Stock.deleteMany({});
    console.log('🗑️ Cleared existing stocks');

    // Insert default stocks with initial prices
    for (const stockData of defaultStocks) {
      await Stock.findOneAndUpdate(
        { symbol: stockData.symbol },
        {
          symbol: stockData.symbol,
          shortName: stockData.shortName,
          sector: stockData.sector,
          exchange: stockData.exchange,
          currentPrice: stockData.currentPrice,
          marketCap: stockData.marketCap ? stockData.marketCap * 100000 : null,
          lastUpdated: new Date(),
        },
        { upsert: true, new: true }
      );
      console.log(`✅ Seeded: ${stockData.symbol} - ₹${stockData.currentPrice}`);
    }

    console.log('\n🎉 Stock database seeded successfully!');
    console.log(`📊 Total stocks: ${defaultStocks.length}`);
    
    // Show summary by sector
    const sectorCount = {};
    defaultStocks.forEach(stock => {
      sectorCount[stock.sector] = (sectorCount[stock.sector] || 0) + 1;
    });
    
    console.log('\n📈 Sector Distribution:');
    Object.entries(sectorCount).forEach(([sector, count]) => {
      console.log(`   ${sector}: ${count}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding stocks:', error.message);
    process.exit(1);
  }
};

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedStocks();
}

export default seedStocks;
