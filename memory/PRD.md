# ScribbleComix — Product Requirement Doc

## Original Problem Statement
"I want to create a sketch comic book story" — app that generates playful hand-drawn sketch comics with AI + manual editing.

## User Choices
- AI + manual comic editing
- Emergent Universal Key: Claude Sonnet 4.5 (story) + Gemini Nano Banana `gemini-3.1-flash-image-preview` (sketch panels)
- User-selectable Grid or Webtoon layout
- Emergent Google Auth
- Playful sketch/ink aesthetic
- Monetization: credits + subscriptions (Stripe). Cost model: story free, sketch = 1 credit. Free tier: 20 credits. Paid: packs $3.99/$8.99/$17.99 + Pro $7.99/mo + Ultimate $15.99/mo (unlimited).

## Architecture
- Backend: FastAPI + MongoDB (motor), emergentintegrations (Claude+Nano Banana+Stripe), httpx for Emergent Auth exchange.
- Frontend: React (CRA) + React Router + Tailwind + Shadcn + sonner + lucide-react.
- Auth: Emergent Google Auth → `/dashboard#session_id=…` → backend exchange → cookie + localStorage token.
- Payments: Stripe Checkout (one-time SKUs) via emergentintegrations. payment_transactions collection ensures idempotent granting. Subscriptions modeled as 30-day tier extensions (user renews manually).

## Implemented (2026-02)
- Backend: full auth/AI/comic/billing stack + **public share endpoints** (`POST /api/comics/:id/share`, `unshare`, public `GET /api/public/comics/:share_id`), **true subscription endpoints** (`POST /api/billing/subscribe` via stripe SDK with mode='subscription', `POST /api/billing/portal` for Customer Portal, `GET /api/billing/subscriptions-config`), **promo code INK50**.
- Credits + tier gating, reference-character consistency (Pro/Ultimate), 402 on empty credits.
- Frontend pages: Landing, Dashboard, Creator (pointing doodle on upsell banner), Reader (HTML + PDF with **dynamic jspdf import** + Share button), AuthCallback, Billing (walking doodle trophy + promo + Manage subscription portal button when configured), BillingSuccess, **PublicReader** at `/read/:shareId` (no-auth viral share page with "Make your own" CTA).
- Doodle animations: WalkingDoodle (walks to Ultimate card, lifts it like a trophy), PointingDoodle (walks out of low-credits banner and points at it).
- Tests: ~45 backend pytest + all frontend flows verified (iterations 1-5).

## Tier features wired (full)
- Free: 20 credits on signup, story free, 1 credit/sketch.
- Pro: 300 credits + character consistency + priority (flag).
- Ultimate: unlimited sketches + PDF export + character consistency + all Pro perks.

## True subscriptions (v2)
- `/api/billing/subscribe` uses stripe SDK mode='subscription' with recurring `price` IDs — **activates automatically** when user sets `STRIPE_PRICE_PRO` and `STRIPE_PRICE_ULTIMATE` env vars (their own Stripe account, live key).
- Customer Portal `/api/billing/portal` lets users self-cancel.
- Until real Stripe prices are set, app falls back to the 30-day one-time flow with sk_test_emergent.

## P1/P2 Backlog
- P2: Auto-generated OG/Twitter social-share image for `/read/:shareId` (watermarked "Made with ScribbleComix")
- P2: IntersectionObserver to retrigger WalkingDoodle animation when billing page enters view
- P2: Panel reordering (drag-and-drop)
- P2: Drag-to-position speech bubbles
- P2: Template starter prompts
- P2: Discover/community feed
- P2: Move PROMO_CODES to DB for non-engineer management
