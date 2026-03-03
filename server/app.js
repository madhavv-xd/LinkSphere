// app.js — LinkSphere Express Server Entry Point

const express = require("express");
const cors    = require("cors");
const userRoutes = require("./routes/userRoutes");

const app = express();

// ── Global Middleware ─────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json()); // parse JSON request bodies

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api/users", userRoutes);

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "LinkSphere server is running" });
});

// ── Start Server ──────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

module.exports = app;