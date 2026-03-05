"use client";

import { useState, useEffect } from "react";

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      on: (event: string, handler: (...args: unknown[]) => void) => void;
      removeListener: (event: string, handler: (...args: unknown[]) => void) => void;
    };
  }
}

const TOKENS = [
  { symbol: "ETH", name: "Ethereum", color: "#627EEA", balance: "2.4521", price: 3420.5 },
  { symbol: "USDC", name: "USD Coin", color: "#2775CA", balance: "1,250.00", price: 1.0 },
  { symbol: "BTC", name: "Bitcoin", color: "#F7931A", balance: "0.0821", price: 68200.0 },
  { symbol: "SOL", name: "Solana", color: "#9945FF", balance: "45.230", price: 185.3 },
  { symbol: "UNI", name: "Uniswap", color: "#FF007A", balance: "120.50", price: 12.4 },
  { symbol: "LINK", name: "Chainlink", color: "#2A5ADA", balance: "85.00", price: 18.7 },
  { symbol: "AAVE", name: "Aave", color: "#B6509E", balance: "5.20", price: 210.0 },
  { symbol: "MATIC", name: "Polygon", color: "#8247E5", balance: "500.00", price: 0.85 },
];

type Token = (typeof TOKENS)[number];

function TokenAvatar({ symbol, size = "md" }: { symbol: string; size?: "sm" | "md" | "lg" }) {
  const token = TOKENS.find((t) => t.symbol === symbol);
  const dim = size === "sm" ? 28 : size === "lg" ? 44 : 36;
  const fs = size === "sm" ? 11 : size === "lg" ? 15 : 13;
  return (
    <div
      style={{
        width: dim,
        height: dim,
        borderRadius: "50%",
        background: token?.color || "#4f6ef7",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "white",
        fontWeight: 700,
        fontSize: fs,
        flexShrink: 0,
        letterSpacing: "-0.5px",
      }}
    >
      {symbol.slice(0, 3)}
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
      style={{ background: "rgba(5,6,20,0.7)", backdropFilter: "blur(6px)" }}
      onClick={onClose}
    >
      <div
        className="token-modal w-full max-w-sm overflow-hidden animate-fadein"
        onClick={(e) => e.stopPropagation()}
      >
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
            >
              ✕
            </button>
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
        <div style={{ maxHeight: 280, overflowY: "auto", paddingBottom: 8 }}>
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
              <TokenAvatar symbol={token.symbol} size="md" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: "#e8eaff", fontWeight: 600, fontSize: 14 }}>{token.symbol}</div>
                <div style={{ color: "#6b7299", fontSize: 12 }}>{token.name}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ color: "#c0c8f0", fontSize: 13, fontWeight: 500 }}>{token.balance}</div>
                <div style={{ color: "#6b7299", fontSize: 11 }}>${token.price.toLocaleString()}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function SafeSwapPage() {
  const [fromToken, setFromToken] = useState<Token>(TOKENS[0]);
  const [toToken, setToToken] = useState<Token>(TOKENS[1]);
  const [fromAmount, setFromAmount] = useState("");
  const [slippage, setSlippage] = useState("0.5");
  const [modalFor, setModalFor] = useState<"from" | "to" | null>(null);
  const [isSwapping, setIsSwapping] = useState(false);
  const [account, setAccount] = useState<string | null>(null);
  const connected = !!account;

  useEffect(() => {
    if (!window.ethereum) return;
    const handleAccountsChanged = (accounts: unknown) => {
      const arr = accounts as string[];
      setAccount(arr.length > 0 ? arr[0] : null);
    };
    window.ethereum.on("accountsChanged", handleAccountsChanged);
    // Check if already connected
    window.ethereum
      .request({ method: "eth_accounts" })
      .then((accounts) => {
        const arr = accounts as string[];
        if (arr.length > 0) setAccount(arr[0]);
      })
      .catch(() => {});
    return () => {
      window.ethereum?.removeListener("accountsChanged", handleAccountsChanged);
    };
  }, []);

  async function connectWallet() {
    if (!window.ethereum) {
      alert("MetaMask не найден. Установите расширение MetaMask в браузере.");
      return;
    }
    try {
      const accounts = (await window.ethereum.request({ method: "eth_requestAccounts" })) as string[];
      if (accounts.length > 0) setAccount(accounts[0]);
    } catch {
      // user rejected
    }
  }

  function disconnectWallet() {
    setAccount(null);
  }

  const toAmount =
    fromAmount && !isNaN(Number(fromAmount))
      ? ((Number(fromAmount) * fromToken.price) / toToken.price).toFixed(6)
      : "";

  const exchangeRate = (fromToken.price / toToken.price).toFixed(6);

  const usdValue =
    fromAmount && !isNaN(Number(fromAmount))
      ? (Number(fromAmount) * fromToken.price).toFixed(2)
      : null;

  function handleFlip() {
    const tmp = fromToken;
    setFromToken(toToken);
    setToToken(tmp);
    setFromAmount(toAmount);
  }

  async function handleSwap() {
    if (!connected || !fromAmount) return;
    setIsSwapping(true);
    await new Promise((r) => setTimeout(r, 2000));
    setIsSwapping(false);
    setFromAmount("");
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0d0e1a" }}>
      {/* Subtle background blobs */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", overflow: "hidden", zIndex: 0,
      }}>
        <div style={{
          position: "absolute", top: "-80px", right: "-80px",
          width: 400, height: 400, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(108,99,255,0.18) 0%, transparent 70%)",
        }} />
        <div style={{
          position: "absolute", bottom: "-60px", left: "-60px",
          width: 350, height: 350, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(108,99,255,0.1) 0%, transparent 70%)",
        }} />
      </div>

      {/* Header */}
      <header style={{
        position: "relative", zIndex: 10,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "18px 32px", maxWidth: 1100, margin: "0 auto",
      }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 12,
            background: "linear-gradient(135deg, #6c63ff, #9b8fff)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 4px 12px rgba(108,99,255,0.4)",
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L4 7v5c0 5.25 3.4 10.15 8 11.35C16.6 22.15 20 17.25 20 12V7L12 2z" fill="white" fillOpacity="0.9"/>
              <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 18, color: "#e8eaff", letterSpacing: "-0.5px" }}>SafeSwap</div>
            <div style={{ fontSize: 10, color: "#7b82b0", fontWeight: 500, marginTop: -2 }}>Secure Exchange</div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ display: "flex", gap: 4 }} className="hidden md:flex">
          {["Swap", "Liquidity", "Earn", "Analytics"].map((item, i) => (
            <button
              key={item}
              style={{
                padding: "8px 16px", borderRadius: 10, fontSize: 14, fontWeight: 500,
                border: "none", cursor: "pointer",
                background: i === 0 ? "rgba(108,99,255,0.2)" : "transparent",
                color: i === 0 ? "#9b8fff" : "#7b82b0",
                transition: "all 0.15s",
              }}
            >
              {item}
            </button>
          ))}
        </nav>

        {/* Connect */}
        <button
          onClick={connected ? disconnectWallet : connectWallet}
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
      </header>

      {/* Main */}
      <main style={{ position: "relative", zIndex: 10, display: "flex", flexDirection: "column", alignItems: "center", padding: "20px 16px 60px" }}>

        {/* Hero */}
        <div className="animate-float" style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.25)", borderRadius: 999, padding: "4px 14px", marginBottom: 16 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L4 7v5c0 5.25 3.4 10.15 8 11.35C16.6 22.15 20 17.25 20 12V7L12 2z" fill="#22c55e"/>
            </svg>
            <span style={{ fontSize: 12, fontWeight: 600, color: "#4ade80" }}>Audited & Secure</span>
          </div>
          <h1 style={{ fontSize: "clamp(36px, 6vw, 56px)", fontWeight: 800, color: "#e8eaff", letterSpacing: "-1.5px", lineHeight: 1.1, marginBottom: 12 }}>
            Swap Tokens{" "}
            <span style={{ background: "linear-gradient(135deg, #6c63ff, #b09fff)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Safely
            </span>
          </h1>
          <p style={{ color: "#7b82b0", fontSize: 17, maxWidth: 420, margin: "0 auto" }}>
            Best rates across all major DEXs — protected by multi-layer security
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
            <div style={{ fontWeight: 700, fontSize: 16, color: "#e8eaff" }}>Swap</div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span className="badge-safe">🔒 Protected</span>
              {/* Slippage */}
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
                Balance: <span style={{ color: "#a0a8d0", fontWeight: 600 }}>{fromToken.balance} {fromToken.symbol}</span>
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button
                className="token-btn"
                onClick={() => setModalFor("from")}
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", cursor: "pointer", border: "1.5px solid #252847" }}
              >
                <TokenAvatar symbol={fromToken.symbol} size="sm" />
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

          {/* Flip button */}
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
                Balance: <span style={{ color: "#a0a8d0", fontWeight: 600 }}>{toToken.balance} {toToken.symbol}</span>
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button
                className="token-btn"
                onClick={() => setModalFor("to")}
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", cursor: "pointer", border: "1.5px solid #252847" }}
              >
                <TokenAvatar symbol={toToken.symbol} size="sm" />
                <span style={{ fontWeight: 700, fontSize: 15, color: "#e8eaff" }}>{toToken.symbol}</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" style={{ color: "#6b7299" }}>
                  <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              <div style={{ flex: 1, textAlign: "right" }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: toAmount ? "#e8eaff" : "#c8d0e7" }}>
                  {toAmount || "0.00"}
                </div>
                {toAmount && (
                  <div style={{ fontSize: 12, color: "#6b7299", marginTop: 2 }}>
                    ≈ ${(Number(toAmount) * toToken.price).toFixed(2)}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Rate info */}
          {fromAmount && toAmount && (
            <div className="info-row" style={{ padding: "12px 14px", marginBottom: 16 }}>
              {[
                { label: "Exchange Rate", value: `1 ${fromToken.symbol} = ${exchangeRate} ${toToken.symbol}` },
                { label: "Price Impact", value: "< 0.01%", green: true },
                { label: "Network Fee", value: "~$2.40" },
                { label: "Slippage", value: `${slippage}%` },
              ].map((row) => (
                <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "3px 0" }}>
                  <span style={{ fontSize: 12, color: "#6b7299" }}>{row.label}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: row.green ? "#22c55e" : "#a0a8d0" }}>{row.value}</span>
                </div>
              ))}
            </div>
          )}

          {/* Swap button */}
          <button
            disabled={!connected || !fromAmount || isSwapping}
            onClick={handleSwap}
            className="btn-primary"
            style={{ width: "100%", padding: "15px 0", fontSize: 15, border: "none", cursor: "pointer" }}
          >
            {isSwapping ? (
              <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <svg style={{ animation: "spin 1s linear infinite" }} width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="3" strokeOpacity="0.3"/>
                  <path d="M12 2a10 10 0 0110 10" stroke="white" strokeWidth="3" strokeLinecap="round"/>
                </svg>
                Swapping securely...
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

        {/* Trust badges */}
        <div style={{ marginTop: 24, display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center" }}>
          {[
            { icon: "🔒", text: "Audited by Certik" },
            { icon: "🛡️", text: "Non-custodial" },
            { icon: "⚡", text: "Powered by 1inch" },
            { icon: "🌐", text: "Multi-chain" },
          ].map((b) => (
            <div key={b.text} style={{
              display: "flex", alignItems: "center", gap: 6,
              background: "#13152a", border: "1px solid #252847",
              borderRadius: 999, padding: "5px 14px",
              fontSize: 12, color: "#7b82b0", fontWeight: 500,
              boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
            }}>
              <span>{b.icon}</span>
              <span>{b.text}</span>
            </div>
          ))}
        </div>
      </main>

      {/* Token modal */}
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
