const BASE = "/api";
const token = localStorage.getItem("token");
const role = localStorage.getItem("role");

let qrScanner = null;
let qrScannerRunning = false;
let scanBusy = false;

if (!token || role !== "Admin") {
  window.location.href = "index.html";
}

function showToast(message, type = "success") {
  const toastBox = document.getElementById("toastBox");
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerText = message;
  toastBox.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

window.addEventListener("DOMContentLoaded", () => {
  loadProfile();
  loadAnalytics();
  fetchEvents();
});

function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("role");
  localStorage.removeItem("eventId");
  localStorage.removeItem("eventName");
  window.location.href = "index.html";
}

function formatDateInput(dateValue) {
  const d = new Date(dateValue);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDisplayDate(dateValue) {
  return new Date(dateValue).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

async function loadProfile() {
  try {
    const res = await fetch(`${BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const user = await res.json();

    if (!res.ok) return;

    document.getElementById("profileCard").innerHTML = `
      <div class="profile-grid">
        <div>
          <p class="eyebrow">Profile</p>
          <h2>${user.name}</h2>
          <p>${user.email}</p>
        </div>
        <div class="profile-pill">${user.role}</div>
      </div>
    `;
  } catch (err) {
    console.error("Profile load error:", err);
  }
}

async function loadAnalytics() {
  try {
    const res = await fetch(`${BASE}/events/analytics/summary`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();

    if (!res.ok) return;

    document.getElementById("analytics").innerHTML = `
      <div class="stat-card modern-card"><span>Total Events</span><strong>${data.totalEvents}</strong></div>
      <div class="stat-card modern-card"><span>Upcoming Events</span><strong>${data.upcomingEvents}</strong></div>
      <div class="stat-card modern-card"><span>Total Bookings</span><strong>${data.totalBookings}</strong></div>
      <div class="stat-card modern-card"><span>Tickets Sold</span><strong>${data.ticketsSold}</strong></div>
      <div class="stat-card modern-card"><span>Tickets Left</span><strong>${data.ticketsLeft}</strong></div>
      <div class="stat-card modern-card"><span>Total Tickets</span><strong>${data.totalTickets}</strong></div>
    `;
  } catch (err) {
    console.error("Analytics error:", err);
  }
}

async function saveEvent() {
  const eventId = document.getElementById("eventId").value;
  const name = document.getElementById("name").value.trim();
  const venue = document.getElementById("venue").value.trim();
  const date = document.getElementById("date").value;
  const totalTickets = document.getElementById("totalTickets").value;
  const category = document.getElementById("category").value;
  const description = document.getElementById("description").value.trim();
  const poster = document.getElementById("poster").files[0];

  if (!name || !venue || !date || !totalTickets) {
    showToast("Please fill all required fields.", "error");
    return;
  }

  const formData = new FormData();
  formData.append("name", name);
  formData.append("venue", venue);
  formData.append("date", date);
  formData.append("totalTickets", totalTickets);
  formData.append("category", category);
  formData.append("description", description);
  if (poster) formData.append("poster", poster);

  try {
    const url = eventId ? `${BASE}/events/${eventId}` : `${BASE}/events`;
    const method = eventId ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: formData
    });

    const data = await res.json();

    if (!res.ok) {
      showToast(data.message || "Operation failed.", "error");
      return;
    }

    showToast(eventId ? "Event updated successfully." : "Event created successfully.");
    resetForm();
    fetchEvents();
    loadAnalytics();
  } catch (err) {
    console.error("Save event error:", err);
    showToast("Server error while saving event.", "error");
  }
}

function resetForm() {
  document.getElementById("eventId").value = "";
  document.getElementById("name").value = "";
  document.getElementById("venue").value = "";
  document.getElementById("date").value = "";
  document.getElementById("totalTickets").value = "";
  document.getElementById("category").value = "Technical";
  document.getElementById("description").value = "";
  document.getElementById("poster").value = "";
  document.getElementById("formTitle").innerText = "Create New Event";
}

async function fetchEvents() {
  try {
    const search = document.getElementById("searchInput").value.trim();
    const category = document.getElementById("filterCategory").value;

    const query = new URLSearchParams();
    if (search) query.append("search", search);
    if (category) query.append("category", category);

    const res = await fetch(`${BASE}/events?${query.toString()}`);
    const events = await res.json();

    if (!res.ok) {
      showToast(events.message || "Failed to load events.", "error");
      return;
    }

    displayEvents(events);
  } catch (err) {
    console.error("Fetch events error:", err);
    showToast("Server not reachable.", "error");
  }
}

function editEvent(event) {
  document.getElementById("eventId").value = event._id;
  document.getElementById("name").value = event.name;
  document.getElementById("venue").value = event.venue;
  document.getElementById("date").value = formatDateInput(event.date);
  document.getElementById("totalTickets").value = event.totalTickets;
  document.getElementById("category").value = event.category || "Other";
  document.getElementById("description").value = event.description || "";
  document.getElementById("formTitle").innerText = "Edit Event";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function deleteEvent(id) {
  if (!confirm("Delete this event?")) return;

  try {
    const res = await fetch(`${BASE}/events/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await res.json();

    if (!res.ok) {
      showToast(data.message || "Delete failed.", "error");
      return;
    }

    showToast("Event deleted.");
    fetchEvents();
    loadAnalytics();
  } catch (err) {
    console.error("Delete event error:", err);
    showToast("Server error while deleting.", "error");
  }
}

function displayEvents(events) {
  const container = document.getElementById("events");
  container.innerHTML = "";

  if (!Array.isArray(events) || events.length === 0) {
    container.innerHTML = `<div class="empty-state">No events found.</div>`;
    return;
  }

  events.forEach((event) => {
    const sold = event.totalTickets - event.tickets;
    const poster = event.poster
      ? `<img class="poster-img" src="${event.poster}" alt="${event.name}">`
      : `<div class="poster-placeholder">No Poster</div>`;

    const isSoldOut = event.tickets <= 0;

    const div = document.createElement("div");
    div.className = "event-card modern-card";

    div.innerHTML = `
      ${poster}
      <div class="card-topline">
        <span class="badge">${event.category || "Other"}</span>
        <span class="badge ${isSoldOut ? "badge-danger" : "badge-success"}">
          ${isSoldOut ? "Sold Out" : `${event.tickets} Left`}
        </span>
      </div>
      <h4>${event.name}</h4>
      <p><b>Venue:</b> ${event.venue}</p>
      <p><b>Date:</b> ${formatDisplayDate(event.date)}</p>
      <p><b>Total Tickets:</b> ${event.totalTickets}</p>
      <p><b>Tickets Sold:</b> ${sold}</p>
      <p><b>Description:</b> ${event.description || "N/A"}</p>
      <div class="action-row">
        <button onclick='editEvent(${JSON.stringify(event).replace(/'/g, "&apos;")})'>Edit</button>
        <button class="danger-btn" onclick="deleteEvent('${event._id}')">Delete</button>
      </div>
    `;

    container.appendChild(div);
  });
}

async function startScanner() {
  if (qrScannerRunning) return;

  try {
    if (!window.Html5Qrcode) {
      showToast("QR scanner library failed to load.", "error");
      return;
    }

    qrScanner = new Html5Qrcode("reader");
    await qrScanner.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: 240 },
      async (decodedText) => {
        if (scanBusy) return;
        scanBusy = true;
        await scanTicket(decodedText);
        setTimeout(() => {
          scanBusy = false;
        }, 1800);
      }
    );

    qrScannerRunning = true;
    showToast("Scanner started.");
  } catch (err) {
    console.error("Scanner start error:", err);
    showToast("Unable to start camera scanner.", "error");
  }
}

async function stopScanner() {
  try {
    if (qrScanner && qrScannerRunning) {
      await qrScanner.stop();
      await qrScanner.clear();
      qrScannerRunning = false;
      qrScanner = null;
      showToast("Scanner stopped.");
    }
  } catch (err) {
    console.error("Scanner stop error:", err);
    showToast("Unable to stop scanner cleanly.", "error");
  }
}

async function scanTicket(confirmationId) {
  try {
    const res = await fetch(`${BASE}/bookings/scan`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ confirmationId })
    });

    const data = await res.json();
    const box = document.getElementById("scanResult");

    if (!res.ok) {
      box.innerHTML = `
        <h3>Scan Result</h3>
        <div class="scan-alert error">
          <p><strong>${data.message || "Invalid QR"}</strong></p>
          ${
            data.booking
              ? `
              <p><b>Student:</b> ${data.booking.studentName}</p>
              <p><b>Email:</b> ${data.booking.studentEmail}</p>
              <p><b>Event:</b> ${data.booking.eventName}</p>
              <p><b>Checked In:</b> ${data.booking.checkedInAt ? new Date(data.booking.checkedInAt).toLocaleString("en-IN") : "N/A"}</p>
            `
              : ""
          }
        </div>
      `;
      showToast(data.message || "Scan failed.", "error");
      return;
    }

    const booking = data.booking;

    box.innerHTML = `
      <h3>Scan Result</h3>
      <div class="scan-alert success">
        <p><strong>${data.message}</strong></p>
        <p><b>Student:</b> ${booking.studentName}</p>
        <p><b>Email:</b> ${booking.studentEmail}</p>
        <p><b>Event:</b> ${booking.eventName}</p>
        <p><b>Venue:</b> ${booking.venue}</p>
        <p><b>Event Date:</b> ${booking.eventDate ? new Date(booking.eventDate).toLocaleDateString("en-IN") : "N/A"}</p>
        <p><b>Checked In At:</b> ${booking.checkedInAt ? new Date(booking.checkedInAt).toLocaleString("en-IN") : "N/A"}</p>
      </div>
    `;

    showToast("QR verified successfully.");
  } catch (err) {
    console.error("Scan ticket error:", err);
    showToast("Server error while verifying QR.", "error");
  }
}