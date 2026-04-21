# Event-Booking-System

# 🎟️ Event Booking System

A full-stack web application that enables seamless event management, ticket booking, and real-time updates for both **Admins** and **Students**.

🚀 **Live Demo:** https://event-booking-system-otjq.onrender.com  

---

## 📌 Overview

The **Event Booking System** is designed to simplify event organization and participation. It allows administrators to create and manage events while enabling students to explore, book, and track their event participation.

The system ensures:
- Smooth ticket booking experience
- Real-time updates
- Secure authentication
- Smart event cancellation with notifications

---

## ✨ Key Features

### 👨‍💼 Admin Features
- Create, edit, and delete events
- Upload event posters
- Manage ticket availability
- Cancel events even after bookings
- QR-based check-in system
- View analytics (tickets sold, events, etc.)

---

### 🧑‍🎓 Student Features
- Browse upcoming events
- Filter/search events by category
- Book tickets (1 per user)
- View booking history
- QR code for event entry
- Real-time dashboard updates
- Automatic updates when event is cancelled

---

### 📧 Smart Notification System
- Email notifications sent when:
  - Event is cancelled
- Ensures users stay informed instantly

---

### 🔒 Authentication & Security
- JWT-based authentication
- Role-based access control (Admin / Student)
- Protected routes for secure operations

---

## 🏗️ Tech Stack

### 🔹 Frontend
- HTML5
- CSS3
- JavaScript (Vanilla JS)
- Responsive UI

### 🔹 Backend
- Node.js
- Express.js

### 🔹 Database
- MongoDB (Mongoose)

### 🔹 Other Tools
- Multer (file uploads)
- Nodemailer (email notifications)
- QRCode (ticket verification)
- JWT (authentication)

---

## 🧠 System Architecture
Frontend (HTML/CSS/JS)
↓
REST API (Express.js)
↓
MongoDB Database


---

## ⚙️ How It Works

### 1. Event Creation
Admin creates event → stored in database → displayed to students

### 2. Booking Flow
Student selects event → booking created → QR code generated

### 3. Event Cancellation
Admin cancels event →
- Event status updated
- Students notified via email
- Dashboard reflects cancellation

### 4. QR Check-in
Admin scans QR →
- Validates ticket
- Marks entry status

---
