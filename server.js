const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");
const axios = require("axios");
const mysql = require("mysql2");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
require("dotenv").config();

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Middleware
app.use(
  cors({
    origin: "https://live-location-node-js-1.onrender.com/",
    methods: ["GET", "POST"],
    credentials: true,
  })
);
app.use(express.json()); // For parsing application/json
app.use(express.static(path.join(__dirname, "public")));

// MySQL connection
const db = mysql.createConnection({
  host: "your_mysql_host", // replace with your MySQL host
  user: "your_mysql_user", // replace with your MySQL username
  password: "your_mysql_password", // replace with your MySQL password
  database: "your_database_name", // replace with the name of your MySQL database
});

// Connect to the database
db.connect((err) => {
  if (err) throw err;
  console.log("Connected to MySQL database");
});

// Email setup
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL, // Your email
    pass: process.env.EMAIL_PASSWORD, // Your email password
  },
});

// Register route
app.post("/register", async (req, res) => {
  const { email, password } = req.body;

  // Check if the user already exists
  db.query(
    "SELECT * FROM users WHERE email = ?",
    [email],
    async (err, results) => {
      if (err) {
        return res.status(500).send("Server error");
      }
      if (results.length > 0) {
        return res.status(400).send("User already exists");
      }

      // Hash the password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Insert the new user into the database
      db.query(
        "INSERT INTO users (email, password, is_verified) VALUES (?, ?, ?)",
        [email, hashedPassword, false],
        (err, results) => {
          if (err) {
            return res.status(500).send("Error registering user");
          }

          // Send verification email
          const verificationLink = `http://localhost:3000/verify/${results.insertId}`;
          transporter.sendMail({
            to: email,
            subject: "Email Verification",
            text: `Click this link to verify your email: ${verificationLink}`,
          });

          res.status(201).send("User registered. Please verify your email.");
        }
      );
    }
  );
});

// Email verification route
app.get("/verify/:id", (req, res) => {
  const userId = req.params.id;

  db.query(
    "UPDATE users SET is_verified = ? WHERE id = ?",
    [true, userId],
    (err, results) => {
      if (err) {
        return res.status(400).send("Error verifying email.");
      }
      res.send("Email verified successfully.");
    }
  );
});

// Login route
app.post("/login", (req, res) => {
  const { email, password } = req.body;

  db.query(
    "SELECT * FROM users WHERE email = ?",
    [email],
    async (err, results) => {
      if (err || results.length === 0) {
        return res.status(401).send("Invalid email or password.");
      }

      const user = results[0];
      const passwordMatch = await bcrypt.compare(password, user.password);
      if (passwordMatch) {
        if (user.is_verified) {
          res.json({ message: "Login successful", userId: user.id }); // Adjust as necessary
        } else {
          res.status(401).send("Email not verified.");
        }
      } else {
        res.status(401).send("Invalid email or password.");
      }
    }
  );
});

// Socket.io logic
io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  socket.on("locationUpdate", (data) => {
    io.emit("locationUpdate", data);
    console.log("Location update emitted to all clients");
  });

  socket.on("requestRouteData", async (data1) => {
    const { startLat, startLng, endLat, endLng } = data1;
    io.emit("requestRouteData", data1);
    console.log("Start and end point emitted to front end");

    app.get("/api/getRoute", async (req, res) => {
      try {
        const response = await axios.get(
          `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}`,
          { params: { geometries: "geojson", overview: false } }
        );

        if (response.data.routes && response.data.routes.length > 0) {
          const route = response.data.routes[0];
          console.log(route);
          const dataToSend = {
            route: route,
            waypoints: response.data.waypoints || [],
          };
          return res.json(dataToSend);
        } else {
          console.error("No routes found in the response");
          return res.status(404).json({ error: "No routes found" });
        }
      } catch (error) {
        console.error("Error fetching the route:", error);
        return res
          .status(500)
          .json({ error: "An error occurred while fetching the route" });
      }
    });
  });
});

server.listen(3000, () => {
  console.log("Server is running on port 3000");
});
