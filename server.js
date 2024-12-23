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
  socket.on("requestRouteData", async (data1) => {
    const { startLat, startLng, endLat, endLng } = data1;
    io.emit("requestRouteData", data1);
    console.log("Start and end point emitted to front end");

    // Get route data from the OSRM API
    app.get("/api/getRoute", async (req, res) => {
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
  });

  // Command handling: Receive media commands (e.g., play video, play audio, show image)
  socket.on("mediaData", ({ type, path: mediaPath }) => {
    console.log("Media data received:", { type, mediaPath });

    if (!type || !mediaPath) {
      console.error("Invalid media data:", { type, mediaPath });
      return;
    }

    try {
      switch (type) {
        case "video":
          console.log("Preparing to stream video...");
          streamMedia("video", mediaPath, socket);
          break;
        case "audio":
          console.log("Preparing to stream audio...");
          streamMedia("audio", mediaPath, socket);
          break;
        case "image":
          console.log("Preparing to send image...");
          sendImage(mediaPath, socket);
          break;
        default:
          console.log("Unsupported media type:", type);
      }
      console.log(`Successfully processed ${type}: ${mediaPath}`);
    } catch (error) {
      console.error("Error processing media data:", error);
    }
  });



  //send mediacommands to the front end like startScreenRecord, stopScreenRecord, startAudioRecord, stopAudioRecord and so on 

 socket.on("mediaCommand", (data) => {
   console.log("Received media command:", data);
   // Handle the command here
   io.emit("mediaCommand", data);
   console.log(`Media command emitted to all clients ${data}`);
 });

  // Command handling: Receive media commands (e.g., startScreenRecord, stopScreenRecord, startAudioRecord, stopAudioRecord)

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

  // Handle user disconnection
  socket.on("disconnect", () => {
    console.log("A user disconnected:", socket.id);
  });
});

// Start the server
server.listen(3000, () => {
  console.log("Server is running on port 3000");
});
