const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const port = 3000;

app.use(cors());
app.use(bodyParser.json());

let liveLocation = { latitude: null, longitude: null };

// Endpoint to receive location updates from the Flutter app
app.post('/api/location', (req, res) => {
  const { latitude, longitude } = req.body;
  liveLocation = { latitude, longitude };
  res.status(200).send('Location received');
});

// Endpoint to get live location
app.get('/api/location', (req, res) => {
  res.json(liveLocation);
});

// Endpoint to generate Google Maps link for live location
app.get('/api/share-location', (req, res) => {
  const { latitude, longitude } = liveLocation;
  const googleMapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
  res.json({ url: googleMapsUrl });
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
