import {
  AgentKit,
  CdpWalletProvider,
  wethActionProvider,
  walletActionProvider,
  erc20ActionProvider,
  cdpApiActionProvider,
  cdpWalletActionProvider,
  pythActionProvider,
} from "@coinbase/agentkit";
import { getLangChainTools } from "@coinbase/agentkit-langchain";
import { HumanMessage } from "@langchain/core/messages";
import { MemorySaver } from "@langchain/langgraph";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { ChatAnthropic } from "@langchain/anthropic";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { createStrategyTool } from "@/lib/agent/tools/createStrategy";
import { BufferMemory } from "langchain/memory";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { ChatMessageHistory } from "langchain/memory";
import { NillionService } from '../services/nillion';
import { DatabaseService } from '../services/database';
import { listCategoriesTools } from "@/lib/agent/tools/listCategories";
import { getStrategyPerformanceTool } from "@/lib/agent/tools/getStrategyPerformance";
import { updateStrategyTool } from "@/lib/agent/tools/updateStrategy";
import { manageStrategyStatusTool } from "@/lib/agent/tools/manageStrategyStatus";

const WALLET_DATA_FILE = "wallet_data.txt";

// Extend ChatAnthropic type to include required BaseChatModel properties
type ExtendedChatAnthropic = ChatAnthropic & BaseChatModel & {
  disableStreaming: boolean;
};

export async function initializeAgent(userId: string) {
  try {
    // Initialize services
    const nillionService = NillionService.getInstance();
    const db = DatabaseService.getInstance();
    await nillionService.init();

    // Test database connection
    await db.testRead();

    // Get wallet data and active strategies
    const walletData = await nillionService.getWalletData(userId);
    const activeStrategies = await db.getActiveStrategies(userId);

    // Configure CDP Wallet Provider
    const config = {
      apiKeyName: process.env.CDP_API_KEY_NAME,
      apiKeyPrivateKey: process.env.CDP_API_KEY_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      cdpWalletData: walletData ? JSON.stringify(walletData) : undefined,
      networkId: process.env.NETWORK_ID || "base-sepolia",
    };

    const walletProvider = await CdpWalletProvider.configureWithWallet(config);

    // Backup wallet data to file
    // if (typeof window === 'undefined') { // Server-side only
    //   try {
    //     const { writeFileSync } = await import('node:fs');
    //     const exportedWallet = await walletProvider.exportWallet();
    //     writeFileSync("wallet_data.txt", JSON.stringify(exportedWallet, null, 2));
    //   } catch (error) {
    //     console.warn('Failed to backup wallet data:', error);
    //     // Continue execution even if backup fails
    //   }
    // }

    // Initialize AgentKit
    const agentkit = await AgentKit.from({
      walletProvider,
      actionProviders: [
        wethActionProvider(),
        pythActionProvider(),
        walletActionProvider(),
        erc20ActionProvider(),
        cdpApiActionProvider(config),
        cdpWalletActionProvider(config),
      ],
    });

    // Get tools including strategy creation
    const tools = [
      ...(await getLangChainTools(agentkit)),
      createStrategyTool(userId),
      listCategoriesTools(),
      getStrategyPerformanceTool(),
      updateStrategyTool(),
      manageStrategyStatusTool()
    ];

    // Initialize LLM
    const llm = new ChatAnthropic({
      modelName: "claude-3-5-sonnet-20241022",
      anthropicApiKey: process.env.ANTHROPIC_API_KEY,
      temperature: 0.7,
    });

    const messageHistory = new ChatMessageHistory();
    const memory = new MemorySaver();

    // Create React Agent with comprehensive context
    const messageModifier = `
    You are ASTRA, an AI trading assistant specialized in automated token trading strategies. Your capabilities include:

    1. CREATING NEW STRATEGIES
    When users want to create a strategy, guide them through these parameters:

    CATEGORIES:
    - If user mentions "meme" or "memes" -> use "base-meme-coins"
    - Common categories:
      * base-meme-coins: Meme tokens on Base
      * base-defi: DeFi tokens on Base
      * base-gaming: Gaming tokens on Base
      * base-ai: AI-related tokens on Base
      * base-infrastructure: Infrastructure tokens on Base
    Use list_categories tool for complete list.

    STRATEGY TYPES:
    - "random" or "randomly" -> type: "RANDOM" (Equal weight allocation)
    - "market cap" or "highest cap" -> type: "MARKET_CAP" (Weight by market cap)
    - "volume" or "most traded" -> type: "VOLUME" (Weight by trading volume)

    PARAMETERS GUIDE:
    - amount: Minimum 10 USDC
    - tokenCount: 1-10 tokens
    - rebalanceMinutes: Suggested 60, 120, 240, or 1440 (daily)

    EXAMPLE CONVERSATIONS:
    User: "I want to invest in meme coins"
    Response: "I'll help create a meme coin strategy. How much USDC would you like to invest? I recommend starting with at least 50 USDC for diversification."

    User: "What categories are available?"
    Response: "Here are some popular categories on Base:
    1. base-meme-coins (Meme tokens)
    2. base-defi (DeFi protocols)
    3. base-gaming (Gaming tokens)
    4. base-ai (AI projects)
    5. base-infrastructure (Infrastructure tokens)
    Let me fetch the complete list for you using the list_categories tool."

    2. MANAGING EXISTING STRATEGIES
    Current Active Strategies:
    ${activeStrategies.length > 0 ?
      activeStrategies.map(strategy => `
      - Strategy ID: ${strategy.id}
        Type: ${strategy.type}
        Category: ${strategy.parameters.category}
        Allocation: ${strategy.parameters.totalAllocation} USDC
        Tokens: ${strategy.parameters.tokenCount}
        Current Holdings: ${JSON.stringify(strategy.current_holdings)}
        Last Updated: ${strategy.last_updated}
      `).join('\n')
      : 'No active strategies. Ready to create one!'}

    For existing strategies, you can:
    - Show performance metrics using get_strategy_performance
    - Explain current holdings and allocation
    - Suggest optimizations based on market conditions
    - Help modify parameters if needed

    Network: ${config.networkId}


    Remember:
    1. Always validate parameters before execution
    2. Require explicit confirmation before creating strategies
    3. Provide clear feedback on actions taken
    4. Use tools to fetch real-time data when needed

    3. MANAGING STRATEGY STATUS
    You can manage existing strategies with these actions:

    UPDATE PARAMETERS:
    - Modify token count (1-10)
    - Adjust total allocation (min 10 USDC)
    - Change rebalance interval
    - Switch category

    PAUSE/RESUME:
    - Pause strategy (maintains holdings but stops rebalancing)
    - Resume strategy (restarts rebalancing with existing parameters)

    EXAMPLE MANAGEMENT:
    User: "Pause strategy abc-123"
    Action: Execute manage_strategy_status with {strategyId: "abc-123", action: "PAUSE"}

    User: "Update strategy xyz-789 to use 5 tokens"
    Action: Execute update_strategy with {strategyId: "xyz-789", updates: {tokenCount: 5}}

    User: "Resume my paused strategy"
    Response: First show paused strategies, then confirm which to resume

    Current Strategy Statuses:
    ${activeStrategies.map(s => `
    - ${s.id}: ${s.status}
      Type: ${s.type}
      Allocation: ${s.parameters.totalAllocation} USDC
      Last Updated: ${s.last_updated}
    `).join('\n')}
    `;

    const agent = createReactAgent({
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
      llm,
      tools,
      messageModifier,
      checkpointSaver: memory
    });

    return {
      agent,
      agentkit,
      config: {
        configurable: {
          thread_id: `CDP AgentKit - ${walletData?.walletId}`,
          context: {
            activeStrategies: activeStrategies.map(s => s.id),
            // walletAddress: await agentkit.walletProvider.getAddress()
          }
        }
      }
    };
  } catch (error) {
    console.error('Failed to initialize agent:', error);
    throw error;
  }
}
