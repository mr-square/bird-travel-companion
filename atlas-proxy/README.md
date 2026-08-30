# Atlas API proxy (minimal, for demo/testing only)

The browser can't call Atlas directly — it needs a secret header and Atlas
doesn't allow direct browser calls. This tiny server holds your sandbox
credentials and forwards one real endpoint: `search.do`.

## Setup (2 minutes)

```
cd atlas-proxy
npm install
cp .env.example .env
```

Edit `.env` and paste in your real sandbox `ATLAS_CLIENT_ID` and
`ATLAS_CLIENT_SECRET` (from ATRIP -> Profile -> My Profile -> Company
Information).

```
npm start
```

You should see:
```
Atlas proxy listening on http://localhost:3001
Credentials configured: true
```

## Step 1 — Prove the real API call works (do this first)

Atlas's sandbox only has live test data for specific routes, not arbitrary
city pairs. Their own documented example route is Jeju to Seoul (CJU -> SEL).
Test with that first, in a separate terminal, before trying your app's real
destinations:

```
curl -X POST http://localhost:3001/api/search \
  -H "Content-Type: application/json" \
  -d '{"fromCity":"CJU","toCity":"SEL","fromDate":"20260601"}'
```

If this returns real flight data, your credentials and the proxy are
working end to end. This alone is worth filming for your video, even
before wiring it into the app UI — a Postman or terminal call showing a
real Atlas response is legitimate proof of integration.

## Step 2 — Try your app's actual routes

Your app uses codes like JHB, SIN, KUL, KMG, DPS, KIX, CNX. These are NOT
confirmed sandbox test routes, so they may return an empty result or an
error like `100: Missing required request data` or similar — that likely
means the route isn't in the sandbox's limited test dataset, not that
your integration is broken. Check ATRIP's API Reference -> Atlas Sandbox
-> Sandbox Test Routes page for the full list of routes that actually
have data in sandbox.

## Step 4 — Test the full chain (search -> verify -> order -> pay)

Once search returns real routings, grab a `routingIdentifier` from the
response and test the rest of the chain manually:

```
# 1. Verify (use a routingIdentifier from your search response)
curl -X POST http://localhost:3001/api/verify \
  -H "Content-Type: application/json" \
  -d '{"routingIdentifier":"PASTE_FROM_SEARCH_RESPONSE"}'

# 2. Order (use the sessionId from the verify response)
curl -X POST http://localhost:3001/api/order \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"PASTE_FROM_VERIFY_RESPONSE","travelerName":"For/Test","contactEmail":"for-test@example.com"}'

# 3. Pay (use the orderNo from the order response)
curl -X POST http://localhost:3001/api/pay \
  -H "Content-Type: application/json" \
  -d '{"orderNo":"PASTE_FROM_ORDER_RESPONSE"}'
```

**Important gap to know about:** `order.do` requires full passenger details
(birthday, passport/ID number, nationality, gender) per Atlas's own docs.
Your app's UI currently only collects a traveler name. The `/api/order`
route fills in the rest with Atlas's own sandbox placeholder passenger
("For/Test") so the real call succeeds for demo purposes — this is fine
to show working end-to-end in a video, but flag it as a known gap rather
than presenting it as production-ready passenger collection.

Atlas's sandbox VCC test cards, if you want to test that payment path
(paymentMethod 3) instead of the default deposit path (paymentMethod 1):
Visa `4532015112830366`, Mastercard `5555555555554444`,
Amex `378282246310005`.


## Note on scope

This proxy is for local testing only: no auth on the `/api/search` route,
CORS wide open, credentials in a plaintext `.env` file. Do not deploy this
as-is or share the `.env` file.
