const express = require("express");
const QRCode = require("qrcode");
const Booking = require("../models/Booking");
const Event = require("../models/Event");
const auth = require("../middleware/authMiddleware");

const router = express.Router();

function generateConfirmationId() {
  return "EVT-" + Date.now() + "-" + Math.floor(1000 + Math.random() * 9000);
}

function getTodayStart() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function ensureStudent(req, res) {
  if (req.user.role !== "Student") {
    res.status(403).json({ message: "Students only." });
    return false;
  }
  return true;
}

function ensureAdmin(req, res) {
  if (req.user.role !== "Admin") {
    res.status(403).json({ message: "Admin only." });
    return false;
  }
  return true;
}

router.post("/", auth, async (req, res) => {
  if (!ensureStudent(req, res)) return;

  const { eventId } = req.body;
  const quantity = Number(req.body.quantity);

  if (!eventId) {
    return res.status(400).json({ message: "Event ID is required." });
  }

  if (quantity !== 1) {
    return res.status(400).json({ message: "Each student can book only 1 ticket." });
  }

  try {
    const existingBooking = await Booking.findOne({
      user: req.user.id,
      event: eventId,
      status: "Confirmed"
    });

    if (existingBooking) {
      return res.status(400).json({ message: "You have already booked this event." });
    }

    const updatedEvent = await Event.findOneAndUpdate(
      {
        _id: eventId,
        date: { $gte: getTodayStart() },
        tickets: { $gte: 1 }
      },
      { $inc: { tickets: -1 } },
      { returnDocument: "after" }
    );

    if (!updatedEvent) {
      return res.status(400).json({ message: "Event not available or tickets sold out." });
    }

    const confirmationId = generateConfirmationId();
    const qrCode = await QRCode.toDataURL(confirmationId);

    let booking;

    try {
      booking = await Booking.create({
        confirmationId,
        user: req.user.id,
        event: eventId,
        quantity: 1,
        qrCode
      });
    } catch (dbErr) {
      // rollback ticket in case duplicate booking slips in via race
      await Event.findByIdAndUpdate(eventId, { $inc: { tickets: 1 } });

      if (dbErr.code === 11000) {
        return res.status(400).json({ message: "You have already booked this event." });
      }

      throw dbErr;
    }

    res.json({
      message: "Booking successful.",
      confirmationId: booking.confirmationId,
      qrCode: booking.qrCode
    });
  } catch (err) {
    console.error("Booking route error:", err);
    res.status(500).json({ message: "Server error while booking event." });
  }
});

router.get("/my", auth, async (req, res) => {
  if (!ensureStudent(req, res)) return;

  try {
    const bookings = await Booking.find({ user: req.user.id })
      .populate("event")
      .sort({ createdAt: -1 });

    res.json(bookings);
  } catch (err) {
    console.error("Fetch bookings error:", err);
    res.status(500).json({ message: "Server error while fetching bookings." });
  }
});

router.patch("/:id/cancel", auth, async (req, res) => {
  if (!ensureStudent(req, res)) return;

  try {
    const booking = await Booking.findOne({
      _id: req.params.id,
      user: req.user.id
    });

    if (!booking) {
      return res.status(404).json({ message: "Booking not found." });
    }

    if (booking.status === "Cancelled") {
      return res.status(400).json({ message: "Booking already cancelled." });
    }

    booking.status = "Cancelled";
    booking.entryStatus = "Pending";
    booking.checkedInAt = null;
    await booking.save();

    if (booking.event) {
      await Event.findByIdAndUpdate(booking.event, {
        $inc: { tickets: 1 }
      });
    }

    res.json({ message: "Booking cancelled successfully." });
  } catch (err) {
    console.error("Cancel booking error:", err);
    res.status(500).json({ message: "Server error while cancelling booking." });
  }
});

// Admin QR scan/check-in
router.post("/scan", auth, async (req, res) => {
  if (!ensureAdmin(req, res)) return;

  try {
    const confirmationId = req.body.confirmationId?.trim();

    if (!confirmationId) {
      return res.status(400).json({ message: "Confirmation ID is required." });
    }

    const booking = await Booking.findOne({
      confirmationId
    })
      .populate("user", "name email")
      .populate("event", "name venue date");

    if (!booking) {
      return res.status(404).json({ message: "Invalid QR / booking not found." });
    }

    if (booking.status !== "Confirmed") {
      return res.status(400).json({ message: "This booking is cancelled." });
    }

    if (!booking.event) {
      return res.status(400).json({ message: "Associated event not found." });
    }

    if (booking.entryStatus === "CheckedIn") {
      return res.status(400).json({
        message: "QR already used.",
        booking: {
          confirmationId: booking.confirmationId,
          studentName: booking.user?.name || "N/A",
          studentEmail: booking.user?.email || "N/A",
          eventName: booking.event?.name || "N/A",
          checkedInAt: booking.checkedInAt
        }
      });
    }

    booking.entryStatus = "CheckedIn";
    booking.checkedInAt = new Date();
    await booking.save();

    res.json({
      message: "Check-in successful.",
      booking: {
        confirmationId: booking.confirmationId,
        studentName: booking.user?.name || "N/A",
        studentEmail: booking.user?.email || "N/A",
        eventName: booking.event?.name || "N/A",
        venue: booking.event?.venue || "N/A",
        eventDate: booking.event?.date || null,
        checkedInAt: booking.checkedInAt
      }
    });
  } catch (err) {
    console.error("QR scan error:", err);
    res.status(500).json({ message: "Server error while scanning QR." });
  }
});

module.exports = router;