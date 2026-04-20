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
- Backend: `/api/auth/*`, `/api/generate/{story,panel-image}`, `/api/comics` CRUD, `/api/billing/{packages,me,checkout,status}`, `/api/webhook/stripe`.
- Credits + tier gating on panel-image generation (402 on empty credits for non-ultimate).
- Frontend pages: Landing (with Pricing section), Dashboard, Creator, Reader, AuthCallback, Billing, BillingSuccess (polling).
- Navbar credits/tier chip.
- 23/23 backend pytest + full frontend flow verified end-to-end.

## P0/P1/P2 Backlog
- P1: True Stripe subscription mode with auto-renew (currently 30-day one-time)
- P1: Reference-character consistency (Nano Banana with prior panel as reference) — unlock for Pro/Ultimate
- P1: PDF export (Ultimate perk) — currently HTML only
- P1: Public read-only share link for comics
- P2: Panel reordering (drag-and-drop)
- P2: Drag-to-position speech bubbles
- P2: Template starter prompts
- P2: Discover/community feed

## Next Tasks
- Wire PDF export + character consistency to the Ultimate tier flag (already gated on backend, needs implementation).
- Add true Stripe subscription mode + customer portal for cancellation.
