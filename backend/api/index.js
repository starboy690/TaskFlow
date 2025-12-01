// api/index.js
const express = require("express");
const mongoose = require("mongoose");

const app = express();

mongoose.connect(process.env.MONGODB_URI);

app.get("/api/data", async (req, res) => {
  // Fetch data from MongoDB
  const data = await SomeModel.find();
  res.json(data);
});

module.exports = app;
