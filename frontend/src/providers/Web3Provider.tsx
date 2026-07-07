"use client";

import * as React from "react";
import {
  RainbowKitProvider,
  getDefaultConfig,
  lightTheme,
} from "@rainbow-me/rainbowkit";
import "@rainbow-me/rainbowkit/styles.css";
import { WagmiProvider } from "wagmi";
import { sepolia } from "wagmi/chains";
import { type Chain } from 'viem'
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";

export const botNetwork = {
  id: 968,
  name: 'BOT Chain Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'BOT Token',
    symbol: 'BOT',
  },
  rpcUrls: {
    default: { http: ['https://rpc.bohr.life'] },
    public: { http: ['https://rpc.bohr.life'] },
  },
  blockExplorers: {
    default: { name: 'BOTScan', url: 'https://scan.bohr.life' },
  },
} as const satisfies Chain

const config = getDefaultConfig({
  appName: "BOTBOT",
  projectId: "4b92bdf61c778401dd7d5c7075c3db11", // Placeholder WalletConnect ID
  chains: [botNetwork, sepolia],
  ssr: true,
});

const queryClient = new QueryClient();

export function Web3Provider({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={lightTheme({
            accentColor: "#3B82F6",
            accentColorForeground: "white",
            borderRadius: "large",
            fontStack: "system",
          })}
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
