const express = require("express");
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const auth = require("../middleware/authMiddleware");
const nodemailer = require("nodemailer");

const router = express.Router();

const isValidEmail = (email) =>
  /^[a-zA-Z0-9._%+-]+@msrit\.edu$/.test(email);

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

router.post("/register", async (req, res) => {
  try {
    const name = req.body.name?.trim();
    const email = req.body.email?.trim().toLowerCase();
    const password = req.body.password;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Please fill all fields." });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ message: "Only @msrit.edu email addresses are allowed." });
    }

    if (name.length < 2) {
      return res.status(400).json({ message: "Name must be at least 2 characters." });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters." });
    }

    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(400).json({ message: "User already exists." });
    }

    await User.create({
      name,
      email,
      password,
      role: "Student"
    });

    res.json({ message: "Registration successful." });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ message: "Server error during registration." });
  }
});

router.post("/login", async (req, res) => {
  try {
    const email = req.body.email?.trim().toLowerCase();
    const password = req.body.password;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid credentials." });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ message: "Invalid credentials." });

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      token,
      role: user.role,
      name: user.name,
      email: user.email
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error during login." });
  }
});

router.get("/me", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found." });
    res.json(user);
  } catch (err) {
    console.error("Profile error:", err);
    res.status(500).json({ message: "Server error while fetching profile." });
  }
});

router.post("/forgot-password", async (req, res) => {
  try {
    const email = req.body.email?.trim().toLowerCase();

    if (!email) {
      return res.status(400).json({ message: "Email is required." });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ message: "Only @msrit.edu email addresses are allowed." });
    }

    const user = await User.findOne({ email, role: "Student" });

    if (!user) {
      return res.status(404).json({ message: "No student account found with this email." });
    }

    const otp = generateOtp();
    user.resetOtp = otp;
    user.resetOtpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 min
    await user.save();

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "EventSphere Password Reset OTP",
      text: `Your OTP for password reset is ${otp}. It is valid for 10 minutes.`
    });

    res.json({ message: "OTP sent to your registered email address." });
  } catch (err) {
    console.error("Forgot password error:", err);
    res.status(500).json({ message: "Failed to send OTP." });
  }
});

router.post("/verify-otp", async (req, res) => {
  try {
    const email = req.body.email?.trim().toLowerCase();
    const otp = req.body.otp?.trim();

    if (!email || !otp) {
      return res.status(400).json({ message: "Email and OTP are required." });
    }

    const user = await User.findOne({ email, role: "Student" });

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    if (!user.resetOtp || !user.resetOtpExpiry) {
      return res.status(400).json({ message: "No OTP request found." });
    }

    if (user.resetOtp !== otp) {
      return res.status(400).json({ message: "Invalid OTP." });
    }

    if (user.resetOtpExpiry < new Date()) {
      return res.status(400).json({ message: "OTP has expired." });
    }

    res.json({ message: "OTP verified successfully." });
  } catch (err) {
    console.error("Verify OTP error:", err);
    res.status(500).json({ message: "Server error while verifying OTP." });
  }
});

router.post("/reset-password", async (req, res) => {
  try {
    const email = req.body.email?.trim().toLowerCase();
    const otp = req.body.otp?.trim();
    const newPassword = req.body.newPassword;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: "Email, OTP and new password are required." });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters." });
    }

    const user = await User.findOne({ email, role: "Student" });

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    if (!user.resetOtp || !user.resetOtpExpiry) {
      return res.status(400).json({ message: "No OTP request found." });
    }

    if (user.resetOtp !== otp) {
      return res.status(400).json({ message: "Invalid OTP." });
    }

    if (user.resetOtpExpiry < new Date()) {
      return res.status(400).json({ message: "OTP has expired." });
    }

    user.password = newPassword;
    user.resetOtp = null;
    user.resetOtpExpiry = null;
    await user.save();

    res.json({ message: "Password reset successful. Please login." });
  } catch (err) {
    console.error("Reset password error:", err);
    res.status(500).json({ message: "Server error while resetting password." });
  }
});

module.exports = router;