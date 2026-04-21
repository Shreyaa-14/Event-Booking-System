const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const nodemailer = require("nodemailer");
const Event = require("../models/Event");
const Booking = require("../models/Booking");
const auth = require("../middleware/authMiddleware");

const router = express.Router();

const uploadPath = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only JPG, PNG and WEBP images are allowed."));
    }
  }
});

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

function getTodayStart() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function parseDateOnly(dateStr) {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

router.post("/", auth, upload.single("poster"), async (req, res) => {
  try {
    if (req.user.role !== "Admin") {
      return res.status(403).json({ message: "Admin only." });
    }

    const name = req.body.name?.trim();
    const venue = req.body.venue?.trim();
    const category = req.body.category?.trim() || "Other";
    const description = req.body.description?.trim() || "";
    const date = req.body.date;
    const totalTickets = Number(req.body.totalTickets);

    if (!name || !venue || !date || !req.body.totalTickets) {
      return res.status(400).json({ message: "Please fill all required fields." });
    }

    if (!Number.isInteger(totalTickets) || totalTickets <= 0) {
      return res.status(400).json({ message: "Total tickets must be a positive whole number." });
    }

    const eventDate = parseDateOnly(date);
    if (isNaN(eventDate.getTime())) {
      return res.status(400).json({ message: "Invalid event date." });
    }

    if (eventDate < getTodayStart()) {
      return res.status(400).json({ message: "Past-date events cannot be created." });
    }

    const poster = req.file ? `/uploads/${req.file.filename}` : "";

    const event = await Event.create({
      name,
      venue,
      date: eventDate,
      totalTickets,
      tickets: totalTickets,
      category,
      description,
      poster,
      createdBy: req.user.id,
      status: "Active"
    });

    res.json(event);
  } catch (err) {
    console.error("Create event error:", err);
    res.status(500).json({ message: "Server error while creating event." });
  }
});

router.put("/:id", auth, upload.single("poster"), async (req, res) => {
  try {
    if (req.user.role !== "Admin") {
      return res.status(403).json({ message: "Admin only." });
    }

    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: "Event not found." });
    }

    const name = req.body.name?.trim();
    const venue = req.body.venue?.trim();
    const category = req.body.category?.trim() || "Other";
    const description = req.body.description?.trim() || "";
    const date = req.body.date;
    const totalTickets = Number(req.body.totalTickets);

    if (!name || !venue || !date || !req.body.totalTickets) {
      return res.status(400).json({ message: "Please fill all required fields." });
    }

    if (!Number.isInteger(totalTickets) || totalTickets <= 0) {
      return res.status(400).json({ message: "Total tickets must be a positive whole number." });
    }

    const eventDate = parseDateOnly(date);
    if (isNaN(eventDate.getTime())) {
      return res.status(400).json({ message: "Invalid event date." });
    }

    if (eventDate < getTodayStart()) {
      return res.status(400).json({ message: "Past-date events cannot be set." });
    }

    const sold = event.totalTickets - event.tickets;
    if (totalTickets < sold) {
      return res.status(400).json({
        message: `Total tickets cannot be less than already sold tickets (${sold}).`
      });
    }

    event.name = name;
    event.venue = venue;
    event.category = category;
    event.description = description;
    event.date = eventDate;
    event.totalTickets = totalTickets;
    event.tickets = totalTickets - sold;

    if (req.file) {
      if (event.poster) {
        const oldPosterPath = path.join(__dirname, "..", event.poster);
        if (fs.existsSync(oldPosterPath)) {
          fs.unlinkSync(oldPosterPath);
        }
      }
      event.poster = `/uploads/${req.file.filename}`;
    }

    await event.save();

    res.json({ message: "Event updated successfully.", event });
  } catch (err) {
    console.error("Update event error:", err);
    res.status(500).json({ message: "Server error while updating event." });
  }
});

router.get("/", async (req, res) => {
  try {
    const { search = "", category = "", upcoming = "" } = req.query;
    const query = {};

    if (search.trim()) {
      query.$or = [
        { name: { $regex: search.trim(), $options: "i" } },
        { venue: { $regex: search.trim(), $options: "i" } },
        { category: { $regex: search.trim(), $options: "i" } }
      ];
    }

    if (category.trim()) {
      query.category = category.trim();
    }

    if (upcoming === "true") {
      query.date = { $gte: getTodayStart() };
    }

    const events = await Event.find(query).sort({ date: 1 });
    res.json(events);
  } catch (err) {
    console.error("Fetch events error:", err);
    res.status(500).json({ message: "Server error while fetching events." });
  }
});

router.get("/analytics/summary", auth, async (req, res) => {
  try {
    if (req.user.role !== "Admin") {
      return res.status(403).json({ message: "Admin only." });
    }

    const totalEvents = await Event.countDocuments();
    const upcomingEvents = await Event.countDocuments({ date: { $gte: getTodayStart() } });
    const totalBookings = await Booking.countDocuments({ status: "Confirmed" });

    const eventList = await Event.find();
    const totalTickets = eventList.reduce((sum, e) => sum + e.totalTickets, 0);
    const ticketsLeft = eventList.reduce((sum, e) => sum + e.tickets, 0);
    const ticketsSold = totalTickets - ticketsLeft;

    res.json({
      totalEvents,
      upcomingEvents,
      totalBookings,
      totalTickets,
      ticketsSold,
      ticketsLeft
    });
  } catch (err) {
    console.error("Analytics error:", err);
    res.status(500).json({ message: "Server error while fetching analytics." });
  }
});

router.patch("/:id/cancel", auth, async (req, res) => {
  try {
    if (req.user.role !== "Admin") {
      return res.status(403).json({ message: "Admin only." });
    }

    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: "Event not found." });
    }

    if (event.status === "Cancelled") {
      return res.status(400).json({ message: "Event already cancelled." });
    }

    event.status = "Cancelled";
    await event.save();

    const bookings = await Booking.find({
      event: event._id,
      status: "Confirmed"
    }).populate("user", "name email");

    for (const booking of bookings) {
      if (!booking.user?.email) continue;

      try {
        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: booking.user.email,
          subject: `Event Cancelled: ${event.name}`,
          html: `
            <p>Dear ${booking.user.name || "Student"},</p>
            <p>We regret to inform you that your booked event has been cancelled.</p>
            <p><b>Event:</b> ${event.name}</p>
            <p><b>Venue:</b> ${event.venue}</p>
            <p><b>Date:</b> ${new Date(event.date).toLocaleDateString("en-IN")}</p>
            <p>This cancellation will also be reflected on your EventSphere dashboard.</p>
            <br>
            <p>Regards,<br>EventSphere Team</p>
          `
        });
      } catch (mailErr) {
        console.error(`Failed to send cancellation email to ${booking.user.email}:`, mailErr);
      }
    }

    res.json({ message: "Event cancelled and students notified successfully." });
  } catch (err) {
    console.error("Cancel event error:", err);
    res.status(500).json({ message: "Server error while cancelling event." });
  }
});

router.delete("/:id", auth, async (req, res) => {
  try {
    if (req.user.role !== "Admin") {
      return res.status(403).json({ message: "Admin only." });
    }

    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: "Event not found." });
    }

    const activeBookings = await Booking.countDocuments({
      event: event._id,
      status: "Confirmed"
    });

    if (activeBookings > 0) {
      return res.status(400).json({
        message: "This event has confirmed bookings. Cancel bookings first before deleting."
      });
    }

    if (event.poster) {
      const posterPath = path.join(__dirname, "..", event.poster);
      if (fs.existsSync(posterPath)) {
        fs.unlinkSync(posterPath);
      }
    }

    await Event.findByIdAndDelete(req.params.id);

    res.json({ message: "Event deleted." });
  } catch (err) {
    console.error("Delete event error:", err);
    res.status(500).json({ message: "Server error while deleting event." });
  }
});

module.exports = router;