# ScribbleComix — Product Requirement Doc

## Original Problem Statement
"I want to create a sketch comic book story" — user wants an app that can generate playful, hand-drawn sketch-style comic books with both AI assistance and manual editing.

## User Choices (captured on 2026-02)
- AI generation + manual comic editing (both)
- LLM: Emergent Universal Key — Claude Sonnet 4.5 (story) + Gemini Nano Banana `gemini-3.1-flash-image-preview` (sketch panels)
- Layout: user chooses Grid OR Webtoon
- Auth: Emergent-managed Google Auth
- Visual style: playful (ink-on-paper sketch brutalism)

## Architecture
- Backend: FastAPI + MongoDB (motor), emergentintegrations lib for LLM/image gen, httpx for Emergent Auth exchange.
- Frontend: React (CRA) + React Router 7 + Tailwind + Shadcn + sonner toasts + lucide-react icons.
- Auth flow: Landing → Google (auth.emergentagent.com) → redirect to `/dashboard#session_id=…` → `AppRouter` detects hash synchronously → `AuthCallback` exchanges via `POST /api/auth/session` → cookie + localStorage token.

## User Personas
- Casual storyteller: writes a one-line idea, gets a finished comic.
- Doodler/creator: iterates on prompts, tweaks captions/dialogue, regenerates sketches per panel.

## Core Requirements (static)
1. Google login required to create/save comics.
2. AI "Generate story" → title, synopsis, N panels with caption, dialogue, image_prompt.
3. AI "Sketch" per panel via Nano Banana in ink-style.
4. Per-panel editing of caption, dialogue, prompt.
5. Layout toggle: 2×N grid vs vertical webtoon.
6. Save / update / delete comics. List all.
7. Reader view with download (HTML export).

## Implemented (2026-02)
- Backend: `/api/auth/session`, `/api/auth/me`, `/api/auth/logout`, `/api/generate/story`, `/api/generate/panel-image`, `/api/comics` CRUD.
- Frontend pages: Landing, Dashboard (My Comics), Creator (with sidebar + canvas), Reader (with layout override + HTML download), AuthCallback, ProtectedRoute.
- Design: Caveat Brush + Fredoka + Nunito + Kalam fonts; paper texture body; ink borders + offset shadows; yellow/pink/blue accents; tape & wiggle/floaty animations.
- Tested end-to-end with real Claude + Gemini (12/12 backend passing + full frontend flow verified).

## P0/P1/P2 Backlog
- P1: PDF export (currently HTML only).
- P1: Public share link (read-only reader with shareable URL).
- P1: Reference character consistency (pass prior panel image as reference to Nano Banana for same-character look).
- P2: Speech bubbles placement (drag to position bubble on image).
- P2: Panel reordering (drag-and-drop).
- P2: Social feed / discover page.
- P2: Template starter prompts.

## Next Tasks
- Monetization hook: Pro tier (unlimited generations, PDF export, custom character styles) or credit pack.
- Shareable public reader URL.
- Reference-image chaining for character consistency across panels.
