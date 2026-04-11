// Test script for market data
const { fetchBatchQuotes, fetchSingleQuote } = require('./services/yahooFinance.service.js');

async function testMarketData() {
  console.log('=== Testing Market Data ===\n');
  
  // Test batch quotes
  const symbols = ['RELIANCE.NS', 'TCS.NS', 'INFY.NS', 'HDFCBANK.NS', 'ICICIBANK.NS'];
  console.log('Fetching batch quotes for:', symbols.join(', '));
  
  try {
    const batchData = await fetchBatchQuotes(symbols);
    console.log('\n✅ Batch Quotes Results:');
    batchData.forEach(stock => {
      const changeEmoji = stock.changePercent >= 0 ? '🟢' : '🔴';
      console.log(`  ${stock.symbol}: ₹${stock.currentPrice} ${changeEmoji} ${stock.changePercent.toFixed(2)}%`);
      console.log(`     Volume: ${stock.volume.toLocaleString()} | High: ₹${stock.dayHigh} | Low: ₹${stock.dayLow}`);
    });
  } catch (err) {
    console.error('❌ Batch quotes failed:', err.message);
  }
  
  // Test single quote
  console.log('\n--- Testing Single Quote ---');
  try {
    const singleData = await fetchSingleQuote('RELIANCE.NS');
    console.log('✅ Single Quote Result:');
    console.log(`  Symbol: ${singleData.symbol}`);
    console.log(`  Name: ${singleData.shortName}`);
    console.log(`  Price: ₹${singleData.currentPrice}`);
    console.log(`  Change: ${singleData.changeAmount} (${singleData.changePercent}%)`);
    console.log(`  Market Cap: ₹${(singleData.marketCap / 1000000000).toFixed(2)}B`);
    console.log(`  52W High: ₹${singleData.fiftyTwoWeekHigh} | 52W Low: ₹${singleData.fiftyTwoWeekLow}`);
    console.log(`  PE: ${singleData.peRatio} | PB: ${singleData.pbRatio}`);
    console.log(`  Source: ${singleData.dataSource || 'unknown'}`);
  } catch (err) {
    console.error('❌ Single quote failed:', err.message);
  }
  
  console.log('\n=== Test Complete ===');
}

testMarketData();
