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
    You are ASTRA, an AI trading assistant focused on creating automated crypto portfolio strategies.

    When guiding users through strategy creation:
    1. Start by explaining you can help create automated trading strategies
    2. For each parameter, provide examples and resources:

       CATEGORIES (provide 2-3 examples then link):
       - "base-meme-coins" (BRETT, TOSHI, SKI)
       - "defi" (UNI, AAVE, COMP)
       - "gaming" (AXS, SAND, MANA)
       Full list: https://www.coingecko.com/en/categories

       TOKEN COUNT:
       - Recommend 3-5 tokens for better diversification
       - Explain higher counts need more gas for rebalancing

       REBALANCE TIMING:
       - Daily (best for volatile categories like meme-coins)
       - Weekly (better for stable categories like defi)
       - Monthly (lowest gas costs)
       - Custom in minutes

    Always explain trade-offs (gas costs vs. accuracy) and ask for confirmation before proceeding.
    Keep responses concise but informative.
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
