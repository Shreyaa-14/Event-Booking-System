const mongoose = require("mongoose");

function generateConfirmationId() {
  return "EVT-" + Date.now() + "-" + Math.floor(1000 + Math.random() * 9000);
}

const bookingSchema = new mongoose.Schema(
  {
    confirmationId: {
      type: String,
      unique: true,
      default: generateConfirmationId
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    status: {
      type: String,
      enum: ["Confirmed", "Cancelled"],
      default: "Confirmed"
    },
    qrCode: {
      type: String,
      default: ""
    },
    entryStatus: {
      type: String,
      enum: ["Pending", "CheckedIn"],
      default: "Pending"
    },
    checkedInAt: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

// Prevent duplicate active booking for same user + event
bookingSchema.index(
  { user: 1, event: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: { status: "Confirmed" }
  }
);

module.exports = mongoose.model("Booking", bookingSchema);