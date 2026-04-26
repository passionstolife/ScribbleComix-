# Meshy AI — Free Account & API Key Setup Guide

ScribbleComix's "2D → 3D Sketch Converter" feature uses Meshy AI to turn your sketch panels into 3D models you can rotate and download as GLB files.

## Important: API access requires PRO plan
Meshy's **Free tier (100 credits/month) does NOT include API key access**. To use the API from ScribbleComix, you need at least Meshy Pro. Good news: there's a **free trial route** below to test it before paying.

---

## Step 1 — Create a Free Meshy Account
1. Go to **https://www.meshy.ai**
2. Click **"Sign up"** (top-right corner). You can use Google / Discord / email.
3. Verify your email if asked.
4. You're now on the **Free tier** with 100 credits/month (enough for ~5 text-to-3D generations to test the UI).

## Step 2 — Earn FREE bonus credits & free Pro months
Before you pay, stack these free perks:
- **Discord referral**: Join Meshy's Discord (linked from their pricing page) → get **+50 permanent credits**.
- **Community share**: Post one of your generated 3D models on social with #meshyai → another **+50 credits**.
- **Referral program**: Invite 3 friends → **3 free months of Pro**. (Each friend who signs up = 1 free Pro month for you.)
  - Find your referral link at: **https://www.meshy.ai/referral**
  - Share it on Twitter, Reddit r/blender, Discord servers, or message your art friends.
  - Pro tip: post a short demo of your 3D ScribbleComix output with the link.

## Step 3 — Upgrade to Pro (only when you're ready)
1. Go to **https://www.meshy.ai/pricing**
2. Pick **Pro** ($16/month billed annually = $192/yr, or $20/month if billed monthly).
   - Pro gives you 1,000 credits/month + API access + commercial license + faster queues.
3. Pay with card. (Meshy supports Stripe — same as your ScribbleComix.)

## Step 4 — Generate your API key
1. After upgrading, log in and go to **https://www.meshy.ai/api**
2. Click **"Create API Key"**
3. Copy the key (it starts with `msy_…`). **Save it somewhere safe immediately** — Meshy only shows it once.
4. Optional: name the key "ScribbleComix Production" for tracking.

## Step 5 — Give the key to me
When you're ready, paste the key in chat with me like this:
> "My Meshy key is `msy_xxxxxxxxxxxxxxxxxxx`"

I'll:
- Add it as `MESHY_API_KEY` in `/app/backend/.env` (never committed to git)
- Wire up the `/api/comics/{comic_id}/panels/{panel_id}/to-3d` endpoint
- Build the Three.js viewer modal in the frontend
- Tier-gate it: Ultimate users only (since each conversion costs ~10 Meshy credits = real money)
- Add a usage cap so you don't burn through your Pro credits in one bad day

## Cost expectations (so you're not surprised)
With Pro's 1,000 credits/month:
- Each panel → 3D conversion costs **~20 credits** (preview mesh) + **+10 credits** (textured refine) = ~30 credits per panel.
- That's ~33 conversions per month from Pro plan alone.
- For ScribbleComix scale, recommend **rate-limiting Ultimate users to 2 conversions per comic** at first.

## Useful links
- Meshy pricing: https://www.meshy.ai/pricing
- API docs: https://docs.meshy.ai
- Referral: https://www.meshy.ai/referral
- Discord: https://discord.gg/meshyai (linked from their site)

## Free alternatives if you'd rather wait
If $16–$20/month is too much right now, here are **free 3D options** I can integrate later instead:
- **Stable Fast 3D** (Stability AI) — has a free tier with limits
- **Tripo3D** — has free credits on signup (~50)
- **In-browser Three.js parallax** — no AI, but converts a flat panel into a 2.5D depth-card effect (uses depth maps generated on-device, totally free, looks cool but not "true" 3D)

Just say the word if you want me to use one of these instead of waiting for Meshy Pro.
