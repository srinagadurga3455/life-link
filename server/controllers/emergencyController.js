const EmergencyEvent = require('../models/EmergencyEvent');
const EmergencyContact = require('../models/EmergencyContact');
const User = require('../models/User');
const { sendSMS } = require('../utils/sms');

// Trigger emergency event
const triggerEmergency = async (req, res, next) => {
  try {
    const { type, latitude, longitude } = req.body;

    if (!type || typeof latitude !== 'number' || typeof longitude !== 'number') {
      return res.status(400).json({ error: 'Type, latitude, and longitude are required' });
    }

    if (!['manual', 'fall'].includes(type)) {
      return res.status(400).json({ error: 'Type must be "manual" or "fall"' });
    }

    // Create emergency event
    const emergencyEvent = new EmergencyEvent({
      userId: req.user.userId,
      type,
      location: {
        latitude,
        longitude,
      },
      status: 'active',
    });

    await emergencyEvent.save();

    // Get user and emergency contacts
    const user = await User.findById(req.user.userId);
    const contacts = await EmergencyContact.find({ userId: req.user.userId }).sort({ priority: 1 });

    // Send SMS to emergency contacts (mock)
    const locationUrl = `https://maps.google.com/?q=${latitude},${longitude}`;
    const message = `EMERGENCY ALERT from ${user.name}! Type: ${type}. Location: ${locationUrl}. Please respond immediately. - Smart SOS+`;

    for (const contact of contacts) {
      await sendSMS(contact.phone, message);
    }

    res.status(201).json({
      message: 'Emergency triggered successfully',
      emergencyEvent,
      notifiedContacts: contacts.length,
    });
  } catch (error) {
    next(error);
  }
};

// Get emergency history
const getEmergencyHistory = async (req, res, next) => {
  try {
    const events = await EmergencyEvent.find({ userId: req.user.userId })
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({
      events,
    });
  } catch (error) {
    next(error);
  }
};

// Update emergency status
const updateEmergencyStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['active', 'resolved', 'cancelled'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const emergencyEvent = await EmergencyEvent.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!emergencyEvent) {
      return res.status(404).json({ error: 'Emergency event not found' });
    }

    res.json({
      message: 'Emergency status updated successfully',
      emergencyEvent,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  triggerEmergency,
  getEmergencyHistory,
  updateEmergencyStatus,
};
