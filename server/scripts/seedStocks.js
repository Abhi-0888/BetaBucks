import mongoose from 'mongoose';
import Stock from '../models/Stock.model.js';
import env from '../config/env.js';

// Default NIFTY 50 stocks with company info
const defaultStocks = [
  { symbol: 'RELIANCE.NS', shortName: 'Reliance Industries Ltd', sector: 'Energy', exchange: 'NSE' },
  { symbol: 'TCS.NS', shortName: 'Tata Consultancy Services', sector: 'IT', exchange: 'NSE' },
  { symbol: 'INFY.NS', shortName: 'Infosys Ltd', sector: 'IT', exchange: 'NSE' },
  { symbol: 'HDFCBANK.NS', shortName: 'HDFC Bank Ltd', sector: 'Banking', exchange: 'NSE' },
  { symbol: 'ICICIBANK.NS', shortName: 'ICICI Bank Ltd', sector: 'Banking', exchange: 'NSE' },
  { symbol: 'WIPRO.NS', shortName: 'Wipro Ltd', sector: 'IT', exchange: 'NSE' },
  { symbol: 'SBIN.NS', shortName: 'State Bank of India', sector: 'Banking', exchange: 'NSE' },
  { symbol: 'TATAMOTORS.NS', shortName: 'Tata Motors Ltd', sector: 'Auto', exchange: 'NSE' },
  { symbol: 'TATASTEEL.NS', shortName: 'Tata Steel Ltd', sector: 'Metals', exchange: 'NSE' },
  { symbol: 'HINDUNILVR.NS', shortName: 'Hindustan Unilever', sector: 'FMCG', exchange: 'NSE' },
  { symbol: 'BAJFINANCE.NS', shortName: 'Bajaj Finance Ltd', sector: 'Finance', exchange: 'NSE' },
  { symbol: 'ADANIENT.NS', shortName: 'Adani Enterprises', sector: 'Conglomerate', exchange: 'NSE' },
  { symbol: 'MARUTI.NS', shortName: 'Maruti Suzuki India', sector: 'Auto', exchange: 'NSE' },
  { symbol: 'SUNPHARMA.NS', shortName: 'Sun Pharmaceutical', sector: 'Pharma', exchange: 'NSE' },
  { symbol: 'ONGC.NS', shortName: 'ONGC Ltd', sector: 'Energy', exchange: 'NSE' },
  { symbol: 'POWERGRID.NS', shortName: 'Power Grid Corporation', sector: 'Utilities', exchange: 'NSE' },
  { symbol: 'COALINDIA.NS', shortName: 'Coal India Ltd', sector: 'Mining', exchange: 'NSE' },
  { symbol: 'NTPC.NS', shortName: 'NTPC Ltd', sector: 'Utilities', exchange: 'NSE' },
  { symbol: 'LT.NS', shortName: 'Larsen & Toubro Ltd', sector: 'Infrastructure', exchange: 'NSE' },
  { symbol: 'AXISBANK.NS', shortName: 'Axis Bank Ltd', sector: 'Banking', exchange: 'NSE' },
];

const seedStocks = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing stocks (optional - comment out if you want to keep existing)
    await Stock.deleteMany({});
    console.log('🗑️ Cleared existing stocks');

    // Insert default stocks
    for (const stockData of defaultStocks) {
      await Stock.findOneAndUpdate(
        { symbol: stockData.symbol },
        {
          ...stockData,
          currentPrice: 0,
          lastUpdated: new Date(),
        },
        { upsert: true, new: true }
      );
      console.log(`✅ Seeded: ${stockData.symbol} - ${stockData.shortName}`);
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
