const BASE = "/api";
const token = localStorage.getItem("token");
const role = localStorage.getItem("role");

if (!token || role !== "Student") {
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
    loadEvents();
    loadBookings();
});

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
        console.error("Profile error:", err);
    }
}

async function loadEvents() {
    try {
        const search = document.getElementById("searchInput").value.trim();
        const category = document.getElementById("filterCategory").value;

        const query = new URLSearchParams();
        query.append("upcoming", "true");
        if (search) query.append("search", search);
        if (category) query.append("category", category);

        const res = await fetch(`${BASE}/events?${query.toString()}`);
        const events = await res.json();

        const container = document.getElementById("events");
        container.innerHTML = "";

        if (!res.ok) {
            container.innerHTML = `<div class="empty-state">Failed to load events.</div>`;
            return;
        }

        if (!Array.isArray(events) || events.length === 0) {
            container.innerHTML = `<div class="empty-state">No upcoming events available.</div>`;
            return;
        }

        events.forEach(e => {
            const sold = e.totalTickets - e.tickets;
            const poster = e.poster
                ? `<img class="poster-img" src="${e.poster}" alt="${e.name}">`
                : `<div class="poster-placeholder">No Poster</div>`;

            const isCancelled = e.status === "Cancelled";

            container.innerHTML += `
            <div class="card modern-card">
                ${poster}
                <div class="card-topline">
                    <span class="badge">${e.category || "Other"}</span>
                    <span class="badge ${isCancelled || e.tickets <= 0 ? "badge-danger" : "badge-success"}">
                        ${isCancelled ? "Cancelled" : e.tickets > 0 ? `${e.tickets} Left` : "Sold Out"}
                    </span>
                </div>
                <h4>${e.name}</h4>
                <p><b>Venue:</b> ${e.venue}</p>
                <p><b>Date:</b> ${formatDisplayDate(e.date)}</p>
                <p><b>Tickets Sold:</b> ${sold}</p>
                <p><b>Status:</b> ${e.status || "Active"}</p>
                <p><b>Description:</b> ${e.description || "N/A"}</p>
                ${
                    isCancelled
                    ? `<button disabled>Event Cancelled</button>`
                    : e.tickets > 0
                    ? `<button onclick="goToBooking('${e._id}','${e.name.replace(/'/g, "\\'")}')">Book Now</button>`
                    : `<button disabled>Sold Out</button>`
                }
            </div>`;
        });
    } catch (err) {
        console.error("Load events error:", err);
        document.getElementById("events").innerHTML = `<div class="empty-state">Server not reachable.</div>`;
    }
}

async function loadBookings() {
    try {
        const res = await fetch(`${BASE}/bookings/my`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const bookings = await res.json();

        const container = document.getElementById("bookings");
        container.innerHTML = "";

        if (!res.ok) {
            container.innerHTML = `<div class="empty-state">Failed to load bookings.</div>`;
            return;
        }

        if (!Array.isArray(bookings)) {
            container.innerHTML = `<div class="empty-state">No bookings found.</div>`;
            return;
        }

        const activeBookings = bookings.filter(b => b.status === "Confirmed");

        if (activeBookings.length === 0) {
            container.innerHTML = `<div class="empty-state">No active bookings found.</div>`;
            return;
        }

        activeBookings.forEach(b => {
            const eventName = b.event ? b.event.name : "Deleted Event";
            const isEventCancelled = b.event?.status === "Cancelled";

            container.innerHTML += `
            <div class="card modern-card">
                <div class="card-topline">
                    <span class="badge ${isEventCancelled ? "badge-danger" : ""}">
                        ${isEventCancelled ? "Event Cancelled" : b.status}
                    </span>
                    <span class="badge ${b.entryStatus === "CheckedIn" ? "badge-success" : "badge-muted"}">
                        ${isEventCancelled ? "Not Valid" : b.entryStatus || "Pending"}
                    </span>
                </div>
                <h4>${eventName}</h4>
                <p><b>Confirmation ID:</b> ${b.confirmationId}</p>
                <p><b>Tickets:</b> ${b.quantity}</p>
                <p><b>Booked On:</b> ${new Date(b.createdAt).toLocaleDateString("en-IN")}</p>
                ${
                    b.checkedInAt
                    ? `<p><b>Checked In At:</b> ${new Date(b.checkedInAt).toLocaleString("en-IN")}</p>`
                    : ""
                }
                ${
                    isEventCancelled
                    ? `<p style="color:#d32f2f; font-weight:600;">This event has been cancelled by admin.</p>`
                    : ""
                }
                ${
                    b.qrCode && b.status === "Confirmed" && !isEventCancelled
                    ? `<img class="booking-qr-thumb" src="${b.qrCode}" alt="QR" onclick="openQrModal('${b.qrCode}')">`
                    : ""
                }
                <div class="action-row">
                    ${
                        b.qrCode && b.status === "Confirmed" && !isEventCancelled
                        ? `<button class="secondary-btn" onclick="openQrModal('${b.qrCode}')">View QR</button>`
                        : ""
                    }
                    ${
                        !isEventCancelled
                        ? `<button class="danger-btn" onclick="cancelBooking('${b._id}')">Cancel Booking</button>`
                        : `<button disabled>Cancelled by Admin</button>`
                    }
                </div>
            </div>`;
        });
    } catch (err) {
        console.error("Load bookings error:", err);
        document.getElementById("bookings").innerHTML = `<div class="empty-state">Server not reachable.</div>`;
    }
}

async function cancelBooking(id) {
    try {
        const res = await fetch(`${BASE}/bookings/${id}/cancel`, {
            method: "PATCH",
            headers: { Authorization: `Bearer ${token}` }
        });

        const data = await res.json();

        if (!res.ok) {
            showToast(data.message || "Cancellation failed.", "error");
            return;
        }

        showToast("Booking cancelled successfully.");
        loadBookings();
        loadEvents();
    } catch (err) {
        console.error("Cancel booking error:", err);
        showToast("Server error while cancelling booking.", "error");
    }
}

function goToBooking(id, name) {
    localStorage.setItem("eventId", id);
    localStorage.setItem("eventName", name);
    window.location.href = "booking.html";
}

function openQrModal(src) {
    document.getElementById("qrModalImage").src = src;
    document.getElementById("qrModal").classList.add("show");
}

function closeQrModal() {
    document.getElementById("qrModal").classList.remove("show");
    document.getElementById("qrModalImage").src = "";
}

function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("eventId");
    localStorage.removeItem("eventName");
    window.location.href = "index.html";
}