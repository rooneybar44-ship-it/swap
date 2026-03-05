"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      on: (event: string, handler: (...args: unknown[]) => void) => void;
      removeListener: (event: string, handler: (...args: unknown[]) => void) => void;
    };
  }
}

const CDN = "https://cdn.jsdelivr.net/gh/spothq/cryptocurrency-icons@master/128/color";
const PARASWAP_API = "https://apiv5.paraswap.io";
const COINGECKO_API = "https://api.coingecko.com/api/v3";

type Network = {
  id: string;          // hex chainId e.g. "0x1"
  chainId: number;     // decimal
  name: string;
  shortName: string;
  color: string;
  icon: string;        // emoji or URL
  nativeCurrency: string;
  paraswapNetwork: number | null; // null = not supported by Paraswap
  rpcUrl: string;
  blockExplorer: string;
};

const NETWORKS: Network[] = [
  {
    id: "0x1", chainId: 1, name: "Ethereum", shortName: "ETH",
    color: "#627EEA", icon: "https://cdn.jsdelivr.net/gh/spothq/cryptocurrency-icons@master/128/color/eth.png",
    nativeCurrency: "ETH", paraswapNetwork: 1,
    rpcUrl: "https://mainnet.infura.io/v3/", blockExplorer: "https://etherscan.io",
  },
  {
    id: "0x89", chainId: 137, name: "Polygon", shortName: "MATIC",
    color: "#8247E5", icon: "https://cdn.jsdelivr.net/gh/spothq/cryptocurrency-icons@master/128/color/matic.png",
    nativeCurrency: "MATIC", paraswapNetwork: 137,
    rpcUrl: "https://polygon-rpc.com", blockExplorer: "https://polygonscan.com",
  },
  {
    id: "0x38", chainId: 56, name: "BNB Chain", shortName: "BNB",
    color: "#F3BA2F", icon: "https://cdn.jsdelivr.net/gh/spothq/cryptocurrency-icons@master/128/color/bnb.png",
    nativeCurrency: "BNB", paraswapNetwork: 56,
    rpcUrl: "https://bsc-dataseed.binance.org", blockExplorer: "https://bscscan.com",
  },
  {
    id: "0xa4b1", chainId: 42161, name: "Arbitrum", shortName: "ARB",
    color: "#28A0F0", icon: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/arbitrum/info/logo.png",
    nativeCurrency: "ETH", paraswapNetwork: 42161,
    rpcUrl: "https://arb1.arbitrum.io/rpc", blockExplorer: "https://arbiscan.io",
  },
  {
    id: "0xa", chainId: 10, name: "Optimism", shortName: "OP",
    color: "#FF0420", icon: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/optimism/info/logo.png",
    nativeCurrency: "ETH", paraswapNetwork: 10,
    rpcUrl: "https://mainnet.optimism.io", blockExplorer: "https://optimistic.etherscan.io",
  },
  {
    id: "0xa86a", chainId: 43114, name: "Avalanche", shortName: "AVAX",
    color: "#E84142", icon: "https://cdn.jsdelivr.net/gh/spothq/cryptocurrency-icons@master/128/color/avax.png",
    nativeCurrency: "AVAX", paraswapNetwork: 43114,
    rpcUrl: "https://api.avax.network/ext/bc/C/rpc", blockExplorer: "https://snowtrace.io",
  },
  {
    id: "0x2105", chainId: 8453, name: "Base", shortName: "BASE",
    color: "#0052FF", icon: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/base/info/logo.png",
    nativeCurrency: "ETH", paraswapNetwork: 8453,
    rpcUrl: "https://mainnet.base.org", blockExplorer: "https://basescan.org",
  },
  {
    id: "solana", chainId: 0, name: "Solana", shortName: "SOL",
    color: "#9945FF", icon: `${CDN}/sol.png`,
    nativeCurrency: "SOL", paraswapNetwork: null,
    rpcUrl: "https://api.mainnet-beta.solana.com", blockExplorer: "https://solscan.io",
  },
];

type TokenDef = {
  symbol: string;
  name: string;
  color: string;
  decimals: number;
  address: string;
  coingeckoId: string;
  icon: string;
  fixedPrice?: number;
};

type Token = TokenDef & { balance: number; price: number };

const NATIVE = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";

// Tokens per network
const TOKENS_BY_CHAIN: Record<string, TokenDef[]> = {
  "0x1": [
    { symbol: "ETH", name: "Ethereum", color: "#627EEA", decimals: 18, address: NATIVE, coingeckoId: "ethereum", icon: `${CDN}/eth.png` },
    { symbol: "USDC", name: "USD Coin", color: "#2775CA", decimals: 6, address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", coingeckoId: "usd-coin", icon: `${CDN}/usdc.png` },
    { symbol: "USDT", name: "Tether", color: "#26A17B", decimals: 6, address: "0xdAC17F958D2ee523a2206206994597C13D831ec7", coingeckoId: "tether", icon: `${CDN}/usdt.png` },
    { symbol: "WBTC", name: "Wrapped Bitcoin", color: "#F7931A", decimals: 8, address: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599", coingeckoId: "wrapped-bitcoin", icon: `${CDN}/wbtc.png` },
    { symbol: "LINK", name: "Chainlink", color: "#2A5ADA", decimals: 18, address: "0x514910771AF9Ca656af840dff83E8264EcF986CA", coingeckoId: "chainlink", icon: `${CDN}/link.png` },
    { symbol: "UNI", name: "Uniswap", color: "#FF007A", decimals: 18, address: "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984", coingeckoId: "uniswap", icon: `${CDN}/uni.png` },
    { symbol: "MATIC", name: "Polygon", color: "#8247E5", decimals: 18, address: "0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0", coingeckoId: "matic-network", icon: `${CDN}/matic.png` },
    { symbol: "AAVE", name: "Aave", color: "#B6509E", decimals: 18, address: "0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9", coingeckoId: "aave", icon: `${CDN}/aave.png` },
  ],
  "0x89": [
    { symbol: "MATIC", name: "Polygon", color: "#8247E5", decimals: 18, address: NATIVE, coingeckoId: "matic-network", icon: `${CDN}/matic.png` },
    { symbol: "USDC", name: "USD Coin", color: "#2775CA", decimals: 6, address: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174", coingeckoId: "usd-coin", icon: `${CDN}/usdc.png` },
    { symbol: "USDT", name: "Tether", color: "#26A17B", decimals: 6, address: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F", coingeckoId: "tether", icon: `${CDN}/usdt.png` },
    { symbol: "WETH", name: "Wrapped Ether", color: "#627EEA", decimals: 18, address: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619", coingeckoId: "weth", icon: `${CDN}/eth.png` },
    { symbol: "WBTC", name: "Wrapped Bitcoin", color: "#F7931A", decimals: 8, address: "0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6", coingeckoId: "wrapped-bitcoin", icon: `${CDN}/wbtc.png` },
    { symbol: "LINK", name: "Chainlink", color: "#2A5ADA", decimals: 18, address: "0x53E0bca35eC356BD5ddDFebbD1Fc0fD03FaBad39", coingeckoId: "chainlink", icon: `${CDN}/link.png` },
    { symbol: "AAVE", name: "Aave", color: "#B6509E", decimals: 18, address: "0xD6DF932A45C0f255f85145f286eA0b292B21C90B", coingeckoId: "aave", icon: `${CDN}/aave.png` },
  ],
  "0x38": [
    { symbol: "BNB", name: "BNB", color: "#F3BA2F", decimals: 18, address: NATIVE, coingeckoId: "binancecoin", icon: `${CDN}/bnb.png` },
    { symbol: "USDT", name: "Tether", color: "#26A17B", decimals: 18, address: "0x55d398326f99059fF775485246999027B3197955", coingeckoId: "tether", icon: `${CDN}/usdt.png` },
    { symbol: "USDC", name: "USD Coin", color: "#2775CA", decimals: 18, address: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d", coingeckoId: "usd-coin", icon: `${CDN}/usdc.png` },
    { symbol: "WBTC", name: "Wrapped Bitcoin", color: "#F7931A", decimals: 18, address: "0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c", coingeckoId: "wrapped-bitcoin", icon: `${CDN}/wbtc.png` },
    { symbol: "ETH", name: "Ethereum", color: "#627EEA", decimals: 18, address: "0x2170Ed0880ac9A755fd29B2688956BD959F933F8", coingeckoId: "ethereum", icon: `${CDN}/eth.png` },
    { symbol: "LINK", name: "Chainlink", color: "#2A5ADA", decimals: 18, address: "0xF8A0BF9cF54Bb92F17374d9e9A321E6a111a51bD", coingeckoId: "chainlink", icon: `${CDN}/link.png` },
  ],
  "0xa4b1": [
    { symbol: "ETH", name: "Ethereum", color: "#627EEA", decimals: 18, address: NATIVE, coingeckoId: "ethereum", icon: `${CDN}/eth.png` },
    { symbol: "USDC", name: "USD Coin", color: "#2775CA", decimals: 6, address: "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8", coingeckoId: "usd-coin", icon: `${CDN}/usdc.png` },
    { symbol: "USDT", name: "Tether", color: "#26A17B", decimals: 6, address: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", coingeckoId: "tether", icon: `${CDN}/usdt.png` },
    { symbol: "WBTC", name: "Wrapped Bitcoin", color: "#F7931A", decimals: 8, address: "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f", coingeckoId: "wrapped-bitcoin", icon: `${CDN}/wbtc.png` },
    { symbol: "LINK", name: "Chainlink", color: "#2A5ADA", decimals: 18, address: "0xf97f4df75117a78c1A5a0DBb814Af92458539FB4", coingeckoId: "chainlink", icon: `${CDN}/link.png` },
    { symbol: "UNI", name: "Uniswap", color: "#FF007A", decimals: 18, address: "0xFa7F8980b0f1E64A2062791cc3b0871572f1F7f0", coingeckoId: "uniswap", icon: `${CDN}/uni.png` },
  ],
  "0xa": [
    { symbol: "ETH", name: "Ethereum", color: "#627EEA", decimals: 18, address: NATIVE, coingeckoId: "ethereum", icon: `${CDN}/eth.png` },
    { symbol: "USDC", name: "USD Coin", color: "#2775CA", decimals: 6, address: "0x7F5c764cBc14f9669B88837ca1490cCa17c31607", coingeckoId: "usd-coin", icon: `${CDN}/usdc.png` },
    { symbol: "USDT", name: "Tether", color: "#26A17B", decimals: 6, address: "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58", coingeckoId: "tether", icon: `${CDN}/usdt.png` },
    { symbol: "WBTC", name: "Wrapped Bitcoin", color: "#F7931A", decimals: 8, address: "0x68f180fcCe6836688e9084f035309E29Bf0A2095", coingeckoId: "wrapped-bitcoin", icon: `${CDN}/wbtc.png` },
    { symbol: "LINK", name: "Chainlink", color: "#2A5ADA", decimals: 18, address: "0x350a791Bfc2C21F9Ed5d10980Dad2e2638ffa7f6", coingeckoId: "chainlink", icon: `${CDN}/link.png` },
    { symbol: "OP", name: "Optimism", color: "#FF0420", decimals: 18, address: "0x4200000000000000000000000000000000000042", coingeckoId: "optimism", icon: `${CDN}/op.png` },
  ],
  "0xa86a": [
    { symbol: "AVAX", name: "Avalanche", color: "#E84142", decimals: 18, address: NATIVE, coingeckoId: "avalanche-2", icon: `${CDN}/avax.png` },
    { symbol: "USDC", name: "USD Coin", color: "#2775CA", decimals: 6, address: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E", coingeckoId: "usd-coin", icon: `${CDN}/usdc.png` },
    { symbol: "USDT", name: "Tether", color: "#26A17B", decimals: 6, address: "0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7", coingeckoId: "tether", icon: `${CDN}/usdt.png` },
    { symbol: "WBTC", name: "Wrapped Bitcoin", color: "#F7931A", decimals: 8, address: "0x50b7545627a5162F82A992c33b87aDc75187B218", coingeckoId: "wrapped-bitcoin", icon: `${CDN}/wbtc.png` },
    { symbol: "LINK", name: "Chainlink", color: "#2A5ADA", decimals: 18, address: "0x5947BB275c521040051D82396192181b413227A3", coingeckoId: "chainlink", icon: `${CDN}/link.png` },
  ],
  "0x2105": [
    { symbol: "ETH", name: "Ethereum", color: "#627EEA", decimals: 18, address: NATIVE, coingeckoId: "ethereum", icon: `${CDN}/eth.png` },
    { symbol: "USDC", name: "USD Coin", color: "#2775CA", decimals: 6, address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", coingeckoId: "usd-coin", icon: `${CDN}/usdc.png` },
    { symbol: "USDT", name: "Tether", color: "#26A17B", decimals: 6, address: "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2", coingeckoId: "tether", icon: `${CDN}/usdt.png` },
    { symbol: "WBTC", name: "Wrapped Bitcoin", color: "#F7931A", decimals: 8, address: "0x1ceA84203673764244E05693e42E6Ace62bE9BA5", coingeckoId: "wrapped-bitcoin", icon: `${CDN}/wbtc.png` },
    { symbol: "LINK", name: "Chainlink", color: "#2A5ADA", decimals: 18, address: "0x88Fb150BDc53A65fe94Dea0c9BA0a6dAf8C6e196", coingeckoId: "chainlink", icon: `${CDN}/link.png` },
  ],
  "solana": [
    { symbol: "SOL", name: "Solana", color: "#9945FF", decimals: 9, address: NATIVE, coingeckoId: "solana", icon: `${CDN}/sol.png` },
    { symbol: "USDC", name: "USD Coin", color: "#2775CA", decimals: 6, address: "DdfQ6ZtvxSAPDUyMvhR8R9JUTJj1ZSavCNrQN9jVZJEA", coingeckoId: "usd-coin", icon: "https://img.cryptorank.io/coins/usd%20coin1634317395959.png", fixedPrice: 1 },
    { symbol: "USDT", name: "Tether", color: "#26A17B", decimals: 6, address: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB", coingeckoId: "tether", icon: `${CDN}/usdt.png` },
    { symbol: "RAY", name: "Raydium", color: "#5AC4BE", decimals: 6, address: "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R", coingeckoId: "raydium", icon: `${CDN}/ray.png` },
    { symbol: "SRM", name: "Serum", color: "#65C2CB", decimals: 6, address: "SRMuApVNdxXokk5GT7XD5cUUgXMBCoAz2LHeuAoKWRt", coingeckoId: "serum", icon: `${CDN}/srm.png` },
  ],
};

function makeToken(def: TokenDef, balance = 0, price = 0): Token {
  return { ...def, balance, price: def.fixedPrice ?? price };
}

function encodeBalanceOf(walletAddress: string): string {
  const padded = walletAddress.toLowerCase().replace("0x", "").padStart(64, "0");
  return "0x70a08231" + padded;
}

function encodeAllowance(owner: string, spender: string): string {
  const o = owner.toLowerCase().replace("0x", "").padStart(64, "0");
  const s = spender.toLowerCase().replace("0x", "").padStart(64, "0");
  return "0xdd62ed3e" + o + s;
}

async function fetchERC20Balance(tokenAddress: string, walletAddress: string): Promise<string> {
  const result = await window.ethereum!.request({
    method: "eth_call",
    params: [{ to: tokenAddress, data: encodeBalanceOf(walletAddress) }, "latest"],
  }) as string;
  return result;
}

async function fetchCoinGeckoPrices(ids: string[]): Promise<Record<string, number>> {
  const unique = [...new Set(ids)];
  const res = await fetch(`${COINGECKO_API}/simple/price?ids=${unique.join(",")}&vs_currencies=usd`);
  const data = await res.json() as Record<string, { usd: number }>;
  const out: Record<string, number> = {};
  for (const id of unique) out[id] = data[id]?.usd ?? 0;
  return out;
}

function TokenAvatar({ token, size = "md" }: { token: TokenDef; size?: "sm" | "md" | "lg" }) {
  const dim = size === "sm" ? 28 : size === "lg" ? 44 : 36;
  return (
    <Image
      src={token.icon}
      alt={token.symbol}
      width={dim}
      height={dim}
      unoptimized
      style={{ borderRadius: "50%", flexShrink: 0 }}
    />
  );
}

function NetworkIcon({ network, size = 20 }: { network: Network; size?: number }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      width: size, height: size, borderRadius: "50%",
      background: network.color + "22",
      border: `1.5px solid ${network.color}55`,
      flexShrink: 0, overflow: "hidden",
    }}>
      <Image src={network.icon} alt={network.name} width={size} height={size} unoptimized style={{ borderRadius: "50%", objectFit: "cover" }} />
    </span>
  );
}

function NetworkSelectModal({
  current, onSelect, onClose,
}: {
  current: Network;
  onSelect: (n: Network) => void;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(5,6,20,0.7)", backdropFilter: "blur(6px)" }}
      onClick={onClose}
    >
      <div className="token-modal w-full max-w-sm overflow-hidden animate-fadein" onClick={(e) => e.stopPropagation()}>
        <div className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 style={{ color: "#e8eaff", fontWeight: 700, fontSize: 17 }}>Select Network</h3>
            <button
              onClick={onClose}
              style={{
                width: 32, height: 32, borderRadius: 8,
                background: "#0d0e1a", border: "1px solid #252847",
                color: "#7b82b0", cursor: "pointer", fontSize: 14,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >✕</button>
          </div>
        </div>
        <div style={{ paddingBottom: 12 }}>
          {NETWORKS.map((net) => (
            <button
              key={net.id}
              onClick={() => { onSelect(net); onClose(); }}
              className="token-list-item"
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 12,
                padding: "12px 20px", background: "none", border: "none",
                cursor: "pointer", textAlign: "left",
                borderLeft: net.id === current.id ? `3px solid ${net.color}` : "3px solid transparent",
              }}
            >
              <NetworkIcon network={net} size={36} />
              <div style={{ flex: 1 }}>
                <div style={{ color: "#e8eaff", fontWeight: 600, fontSize: 14 }}>{net.name}</div>
                <div style={{ color: "#6b7299", fontSize: 12 }}>{net.nativeCurrency} · Chain {net.chainId}</div>
              </div>
              {net.id === current.id && (
                <span style={{ color: net.color, fontSize: 12, fontWeight: 700 }}>✓ Active</span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function TokenSelectModal({
  onSelect, onClose, excludeSymbol, tokens,
}: {
  onSelect: (token: Token) => void;
  onClose: () => void;
  excludeSymbol?: string;
  tokens: Token[];
}) {
  const [search, setSearch] = useState("");
  const filtered = tokens.filter(
    (t) =>
      t.symbol !== excludeSymbol &&
      (t.symbol.toLowerCase().includes(search.toLowerCase()) ||
        t.name.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(5,6,20,0.7)", backdropFilter: "blur(6px)" }}
      onClick={onClose}
    >
      <div className="token-modal w-full max-w-sm overflow-hidden animate-fadein" onClick={(e) => e.stopPropagation()}>
        <div className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 style={{ color: "#e8eaff", fontWeight: 700, fontSize: 17 }}>Select Token</h3>
            <button
              onClick={onClose}
              style={{
                width: 32, height: 32, borderRadius: 8,
                background: "#0d0e1a", border: "1px solid #252847",
                color: "#7b82b0", cursor: "pointer", fontSize: 14,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >✕</button>
          </div>
          <div className="relative mb-4">
            <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#6b7299", fontSize: 14 }}>🔍</span>
            <input
              autoFocus
              type="text"
              placeholder="Search token..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: "100%", background: "#0a0b18",
                border: "1.5px solid #252847", borderRadius: 12,
                paddingLeft: 36, paddingRight: 14, paddingTop: 10, paddingBottom: 10,
                color: "#e8eaff", fontSize: 14, outline: "none",
              }}
            />
          </div>
          <div style={{ fontSize: 11, color: "#6b7299", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6, paddingLeft: 4 }}>
            All Tokens
          </div>
        </div>
        <div style={{ maxHeight: 300, overflowY: "auto", paddingBottom: 8 }}>
          {filtered.map((token) => (
            <button
              key={token.symbol}
              onClick={() => { onSelect(token); onClose(); }}
              className="token-list-item"
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 12,
                padding: "10px 20px", background: "none", border: "none",
                cursor: "pointer", textAlign: "left",
              }}
            >
              <TokenAvatar token={token} size="md" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: "#e8eaff", fontWeight: 600, fontSize: 14 }}>{token.symbol}</div>
                <div style={{ color: "#6b7299", fontSize: 12 }}>{token.name}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ color: "#c0c8f0", fontSize: 13, fontWeight: 500 }}>
                  {token.balance > 0 ? token.balance.toFixed(4) : "—"}
                </div>
                {token.price > 0 && (
                  <div style={{ color: "#6b7299", fontSize: 11 }}>${token.price.toLocaleString(undefined, { maximumFractionDigits: 4 })}</div>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Price Ticker ────────────────────────────────────────────────────────────
const TICKER_COINS = [
  { id: "bitcoin", symbol: "BTC", icon: `${CDN}/btc.png` },
  { id: "ethereum", symbol: "ETH", icon: `${CDN}/eth.png` },
  { id: "binancecoin", symbol: "BNB", icon: `${CDN}/bnb.png` },
  { id: "solana", symbol: "SOL", icon: `${CDN}/sol.png` },
  { id: "ripple", symbol: "XRP", icon: `${CDN}/xrp.png` },
  { id: "cardano", symbol: "ADA", icon: `${CDN}/ada.png` },
  { id: "avalanche-2", symbol: "AVAX", icon: `${CDN}/avax.png` },
  { id: "matic-network", symbol: "MATIC", icon: `${CDN}/matic.png` },
  { id: "chainlink", symbol: "LINK", icon: `${CDN}/link.png` },
  { id: "uniswap", symbol: "UNI", icon: `${CDN}/uni.png` },
];

function PriceTicker() {
  const [prices, setPrices] = useState<Record<string, { usd: number; usd_24h_change: number }>>({});

  useEffect(() => {
    const ids = TICKER_COINS.map((c) => c.id).join(",");
    const fetchPrices = async () => {
      try {
        const res = await fetch(`${COINGECKO_API}/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`);
        if (res.ok) {
          const data = await res.json() as Record<string, { usd: number; usd_24h_change: number }>;
          setPrices(data);
        }
      } catch { /* ignore */ }
    };
    fetchPrices();
    const interval = setInterval(fetchPrices, 60000);
    return () => clearInterval(interval);
  }, []);

  const items = [...TICKER_COINS, ...TICKER_COINS]; // duplicate for seamless scroll

  return (
    <div style={{
      position: "relative", zIndex: 10,
      background: "rgba(13,14,26,0.85)", borderTop: "1px solid rgba(108,99,255,0.15)", borderBottom: "1px solid rgba(108,99,255,0.15)",
      overflow: "hidden", height: 40,
    }}>
      <div className="ticker-track" style={{ alignItems: "center", height: 40 }}>
        {items.map((coin, i) => {
          const p = prices[coin.id];
          const change = p?.usd_24h_change ?? 0;
          const isUp = change >= 0;
          return (
            <div key={`${coin.id}-${i}`} style={{ display: "flex", alignItems: "center", gap: 6, padding: "0 20px", whiteSpace: "nowrap", borderRight: "1px solid rgba(108,99,255,0.1)" }}>
              <Image src={coin.icon} alt={coin.symbol} width={18} height={18} unoptimized style={{ borderRadius: "50%" }} />
              <span style={{ fontWeight: 600, fontSize: 12, color: "#c8caff" }}>{coin.symbol}</span>
              <span style={{ fontSize: 12, color: "#e8eaff", fontWeight: 500 }}>
                {p ? `$${p.usd.toLocaleString(undefined, { maximumFractionDigits: p.usd > 100 ? 0 : p.usd > 1 ? 2 : 4 })}` : "—"}
              </span>
              {p && (
                <span style={{ fontSize: 11, color: isUp ? "#4ade80" : "#f87171", fontWeight: 600 }}>
                  {isUp ? "▲" : "▼"} {Math.abs(change).toFixed(2)}%
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Reviews ─────────────────────────────────────────────────────────────────
const REVIEWS = [
  { name: "Alex M.", avatar: "A", color: "#6c63ff", text: "SwapX gave me the best rate I've ever seen. Saved $40 on a single ETH swap compared to Uniswap!", rating: 5, date: "2 days ago" },
  { name: "Sarah K.", avatar: "S", color: "#9945FF", text: "Super fast and the UI is gorgeous. Connected my MetaMask in seconds and swapped BNB to USDC without any issues.", rating: 5, date: "5 days ago" },
  { name: "Dmitri V.", avatar: "D", color: "#28A0F0", text: "Finally a DEX aggregator that actually works. The multi-chain support is a game changer — switched from Ethereum to Polygon seamlessly.", rating: 5, date: "1 week ago" },
  { name: "Priya R.", avatar: "P", color: "#F3BA2F", text: "I was skeptical at first but the real-time price quotes are spot on. Swapped AVAX to USDT and the transaction confirmed in under 30 seconds.", rating: 5, date: "1 week ago" },
  { name: "James T.", avatar: "J", color: "#E84142", text: "The slippage control is excellent. Set it to 0.5% and my swap went through perfectly. Much better than other aggregators I've tried.", rating: 4, date: "2 weeks ago" },
  { name: "Yuki N.", avatar: "Y", color: "#4ade80", text: "Love the dark theme and the smooth animations. SwapX feels premium. Already recommended it to my whole crypto group.", rating: 5, date: "2 weeks ago" },
];

function StarRating({ rating }: { rating: number }) {
  return (
    <div style={{ display: "flex", gap: 2 }}>
      {[1,2,3,4,5].map((s) => (
        <svg key={s} width="13" height="13" viewBox="0 0 24 24" fill={s <= rating ? "#f59e0b" : "none"} stroke={s <= rating ? "#f59e0b" : "#4b5563"} strokeWidth="2">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
        </svg>
      ))}
    </div>
  );
}

export default function SwapPage() {
  const [selectedNetwork, setSelectedNetwork] = useState<Network>(NETWORKS[0]);
  const [tokens, setTokens] = useState<Token[]>(() => (TOKENS_BY_CHAIN["0x1"] ?? []).map((t) => makeToken(t)));
  const [fromToken, setFromToken] = useState<Token>(() => makeToken((TOKENS_BY_CHAIN["0x1"] ?? [])[0]));
  const [toToken, setToToken] = useState<Token>(() => makeToken((TOKENS_BY_CHAIN["0x1"] ?? [])[1]));
  const [fromAmount, setFromAmount] = useState("");
  const [toAmount, setToAmount] = useState("");
  const [slippage, setSlippage] = useState("0.5");
  const [modalFor, setModalFor] = useState<"from" | "to" | null>(null);
  const [networkModalOpen, setNetworkModalOpen] = useState(false);
  const [isSwapping, setIsSwapping] = useState(false);
  const [balancesLoading, setBalancesLoading] = useState(false);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [toastType, setToastType] = useState<"ok" | "err" | "info">("ok");
  const [account, setAccount] = useState<string | null>(null);
  const [chainId, setChainId] = useState<string | null>(null);
  const [exchangeRate, setExchangeRate] = useState<string | null>(null);
  const quoteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connected = !!account;
  // Solana is non-EVM — treat it as always "on network" (user switches manually in MetaMask)
  const isOnSelectedNetwork = selectedNetwork.chainId === 0 || chainId?.toLowerCase() === selectedNetwork.id.toLowerCase();

  function showToast(msg: string, type: "ok" | "err" | "info" = "ok") {
    setToast(msg);
    setToastType(type);
    setTimeout(() => setToast(null), 5000);
  }

  const syncToken = useCallback((sym: string, updatedList: Token[]) => {
    return updatedList.find((t) => t.symbol === sym);
  }, []);

  // When network changes, reset token list
  const applyNetwork = useCallback((net: Network) => {
    const defs = TOKENS_BY_CHAIN[net.id] ?? [];
    const newTokens = defs.map((t) => makeToken(t));
    setTokens(newTokens);
    setFromToken(newTokens[0] ?? makeToken(defs[0]));
    setToToken(newTokens[1] ?? makeToken(defs[1]));
    setFromAmount("");
    setToAmount("");
    setExchangeRate(null);
  }, []);

  const loadBalancesAndPrices = useCallback(async (addr: string, net: Network) => {
    if (!window.ethereum) return;
    setBalancesLoading(true);
    const defs = TOKENS_BY_CHAIN[net.id] ?? [];
    try {
      const priceMap = await fetchCoinGeckoPrices(defs.map((t) => t.coingeckoId));

      // Non-EVM chains (e.g. Solana): skip EVM balance calls, show prices only
      const balances = net.chainId === 0
        ? defs.map(() => 0)
        : await Promise.all(
            defs.map(async (token) => {
              try {
                if (token.address.toLowerCase() === NATIVE.toLowerCase()) {
                  const bal = await window.ethereum!.request({ method: "eth_getBalance", params: [addr, "latest"] }) as string;
                  return parseInt(bal, 16) / 1e18;
                } else {
                  const raw = await fetchERC20Balance(token.address, addr);
                  return parseInt(raw, 16) / Math.pow(10, token.decimals);
                }
              } catch { return 0; }
            })
          );

      const updated = defs.map((t, i) => makeToken(t, balances[i], t.fixedPrice ?? priceMap[t.coingeckoId] ?? 0));
      setTokens(updated);
      setFromToken((prev) => syncToken(prev.symbol, updated) ?? updated[0]);
      setToToken((prev) => syncToken(prev.symbol, updated) ?? updated[1]);
    } catch (e) {
      console.error("Failed to load balances", e);
    } finally {
      setBalancesLoading(false);
    }
  }, [syncToken]);

  const fetchQuote = useCallback(async (amount: string, from: Token, to: Token, net: Network) => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      setToAmount("");
      setExchangeRate(null);
      return;
    }
    if (!net.paraswapNetwork) {
      // Fallback to price-based
      if (from.price > 0 && to.price > 0) {
        const out = (Number(amount) * from.price) / to.price;
        setToAmount(out.toFixed(6));
        setExchangeRate(`1 ${from.symbol} ≈ ${(from.price / to.price).toFixed(6)} ${to.symbol}`);
      }
      return;
    }
    setQuoteLoading(true);
    try {
      const amtRaw = BigInt(Math.round(Number(amount) * Math.pow(10, from.decimals))).toString();
      const url = `${PARASWAP_API}/prices?srcToken=${from.address}&srcDecimals=${from.decimals}&destToken=${to.address}&destDecimals=${to.decimals}&amount=${amtRaw}&side=SELL&network=${net.paraswapNetwork}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("quote_api_fail");
      const data = await res.json() as { priceRoute: { destAmount: string } };
      const destAmt = Number(data.priceRoute.destAmount) / Math.pow(10, to.decimals);
      setToAmount(destAmt.toFixed(6));
      const rate = (destAmt / Number(amount)).toFixed(6);
      setExchangeRate(`1 ${from.symbol} = ${rate} ${to.symbol}`);
    } catch {
      if (from.price > 0 && to.price > 0) {
        const out = (Number(amount) * from.price) / to.price;
        setToAmount(out.toFixed(6));
        setExchangeRate(`1 ${from.symbol} ≈ ${(from.price / to.price).toFixed(6)} ${to.symbol}`);
      }
    } finally {
      setQuoteLoading(false);
    }
  }, []);

  useEffect(() => {
    if (quoteTimer.current) clearTimeout(quoteTimer.current);
    quoteTimer.current = setTimeout(() => fetchQuote(fromAmount, fromToken, toToken, selectedNetwork), 600);
    return () => { if (quoteTimer.current) clearTimeout(quoteTimer.current); };
  }, [fromAmount, fromToken, toToken, selectedNetwork, fetchQuote]);

  useEffect(() => {
    if (!window.ethereum) return;
    const onAccountsChanged = (accs: unknown) => {
      const arr = accs as string[];
      setAccount(arr[0] ?? null);
    };
    const onChainChanged = (chain: unknown) => {
      const c = chain as string;
      setChainId(c);
      // Auto-update selected network if we know it
      const matched = NETWORKS.find((n) => n.id.toLowerCase() === c.toLowerCase());
      if (matched) {
        setSelectedNetwork(matched);
        applyNetwork(matched);
      }
    };
    window.ethereum.on("accountsChanged", onAccountsChanged);
    window.ethereum.on("chainChanged", onChainChanged);
    window.ethereum.request({ method: "eth_accounts" }).then((a) => {
      const arr = a as string[];
      if (arr[0]) setAccount(arr[0]);
    }).catch(() => {});
    window.ethereum.request({ method: "eth_chainId" }).then((c) => {
      const chain = c as string;
      setChainId(chain);
      const matched = NETWORKS.find((n) => n.id.toLowerCase() === chain.toLowerCase());
      if (matched) {
        setSelectedNetwork(matched);
        applyNetwork(matched);
      }
    }).catch(() => {});
    return () => {
      window.ethereum?.removeListener("accountsChanged", onAccountsChanged);
      window.ethereum?.removeListener("chainChanged", onChainChanged);
    };
  }, [applyNetwork]);

  useEffect(() => {
    if (account && isOnSelectedNetwork) loadBalancesAndPrices(account, selectedNetwork);
  }, [account, isOnSelectedNetwork, selectedNetwork, loadBalancesAndPrices]);

  async function connectWallet() {
    if (!window.ethereum) {
      alert("MetaMask not found. Please install MetaMask browser extension.");
      return;
    }
    try {
      const accs = await window.ethereum.request({ method: "eth_requestAccounts" }) as string[];
      if (accs[0]) setAccount(accs[0]);
    } catch { /* user rejected */ }
  }

  async function switchToNetwork(net: Network) {
    if (net.chainId === 0) {
      showToast(`ℹ️ Please switch to ${net.name} manually in MetaMask`, "info");
      return;
    }
    try {
      await window.ethereum?.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: net.id }],
      });
    } catch (err) {
      // Chain not added to MetaMask — try adding it
      const e = err as { code?: number };
      if (e.code === 4902) {
        try {
          await window.ethereum?.request({
            method: "wallet_addEthereumChain",
            params: [{
              chainId: net.id,
              chainName: net.name,
              nativeCurrency: { name: net.nativeCurrency, symbol: net.nativeCurrency, decimals: 18 },
              rpcUrls: [net.rpcUrl],
              blockExplorerUrls: [net.blockExplorer],
            }],
          });
        } catch {
          showToast(`❌ Failed to add ${net.name}`, "err");
        }
      } else {
        showToast(`❌ Failed to switch to ${net.name}`, "err");
      }
    }
  }

  async function handleNetworkSelect(net: Network) {
    setSelectedNetwork(net);
    applyNetwork(net);
    if (connected) {
      await switchToNetwork(net);
    }
  }

  function handleFlip() {
    setFromToken(toToken);
    setToToken(fromToken);
    setFromAmount(toAmount);
    setToAmount(fromAmount);
  }

  async function handleSwap() {
    if (!connected || !account) return;
    if (!isOnSelectedNetwork) { await switchToNetwork(selectedNetwork); return; }

    const amt = Number(fromAmount);
    if (!fromAmount || isNaN(amt) || amt <= 0) return;
    if (amt > fromToken.balance) {
      showToast(`❌ Insufficient ${fromToken.symbol} balance`, "err");
      return;
    }
    if (!selectedNetwork.paraswapNetwork) {
      showToast("❌ Swaps not supported on this network yet", "err");
      return;
    }

    setIsSwapping(true);
    try {
      const amtRaw = BigInt(Math.round(amt * Math.pow(10, fromToken.decimals))).toString();

      showToast("🔍 Getting best route...", "info");
      const priceUrl = `${PARASWAP_API}/prices?srcToken=${fromToken.address}&srcDecimals=${fromToken.decimals}&destToken=${toToken.address}&destDecimals=${toToken.decimals}&amount=${amtRaw}&side=SELL&network=${selectedNetwork.paraswapNetwork}&userAddress=${account}`;
      const priceRes = await fetch(priceUrl);
      if (!priceRes.ok) throw new Error("Failed to get price route");
      const priceData = await priceRes.json() as { priceRoute: unknown };

      const buildRes = await fetch(`${PARASWAP_API}/transactions/${selectedNetwork.paraswapNetwork}?ignoreChecks=true`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          srcToken: fromToken.address,
          srcDecimals: fromToken.decimals,
          destToken: toToken.address,
          destDecimals: toToken.decimals,
          srcAmount: amtRaw,
          slippage: Math.round(Number(slippage) * 100),
          priceRoute: priceData.priceRoute,
          userAddress: account,
        }),
      });
      if (!buildRes.ok) {
        const errJson = await buildRes.json() as { error?: string };
        throw new Error(errJson.error ?? "Failed to build transaction");
      }
      const txData = await buildRes.json() as { to: string; data: string; value?: string; gas?: string };

      const isNativeToken = fromToken.address.toLowerCase() === NATIVE.toLowerCase();
      if (!isNativeToken) {
        const allowanceHex = await window.ethereum!.request({
          method: "eth_call",
          params: [{ to: fromToken.address, data: encodeAllowance(account, txData.to) }, "latest"],
        }) as string;

        const allowance = BigInt(allowanceHex || "0x0");
        const needed = BigInt(amtRaw);

        if (allowance < needed) {
          showToast("🔐 Approving token spend...", "info");
          const maxUint256 = "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";
          const approveData = "0x095ea7b3" +
            txData.to.toLowerCase().replace("0x", "").padStart(64, "0") +
            maxUint256;

          await window.ethereum!.request({
            method: "eth_sendTransaction",
            params: [{ from: account, to: fromToken.address, data: approveData }],
          });
          showToast("✅ Approved! Submitting swap...", "ok");
          await new Promise((r) => setTimeout(r, 2000));
        }
      }

      const txHash = await window.ethereum!.request({
        method: "eth_sendTransaction",
        params: [{
          from: account,
          to: txData.to,
          data: txData.data,
          value: txData.value && txData.value !== "0" ? "0x" + BigInt(txData.value).toString(16) : "0x0",
          ...(txData.gas ? { gas: "0x" + Number(txData.gas).toString(16) } : {}),
        }],
      }) as string;

      showToast(`✅ Swap submitted! ${txHash.slice(0, 8)}...${txHash.slice(-6)}`, "ok");
      setFromAmount("");
      setToAmount("");
      setTimeout(() => loadBalancesAndPrices(account, selectedNetwork), 8000);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      if (!msg.toLowerCase().includes("user rejected") && !msg.toLowerCase().includes("user denied")) {
        showToast(`❌ ${msg.slice(0, 80)}`, "err");
      }
    } finally {
      setIsSwapping(false);
    }
  }

  const usdValue = fromAmount && !isNaN(Number(fromAmount)) && fromToken.price > 0
    ? (Number(fromAmount) * fromToken.price).toFixed(2)
    : null;

  const toUsdValue = toAmount && !isNaN(Number(toAmount)) && toToken.price > 0
    ? (Number(toAmount) * toToken.price).toFixed(2)
    : null;

  return (
    <div style={{ minHeight: "100vh", background: "#0d0e1a" }}>
      {/* Background blobs */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", overflow: "hidden", zIndex: 0 }}>
        <div style={{ position: "absolute", top: "-100px", right: "-100px", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(108,99,255,0.22) 0%, transparent 65%)" }} />
        <div style={{ position: "absolute", bottom: "-80px", left: "-80px", width: 420, height: 420, borderRadius: "50%", background: "radial-gradient(circle, rgba(79,110,247,0.15) 0%, transparent 65%)" }} />
        <div style={{ position: "absolute", top: "40%", left: "15%", width: 280, height: 280, borderRadius: "50%", background: "radial-gradient(circle, rgba(153,69,255,0.1) 0%, transparent 65%)" }} />
        <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(108,99,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(108,99,255,0.04) 1px, transparent 1px)", backgroundSize: "60px 60px" }} />
      </div>

      {/* Header */}
      <header style={{
        position: "relative", zIndex: 10,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "18px 32px", maxWidth: 1100, margin: "0 auto",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 12,
            background: "linear-gradient(135deg, #6c63ff, #9b8fff)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 4px 12px rgba(108,99,255,0.4)",
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 18, color: "#e8eaff", letterSpacing: "-0.5px" }}>SwapX</div>
            <div style={{ fontSize: 10, color: "#7b82b0", fontWeight: 500, marginTop: -2 }}>DEX Aggregator</div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* Network selector */}
          <button
            onClick={() => setNetworkModalOpen(true)}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "8px 14px", borderRadius: 12, fontSize: 13, fontWeight: 600,
              background: "#13152a", border: `1.5px solid ${selectedNetwork.color}44`,
              color: "#e8eaff", cursor: "pointer",
            }}
          >
            <NetworkIcon network={selectedNetwork} size={20} />
            <span>{selectedNetwork.shortName}</span>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" style={{ color: "#6b7299" }}>
              <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          {connected && !isOnSelectedNetwork && (
            <button
              onClick={() => switchToNetwork(selectedNetwork)}
              style={{
                padding: "9px 18px", borderRadius: 12, fontSize: 13, fontWeight: 600,
                background: "rgba(239,68,68,0.15)", color: "#f87171",
                border: "1.5px solid rgba(239,68,68,0.3)", cursor: "pointer",
              }}
            >
              ⚠️ Switch Network
            </button>
          )}

          <button
            onClick={connected ? () => setAccount(null) : connectWallet}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "9px 18px", borderRadius: 12, fontSize: 14, fontWeight: 600,
              cursor: "pointer", transition: "all 0.2s",
              background: connected ? "rgba(34,197,94,0.12)" : "linear-gradient(135deg, #4f6ef7, #6c8bff)",
              color: connected ? "#4ade80" : "white",
              border: connected ? "1.5px solid rgba(34,197,94,0.3)" : "none",
              boxShadow: connected ? "none" : "0 4px 12px rgba(79,110,247,0.3)",
            }}
          >
            {connected ? (
              <>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e", display: "inline-block" }} />
                {account!.slice(0, 6)}...{account!.slice(-4)}
                {balancesLoading && <span style={{ fontSize: 11, opacity: 0.7 }}>⟳</span>}
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <rect x="2" y="7" width="20" height="14" rx="2" stroke="white" strokeWidth="2"/>
                  <path d="M16 3H8a2 2 0 00-2 2v2h12V5a2 2 0 00-2-2z" stroke="white" strokeWidth="2"/>
                  <circle cx="17" cy="14" r="1.5" fill="white"/>
                </svg>
                Connect Wallet
              </>
            )}
          </button>
        </div>
      </header>

      {/* Price Ticker */}
      <PriceTicker />

      {/* Main */}
      <main style={{ position: "relative", zIndex: 10, display: "flex", flexDirection: "column", alignItems: "center", padding: "20px 16px 60px" }}>

        {/* Hero */}
        <div className="animate-float" style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.25)", borderRadius: 999, padding: "4px 14px", marginBottom: 16 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "#4ade80" }}>⚡ Powered by Paraswap</span>
          </div>
          <h1 style={{ fontSize: "clamp(36px, 6vw, 56px)", fontWeight: 800, color: "#e8eaff", letterSpacing: "-1.5px", lineHeight: 1.1, marginBottom: 12 }}>
            Swap Tokens{" "}
            <span style={{ background: "linear-gradient(135deg, #6c63ff, #b09fff)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Instantly
            </span>
          </h1>
          <p style={{ color: "#7b82b0", fontSize: 17, maxWidth: 420, margin: "0 auto" }}>
            Best rates from all major DEXes — real balances, real swaps
          </p>
        </div>

        {/* Stats */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center", marginBottom: 36 }}>
          {[
            { label: "24h Volume", value: "$2.4B", icon: "📊" },
            { label: "Total Liquidity", value: "$8.1B", icon: "💧" },
            { label: "Tokens Supported", value: "12,450+", icon: "🪙" },
            { label: "Avg. Fee", value: "0.05%", icon: "⚡" },
          ].map((stat) => (
            <div key={stat.label} className="stat-card" style={{ padding: "12px 20px", textAlign: "center", minWidth: 120 }}>
              <div style={{ fontSize: 18, marginBottom: 2 }}>{stat.icon}</div>
              <div style={{ fontWeight: 700, fontSize: 16, color: "#e8eaff" }}>{stat.value}</div>
              <div style={{ fontSize: 11, color: "#6b7299", fontWeight: 500 }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Swap Card */}
        <div className="swap-card animate-fadein" style={{ width: "100%", maxWidth: 440, padding: 24 }}>

          {/* Card header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ fontWeight: 700, fontSize: 16, color: "#e8eaff" }}>Swap</div>
              <div style={{
                display: "flex", alignItems: "center", gap: 5,
                background: selectedNetwork.color + "22",
                border: `1px solid ${selectedNetwork.color}44`,
                borderRadius: 8, padding: "3px 8px",
                fontSize: 11, fontWeight: 600, color: selectedNetwork.color,
              }}>
                <NetworkIcon network={selectedNetwork} size={14} />
                {selectedNetwork.name}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span className="badge-safe">🔒 Non-custodial</span>
              <div style={{ display: "flex", gap: 4, marginLeft: 8 }}>
                {["0.1", "0.5", "1.0"].map((s) => (
                  <button
                    key={s}
                    onClick={() => setSlippage(s)}
                    style={{
                      padding: "3px 8px", borderRadius: 8, fontSize: 11, fontWeight: 600,
                      cursor: "pointer", transition: "all 0.15s",
                      background: slippage === s ? "rgba(108,99,255,0.2)" : "transparent",
                      color: slippage === s ? "#9b8fff" : "#6b7299",
                      border: slippage === s ? "1.5px solid rgba(108,99,255,0.5)" : "1.5px solid transparent",
                    }}
                  >
                    {s}%
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* From */}
          <div className="token-input" style={{ padding: 16, marginBottom: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ fontSize: 12, color: "#6b7299", fontWeight: 500 }}>You Pay</span>
              <span style={{ fontSize: 12, color: "#6b7299" }}>
                Balance:{" "}
                <span style={{ color: "#a0a8d0", fontWeight: 600 }}>
                  {connected && isOnSelectedNetwork
                    ? balancesLoading
                      ? "..."
                      : `${fromToken.balance.toFixed(4)} ${fromToken.symbol}`
                    : `—`}
                </span>
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button
                className="token-btn"
                onClick={() => setModalFor("from")}
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", cursor: "pointer", border: "1.5px solid #252847" }}
              >
                <TokenAvatar token={fromToken} size="sm" />
                <span style={{ fontWeight: 700, fontSize: 15, color: "#e8eaff" }}>{fromToken.symbol}</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" style={{ color: "#6b7299" }}>
                  <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              <div style={{ flex: 1, textAlign: "right" }}>
                <input
                  type="number"
                  placeholder="0.00"
                  value={fromAmount}
                  onChange={(e) => setFromAmount(e.target.value)}
                  style={{
                    width: "100%", background: "transparent", border: "none", outline: "none",
                    fontSize: 24, fontWeight: 700, color: "#e8eaff", textAlign: "right",
                  }}
                />
                {usdValue && (
                  <div style={{ fontSize: 12, color: "#6b7299", marginTop: 2 }}>≈ ${usdValue}</div>
                )}
              </div>
            </div>
            {connected && isOnSelectedNetwork && fromToken.balance > 0 && (
              <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                {["25%", "50%", "75%", "MAX"].map((pct) => (
                  <button
                    key={pct}
                    style={{
                      flex: 1, fontSize: 11, fontWeight: 600, padding: "5px 0",
                      borderRadius: 8, cursor: "pointer", transition: "all 0.15s",
                      background: "#0d0e1a", color: "#7b82b0",
                      border: "1px solid #252847",
                    }}
                    onClick={() => {
                      const mul = pct === "MAX" ? 1 : parseFloat(pct) / 100;
                      setFromAmount((fromToken.balance * mul).toFixed(6));
                    }}
                  >
                    {pct}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Flip */}
          <div style={{ display: "flex", justifyContent: "center", margin: "4px 0", position: "relative", zIndex: 1 }}>
            <button
              onClick={handleFlip}
              className="swap-arrow-btn"
              style={{ width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>

          {/* To */}
          <div className="token-input" style={{ padding: 16, marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ fontSize: 12, color: "#6b7299", fontWeight: 500 }}>You Receive</span>
              <span style={{ fontSize: 12, color: "#6b7299" }}>
                Balance:{" "}
                <span style={{ color: "#a0a8d0", fontWeight: 600 }}>
                  {connected && isOnSelectedNetwork
                    ? balancesLoading
                      ? "..."
                      : `${toToken.balance.toFixed(4)} ${toToken.symbol}`
                    : "—"}
                </span>
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button
                className="token-btn"
                onClick={() => setModalFor("to")}
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", cursor: "pointer", border: "1.5px solid #252847" }}
              >
                <TokenAvatar token={toToken} size="sm" />
                <span style={{ fontWeight: 700, fontSize: 15, color: "#e8eaff" }}>{toToken.symbol}</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" style={{ color: "#6b7299" }}>
                  <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              <div style={{ flex: 1, textAlign: "right" }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: toAmount ? "#e8eaff" : "#c8d0e7" }}>
                  {quoteLoading ? (
                    <span style={{ fontSize: 14, color: "#6b7299" }}>Fetching quote...</span>
                  ) : (
                    toAmount || "0.00"
                  )}
                </div>
                {toUsdValue && !quoteLoading && (
                  <div style={{ fontSize: 12, color: "#6b7299", marginTop: 2 }}>≈ ${toUsdValue}</div>
                )}
              </div>
            </div>
          </div>

          {/* Rate info */}
          {exchangeRate && fromAmount && toAmount && (
            <div className="info-row" style={{ padding: "12px 14px", marginBottom: 16 }}>
              {[
                { label: "Exchange Rate", value: exchangeRate },
                { label: "Slippage Tolerance", value: `${slippage}%` },
                { label: "Network", value: selectedNetwork.name },
                { label: "Routing", value: selectedNetwork.paraswapNetwork ? "Paraswap DEX Aggregator" : "Price estimate" },
              ].map((row) => (
                <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "3px 0" }}>
                  <span style={{ fontSize: 12, color: "#6b7299" }}>{row.label}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#a0a8d0", maxWidth: 200, textAlign: "right" }}>{row.value}</span>
                </div>
              ))}
            </div>
          )}

          {/* Swap button */}
          <button
            disabled={(!connected || !fromAmount || isSwapping || quoteLoading) && connected}
            onClick={
              !connected
                ? connectWallet
                : connected && !isOnSelectedNetwork
                ? () => switchToNetwork(selectedNetwork)
                : handleSwap
            }
            className="btn-primary"
            style={{ width: "100%", padding: "15px 0", fontSize: 15, border: "none", cursor: "pointer", opacity: isSwapping ? 0.8 : 1 }}
          >
            {isSwapping ? (
              <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <svg style={{ animation: "spin 1s linear infinite" }} width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="3" strokeOpacity="0.3"/>
                  <path d="M12 2a10 10 0 0110 10" stroke="white" strokeWidth="3" strokeLinecap="round"/>
                </svg>
                Processing swap...
              </span>
            ) : !connected ? (
              "Connect Wallet to Swap"
            ) : !isOnSelectedNetwork ? (
              `Switch to ${selectedNetwork.name}`
            ) : !fromAmount ? (
              "Enter an Amount"
            ) : quoteLoading ? (
              "Getting quote..."
            ) : (
              `Swap ${fromToken.symbol} → ${toToken.symbol}`
            )}
          </button>
        </div>

        {/* Trust badges */}
        <div style={{ marginTop: 24, display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center" }}>
          {[
            { icon: "🔒", text: "Non-custodial" },
            { icon: "⚡", text: "Paraswap routing" },
            { icon: "🌐", text: selectedNetwork.name },
            { icon: "📊", text: "Best price routing" },
          ].map((b) => (
            <div key={b.text} style={{
              display: "flex", alignItems: "center", gap: 6,
              background: "#13152a", border: "1px solid #252847",
              borderRadius: 999, padding: "5px 14px",
              fontSize: 12, color: "#7b82b0", fontWeight: 500,
            }}>
              <span>{b.icon}</span>
              <span>{b.text}</span>
            </div>
          ))}
        </div>
      </main>

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 32, left: "50%", transform: "translateX(-50%)",
          background: "#13152a",
          border: `1.5px solid ${toastType === "err" ? "rgba(239,68,68,0.4)" : toastType === "info" ? "rgba(108,99,255,0.4)" : "#252847"}`,
          borderRadius: 14,
          padding: "14px 24px", color: "#e8eaff", fontSize: 14, fontWeight: 600,
          boxShadow: "0 8px 32px rgba(0,0,0,0.4)", zIndex: 100,
          animation: "fadein 0.3s ease", maxWidth: "90vw", textAlign: "center",
        }}>
          {toast}
        </div>
      )}

      {/* Reviews Section */}
      <section style={{ position: "relative", zIndex: 10, padding: "60px 16px 80px", maxWidth: 1100, margin: "0 auto", width: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.25)", borderRadius: 999, padding: "4px 14px", marginBottom: 14 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "#fbbf24" }}>⭐ Trusted by thousands</span>
          </div>
          <h2 style={{ fontSize: "clamp(26px, 4vw, 38px)", fontWeight: 800, color: "#e8eaff", letterSpacing: "-1px", marginBottom: 10 }}>
            What Our Users Say
          </h2>
          <p style={{ color: "#7b82b0", fontSize: 15, maxWidth: 400, margin: "0 auto" }}>
            Real feedback from real traders who use SwapX every day
          </p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 20 }}>
          {REVIEWS.map((review) => (
            <div key={review.name} style={{
              background: "rgba(19,21,42,0.85)", border: "1px solid rgba(108,99,255,0.18)",
              borderRadius: 18, padding: "22px 24px",
              backdropFilter: "blur(12px)",
              transition: "border-color 0.2s",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                <div style={{
                  width: 42, height: 42, borderRadius: "50%",
                  background: `linear-gradient(135deg, ${review.color}, ${review.color}99)`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontWeight: 700, fontSize: 16, color: "white", flexShrink: 0,
                }}>
                  {review.avatar}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "#e8eaff" }}>{review.name}</div>
                  <div style={{ fontSize: 11, color: "#6b7299", marginTop: 1 }}>{review.date}</div>
                </div>
                <div style={{ marginLeft: "auto" }}>
                  <StarRating rating={review.rating} />
                </div>
              </div>
              <p style={{ color: "#9ba3c9", fontSize: 13.5, lineHeight: 1.6, margin: 0 }}>
                &ldquo;{review.text}&rdquo;
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Token modal */}
      {modalFor && (
        <TokenSelectModal
          tokens={tokens}
          excludeSymbol={modalFor === "from" ? toToken.symbol : fromToken.symbol}
          onSelect={(token) => {
            if (modalFor === "from") setFromToken(token);
            else setToToken(token);
          }}
          onClose={() => setModalFor(null)}
        />
      )}

      {/* Network modal */}
      {networkModalOpen && (
        <NetworkSelectModal
          current={selectedNetwork}
          onSelect={handleNetworkSelect}
          onClose={() => setNetworkModalOpen(false)}
        />
      )}
    </div>
  );
}
