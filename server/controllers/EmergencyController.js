import Emergency from "../models/EmergencyModel.js";
import mongoose from "mongoose";

// Get all emergency contacts for a user
export const getEmergencyContacts = async (req, res) => {
  try {
    const { userId } = req.params;

    // Validate userId is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid userId format",
      });
    }

    const emergency = await Emergency.findOne({ userId }).populate("userId", "-password");

    if (!emergency) {
      return res.status(404).json({
        success: false,
        message: "No emergency contacts found for this user",
      });
    }

    res.status(200).json({
      success: true,
      data: emergency,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Create emergency contacts (initial setup)
export const createEmergencyContacts = async (req, res) => {
  try {
    const { userId, emergencyContacts } = req.body;

    // Validate required fields
    if (!userId || !emergencyContacts) {
      return res.status(400).json({
        success: false,
        message: "userId and emergencyContacts array are required",
      });
    }

    // Validate userId is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid userId format",
      });
    }

    if (!Array.isArray(emergencyContacts) || emergencyContacts.length === 0) {
      return res.status(400).json({
        success: false,
        message: "emergencyContacts must be a non-empty array",
      });
    }

    if (emergencyContacts.length > 3) {
      return res.status(400).json({
        success: false,
        message: "You can only add up to 3 emergency contacts",
      });
    }

    // Check if emergency contacts already exist for this user
    const existingEmergency = await Emergency.findOne({ userId });

    if (existingEmergency) {
      return res.status(400).json({
        success: false,
        message: "Emergency contacts already exist for this user. Use update to modify.",
      });
    }

    // Validate each contact
    for (let contact of emergencyContacts) {
      if (!contact.name || !contact.mobileNumber || !contact.relationship) {
        return res.status(400).json({
          success: false,
          message: "Each contact must have name, mobileNumber, and relationship",
        });
      }
    }

    // Create new emergency contacts
    const emergency = new Emergency({
      userId: new mongoose.Types.ObjectId(userId),
      emergencyContacts,
    });

    await emergency.save();

    res.status(201).json({
      success: true,
      message: "Emergency contacts created successfully",
      data: emergency,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Update emergency contacts
export const updateEmergencyContacts = async (req, res) => {
  try {
    const { userId } = req.params;
    const { emergencyContacts } = req.body;

    if (!emergencyContacts) {
      return res.status(400).json({
        success: false,
        message: "emergencyContacts array is required",
      });
    }

    if (!Array.isArray(emergencyContacts) || emergencyContacts.length === 0) {
      return res.status(400).json({
        success: false,
        message: "emergencyContacts must be a non-empty array",
      });
    }

    if (emergencyContacts.length > 3) {
      return res.status(400).json({
        success: false,
        message: "You can only have up to 3 emergency contacts",
      });
    }

    // Validate each contact
    for (let contact of emergencyContacts) {
      if (!contact.name || !contact.mobileNumber || !contact.relationship) {
        return res.status(400).json({
          success: false,
          message: "Each contact must have name, mobileNumber, and relationship",
        });
      }
    }

    const emergency = await Emergency.findOneAndUpdate(
      { userId },
      {
        emergencyContacts,
        updatedAt: Date.now(),
      },
      { new: true }
    );

    if (!emergency) {
      return res.status(404).json({
        success: false,
        message: "Emergency contacts not found for this user",
      });
    }

    res.status(200).json({
      success: true,
      message: "Emergency contacts updated successfully",
      data: emergency,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Add a single emergency contact
export const addEmergencyContact = async (req, res) => {
  try {
    const { userId } = req.params;
    const { name, mobileNumber, relationship } = req.body;

    if (!name || !mobileNumber || !relationship) {
      return res.status(400).json({
        success: false,
        message: "name, mobileNumber, and relationship are required",
      });
    }

    const emergency = await Emergency.findOne({ userId });

    if (!emergency) {
      return res.status(404).json({
        success: false,
        message: "Emergency contacts not found for this user",
      });
    }

    if (emergency.emergencyContacts.length >= 3) {
      return res.status(400).json({
        success: false,
        message: "Maximum 3 emergency contacts allowed",
      });
    }

    emergency.emergencyContacts.push({ name, mobileNumber, relationship });
    emergency.updatedAt = Date.now();

    await emergency.save();

    res.status(200).json({
      success: true,
      message: "Emergency contact added successfully",
      data: emergency,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Delete a specific emergency contact
export const deleteEmergencyContact = async (req, res) => {
  try {
    const { userId, contactId } = req.params;

    const emergency = await Emergency.findOne({ userId });

    if (!emergency) {
      return res.status(404).json({
        success: false,
        message: "Emergency contacts not found for this user",
      });
    }

    emergency.emergencyContacts = emergency.emergencyContacts.filter(
      (contact) => contact._id.toString() !== contactId
    );

    emergency.updatedAt = Date.now();

    await emergency.save();

    res.status(200).json({
      success: true,
      message: "Emergency contact deleted successfully",
      data: emergency,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Delete all emergency contacts for a user
export const deleteAllEmergencyContacts = async (req, res) => {
  try {
    const { userId } = req.params;

    const emergency = await Emergency.findOneAndDelete({ userId });

    if (!emergency) {
      return res.status(404).json({
        success: false,
        message: "Emergency contacts not found for this user",
      });
    }

    res.status(200).json({
      success: true,
      message: "All emergency contacts deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
