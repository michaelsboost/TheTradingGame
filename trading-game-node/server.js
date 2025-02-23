require('dotenv').config();
const express = require('express');
const request = require('request');
const cors = require('cors');
const path = require('path');

const app = express();
const port = 3000;

// Enable CORS for all origins (for development)
app.use(cors());

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// API endpoint for GLOBAL_QUOTE
app.get('/api/global-quote/:symbol', (req, res) => {
  const symbol = req.params.symbol;
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&entitlement=realtime&apikey=${apiKey}`;

  request.get({ url, json: true }, (err, apiRes, data) => {
    if (err) {
      return res.status(500).send({ error: 'Error fetching data from Alpha Vantage' });
    }
    if (apiRes.statusCode !== 200) {
      return res.status(apiRes.statusCode).send({ error: 'Alpha Vantage API error' });
    }
    res.send(data);
  });
});

// API endpoint for TIME_SERIES_INTRADAY
app.get('/api/time-series-intraday/:symbol/:interval', (req, res) => {
    const { symbol, interval } = req.params;
    const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
    const url = `https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=${symbol}&interval=${interval}&entitlement=realtime&apikey=${apiKey}`;

    request.get({ url, json: true }, (err, apiRes, data) => {
        if (err) {
            return res.status(500).send({ error: 'Error fetching data from Alpha Vantage' });
        }
        if (apiRes.statusCode !== 200) {
            return res.status(apiRes.statusCode).send({ error: 'Alpha Vantage API error' });
        }
        res.send(data);
    });
});

// API endpoint for TIME_SERIES_DAILY
app.get('/api/time-series-daily/:symbol', (req, res) => {
    const { symbol } = req.params;
    const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
    const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbol}&entitlement=realtime&apikey=${apiKey}`;

    request.get({ url, json: true }, (err, apiRes, data) => {
        if (err) {
            return res.status(500).send({ error: 'Error fetching data from Alpha Vantage' });
        }
        if (apiRes.statusCode !== 200) {
            return res.status(apiRes.statusCode).send({ error: 'Alpha Vantage API error' });
        }
        res.send(data);
    });
});

// API endpoint for EMA
app.get('/api/ema/:symbol/:interval/:time_period/:series_type', (req, res) => {
    const { symbol, interval, time_period, series_type } = req.params;
    const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
    const url = `https://www.alphavantage.co/query?function=EMA&symbol=${symbol}&interval=${interval}&time_period=${time_period}&series_type=${series_type}&entitlement=realtime&apikey=${apiKey}`;

    request.get({ url, json: true }, (err, apiRes, data) => {
        if (err) {
            return res.status(500).send({ error: 'Error fetching data from Alpha Vantage' });
        }
        if (apiRes.statusCode !== 200) {
            return res.status(apiRes.statusCode).send({ error: 'Alpha Vantage API error' });
        }
        res.send(data);
    });
});

// Start the server
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
