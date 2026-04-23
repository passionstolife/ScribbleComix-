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
- Backend: auth/AI/comic/billing stack + public share + true subscriptions + Customer Portal + **Founder/Co-Founder/Promoter role system** + **XP/Level/Achievement gamification** + **/api/profile/me & /api/profile/public/:user_id** + **/api/admin/{promote,users}**.
- Admins seeded at module level: `passionstolife@gmail.com` (Founder), `cachetito1966@gmail.com` + `ramonfloridarican12@gmail.com` (Co-Founders). All receive unlimited credits + ultimate tier for 100 years on first login. Roxy's email to be added by admin via /admin/promote when she joins (role='promoter', also unlimited).
- 10 achievements: first_steps, published_author, serial_creator, ink_master, supporter, pro_ink, ultimate_legend, story_spinner, share_champion, night_owl. Auto-unlock via _check_achievements on create/share/purchase/subscribe/panel-sketch events.
- 10 levels split across 5 tier colors: bronze → silver → gold → platinum → diamond. Ranks: Sketch Novice → Ink Apprentice → Pen Artisan → Panel Master → Comic Legend.
- Frontend pages: Landing, Dashboard, Creator, Reader (HTML + dynamic PDF + share), Billing (promo + walking-doodle + portal), BillingSuccess (Stripe polling), PublicReader, **Profile (role badge + laurel tier medallion + XP bar + stats + achievement grid)**, **Admin dashboard (users table + promote form)**.
- Navbar: credits/tier chip + Founder shield admin button + RoleBadge next to user name.
- Hand-drawn SVG badge library (`Badges.jsx`): `RoleBadge` (6 distinct shield designs), `TierBadge` (laurel medallion w/ ribbon banner), `AchievementSeal` (comic-book starburst seals BOOM/ZAP/POW/WOW/LOVE/★/♛/☾).
- Tests: 66/69 (24/24 new iter6 + full frontend flows).

## Known issues & debt
- Backend: `server.py` is now 1157 lines — should split into billing/sharing/gamification/admin modules in a cleanup sprint.
- 3 iter-5 Stripe tests are stale (they assume STRIPE_PRICE_PRO is NOT set, but it now is) — update assertions when revisiting tests.
- `/admin/users` has a silent 500-user cap — add pagination at scale.

## P1/P2 Backlog (v1.2+)
- P1: **"Read my comic aloud"** (ElevenLabs TTS) — requires user's ELEVENLABS_API_KEY env var
- P1: **2D→3D panel converter** (Meshy AI) — requires MESHY_API_KEY env var + Three.js/model-viewer
- P1: **Printable achievement certificates** (jsPDF)
- P1: **Auto OG social-share image** for /read/:shareId (viral growth)
- P2: **Level-Up celebration popup** (animated badge reveal)
- P2: Pagination on /admin/users
- P2: Split server.py into modules
- P2: FOUNDER_EMAILS from env (FOUNDER_EMAILS_CSV)

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
