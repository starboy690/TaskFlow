const jwt = require("jsonwebtoken");
const User = require("../models/User");
const bcrypt = require("bcryptjs");

const authController = {
  register: async (req, res) => {
    try {
      const { name, fullname, email, password } = req.body;

      // Validate input - accept both name and fullname
      if ((!name && !fullname) || !email || !password) {
        return res.status(400).json({
          success: false,
          message: "Please provide name, email, and password",
        });
      }

      // Use fullname if provided, otherwise use name
      const userName = fullname || name;

      // Check if user already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "User already exists with this email",
        });
      }

      // Create user
      const user = await User.create({
        name: userName, // Use the determined name
        email,
        password,
      });

      // Generate token
      const token = jwt.sign(
        { id: user._id },
        process.env.JWT_SECRET || "fallback_secret",
        {
          expiresIn: "7d",
        }
      );

      res.status(201).json({
        success: true,
        message: "User registered successfully",
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
        },
        token,
      });
    } catch (err) {
      console.error("Register error:", err);
      if (err.code === 11000) {
        return res.status(400).json({
          success: false,
          message: "Email already exists",
        });
      }
      res.status(500).json({
        success: false,
        message: "Server error during registration",
      });
    }
  },

  login: async (req, res) => {
    try {
      const { email, password } = req.body;

      // Find user and include password field
      const user = await User.findOne({ email }).select("+password");
      if (!user) {
        return res.status(401).json({
          success: false,
          message: "Invalid email or password",
        });
      }

      // Check password
      const isMatch = await user.matchPassword(password);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: "Invalid email or password",
        });
      }

      // Generate token
      const token = jwt.sign(
        { id: user._id },
        process.env.JWT_SECRET || "fallback_secret",
        {
          expiresIn: "7d",
        }
      );

      // Make sure user object has the name property
      const userResponse = {
        _id: user._id,
        name: user.name, // This should match your User model
        email: user.email,
      };

      console.log("Sending login response:", { user: userResponse, token });

      res.json({
        success: true,
        message: "Login successful",
        user: userResponse,
        token,
      });
    } catch (err) {
      console.error("Login error:", err);
      res.status(500).json({
        success: false,
        message: "Server error during login",
      });
    }
  },

  getMe: async (req, res) => {
    try {
      // req.user is set by the auth middleware
      const user = await User.findById(req.user.id);

      res.json({
        success: true,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
        },
      });
    } catch (err) {
      console.error("Get me error:", err);
      res.status(500).json({
        success: false,
        message: "Server error fetching user data",
      });
    }
  },
};

module.exports = authController;
