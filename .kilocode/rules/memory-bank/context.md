# Active Context: Next.js Starter Template

## Current State

**Template Status**: ✅ Ready for development

The template is a clean Next.js 16 starter with TypeScript and Tailwind CSS 4. It's ready for AI-assisted expansion to build any type of application.

## Recently Completed

- [x] Token swap UI — dark theme DEX interface with SwapX branding, animated swap card, token selector modal, slippage settings, stats bar, connect wallet button
- [x] Coin logos via CryptoIcons CDN (next/image unoptimized), expanded token list to 12 tokens (ETH, USDC, BTC, BNB, SOL, ADA, AVAX, MATIC, DOT, LINK, UNI, USDT)
- [x] Re-added Solana network support via MetaMask Snap (`npm:@solflare-wallet/solana-snap`). Uses `wallet_requestSnaps` to install snap, then `wallet_invokeSnap` with `getPublicKey` method and derivation path `["44'", "501'", "0'", "0'"]`. All wallet interactions go through MetaMask only — no Phantom or other wallets.
- [x] Solana balance fetching via Solana JSON-RPC (`api.mainnet-beta.solana.com`): `getBalance` for SOL, `getTokenAccountsByOwner` for SPL tokens (USDC, USDT, RAY, BONK, JUP).
- [x] Separate `solanaAccount` state from EVM `account` state. `activeAccount` computed based on `isSolana` flag. `isOnSelectedNetwork` handles both EVM chain matching and Solana connection status.
- [x] Solana swaps marked as "coming soon" (view-only) — balances and prices display correctly, but swap execution is not yet implemented for Solana.
- [x] 8 networks total: Ethereum, Polygon, BNB Chain, Arbitrum, Optimism, Avalanche, Base, Solana.

- [x] Base Next.js 16 setup with App Router
- [x] TypeScript configuration with strict mode
- [x] Tailwind CSS 4 integration
- [x] ESLint configuration
- [x] Memory bank documentation
- [x] Recipe system for common features

## Current Structure

| File/Directory | Purpose | Status |
|----------------|---------|--------|
| `src/app/page.tsx` | Home page | ✅ Ready |
| `src/app/layout.tsx` | Root layout | ✅ Ready |
| `src/app/globals.css` | Global styles | ✅ Ready |
| `.kilocode/` | AI context & recipes | ✅ Ready |

## Current Focus

The template is ready. Next steps depend on user requirements:

1. What type of application to build
2. What features are needed
3. Design/branding preferences

## Quick Start Guide

### To add a new page:

Create a file at `src/app/[route]/page.tsx`:
```tsx
export default function NewPage() {
  return <div>New page content</div>;
}
```

### To add components:

Create `src/components/` directory and add components:
```tsx
// src/components/ui/Button.tsx
export function Button({ children }: { children: React.ReactNode }) {
  return <button className="px-4 py-2 bg-blue-600 text-white rounded">{children}</button>;
}
```

### To add a database:

Follow `.kilocode/recipes/add-database.md`

### To add API routes:

Create `src/app/api/[route]/route.ts`:
```tsx
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ message: "Hello" });
}
```

## Available Recipes

| Recipe | File | Use Case |
|--------|------|----------|
| Add Database | `.kilocode/recipes/add-database.md` | Data persistence with Drizzle + SQLite |

## Pending Improvements

- [ ] Add more recipes (auth, email, etc.)
- [ ] Add example components
- [ ] Add testing setup recipe

## Session History

| Date | Changes |
|------|---------|
| Initial | Template created with base setup |
