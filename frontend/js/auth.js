const BASE = "/api";

function showToast(message, type = "success") {
    const toastBox = document.getElementById("toastBox");
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.innerText = message;
    toastBox.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function toggleForgotPassword() {
    const section = document.getElementById("forgotPasswordSection");
    section.style.display = section.style.display === "none" ? "block" : "none";
}

async function register() {
    const name = document.getElementById("name")?.value.trim();
    const email = document.getElementById("email")?.value.trim().toLowerCase();
    const password = document.getElementById("password")?.value;

    if (!name || !email || !password) {
        showToast("Please fill all fields.", "error");
        return;
    }

    if (!email.endsWith("@msrit.edu")) {
        showToast("Only @msrit.edu email addresses are allowed.", "error");
        return;
    }

    if (password.length < 6) {
        showToast("Password must be at least 6 characters.", "error");
        return;
    }

    try {
        const res = await fetch(`${BASE}/auth/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, email, password })
        });

        const data = await res.json();

        if (!res.ok) {
            showToast(data.message || "Registration failed.", "error");
            return;
        }

        showToast("Registration successful.");
        setTimeout(() => {
            window.location.href = "index.html";
        }, 1200);
    } catch (err) {
        console.error("Register error:", err);
        showToast("Server not reachable.", "error");
    }
}

async function login() {
    const email = document.getElementById("email")?.value.trim().toLowerCase();
    const password = document.getElementById("password")?.value;

    if (!email || !password) {
        showToast("Please enter email and password.", "error");
        return;
    }

    try {
        const res = await fetch(`${BASE}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });

        const data = await res.json();

        if (!res.ok) {
            showToast(data.message || "Login failed.", "error");
            return;
        }

        localStorage.setItem("token", data.token);
        localStorage.setItem("role", data.role);

        showToast("Login successful.");

        setTimeout(() => {
            if (data.role === "Admin") {
                window.location.href = "admin.html";
            } else {
                window.location.href = "student.html";
            }
        }, 800);
    } catch (err) {
        console.error("Login error:", err);
        showToast("Server not reachable.", "error");
    }
}

async function sendOtp() {
    const email = document.getElementById("forgotEmail").value.trim().toLowerCase();

    if (!email) {
        showToast("Please enter your registered email.", "error");
        return;
    }

    try {
        const res = await fetch(`${BASE}/auth/forgot-password`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email })
        });

        const data = await res.json();

        if (!res.ok) {
            showToast(data.message || "Failed to send OTP.", "error");
            return;
        }

        showToast(data.message || "OTP sent successfully.");
    } catch (err) {
        console.error("Send OTP error:", err);
        showToast("Server not reachable.", "error");
    }
}

async function verifyOtp() {
    const email = document.getElementById("forgotEmail").value.trim().toLowerCase();
    const otp = document.getElementById("otp").value.trim();

    if (!email || !otp) {
        showToast("Please enter email and OTP.", "error");
        return;
    }

    try {
        const res = await fetch(`${BASE}/auth/verify-otp`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, otp })
        });

        const data = await res.json();

        if (!res.ok) {
            showToast(data.message || "OTP verification failed.", "error");
            return;
        }

        showToast(data.message || "OTP verified.");
    } catch (err) {
        console.error("Verify OTP error:", err);
        showToast("Server not reachable.", "error");
    }
}

async function resetPassword() {
    const email = document.getElementById("forgotEmail").value.trim().toLowerCase();
    const otp = document.getElementById("otp").value.trim();
    const newPassword = document.getElementById("newPassword").value;

    if (!email || !otp || !newPassword) {
        showToast("Please fill email, OTP and new password.", "error");
        return;
    }

    try {
        const res = await fetch(`${BASE}/auth/reset-password`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, otp, newPassword })
        });

        const data = await res.json();

        if (!res.ok) {
            showToast(data.message || "Password reset failed.", "error");
            return;
        }

        showToast(data.message || "Password reset successful.");
        setTimeout(() => {
            window.location.href = "index.html";
        }, 1200);
    } catch (err) {
        console.error("Reset password error:", err);
        showToast("Server not reachable.", "error");
    }
}

function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("eventId");
    localStorage.removeItem("eventName");
    window.location.href = "index.html";
}