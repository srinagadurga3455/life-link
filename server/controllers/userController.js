const User = require('../models/User');

// Get user profile
const getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      user: {
        id: user._id,
        name: user.name,
        phone: user.phone,
        sex: user.sex,
        age: user.age,
        healthCondition: user.healthCondition,
        bloodGroup: user.bloodGroup,
        fallDetectionEnabled: user.fallDetectionEnabled,
        pushNotificationsEnabled: user.pushNotificationsEnabled,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Update user profile
const updateProfile = async (req, res, next) => {
  try {
    const { name, sex, age, healthCondition, bloodGroup, fallDetectionEnabled, pushNotificationsEnabled } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user.userId,
      {
        name,
        sex,
        age,
        healthCondition,
        bloodGroup,
        fallDetectionEnabled,
        pushNotificationsEnabled,
      },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        name: user.name,
        phone: user.phone,
        sex: user.sex,
        age: user.age,
        healthCondition: user.healthCondition,
        bloodGroup: user.bloodGroup,
        fallDetectionEnabled: user.fallDetectionEnabled,
        pushNotificationsEnabled: user.pushNotificationsEnabled,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProfile,
  updateProfile,
};
