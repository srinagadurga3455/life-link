const EmergencyContact = require('../models/EmergencyContact');

// Create emergency contact
const createContact = async (req, res, next) => {
  try {
    const { name, phone, priority, tag } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ error: 'Name and phone are required' });
    }

    const contact = new EmergencyContact({
      userId: req.user.userId,
      name,
      phone,
      priority: priority || 1,
      tag: tag || 'Secondary',
    });

    await contact.save();

    res.status(201).json({
      message: 'Contact created successfully',
      contact,
    });
  } catch (error) {
    next(error);
  }
};

// Get all contacts for user
const getContacts = async (req, res, next) => {
  try {
    const contacts = await EmergencyContact.find({ userId: req.user.userId }).sort({ priority: 1 });

    res.json({
      contacts,
    });
  } catch (error) {
    next(error);
  }
};

// Update contact
const updateContact = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, phone, priority, tag } = req.body;

    const contact = await EmergencyContact.findByIdAndUpdate(
      id,
      { name, phone, priority, tag },
      { new: true, runValidators: true }
    );

    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    res.json({
      message: 'Contact updated successfully',
      contact,
    });
  } catch (error) {
    next(error);
  }
};

// Delete contact
const deleteContact = async (req, res, next) => {
  try {
    const { id } = req.params;

    const contact = await EmergencyContact.findByIdAndDelete(id);

    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    res.json({
      message: 'Contact deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createContact,
  getContacts,
  updateContact,
  deleteContact,
};
