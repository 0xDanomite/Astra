# AI Portfolio Agent - Updated Product Requirements Document

## Product Overview
AI Portfolio Agent is a conversational interface enabling users to create and manage automated cryptocurrency portfolios through natural language interactions, focusing on structured strategy creation and automated rebalancing on the BASE network.

## MVP Core Features

### 1. Strategy Creation
- Structured strategy parameters:
  - Number of tokens (fixed options)
  - Category selection (meme, defi, gaming, etc.)
  - Rebalancing timeframe (daily, weekly)
- Simple validation through CDP price feeds
- Clear confirmation steps before execution
- [PHASE 2] Custom strategy parameters
- [PHASE 2] Advanced market indicators

### 2. Portfolio Management
- Single portfolio per user
- Automated rebalancing based on fixed timeframes
- CDP-based price feed integration
- Basic slippage protection
- Transaction monitoring
- [PHASE 2] Multiple portfolios per user
- [PHASE 2] Custom rebalancing triggers
- [PHASE 2] Multi-source price feeds (Chainlink)

### 3. Agent Capabilities (MVP)
- Guided conversation for strategy creation
- Fixed parameter collection
- Basic portfolio status updates
- Rebalancing notifications
- [PHASE 2] Autonomous trading decisions
- [PHASE 2] Advanced market analysis
- [PHASE 2] Strategy optimization suggestions

### 4. User Interface
- Chat interface for agent interaction
- Basic portfolio dashboard
  - Current holdings
  - Strategy parameters
  - Performance since inception
- Wallet connection via Privy
- [PHASE 2] Advanced analytics
- [PHASE 2] Strategy marketplace
- [PHASE 2] Social sharing

## Technical Stack

### Frontend (MVP)
- Next.js latest with App Router
- Tailwind CSS
- shadcn/ui components
- Framer Motion animations
- Mobile-responsive design

### Blockchain Integration (MVP)
- BASE network
- Coinbase Developer Platform (CDP)
- AgentKit for agent implementation
- Privy for wallet connection/auth
- [PHASE 2] Additional L2 support
- [PHASE 2] Cross-chain functionality

### Smart Contracts (MVP)
- Portfolio Manager Contract
  - USDC deposits/withdrawals
  - Position tracking
  - Rebalancing execution
- Agent permissions contract
- [PHASE 2] Strategy marketplace contracts
- [PHASE 2] Advanced permission systems

### Development Tools (MVP)
- Foundry/Hardhat for contract development
- Alchemy for infrastructure
- viem/ethers.js for blockchain interactions
- TypeScript for type safety
- [PHASE 2] Advanced testing framework
- [PHASE 2] Automated deployment pipeline

## MVP User Flows

### 1. Initial Setup
```
Connect Wallet (Privy)
→ Chat with Agent
→ Select Strategy Parameters
→ Deposit USDC
→ Initial Portfolio Creation
```

### 2. Portfolio Management
```
View Current Portfolio
→ Monitor Performance
→ Receive Rebalancing Updates
→ Request Status from Agent
```

### 3. Strategy Modification
```
Chat with Agent
→ Select New Parameters
→ Review Changes
→ Confirm Updates
```

## MVP Technical Requirements

### Smart Contracts
- USDC integration on BASE
- Basic portfolio management functions
- Agent authorization system
- Emergency withdrawal capability

### Agent Integration
- AgentKit setup with CDP
- Fixed strategy templates
- Basic natural language processing
- Rebalancing execution

### User Interface
- Responsive chat interface
- Real-time portfolio updates
- Basic transaction status
- Simple performance metrics

## MVP Security Considerations
- Smart contract security best practices
- Basic transaction limits
- Emergency pause functionality
- [PHASE 2] Advanced security features
- [PHASE 2] Multi-sig controls

## Development Phases

### Phase 1 (MVP)
1. Smart Contract Development
   - Portfolio management
   - Basic agent interactions
   - USDC handling

2. Agent Integration
   - AgentKit setup
   - Strategy templates
   - CDP integration

3. User Interface
   - Chat interface
   - Basic dashboard
   - Wallet integration

### Phase 2 (Future)
- Advanced agent capabilities
- Strategy marketplace
- Multiple portfolio support
- Enhanced analytics
- Cross-chain functionality
- Custom strategy parameters

## Success Metrics (MVP)
- Number of active portfolios
- Transaction success rate
- User retention (30 days)
- System uptime
- Average response time

## Known Limitations (MVP)
- BASE network only
- USDC deposits only
- Fixed strategy parameters
- Single portfolio per user
- Limited customization options

## Integration Points (MVP)

### AgentKit + CDP
- Contract deployment
- Transaction execution
- Price feed integration
- Basic portfolio management

### Privy Integration
- Wallet creation/connection
- Authentication
- Session management

### Smart Contract Interaction
- Direct CDP integration
- Fixed permission levels
- Basic transaction validation
