import express from "express";
import { assistAfterSOS, getSosStatus, triggerSOSForUser } from "../controllers/SosController.js";

const router = express.Router();

router.post("/sos", triggerSOSForUser);
router.post("/sos/assist", assistAfterSOS);
router.get("/sos/status/:sessionId", getSosStatus);

export default router;
