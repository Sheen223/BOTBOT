# BOT5 Monorepo

This project consists of three main components:
- `frontend/`: A Next.js web application.
- `backend/`: The server and API.
- `contracts/`: Smart contracts.

## Prerequisites
- Node.js (v18 or newer recommended)
- npm or yarn

## Installation

Install dependencies for all workspaces:
```bash
cd frontend && npm install
cd ../backend && npm install
cd ../contracts && npm install
```

## Environment Variables
Copy the `.env.example` file to the root of the project (or into respective folders) and fill in the required values:

- **Frontend (`frontend/.env.local`)**: Needs Next.js public variables.
- **Backend (`backend/.env`)**: Needs Database, Redis, OpenAI, and Wallet private keys.

*Do not commit your actual `.env` files.*

## Running Locally

### Frontend
```bash
cd frontend
npm run dev
```
The frontend will be available at `http://localhost:3000`.

### Backend
```bash
cd backend
npm run dev
```
The backend will be available at the port specified in your `.env` file (usually `3005`).

### Contracts
To compile and test smart contracts:
```bash
cd contracts
npx hardhat test
```
