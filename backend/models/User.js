const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: {
      type: String,
      required: true,
      unique: true,
      match: /^[a-zA-Z0-9._%+-]+@msrit\.edu$/
    },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ["Admin", "Student"],
      default: "Student"
    },
    resetOtp: { type: String, default: null },
    resetOtpExpiry: { type: Date, default: null }
  },
  { timestamps: true }
);

userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 12);
});

module.exports = mongoose.model("User", userSchema);