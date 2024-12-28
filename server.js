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

  // Command handling: Receive media commands (e.g., play video, play audio, show image)
 // Listen for mediaData
  socket.on("mediaData", ({ type, file }) => {
    console.log("Media data received:", { type, file });

    if (!type || !file) {
      console.error("Invalid media data:", { type, file });
      return;
    }

    try {
      switch (type) {
        case "video":
          console.log("Preparing to stream video...");
          // Handle video data
          streamMedia(type, file, socket);
          break;
        case "audio":
          console.log("Preparing to stream audio...");
          // Handle audio data
          streamMedia(type, file, socket);
          break;
        case "image":
          console.log("Preparing to send image...");
          // Handle image data
          sendImage(file, socket);
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
const streamMedia = (type, mediaPath, socket) => {
  console.log(`Streaming ${type}: ${mediaPath}`);

  // Replace this with actual streaming logic
  if (type === "video" || type === "audio") {
    socket.emit("mediaData", {
      type,
      url: mediaPath, // URL to the media file
    });
  } else {
    console.error(`Unsupported media type for streaming: ${type}`);
  }
};

// Send image data as base64
const sendImage = (mediaPath, socket) => {
  console.log(`Sending image: ${mediaPath}`);
  fs.readFile(mediaPath, (err, data) => {
    if (err) {
      console.error("Error reading image file:", err);
      return;
    }
    // Convert image to base64 for simplicity
    const base64Image = data.toString("base64");
    socket.emit("mediaData", {
      type: "image",
      url: `data:image/jpeg;base64,${base64Image}`, // Adjust MIME type if necessary
    });
  });
};

// Start the server
server.listen(3000, () => {
  console.log("Server is running on port 3000");
});