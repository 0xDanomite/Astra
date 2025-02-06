import { AgentKit } from '@coinbase/agentkit';
import { coingeckoService } from '../services/coingecko';

// Add CDP specific imports
import { SwapAction } from '@coinbase/agentkit/dist/actions/erc20';

interface RebalanceAction {
  token: TokenData;
  action: 'BUY' | 'SELL';
  amount: number;
}

export async function executeStrategy(strategy: Strategy, agentKit: AgentKit) {
  try {
    // 1. Get current top tokens
    const topTokens = await coingeckoService.getTopTokensByCategory(
      strategy.parameters.category,
      strategy.parameters.tokenCount
    );

    // 2. Calculate needed trades
    const rebalanceActions = await calculateRebalanceActions(
      strategy.currentHoldings,
      topTokens,
      strategy.parameters.totalAllocation
    );

    if (rebalanceActions.length > 0) {
      console.log('Rebalancing needed:', rebalanceActions);

      // 3. Execute trades using CDP
      for (const action of rebalanceActions) {
        try {
          console.log(`Initiating ${action.action} for ${action.token.symbol}`);

          // Check USDC balance/allowance first
          const balanceCheck = await agentKit.execute({
            type: 'getBalance',
            params: {
              token: action.action === 'BUY' ? 'USDC' : action.token.symbol
            }
          });

          console.log(`Current balance:`, balanceCheck);

          if (action.action === 'BUY') {
            // Approve USDC spending if needed
            await agentKit.execute({
              type: 'approve',
              params: {
                token: 'USDC',
                amount: action.amount.toString()
              }
            });

            const swapAction: SwapAction = {
              type: 'swap',
              params: {
                tokenIn: 'USDC',
                tokenOut: action.token.symbol,
                amountIn: action.amount.toString(),
                slippage: '0.5',
              }
            };

            console.log('Executing swap:', swapAction);
            const swapResult = await agentKit.execute(swapAction);
            console.log(`Swap result for ${action.token.symbol}:`, swapResult);
          } else {
            // Similar process for sells
            await agentKit.execute({
              type: 'approve',
              params: {
                token: action.token.symbol,
                amount: action.amount.toString()
              }
            });

            const swapAction: SwapAction = {
              type: 'swap',
              params: {
                tokenIn: action.token.symbol,
                tokenOut: 'USDC',
                amountIn: action.amount.toString(),
                slippage: '0.5',
              }
            };

            console.log('Executing swap:', swapAction);
            const swapResult = await agentKit.execute(swapAction);
            console.log(`Swap result for ${action.token.symbol}:`, swapResult);
          }
        } catch (tradeError) {
          console.error(`Trade failed for ${action.token.symbol}:`, tradeError);
          // Continue with next trade even if one fails
        }
      }

      // 4. Update strategy state
      strategy.currentHoldings = topTokens;
      strategy.lastRebalance = new Date();
    }

    return {
      success: true,
      newHoldings: strategy.currentHoldings,
      actions: rebalanceActions,
      executionLogs: true  // Indicate that execution was attempted
    };
  } catch (error) {
    console.error('Strategy execution failed:', error);
    throw error;
  }
}

async function calculateRebalanceActions(
  currentHoldings: TokenData[],
  targetHoldings: TokenData[],
  totalAllocation: number
): Promise<RebalanceAction[]> {
  const actions: RebalanceAction[] = [];
  const perTokenAllocation = totalAllocation / targetHoldings.length;

  // Sell tokens no longer in top list
  currentHoldings.forEach(holding => {
    if (!targetHoldings.find(t => t.address === holding.address)) {
      actions.push({
        token: holding,
        action: 'SELL',
        amount: perTokenAllocation
      });
    }
  });

  // Buy new tokens
  targetHoldings.forEach(target => {
    if (!currentHoldings.find(h => h.address === target.address)) {
      actions.push({
        token: target,
        action: 'BUY',
        amount: perTokenAllocation
      });
    }
  });

  return actions;
}
