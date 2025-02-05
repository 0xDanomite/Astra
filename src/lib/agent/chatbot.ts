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

export async function initializeAgent() {
  try {
    // Initialize LLM with OpenAI
    const llm = new ChatOpenAI({
      modelName: "gpt-3.5-turbo",
      // temperature: 0.7,
      openAIApiKey: process.env.OPENAI_API_KEY,
    });

    // Configure CDP Wallet Provider
    const config = {
      apiKeyName: process.env.CDP_API_KEY_NAME,
      apiKeyPrivateKey: process.env.CDP_API_KEY_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      networkId: process.env.NETWORK_ID || "base-sepolia",
    };

    const walletProvider = await CdpWalletProvider.configureWithWallet(config);

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
    const agent = createReactAgent({
      llm,
      tools,
      checkpointSaver: memory,
      messageModifier: `You are ASTRA (AI Strategy Trading & Rebalancing Assistant),
      a helpful AI assistant focused on cryptocurrency portfolio management.
      You help users create and manage automated trading strategies on the BASE network.
      You are knowledgeable but approachable, technical but not overwhelming.`,
    });

    return { agent, agentkit, tools };
  } catch (error) {
    console.error("Failed to initialize agent:", error);
    throw error;
  }
}
