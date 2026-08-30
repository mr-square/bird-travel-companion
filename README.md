# Bird 🐦

A travel companion app designed for elderly travelers, built for the **Alibaba Cloud x Atlas Agentic AI Hackathon**.

Bird helps someone plan a trip from a friend's photo, book a real flight through Atlas's live sandbox API, stay connected with family while traveling, and communicate across languages — all in one app, with accessibility (large tap targets, plain language, human-in-the-loop confirmation steps) built in from the start rather than bolted on.

## The four tabs

**Plan** — A social feed of friends' trip photos (real, freely licensed Unsplash photography). Tapping a post opens a full short/mid/long itinerary. "Book this trip" carries the destination straight into Book. Users can post their own trip updates and photos too.

**Book** — Search, review, and book a real flight, with an "Existing Bookings" view to manage seat, baggage, and refunds afterward.

**Track** — A Telegram-style interface for an elderly traveler to share live location with family, chat with them (photos included), and hit one of two SOS buttons to alert family or a care admin in an emergency.

**Go** — A hub for **Navigate** (route planning across walk/transit/cab, with one-tap ride-hailing) and **Translate** (live two-way voice translation — ambient "hear what's around you" mode, and push-to-talk "speak and be understood" mode).

## What's actually real vs. mocked

This matters more than it sounds — the honest answer is part of the point.

| Integration | Status |
|---|---|
| Atlas `search.do` | **Real.** Live sandbox call, tested on the Jeju→Seoul route. |
| Atlas `verify.do` | **Real.** Returns a real session and live pricing. |
| Atlas `order.do` | **Real.** Submits actual passenger details entered in the app. |
| Atlas `pay.do` | **Real.** Completes the booking, returns a real PNR. |
| Live map (Track, Navigate) | **Real.** OpenStreetMap embed, centered on actual device geolocation. |
| Translation | **Real.** MyMemory API (free, browser-callable). |
| Avatars | **Real.** Generated via DiceBear. |
| Atlas seat/baggage/refund/webhooks | Mocked, with comments marking the exact real endpoint each one maps to. |
| Speech-to-text / text-to-speech | Browser's native Web Speech API. |
| Ride-hailing, route/mode time estimates | Mocked. |

Every real integration is written to **try the real call first and silently fall back to realistic mock data if it fails** — the app is designed to never break in a demo, whether or not the backend proxy is running.

### The Alibaba Cloud production path

Built with a specific swap-in path to Alibaba's own stack in mind:

- **Amap (Gaode Maps)** — replaces the OpenStreetMap embed; also runs a ride-hailing aggregator that's a natural fit for the Navigate tab's one-tap booking.
- **Qwen3-MT** (Alibaba Cloud Model Studio / DashScope) — replaces the MyMemory translation call.
- **Qwen3-ASR** — replaces the browser's speech-to-text, with built-in language identification across 52 languages.
- **CosyVoice** — replaces the browser's text-to-speech for natural multilingual playback.

## Architecture

```
index.html         Self-contained frontend (HTML/CSS/vanilla JS, no build step)
atlas-proxy/        Minimal Node/Express backend
  server.js         Holds Atlas credentials server-side, proxies search/verify/order/pay
  package.json
  .env.example      Copy to .env and fill in your own Atlas sandbox credentials
```

The frontend can't call Atlas directly — Atlas requires a secret header that must never be exposed in browser code, and doesn't support CORS for direct browser calls. The proxy exists to hold that secret safely and forward requests.

## Running it locally

**Frontend only** (mock data, no setup): just open `index.html` in Chrome.

**With the real Atlas integration:**

```bash
cd atlas-proxy
npm install
cp .env.example .env
# edit .env with your own Atlas sandbox client ID and secret
npm start
```

Then open `index.html` — the app will automatically use the real backend if it's running on `localhost:3001`, and fall back to mock data otherwise.

See `atlas-proxy/README.md` for a full request walkthrough, including a working test route (Jeju → Seoul) and sandbox payment test card numbers.

## Tech stack

- Vanilla HTML/CSS/JavaScript (no framework, no build step) for the frontend
- Node.js + Express for the backend proxy
- Atlas Travel API (Alibaba Cloud x Atlas hackathon)
- Browser-native Web Speech API and Geolocation API
- OpenStreetMap, MyMemory, and DiceBear as free stand-ins for the intended Alibaba Cloud services

## License

MIT — see [LICENSE](LICENSE).
