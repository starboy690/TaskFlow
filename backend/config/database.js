const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/taskflow"
    );

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📊 Database: ${conn.connection.name}`);
    return conn;
  } catch (error) {
    console.error("❌ MongoDB Connection Error:", error.message);

    if (error.message.includes("ECONNREFUSED")) {
      console.log("\n💡 To fix MongoDB:");
      console.log("1. Install: brew install mongodb-community");
      console.log("2. Start: brew services start mongodb-community");
    }

    return null;
  }
};

// MongoDB connection events
mongoose.connection.on("connected", () => {
  console.log("🔗 MongoDB connected successfully");
});

mongoose.connection.on("error", (err) => {
  console.error("❌ MongoDB connection error:", err);
});

mongoose.connection.on("disconnected", () => {
  console.log("⚠️ MongoDB disconnected");
});

module.exports = connectDB;
