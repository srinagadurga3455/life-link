const express = require('express');
const {
  triggerEmergency,
  getEmergencyHistory,
  updateEmergencyStatus,
} = require('../controllers/emergencyController');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// POST /api/emergency/trigger
router.post('/trigger', verifyToken, triggerEmergency);

// GET /api/emergency/history
router.get('/history', verifyToken, getEmergencyHistory);

// PUT /api/emergency/status/:id
router.put('/status/:id', verifyToken, updateEmergencyStatus);

module.exports = router;
