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

document.getElementById("eventName").innerText =
    localStorage.getItem("eventName") || "Event";

async function bookEvent() {
    const eventId = localStorage.getItem("eventId");

    if (!eventId) {
        showToast("No event selected.", "error");
        window.location.href = "student.html";
        return;
    }

    try {
        const res = await fetch(`${BASE}/bookings`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ eventId, quantity: 1 })
        });

        const data = await res.json();

        if (!res.ok) {
            showToast(data.message || "Booking failed.", "error");
            return;
        }

        showConfirmation(data);
        showToast("Booking successful!");
    } catch (err) {
        console.error("Booking error:", err);
        showToast("Server error while booking event.", "error");
    }
}

function showConfirmation(data) {
    const bookingPanel = document.getElementById("bookingPanel");
    bookingPanel.innerHTML = `
        <p class="eyebrow center">Confirmed</p>
        <h1>Booking Successful</h1>
        <p class="booking-subtitle">Your QR pass has been generated successfully.</p>

        <div class="confirmation-card">
            <p><b>Confirmation ID:</b></p>
            <h3>${data.confirmationId}</h3>
            <img class="confirmation-qr" src="${data.qrCode}" alt="Booking QR Code">
            <p class="muted">Please show this QR at the event entry gate.</p>
        </div>

        <div class="action-row vertical">
            <button onclick="downloadQr('${data.qrCode}', '${data.confirmationId}')">Download QR</button>
            <button type="button" class="secondary-btn" onclick="window.location.href='student.html'">Back to Dashboard</button>
        </div>
    `;
}

function downloadQr(dataUrl, confirmationId) {
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `${confirmationId}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}