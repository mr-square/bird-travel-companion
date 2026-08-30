require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const ATLAS_BASE_URL = 'https://sandbox.atriptech.com';
const CLIENT_ID = process.env.ATLAS_CLIENT_ID;
const CLIENT_SECRET = process.env.ATLAS_CLIENT_SECRET;

// Maps to Atlas search.do
// Real request/response shape confirmed from Atlas's own API reference examples.
app.post('/api/search', async (req, res) => {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    return res.status(500).json({ error: 'Atlas credentials are not configured. Set ATLAS_CLIENT_ID and ATLAS_CLIENT_SECRET in .env' });
  }

  const { fromCity, toCity, fromDate } = req.body;
  if (!fromCity || !toCity || !fromDate) {
    return res.status(400).json({ error: 'fromCity, toCity, and fromDate (YYYYMMDD) are required.' });
  }

  const atlasBody = {
    tripType: '1',
    adultNum: 1,
    childNum: 0,
    infantNum: 0,
    fromCity: fromCity,
    fromAirport: '',
    toCity: toCity,
    toAirport: '',
    fromDate: fromDate,
    retDate: '',
    airlines: [],
    fromFlightNumbers: [],
    retFlightNumbers: [],
    includeMultipleFareFamily: false,
    currency: null,
    displayCurrency: 'USD',
    requestSource: null
  };

  try {
    const atlasRes = await fetch(ATLAS_BASE_URL + '/search.do', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip',
        'x-atlas-client-id': CLIENT_ID,
        'x-atlas-client-secret': CLIENT_SECRET,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(atlasBody)
    });

    const text = await atlasRes.text();
    let data;
    try { data = JSON.parse(text); } catch (e) { data = { raw: text }; }

    if (!atlasRes.ok) {
      console.error('Atlas returned an error:', atlasRes.status, data);
      return res.status(atlasRes.status).json({ error: 'Atlas API returned an error', details: data });
    }

    res.json(data);
  } catch (err) {
    console.error('Failed to reach Atlas:', err.message);
    res.status(502).json({ error: 'Failed to reach Atlas API', details: err.message });
  }
});

// Maps to Atlas verify.do — depends on Search having been called first (needs routingIdentifier)
app.post('/api/verify', async (req, res) => {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    return res.status(500).json({ error: 'Atlas credentials are not configured.' });
  }
  const { routingIdentifier } = req.body;
  if (!routingIdentifier) {
    return res.status(400).json({ error: 'routingIdentifier is required (comes from a search.do response).' });
  }
  try {
    const atlasRes = await fetch(ATLAS_BASE_URL + '/verify.do', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip',
        'x-atlas-client-id': CLIENT_ID,
        'x-atlas-client-secret': CLIENT_SECRET,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        routingIdentifier: routingIdentifier,
        displayCurrency: null,
        realTimeBaggage: false,
        maxResponseTime: null,
        paymentMethod: null,
        requestSource: null
      })
    });
    const data = await atlasRes.json();
    if (!atlasRes.ok) return res.status(atlasRes.status).json({ error: 'Atlas verify.do error', details: data });
    res.json(data);
  } catch (err) {
    res.status(502).json({ error: 'Failed to reach Atlas verify.do', details: err.message });
  }
});

// Maps to Atlas order.do — depends on Verify having been called first (needs sessionId)
// Accepts real passenger fields (name, gender, birthday, passport, nationality, email)
// from the frontend. Falls back to Atlas's own sandbox test values only for anything
// left blank, so a real submission is never silently replaced by fake data.
app.post('/api/order', async (req, res) => {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    return res.status(500).json({ error: 'Atlas credentials are not configured.' });
  }
  const { sessionId, travelerName, contactEmail, gender, birthday, passportNumber, nationality } = req.body;
  if (!sessionId) {
    return res.status(400).json({ error: 'sessionId is required (comes from a verify.do response).' });
  }
  try {
    const atlasRes = await fetch(ATLAS_BASE_URL + '/order.do', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip',
        'x-atlas-client-id': CLIENT_ID,
        'x-atlas-client-secret': CLIENT_SECRET,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sessionId: sessionId,
        offerId: '',
        passengers: [
          {
            name: travelerName || 'For/Test',
            passengerType: 0,
            gender: gender || 'M',
            birthday: birthday || '19900101',
            cardType: passportNumber ? 'PP' : 'PP',
            cardNum: passportNumber || '636940383',
            cardIssuePlace: nationality || 'PT',
            cardExpired: '20300101',
            nationality: nationality || 'US',
            ffpCardNo: null,
            ffpCarrier: null,
            ancillaries: []
          }
        ],
        contact: {
          name: travelerName || 'For/Test',
          address: 'For test',
          postcode: '',
          email: contactEmail || 'for-test@example.com',
          mobile: '0001-12345678900'
        },
        useAtlasMailForContact: false,
        locale: '',
        requestSource: '',
        ifSeatOccupied: '',
        payment: null
      })
    });
    const data = await atlasRes.json();
    if (!atlasRes.ok) return res.status(atlasRes.status).json({ error: 'Atlas order.do error', details: data });
    res.json(data);
  } catch (err) {
    res.status(502).json({ error: 'Failed to reach Atlas order.do', details: err.message });
  }
});

// Maps to Atlas pay.do — depends on Order having been called first (needs orderNo)
// Uses "deposit" payment method (1) by default, matching the standard sandbox path.
// VCC (paymentMethod 3) test cards, from Atlas's own docs, if you want to test that path:
//   Visa: 4532015112830366  Mastercard: 5555555555554444  Amex: 378282246310005
app.post('/api/pay', async (req, res) => {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    return res.status(500).json({ error: 'Atlas credentials are not configured.' });
  }
  const { orderNo } = req.body;
  if (!orderNo) {
    return res.status(400).json({ error: 'orderNo is required (comes from an order.do response).' });
  }
  try {
    const atlasRes = await fetch(ATLAS_BASE_URL + '/pay.do', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip',
        'x-atlas-client-id': CLIENT_ID,
        'x-atlas-client-secret': CLIENT_SECRET,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        orderNo: orderNo,
        paymentMethod: 1,
        clientOrderNo: null,
        requestSource: null
      })
    });
    const data = await atlasRes.json();
    if (!atlasRes.ok) return res.status(atlasRes.status).json({ error: 'Atlas pay.do error', details: data });
    res.json(data);
  } catch (err) {
    res.status(502).json({ error: 'Failed to reach Atlas pay.do', details: err.message });
  }
});

app.get('/health', (req, res) => {
  res.json({ ok: true, credentialsConfigured: Boolean(CLIENT_ID && CLIENT_SECRET) });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log('Atlas proxy listening on http://localhost:' + PORT);
  console.log('Credentials configured:', Boolean(CLIENT_ID && CLIENT_SECRET));
});
