import express from "express";
import {
  getEmergencyContacts,
  createEmergencyContacts,
  updateEmergencyContacts,
  addEmergencyContact,
  deleteEmergencyContact,
  deleteAllEmergencyContacts,
} from "../controllers/EmergencyController.js";

const router = express.Router();

router.get("/:userId", getEmergencyContacts);
router.post("/create", createEmergencyContacts);
router.put("/:userId", updateEmergencyContacts);
router.post("/:userId/add", addEmergencyContact);
router.delete("/:userId/:contactId", deleteEmergencyContact);
router.delete("/:userId", deleteAllEmergencyContacts);

export default router;
