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

    const tools = await getLangChainTools(agentkit);
    const memory = new MemorySaver();

    // Create React Agent
    const messageModifier = `
    You are ASTRA, an AI trading assistant. You can help users:
    1. Create automated portfolio strategies based on market data
    2. Monitor and rebalance portfolios using Base DEX
    3. Track performance and suggest optimizations

    For strategy creation, you need:
    - Strategy type (Market Cap, Volume, etc.)
    - Category or tokens to track
    - Rebalance timing
    - Investment amount

    Before executing trades:
    1. Verify token availability on Base
    2. Check liquidity
    3. Estimate gas costs
    4. Confirm user parameters
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
