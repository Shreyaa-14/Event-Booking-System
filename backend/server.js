require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const connectDB = require("./config/db");

const app = express();
connectDB();

// If CLIENT_URL is set, allow only that origin.
// If not set, allow all (useful during development).
if (process.env.CLIENT_URL) {
  app.use(
    cors({
      origin: process.env.CLIENT_URL,
      credentials: true
    })
  );
} else {
  app.use(cors());
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/events", require("./routes/eventRoutes"));
app.use("/api/bookings", require("./routes/bookingRoutes"));

app.use(express.static(path.join(__dirname, "../frontend")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

app.use((err, req, res, next) => {
  console.error("Global error:", err);
  res.status(500).json({
    message: err.message || "Internal server error."
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));