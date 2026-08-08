import "dotenv/config";

import express from "express";
import mongoose from "mongoose";

//corss-origin resource sharing
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

import chatRoutes from "./routes/chatRoutes.js";
import callingRoutes, { twimlAnswer, twimlRespond, twimlStatus } from "./routes/callingRoutes.js";
import messagingRoutes from "./routes/messagingRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import emergencyRoutes from "./routes/emergencyRoutes.js";
import sosRoutes from "./routes/sosRoutes.js";
import nearbyRoutes from "./routes/nearbyRoutes.js";
import healthRoutes from "./routes/healthRoutes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true })); // required for Twilio webhooks
app.use(express.static(__dirname));

// ── Health check ─────────────────────────────────────────────────────────────
app.get("/health", (req, res) => {
  res.json({
    status:  "ok",
    service: "LifeLink Emergency Server",
    time:    new Date().toISOString(),
    uptime:  process.uptime(),
  });
});

// ── API routes ────────────────────────────────────────────────────────────────
app.use("/api", chatRoutes);
app.use("/api", callingRoutes);
app.use("/api", messagingRoutes);
app.use("/api/users", userRoutes);
app.use("/api/emergency", emergencyRoutes);
app.use("/api", sosRoutes);
app.use("/api", nearbyRoutes);
app.use("/api/health", healthRoutes);


// ── Twilio TwiML webhook routes ───────────────────────────────────────────────
app.get( "/twiml/answer",  twimlAnswer);
app.post("/twiml/respond", twimlRespond);
app.post("/twiml/status",  twimlStatus);

// ── Serve main UI ─────────────────────────────────────────────────────────────
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "main.html"));
});

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/users", {
  retryWrites: true,
  w: "majority",
  family: 4,
})
  .then(() => {
    console.log("✅ MongoDB Connected");
    const server = app.listen(PORT, () => {
      console.log(`\n🚨 LifeLink — Unified Emergency Server`);
      console.log(`   http://localhost:${PORT}`);
      console.log(`   Health check  : http://localhost:${PORT}/health`);
      console.log(`   Azure Region  : ${process.env.AZURE_SPEECH_REGION}`);
      console.log(`   PUBLIC_URL    : ${process.env.PUBLIC_URL || "⚠ NOT SET — run ngrok"}`);
      console.log(`   Twilio From   : ${process.env.TWILIO_PHONE_NUMBER || "⚠ NOT SET"}`);
      console.log(`   Model         : openai/gpt-4o-mini (GitHub AI)`);
      console.log(`   Google Maps   : ${process.env.GOOGLE_MAPS_KEY ? '✅ configured' : '⚠ NOT SET — static fallback used'}\n`);
    });

    server.on("error", (err) => {
      if (err.code === "EADDRINUSE") {
        console.error(`❌ Port ${PORT} is already in use. Kill the process or use a different PORT in .env`);
      } else {
        console.error("❌ Server error:", err.message);
      }
      process.exit(1);
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB Connection Error:", err.message);
    process.exit(1);
  });
