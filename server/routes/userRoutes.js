const express = require('express');
const { getProfile, updateProfile } = require('../controllers/userController');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// GET /api/user/profile
router.get('/profile', verifyToken, getProfile);

// PUT /api/user/profile
router.put('/profile', verifyToken, updateProfile);

module.exports = router;
