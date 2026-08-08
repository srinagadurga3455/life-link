import express from "express";
import {
  symptomCheck,
  findDoctors,
  bookAppointment,
  scanMedicine,
  addReminder,
  getReminders,
  deleteReminder,
} from "../controllers/HealthController.js";

const router = express.Router();

// Feature 1 — Symptom Checker
router.post("/symptom-check", symptomCheck);

// Feature 2 — Doctor Booking
router.post("/find-doctors", findDoctors);
router.post("/book-appointment", bookAppointment);

// Feature 3 — Medicine Scanner
router.post("/scan-medicine", scanMedicine);

// Feature 4 — Pill Reminders
router.post("/reminders", addReminder);
router.get("/reminders/:userId", getReminders);
router.delete("/reminders/:reminderId", deleteReminder);

export default router;
