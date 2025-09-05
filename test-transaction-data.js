// Test script for transaction data management
// Run with: node test-transaction-data.js

const { getData } = require('./lib/getData.ts');

async function testTransactionData() {
  const walletAddress = '0x1aeddD4fA751C41CCB5EDF7D8c93E8E2d9EC5851';
  
  console.log('🚀 Starting transaction data test...');
  console.log(`📝 Testing with wallet: ${walletAddress}`);
  
  try {
    // Set environment variable for Moralis API key
    // You'll need to set this: process.env.EXPO_PUBLIC_MORALIS_API_KEY = 'your_api_key_here'
    
    console.log('⏳ Fetching wallet data...');
    await getData(walletAddress);
    
    console.log('✅ Test completed successfully!');
    console.log('📊 Check the console logs above for detailed information');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('💡 Make sure to set your Moralis API key in the environment variables');
  }
}

// Run the test
testTransactionData();
