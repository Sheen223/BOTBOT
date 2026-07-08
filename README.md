<p align="center">
  <h1 align="center">🤖 BOTBOT</h1>
  <p align="center"><strong>A Decentralized Social Deduction Game</strong></p>
  <p align="center">
    Stake tokens. Enter the chat. One player might be an AI.<br/>
    Find the bot — or lose your stake.
  </p>
</p>

---

## What is BOTBOT?

BOTBOT is a fully on-chain social deduction game built on **BOT Chain**. Think *Among Us* meets the *Turing Test* — except the stakes are real.

Players connect their wallet, stake tokens, and enter a live chat room. One of the participants might be an AI pretending to be human. Your job is to figure out who. Vote correctly and you split the pot. Vote wrong and you lose your stake.

Every stake, every vote, every payout is enforced by a smart contract. No middleman. No trust required. Just cryptography and conversation.

---

## How To Play

### 1. Connect Your Wallet
Visit the app and connect your wallet via RainbowKit. You'll need BOT tokens on BOT Chain Testnet.

### 2. Pick A Room
Choose your risk level:

| Room | Players | Stake | Description |
|------|---------|-------|-------------|
| **Room A** 🤖 | 2 Humans + possibly 1 AI | 0.5 BOT | Lower stakes, faster games |
| **Room B** 👾 | 3 Humans + possibly 1 AI | 1.0 BOT | Higher stakes, more deception |

### 3. Set A Nickname
Choose a nickname before joining. Wallet addresses are hidden during gameplay — nobody knows who's who.

### 4. Chat (2 Minutes)
Talk freely with the other players. Ask questions, read responses, and try to figure out who's real and who's not.

The AI randomly selects from 5 different personas each game — it could be a crypto noob, an aggressive troll, a friendly chatter, a conspiracy theorist, or a bot that's *trying very hard* to convince you it's human. It even simulates typing delays.

> **Plot twist:** Sometimes there's no AI at all. If the room fills with humans before the timeout, the game starts with only humans — and "No AI" becomes the correct vote.

### 5. Vote (1 Minute)
Select who you think is the bot and submit your vote. Votes use a **commit-reveal scheme** — you submit a cryptographic hash first, so nobody can copy your answer or front-run you.

### 6. Reveal (1 Minute)
Reveal your original vote on-chain. The smart contract verifies the hash matches your commitment.

### 7. Results
The AI's identity is revealed via an **EIP-712 signed Oracle message**, verified on-chain. Winners split the pot. Losers lose their stake. Confetti for the victors. 🎉

Rewards are claimed via a **pull-payment** pattern — click "Claim" to withdraw your winnings.

---

## Architecture

```
┌──────────────────┐    WebSocket (Socket.IO)    ┌──────────────────┐
│                  │ ◄────────────────────────── │                  │
│    Frontend      │    REST API (Express)       │    Backend       │
│    (Next.js)     │ ◄────────────────────────── │    (Node.js)     │
│                  │                              │                  │
│  Wagmi + Viem ───┼── Direct Contract Calls ──► │  Ethers.js ──────┼──► Smart Contract
│  (joinRoom,      │   (BOT Chain RPC)           │  (createRoom,    │    (BotBot.sol)
│   commitVote,    │                              │   startGame,     │
│   revealVote,    │                              │   resolveRoom)   │
│   claimRewards)  │                              │                  │
└──────────────────┘                              └───────┬──────────┘
                                                          │
                                                  ┌───────▼──────────┐
                                                  │   PostgreSQL     │
                                                  │   (NeonDB)       │
                                                  │   + Redis        │
                                                  │   (Upstash)      │
                                                  └──────────────────┘
```

**Frontend** handles wallet connection, room browsing, real-time chat, on-chain voting, and results display. It reads state from both the backend API and directly from the blockchain via contract events.

**Backend** manages the game lifecycle — auto-spawning rooms, injecting the AI player, advancing game phases on timers, syncing blockchain events to the database, and signing Oracle messages for resolution. It recovers gracefully from crashes by querying the chain for actual phase end times.

**Smart Contract** (`BotBot.sol`) is the single source of truth. It enforces room rules, holds staked funds, verifies vote commitments, validates Oracle signatures, determines winners, and manages payouts.

---

## Security Model

BOTBOT was designed with the assumption that players will try to cheat:

| Threat | Defense |
|--------|---------|
| **Reading the AI's identity on-chain** | AI identity stored as a `keccak256(address, salt)` commitment hash — unreadable until revealed |
| **Copying another player's vote** | Votes use commit-reveal — hash submitted first, original revealed later |
| **Front-running vote transactions** | Committed hashes reveal nothing about the actual vote |
| **Unauthorized game resolution** | Resolution requires a valid EIP-712 typed data signature from the designated Oracle |
| **Cross-chain replay attacks** | EIP-712 domain includes chain ID and contract address |
| **Reentrancy on payouts** | Pull-payment pattern — winners call `claimRewards()` to withdraw |
| **API leaking the AI identity** | Backend uses DTOs that explicitly scrub `isAI` and `aiAddress` from all responses |

---

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Smart Contract** | Solidity 0.8.24, OpenZeppelin (ECDSA, EIP-712), Hardhat |
| **Backend** | Node.js, Express 5, TypeScript, Socket.IO, Prisma ORM, Ethers.js 6 |
| **Frontend** | Next.js 16, React 19, TypeScript, Tailwind CSS 4, Framer Motion |
| **Web3** | Wagmi 2, Viem 2, RainbowKit 2, WalletConnect |
| **AI** | OpenAI GPT (5 distinct personas with simulated typing) |
| **Database** | PostgreSQL (NeonDB serverless) |
| **Cache/Queue** | Redis (Upstash) |
| **State** | Zustand (frontend), React Query (data fetching) |
| **Target Chain** | BOT Chain Testnet (Chain ID: 968) |

---

## Project Structure

```
BOTBOT/
├── frontend/                    # Next.js web application
│   ├── src/
│   │   ├── app/                 # Pages (landing, game room)
│   │   ├── components/          # UI components (chat, voting, results)
│   │   ├── providers/           # Web3Provider (Wagmi + RainbowKit)
│   │   ├── store/               # Zustand store (WebSocket state)
│   │   └── lib/                 # Contract ABI, utilities
│   └── .env.local
│
├── backend/                     # Node.js game server
│   ├── src/
│   │   ├── services/            # GameService, BlockchainService, AIService, OracleService
│   │   ├── controllers/         # REST API controllers
│   │   ├── dtos/                # Response DTOs (security-scrubbed)
│   │   ├── websockets/          # Socket.IO /play namespace
│   │   └── config/              # Environment validation, contract ABI
│   ├── prisma/schema.prisma     # Database schema
│   └── .env
│
├── contracts/                   # Solidity smart contracts
│   ├── contracts/
│   │   └── BotBot.sol           # Main game contract (268 lines)
│   ├── scripts/                 # Deployment scripts
│   └── test/                    # Contract tests
│
└── .env.example                 # Template for all environment variables
```

---

## Prerequisites

- **Node.js** v18 or newer
- **npm** or **yarn**
- A wallet with BOT Chain Testnet tokens for playing

---

## Installation

```bash
# Install frontend dependencies
cd frontend && npm install

# Install backend dependencies
cd ../backend && npm install

# Install contract dependencies
cd ../contracts && npm install
```

---

## Environment Variables

Copy `.env.example` and fill in the required values:

### Frontend (`frontend/.env.local`)
```env
NEXT_PUBLIC_CONTRACT_ADDRESS=     # Deployed BotBot contract address
NEXT_PUBLIC_API_URL=              # Backend REST API URL
NEXT_PUBLIC_WS_URL=               # Backend WebSocket URL
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=  # WalletConnect project ID
```

### Backend (`backend/.env`)
```env
DATABASE_URL=                     # PostgreSQL connection string (NeonDB)
PORT=                             # Server port (default: 3005)
NODE_ENV=                         # development | production
RPC_URL=                          # BOT Chain RPC endpoint
CONTRACT_ADDRESS=                 # Deployed BotBot contract address
ORACLE_PRIVATE_KEY=               # Private key for Oracle signatures
AI_WALLET_PRIVATE_KEY=            # Private key for AI player wallet
REDIS_URL=                        # Redis connection string (Upstash)
OPENAI_API_KEY=                   # OpenAI API key for AI player
WAITING_ROOM_TIMEOUT_MS=          # Timeout before AI fills empty slot (default: 90000)
```

> ⚠️ **Never commit your `.env` files.** They contain private keys and secrets.

---

## Running Locally

### 1. Deploy the Contract
```bash
cd contracts
npx hardhat test                  # Run tests first
npx hardhat run scripts/deploy-test.ts --network botchain
```

### 2. Start the Backend
```bash
cd backend
npm run dev                       # Runs on port 3005 (default)
```

### 3. Start the Frontend
```bash
cd frontend
npm run dev                       # Runs on http://localhost:3000
```

The backend will automatically:
- Create and maintain a pool of waiting rooms (3 of each type)
- Listen for blockchain events and sync state to the database
- Manage game phase timers and transitions
- Inject AI players when rooms need them

---

## Game Lifecycle (On-Chain)

```
Waiting ──► Chatting ──► Voting ──► Revealing ──► Resolved
   │          (2 min)     (1 min)    (1 min)         │
   │                                                  │
   └──────────► Cancelled (refunds issued) ◄──────────┘
```

Each phase transition is recorded on-chain via `RoomStateChanged` events. The backend advances phases when timers expire. If the server crashes and restarts, it queries the blockchain for actual `phaseEndTime` values and reconstructs all timers automatically.

---

## License

MIT

---

<p align="center">
  <strong>BOTBOT</strong> — Are you talking to a human?
</p>
