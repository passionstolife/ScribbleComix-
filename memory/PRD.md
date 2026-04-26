# ScribbleComix — Product Requirement Doc

## Original Problem Statement
"I want to create a sketch comic book story" — app that generates playful hand-drawn sketch comics with AI + manual editing.

## User Choices (locked)
- AI + manual comic editing
- Emergent Universal Key: Claude Sonnet 4.5 (story) + Gemini Nano Banana (sketch panels)
- User-selectable Grid or Webtoon layout
- Emergent Google Auth
- Playful sketch/ink aesthetic (no purple gradients)
- Monetization: credits + subscriptions (Stripe). Cost model: story free, sketch = 1 credit. Free tier: 20 credits. Paid: packs $3.99/$8.99/$17.99 + Pro $7.99/mo + Ultimate $15.99/mo (unlimited).

## Architecture
- Backend: FastAPI + MongoDB (motor), emergentintegrations (Claude+Nano Banana+Stripe), httpx for Emergent Auth exchange.
- Frontend: React (CRA) + React Router + Tailwind + Shadcn + sonner + lucide-react + jsPDF.
- Auth: Emergent Google Auth → `/dashboard#session_id=…` → backend exchange → cookie + localStorage token.
- Payments: Stripe Checkout one-time + Subscriptions, Customer Portal, webhook-driven idempotent grants.

## Implemented (chronological)
### 2026-02 — v1
- Auth, Comic CRUD, AI panel generation, Stripe one-time + subscriptions, Customer Portal, public share.
- Walking doodle SVG, pointing doodle, brutalist sketch UI.
- Founder seeding: passionstolife@gmail.com (Founder) + cachetito1966@gmail.com + ramonfloridarican12@gmail.com (Co-Founders) auto-get unlimited+ultimate at login.
- 10 achievements + 10 levels + RoleBadge/TierBadge/AchievementSeal SVGs.
- Profile, Admin, BillingSuccess polling, PDF export (Ultimate only).

### 2026-04 — v1.1 (this session)
**Phase 1: Visibility & Trophy Bookshelf**
- Bold pink "ADMIN" button in Navbar (was tiny shield icon) for founders/co_founders.
- Role badge always visible in nav (mobile + desktop).
- Big "TITLE BANNER" on Profile (e.g., "FOUNDER · INK APPRENTICE · LVL 4").
- "Admin Panel" CTA card on Dashboard for founders.
- "Trophy Shelf:" milestone progress strip on Dashboard.
- **Trophy Bookshelf** on Profile: 6 progressive milestones (Sketch Starter→Budding Author→Story Weaver→Panel Master→Ink Virtuoso→Legendary Creator) at 1/3/7/12/20/50 comics. New `MilestoneBadge` SVG component with hand-drawn icons (quill/pencils/scroll/book/trophy/crown_star).

**Phase 2: Cinematic Read Mode**
- New `CinematicReader.jsx` modal on Reader + PublicReader pages.
- Procedural ambient music (`/lib/ambientMusic.js`) using Web Audio API: 6 moods (adventure/funny/sad/spooky/heroic/chill). Zero external dependencies.
- Browser SpeechSynthesis API as scroll-synced narrator (free, no API key).
- 6 panel animation effects: Ken Burns, Zoom Punch, Shake, Ink Reveal, Drift, Fade (CSS keyframes only).
- Tier gating: Free=5s preview, Pro=30s, Ultimate=∞. Upsell modal on preview-end.

**Phase 3: Pinterest-style Discover/Collection/Events**
- New backend endpoints: GET `/discover`, POST `/comics/{id}/like`, POST `/comics/{id}/save`, GET `/collection/me`, full CRUD `/events` (founder-gated create/delete) + `/events/{id}/submit`.
- New collections: `comic_likes`, `collections`, `events`. Comics gain `event_id`, `tint`, `like_count`, `save_count`.
- New pages: `/discover` (masonry), `/collection`, `/events`, `/events/:eventId`.
- Free 16-color tint palette for event submissions (`/lib/tints.js`).
- Navbar: Discover/Events/Collection links for logged-in users; Discover for public.

**Phase 4: Printable Achievement Certificates**
- `/lib/certificate.js` — landscape A4 PDF certificates with sketch border, doodle stars, official seal.
- "Cert" download button on every unlocked achievement & milestone on Profile page.

## Tier features wired (full)
- Free: 20 credits on signup, story free, 1 credit/sketch, 5s cinematic preview.
- Pro: 300 credits, character consistency, 30s cinematic preview.
- Ultimate: unlimited sketches + PDF export + character consistency + unlimited cinematic + all Pro perks.

## Known issues & debt (P1/P2)
- Backend `server.py` is 1393 lines — split into routes/discover.py, routes/events.py, routes/profile.py, routes/billing.py.
- 3 stale iter-5 Stripe tests assume STRIPE_PRICE_PRO is unset (now set).
- `/admin/users` silent 500-user cap → add pagination.

## Backlog
### P1 (next)
- 2D → 3D converter (Meshy AI) — needs MESHY_API_KEY.
- Auto OG/Twitter share image for /read/:shareId.
- Level-Up celebration popup (animated badge reveal).
- Real ElevenLabs TTS option (current is browser-native; user can opt-in to higher quality).

### P2
- Pagination on /admin/users.
- FOUNDER_EMAILS from env (FOUNDER_EMAILS_CSV).
- Drag-to-reorder panels & speech bubbles.
- Coloring on actual panel pixels (canvas brush) — current implementation is tint overlay only.
- Comments on shared comics.
- Move PROMO_CODES to DB.

## Test status
- Iter 7 (this session): 28/28 backend pytest pass + all critical frontend flows green.
- Reports: `/app/test_reports/iteration_1.json` … `iteration_7.json` + `/app/backend/tests/test_iter7_discover_events.py`.

## Critical for next agent
- **Stripe**: backend uses `stripe.checkout.Session.retrieve_async()` directly (NOT the emergentintegrations wrapper) due to Pydantic crash on nested metadata. Do not revert.
- **Auth**: do NOT hardcode the redirect URL. `frontend/src/context/AuthContext.jsx` and `pages/AuthCallback.jsx` are intentional.
- **Founder seeding**: re-applied on every `/auth/session` call for FOUNDER_EMAILS / CO_FOUNDER_EMAILS allowlists.
- **Music**: `ambientMusic.js` uses Web Audio API procedurally — zero external assets. If user requests "real" music tracks later, the engine interface (`{start, stop, setVolume}`) makes swapping to MP3 trivial.
- **Cinematic Reader**: respects autoplay policy — `start()` is called from a user-initiated click, never on mount. AudioContext only created after click.
