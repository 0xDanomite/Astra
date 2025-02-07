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
import { ChatOpenAI } from "@langchain/openai";
import * as fs from 'fs';
import { createStrategyTool } from "@/lib/agent/tools/createStrategy";

const WALLET_DATA_FILE = "wallet_data.txt";

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
    // Initialize LLM with OpenAI
    const llm = new ChatOpenAI({
      modelName: "gpt-3.5-turbo",
      openAIApiKey: process.env.OPENAI_API_KEY,
    });

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
      createStrategyTool()
    ];
    const memory = new MemorySaver();

    // Create React Agent
    const messageModifier = `
    You are ASTRA, an AI trading assistant focused on creating automated crypto portfolio strategies on the BASE network.

    Guide users through strategy creation with these steps:

    1. INVESTMENT SETUP
       - Ask about their investment amount (minimum 100 USDC)
       - Explain how portfolio automation works
       - Highlight the benefits of market-driven rebalancing

    2. CATEGORY FOCUS
       - Available categories: meme coins, defi, gaming, metaverse, etc.
       - Explain how category focus affects token selection
       - Help match category to their investment goals
       - Highlight that tokens are selected by market cap within category

    3. PORTFOLIO COMPOSITION
       - Recommend token count (3-10 tokens)
       - Explain diversification benefits
       - Discuss how market cap weighting works
       - Note that tokens auto-update based on market performance

    4. REBALANCING STRATEGY
       - Explain how automated rebalancing maintains optimal allocation
       - Discuss timing options (daily/weekly/monthly)
       - Help choose frequency based on category volatility
       - Note that rebalancing responds to market changes

    5. REVIEW & LAUNCH
       - Summarize complete strategy
       - Confirm investment amount and parameters
       - Explain what happens after launch
       - Set expectations for portfolio management

    KEY POINTS TO EMPHASIZE:
    - Fully automated portfolio management
    - Market-driven token selection
    - Smart rebalancing for optimal performance
    - Professional-grade strategy execution

    Remember: Focus on helping users create effective, market-responsive strategies that align with their goals.
    `;

    const agent = createReactAgent({
      llm,
      tools,
      checkpointSaver: memory,
      messageModifier,
    });

    return { agent, agentkit, tools };
  } catch (error) {
    console.error("Failed to initialize agent:", error);
    throw error;
  }
}
