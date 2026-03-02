const express = require('express');
const {
  createContact,
  getContacts,
  updateContact,
  deleteContact,
} = require('../controllers/contactController');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// POST /api/contacts
router.post('/', verifyToken, createContact);

// GET /api/contacts
router.get('/', verifyToken, getContacts);

// PUT /api/contacts/:id
router.put('/:id', verifyToken, updateContact);

// DELETE /api/contacts/:id
router.delete('/:id', verifyToken, deleteContact);

module.exports = router;
