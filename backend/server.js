const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/auth");
const mongoose = require("mongoose");
require("dotenv").config();

const app = express();

// Middleware
app.use(cors({ origin: "http://127.0.0.1:5500" }));
app.use(express.json());

// In your server.js, make sure you have:
app.use("/api/auth", require("./routes/auth"));

app.get("/", (req, res) => {
  res.send("TaskFlow API is running...");
});

// Simple MongoDB connection
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch((err) => console.log("❌ MongoDB Connection Failed:", err.message));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
