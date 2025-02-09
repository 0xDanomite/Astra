# ASTRA - Autonomous Strategy Trading & Rebalancing Assistant

ASTRA is an AI-powered trading assistant that helps users create and manage automated trading strategies on Base mainnet. Built during a hackathon, this project demonstrates the integration of AI agents with on-chain trading capabilities.

⚠️ **IMPORTANT: This is a hackathon project and NOT intended for production use. All funds are at risk. Use at your own discretion. For more control create your own Nillion SecretVault and Org**

## Overview

ASTRA combines several key technologies:
- Privy for authentication
- Nillion for secure wallet data storage
- AgentKit for AI-powered trading assistance
- Coinbase's CDP for on-chain interactions
- PostgreSQL for strategy persistence

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL database
- Access to the following services:
  - Privy account and API keys
  - Nillion credentials
  - AgentKit API access
  - Coinbase CDP credentials

### Installation

1. Clone the repository
bash
git clone https://github.com/yourusername/astra.git
cd astra

2. Install dependencies
bash
npm install

3. Set up environment variables (see .env.example)

4. Start the development server


## User Flow

1. **Authentication**
   - Visit the application locally or through the hosted website
   - Login using email through Privy authentication
   - Your Privy user ID will be used across the application

2. **Wallet Setup**
   - Upon first login, a CDP wallet is automatically created
   - Wallet credentials are securely stored in Nillion
   - Wallet address is associated with your user profile

3. **Strategy Creation**
   - An AI agent powered by AgentKit guides you through strategy creation
   - Define parameters like:
     - Trading pairs
     - Investment amount
     - Rebalancing frequency
     - Risk tolerance

4. **Funding Your Strategy**
   - Transfer ETH or USDC to your AgentKit wallet
   - Funds are required for strategy execution
   - Monitor your portfolio through the dashboard

## Security Considerations

⚠️ **WARNING**
- This is a hackathon project with known security limitations
- Do not use significant amounts of funds
- The project uses shared credentials for demo purposes
- Production use would require individual API keys and enhanced security

## Technical Architecture

- Frontend: Next.js 13+ with App Router
- Authentication: Privy
- Secure Storage: Nillion
- Database: PostgreSQL
- Trading Infrastructure: Coinbase CDP
- AI Integration: AgentKit

## Future Improvements

1. Individual API key management
2. Enhanced security measures
3. Multi-signature wallet support
4. Advanced risk management
5. Portfolio analytics
6. Custom strategy templates

## Contributing

This project is currently in demo state. For serious usage, consider:
1. Adding your own API keys
2. Implementing proper security measures
3. Adding test coverage
4. Enhancing error handling

## License

MIT License - See LICENSE file for details

## Disclaimer

This software is provided "as is" without warranty of any kind. Use at your own risk.
