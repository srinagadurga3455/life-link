import express from "express";
import { chat, speak, speechHealth, speechToken, transcribe, ttsStream } from "../agents/ChatController.js";

const router = express.Router();

router.post("/chat", chat);
router.post("/speak", speak);
router.post("/transcribe", transcribe);
router.get("/tts", ttsStream);
router.get("/speech-token", speechToken);
router.get("/speech-health", speechHealth);

export default router;
