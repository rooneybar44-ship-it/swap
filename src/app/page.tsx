"use client";

import { useState } from "react";

const TOKENS = [
  { symbol: "ETH", name: "Ethereum", icon: "⟠", balance: "2.4521", price: 3420.5 },
  { symbol: "USDC", name: "USD Coin", icon: "◎", balance: "1,250.00", price: 1.0 },
  { symbol: "BTC", name: "Bitcoin", icon: "₿", balance: "0.0821", price: 68200.0 },
  { symbol: "SOL", name: "Solana", icon: "◎", balance: "45.230", price: 185.3 },
  { symbol: "UNI", name: "Uniswap", icon: "🦄", balance: "120.50", price: 12.4 },
  { symbol: "LINK", name: "Chainlink", icon: "⬡", balance: "85.00", price: 18.7 },
  { symbol: "AAVE", name: "Aave", icon: "👻", balance: "5.20", price: 210.0 },
  { symbol: "MATIC", name: "Polygon", icon: "⬟", balance: "500.00", price: 0.85 },
];

type Token = (typeof TOKENS)[number];

function TokenIcon({ symbol, size = "md" }: { symbol: string; size?: "sm" | "md" | "lg" }) {
  const sizes = { sm: "w-6 h-6 text-xs", md: "w-8 h-8 text-sm", lg: "w-10 h-10 text-base" };
  const colors: Record<string, string> = {
    ETH: "from-blue-500 to-indigo-600",
    USDC: "from-blue-400 to-cyan-500",
    BTC: "from-orange-400 to-yellow-500",
    SOL: "from-purple-500 to-pink-500",
    UNI: "from-pink-500 to-rose-500",
    LINK: "from-blue-600 to-blue-400",
    AAVE: "from-purple-600 to-violet-400",
    MATIC: "from-violet-600 to-purple-400",
  };
  const token = TOKENS.find((t) => t.symbol === symbol);
  return (
    <div
      className={`${sizes[size]} rounded-full bg-gradient-to-br ${colors[symbol] || "from-gray-500 to-gray-700"} flex items-center justify-center font-bold text-white`}
    >
      {token?.icon || symbol[0]}
    </div>
  );
}

function TokenSelectModal({
  onSelect,
  onClose,
  excludeSymbol,
}: {
  onSelect: (token: Token) => void;
  onClose: () => void;
  excludeSymbol?: string;
}) {
  const [search, setSearch] = useState("");
  const filtered = TOKENS.filter(
    (t) =>
      t.symbol !== excludeSymbol &&
      (t.symbol.toLowerCase().includes(search.toLowerCase()) ||
        t.name.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
      onClick={onClose}
    >
      <div
        className="token-modal rounded-2xl w-full max-w-sm overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold text-lg">Select Token</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10"
            >
              ✕
            </button>
          </div>
          <div className="relative mb-4">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
            <input
              autoFocus
              type="text"
              placeholder="Search by name or symbol..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-3 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-purple-500/50"
            />
          </div>
          <div className="text-xs text-gray-500 mb-2 px-1 font-medium uppercase tracking-wider">Popular</div>
        </div>
        <div className="max-h-72 overflow-y-auto pb-2">
          {filtered.map((token) => (
            <button
              key={token.symbol}
              onClick={() => { onSelect(token); onClose(); }}
              className="token-list-item w-full flex items-center gap-3 px-5 py-3 text-left rounded-xl mx-0"
            >
              <TokenIcon symbol={token.symbol} size="md" />
              <div className="flex-1 min-w-0">
                <div className="text-white font-medium text-sm">{token.symbol}</div>
                <div className="text-gray-500 text-xs">{token.name}</div>
              </div>
              <div className="text-right">
                <div className="text-gray-300 text-sm">{token.balance}</div>
                <div className="text-gray-500 text-xs">${token.price.toLocaleString()}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function SwapPage() {
  const [fromToken, setFromToken] = useState<Token>(TOKENS[0]);
  const [toToken, setToToken] = useState<Token>(TOKENS[1]);
  const [fromAmount, setFromAmount] = useState("");
  const [slippage, setSlippage] = useState("0.5");
  const [modalFor, setModalFor] = useState<"from" | "to" | null>(null);
  const [swapped, setSwapped] = useState(false);
  const [isSwapping, setIsSwapping] = useState(false);
  const [connected, setConnected] = useState(false);

  const toAmount =
    fromAmount && !isNaN(Number(fromAmount))
      ? ((Number(fromAmount) * fromToken.price) / toToken.price).toFixed(6)
      : "";

  const exchangeRate =
    fromToken && toToken
      ? (fromToken.price / toToken.price).toFixed(6)
      : "0";

  const usdValue =
    fromAmount && !isNaN(Number(fromAmount))
      ? (Number(fromAmount) * fromToken.price).toFixed(2)
      : null;

  function handleFlip() {
    setFromToken(toToken);
    setToToken(fromToken);
    setFromAmount(toAmount);
    setSwapped((s) => !s);
  }

  async function handleSwap() {
    if (!connected || !fromAmount) return;
    setIsSwapping(true);
    await new Promise((r) => setTimeout(r, 2000));
    setIsSwapping(false);
    setFromAmount("");
  }

  return (
    <div className="min-h-screen bg-grid relative overflow-hidden" style={{ background: "#0a0b0f" }}>
      {/* Background orbs */}
      <div className="glow-orb absolute top-[-10%] left-[20%] w-[500px] h-[500px] rounded-full bg-purple-600 pointer-events-none" />
      <div className="glow-orb absolute bottom-[-10%] right-[15%] w-[400px] h-[400px] rounded-full bg-blue-600 pointer-events-none" />
      <div className="glow-orb absolute top-[40%] left-[-5%] w-[300px] h-[300px] rounded-full bg-violet-500 pointer-events-none" />

      {/* Grid overlay */}
      <div className="absolute inset-0 bg-grid pointer-events-none opacity-40" />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white text-sm font-bold">⚡</div>
          <span className="text-white font-bold text-xl tracking-tight">SwapX</span>
        </div>
        <nav className="hidden md:flex items-center gap-1">
          {["Swap", "Liquidity", "Earn", "Analytics"].map((item, i) => (
            <button
              key={item}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${i === 0 ? "bg-white/10 text-white" : "text-gray-400 hover:text-white hover:bg-white/5"}`}
            >
              {item}
            </button>
          ))}
        </nav>
        <button
          onClick={() => setConnected((c) => !c)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            connected
              ? "bg-green-500/10 border border-green-500/30 text-green-400"
              : "btn-swap text-white"
          }`}
        >
          {connected ? (
            <>
              <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
              0x1a2b...3c4d
            </>
          ) : (
            "Connect Wallet"
          )}
        </button>
      </header>

      {/* Main content */}
      <main className="relative z-10 flex flex-col items-center justify-center px-4 pt-8 pb-16">
        {/* Hero text */}
        <div className="text-center mb-10 animate-float">
          <h1 className="text-5xl md:text-6xl font-extrabold text-white mb-3 tracking-tight">
            Swap{" "}
            <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
              Instantly
            </span>
          </h1>
          <p className="text-gray-400 text-lg max-w-md mx-auto">
            Trade any token at the best rates across all major DEXs
          </p>
        </div>

        {/* Stats bar */}
        <div className="flex flex-wrap items-center justify-center gap-4 mb-10">
          {[
            { label: "24h Volume", value: "$2.4B" },
            { label: "Total Liquidity", value: "$8.1B" },
            { label: "Supported Tokens", value: "12,450+" },
            { label: "Avg. Fee", value: "0.05%" },
          ].map((stat) => (
            <div key={stat.label} className="stat-card rounded-2xl px-5 py-3 text-center">
              <div className="text-white font-bold text-lg">{stat.value}</div>
              <div className="text-gray-500 text-xs">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Swap Card */}
        <div className="swap-card rounded-3xl p-6 w-full max-w-md animate-pulse-glow">
          {/* From */}
          <div className="token-input rounded-2xl p-4 mb-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm font-medium">You Pay</span>
              <span className="text-gray-500 text-xs">
                Balance: <span className="text-gray-300">{fromToken.balance} {fromToken.symbol}</span>
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                className="token-btn flex items-center gap-2 px-3 py-2 rounded-xl"
                onClick={() => setModalFor("from")}
              >
                <TokenIcon symbol={fromToken.symbol} size="sm" />
                <span className="text-white font-semibold">{fromToken.symbol}</span>
                <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <div className="flex-1 text-right">
                <input
                  type="number"
                  placeholder="0.0"
                  value={fromAmount}
                  onChange={(e) => setFromAmount(e.target.value)}
                  className="w-full bg-transparent text-white text-2xl font-bold text-right placeholder-gray-600 focus:outline-none"
                />
                {usdValue && (
                  <div className="text-gray-500 text-xs mt-1">≈ ${usdValue}</div>
                )}
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              {["25%", "50%", "75%", "MAX"].map((pct) => (
                <button
                  key={pct}
                  className="flex-1 text-xs py-1 rounded-lg bg-white/5 text-gray-400 hover:bg-purple-500/20 hover:text-purple-300 transition-all"
                  onClick={() => {
                    const bal = parseFloat(fromToken.balance.replace(",", ""));
                    const multiplier = pct === "MAX" ? 1 : parseFloat(pct) / 100;
                    setFromAmount((bal * multiplier).toFixed(4));
                  }}
                >
                  {pct}
                </button>
              ))}
            </div>
          </div>

          {/* Swap arrow */}
          <div className="flex justify-center my-2 relative z-10">
            <button
              onClick={handleFlip}
              className="swap-arrow-btn w-10 h-10 rounded-xl flex items-center justify-center text-purple-400"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" />
              </svg>
            </button>
          </div>

          {/* To */}
          <div className="token-input rounded-2xl p-4 mb-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm font-medium">You Receive</span>
              <span className="text-gray-500 text-xs">
                Balance: <span className="text-gray-300">{toToken.balance} {toToken.symbol}</span>
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                className="token-btn flex items-center gap-2 px-3 py-2 rounded-xl"
                onClick={() => setModalFor("to")}
              >
                <TokenIcon symbol={toToken.symbol} size="sm" />
                <span className="text-white font-semibold">{toToken.symbol}</span>
                <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <div className="flex-1 text-right">
                <div className="text-white text-2xl font-bold">{toAmount || <span className="text-gray-600">0.0</span>}</div>
                {toAmount && (
                  <div className="text-gray-500 text-xs mt-1">
                    ≈ ${(Number(toAmount) * toToken.price).toFixed(2)}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Rate info */}
          {fromAmount && toAmount && (
            <div className="rounded-xl bg-white/3 border border-white/5 p-3 mb-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">Exchange Rate</span>
                <span className="text-gray-300">1 {fromToken.symbol} = {exchangeRate} {toToken.symbol}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">Price Impact</span>
                <span className="text-green-400">&lt; 0.01%</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">Network Fee</span>
                <span className="text-gray-300">~$2.40</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">Route</span>
                <span className="text-gray-300">{fromToken.symbol} → {toToken.symbol}</span>
              </div>
            </div>
          )}

          {/* Slippage */}
          <div className="flex items-center justify-between mb-4">
            <span className="text-gray-500 text-xs">Slippage Tolerance</span>
            <div className="flex gap-1">
              {["0.1", "0.5", "1.0"].map((s) => (
                <button
                  key={s}
                  onClick={() => setSlippage(s)}
                  className={`px-2 py-1 rounded-lg text-xs font-medium transition-all ${
                    slippage === s
                      ? "bg-purple-500/30 text-purple-300 border border-purple-500/50"
                      : "bg-white/5 text-gray-400 hover:bg-white/10"
                  }`}
                >
                  {s}%
                </button>
              ))}
            </div>
          </div>

          {/* Swap button */}
          <button
            disabled={!connected || !fromAmount || isSwapping}
            onClick={handleSwap}
            className={`w-full py-4 rounded-2xl text-white font-bold text-base transition-all ${
              !connected
                ? "bg-white/10 text-gray-400 cursor-not-allowed"
                : !fromAmount
                ? "bg-white/10 text-gray-400 cursor-not-allowed"
                : isSwapping
                ? "bg-gradient-to-r from-purple-600 to-blue-600 opacity-70 cursor-not-allowed"
                : "btn-swap cursor-pointer"
            }`}
          >
            {isSwapping ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Swapping...
              </span>
            ) : !connected ? (
              "Connect Wallet to Swap"
            ) : !fromAmount ? (
              "Enter an Amount"
            ) : (
              `Swap ${fromToken.symbol} → ${toToken.symbol}`
            )}
          </button>
        </div>

        {/* Bottom info */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-xs text-gray-600">
          <span className="flex items-center gap-1">🔒 Audited by Certik</span>
          <span className="flex items-center gap-1">⚡ Powered by 1inch</span>
          <span className="flex items-center gap-1">🌐 Multi-chain</span>
        </div>
      </main>

      {/* Token select modal */}
      {modalFor && (
        <TokenSelectModal
          excludeSymbol={modalFor === "from" ? toToken.symbol : fromToken.symbol}
          onSelect={(token) => {
            if (modalFor === "from") setFromToken(token);
            else setToToken(token);
          }}
          onClose={() => setModalFor(null)}
        />
      )}
    </div>
  );
}
