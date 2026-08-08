import express from "express";
import { sendMessage, sendBulk, getMessageStatus } from "../agents/MessagingController.js";

const router = express.Router();

router.post("/message", sendMessage);
router.post("/message/bulk", sendBulk);
router.get("/message/status/:sid", getMessageStatus);

export default router;
