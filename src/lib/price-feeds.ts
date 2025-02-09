// import { AgentKit } from "@coinbase/agentkit";

// export async function getTokenPrices(agentkit: AgentKit, symbols: string[], addresses: string[]) {
//   try {
//     // Use AgentKit's built-in Pyth integration
//     const prices = await Promise.all(
//       addresses.map(async (address, index) => {
//         try {
//           const price = await agentkit.getTokenPrice(address);
//           return [symbols[index], price];
//         } catch (error) {
//           console.error(`Failed to get price for ${symbols[index]}:`, error);
//           return [symbols[index], 0];
//         }
//       })
//     );

//     return Object.fromEntries(prices);
//   } catch (error) {
//     console.error('Error fetching prices:', error);
//     return {};
//   }
// }
