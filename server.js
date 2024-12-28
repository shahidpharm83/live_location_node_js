const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");
const axios = require("axios");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

app.use(
  cors({
    origin: "https://live-location-node-js-1.onrender.com/", // or '*' for all origins
    methods: ["GET", "POST"],
    credentials: true,
  })
);

// Serve static files (HTML, CSS, JS) from the "public" folder
app.use(express.static(path.join(__dirname, "public")));

io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  // Listen for location updates from the Flutter client
  socket.on("locationUpdate", (data) => {
    io.emit("locationUpdate", data);
    console.log("Location update emitted to all clients");
  });

  // Listen for route data requests
  socket.on("requestRouteData", (data) => {
    const { startLat, startLng, endLat, endLng } = data;
    io.emit("requestRouteData", data);
    console.log("Start and end point emitted to front end");
  });

  // Listen for mediaData event
  socket.on("mediaData", ({ type, data }) => {
    console.log("Media data received:", { type, data });

    if (!type || !data) {
      console.error("Invalid media data:", { type, data });
      return;
    }

    try {
      switch (type) {
        case "video":
          console.log("Preparing to stream video...");
          streamMedia(type, data, socket);
          break;
        case "audio":
          console.log("Preparing to stream audio...");
          streamMedia(type, data, socket);
          break;
        case "image":
          console.log("Preparing to send image...");
          sendImage(data, socket);
          break;
        default:
          console.log("Unsupported media type:", type);
      }
      console.log(`Successfully processed ${type}`);
    } catch (error) {
      console.error("Error processing media data:", error);
    }
  });

  // Send media commands to the front end like startScreenRecord, stopScreenRecord, startAudioRecord, stopAudioRecord, and so on
  socket.on("mediaCommand", (data) => {
    console.log("Received media command:", data);
    io.emit("mediaCommand", data);
    console.log(`Media command emitted to all clients: ${data.command}`);
  });

  // Handle user disconnection
  socket.on("disconnect", () => {
    console.log("A user disconnected:", socket.id);
  });
});

// Route to get route data from the OSRM API
app.get("/api/getRoute", async (req, res) => {
  const { startLat, startLng, endLat, endLng } = req.query;

  try {
    const response = await axios.get(
      `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}`,
      {
        params: { geometries: "geojson", overview: false },
      }
    );

    if (response.data.routes && response.data.routes.length > 0) {
      const route = response.data.routes[0];
      const dataToSend = {
        route: route,
        waypoints: response.data.waypoints || [],
      };

      return res.json(dataToSend);
    } else {
      return res.status(404).json({ error: "No routes found" });
    }
  } catch (error) {
    return res.status(500).json({ error: "Error fetching the route" });
  }
});

// Stream video or audio data in chunks
const streamMedia = (type, base64Data, socket) => {
  console.log(`Streaming ${type}`);

  // Broadcast the media data to all connected clients
  io.emit("streamMedia", {
    type,
    data: base64Data, // Base64 encoded media data
  });
  console.log(`Streaming ${type} data...`);
};

// Send image data as base64
const sendImage = (base64Image, socket) => {
  console.log(`Sending image`);

  // Broadcast the image data to all connected clients
  io.emit("streamMedia", {
    type: "image",
    data: base64Image, // Base64 encoded image data
  });
  console.log(`Sending image data...`);
};

// Start the server
server.listen(3000, () => {
  console.log("Server is running on port 3000");
});