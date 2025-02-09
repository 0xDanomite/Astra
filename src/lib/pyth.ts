// import { EvmPriceServiceConnection } from '@pythnetwork/price-service-client';

// const connection = new EvmPriceServiceConnection(
//   'https://hermes.pyth.network'
// );

// export async function getPythPriceFeeds(symbols: string[]) {
//   try {
//     const priceIds = symbols.map(symbol => getPythPriceId(symbol));
//     const priceFeeds = await connection.getLatestPriceFeeds(priceIds);

//     return priceFeeds.reduce((acc, feed) => {
//       if (feed) {
//         const symbol = getPythSymbol(feed.id);
//         acc[symbol] = {
//           price: feed.price.price,
//           confidence: feed.price.confidence,
//           timestamp: feed.price.publishTime
//         };
//       }
//       return acc;
//     }, {} as Record<string, { price: number; confidence: number; timestamp: number }>);
//   } catch (error) {
//     console.error('Error fetching Pyth price feeds:', error);
//     return {};
//   }
// }

// // Add mappings for your specific tokens
// function getPythPriceId(symbol: string): string {
//   const mappings: Record<string, string> = {
//     'USDC': '0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a',
//     // Add more mappings as needed
//   };
//   return mappings[symbol] || '';
// }

// function getPythSymbol(priceId: string): string {
//   const mappings: Record<string, string> = {
//     '0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a': 'USDC',
//     // Add more mappings as needed
//   };
//   return mappings[priceId] || '';
// }
