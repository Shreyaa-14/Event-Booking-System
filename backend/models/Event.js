const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    venue: { type: String, required: true, trim: true },
    date: { type: Date, required: true },
    totalTickets: { type: Number, required: true, min: 1 },
    tickets: { type: Number, required: true, min: 0 },
    category: {
      type: String,
      enum: ["Technical", "Cultural", "Sports", "Workshop", "Seminar", "Other"],
      default: "Other"
    },
    description: { type: String, default: "", trim: true },
    poster: { type: String, default: "" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    status: {
      type: String,
      enum: ["Active", "Cancelled"],
      default: "Active"
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Event", eventSchema);