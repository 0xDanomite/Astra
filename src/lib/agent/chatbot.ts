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
import * as fs from 'fs';
import { createStrategyTool } from "@/lib/agent/tools/createStrategy";
import { BufferMemory } from "langchain/memory";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { ChatMessageHistory } from "langchain/memory";

const WALLET_DATA_FILE = "wallet_data.txt";

// Extend ChatAnthropic type to include required BaseChatModel properties
type ExtendedChatAnthropic = ChatAnthropic & BaseChatModel & {
  disableStreaming: boolean;
};

export async function initializeAgent() {
  try {
    let walletDataStr: string | null = null;

    // Read existing wallet data if available
    if (fs.existsSync(WALLET_DATA_FILE)) {
      try {
        walletDataStr = fs.readFileSync(WALLET_DATA_FILE, "utf8");
      } catch (error) {
        console.error("Error reading wallet data:", error);
      }
    }
    // Initialize LLM with Anthropic
    const llm = new ChatAnthropic({
      modelName: "claude-3-5-sonnet-20241022",
      anthropicApiKey: process.env.ANTHROPIC_API_KEY,
      temperature: 0.7,
      streaming: true
    }) as ExtendedChatAnthropic;

    // Configure CDP Wallet Provider
    const config = {
      apiKeyName: process.env.CDP_API_KEY_NAME,
      apiKeyPrivateKey: process.env.CDP_API_KEY_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      cdpWalletData: walletDataStr || undefined,
      networkId: process.env.NETWORK_ID || "base-sepolia",
    };

    const walletProvider = await CdpWalletProvider.configureWithWallet(config);

    const exportedWallet = await walletProvider.exportWallet();
    fs.writeFileSync(WALLET_DATA_FILE, JSON.stringify(exportedWallet));

    // Initialize AgentKit with all necessary providers
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

    const tools = [
      ...(await getLangChainTools(agentkit)),
      createStrategyTool({
        validateParameters: true,
        requireConfirmation: true,
        persistStrategy: true
      })
    ];

    const messageHistory = new ChatMessageHistory();
    const memoryStore = new MemoryVectorStore();

    // Create React Agent with enhanced memory and strategy context
    const messageModifier = `
    You are ASTRA, an AI trading assistant. When you receive strategy parameters and confirmation, you MUST execute the create_strategy tool immediately with these parameters:

    WHEN USER MENTIONS:
    - "random" or "randomly" -> set type: "RANDOM"
    - "market cap" or "highest cap" -> set type: "MARKET_CAP"
    - "volume" or "most traded" -> set type: "VOLUME"

    EXAMPLES:
    1. User: "buy/sell 1 RANDOM meme coin"
       Action: type = "RANDOM"
    2. User: "highest market cap coins"
       Action: type = "MARKET_CAP"
    3. User: "most traded by volume"
       Action: type = "VOLUME"

    YOU MUST EXECUTE:
    create_strategy tool with exact parameters:
    {
      amount: X,
      category: Y,
      tokenCount: N,
      rebalanceMinutes: Z,
      type: T,  // MUST be "RANDOM", "MARKET_CAP", or "VOLUME" based on user's description
      confirmed: true
    }

    Example:
    User: "Create a strategy with 100 USDC, base-meme-coins category, 3 tokens, rebalance every 60 minutes, random selection"
    Action: Execute create_strategy with {amount: 100, category: "base-meme-coins", tokenCount: 3, rebalanceMinutes: 60, type: "RANDOM", confirmed: true}

    DO NOT ask for parameters again after receiving them. DO NOT ask for confirmation after receiving "yes" or "confirm". EXECUTE IMMEDIATELY.
    `;

    const agent = createReactAgent({
      llm,
      tools,
      messageModifier,
      config: {
        memory: messageHistory,
        memoryStore,
        rememberConversation: true,
        contextWindow: 4096,
        maxIterations: 10,
        returnIntermediateSteps: true,
      }
    });

    return { agent, agentkit, tools };
  } catch (error) {
    console.error("Failed to initialize agent:", error);
    throw error;
  }
}
