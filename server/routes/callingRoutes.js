import express from "express";
import { initiateCall, getSessions } from "../agents/CallingController.js";
import { twimlAnswer, twimlRespond, twimlStatus } from "../agents/CallingController.js";

const router = express.Router();

// REST API
router.post("/call", initiateCall);
router.get("/sessions", getSessions);

export { twimlAnswer, twimlRespond, twimlStatus };
export default router;

