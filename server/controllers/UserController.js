import User from "../models/UserModel.js";
import bcrypt from "bcryptjs";

// Get user by ID
export const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get all users
export const getUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password");
    res.status(200).json({
      success: true,
      data: users,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Sign up - Create new user
export const signup = async (req, res) => {
  try {
    console.log("User hitted signup button");
    const { username, email, password, mobileNumber, sex, age, health, bloodGroup, address } = req.body;

    // Validate required fields
    if (!username || !email || !password || !mobileNumber ) {
      return res.status(400).json({
        success: false,
        message: "All fields (username, email, password, mobileNumber) are required",
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }, { mobileNumber }],
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User with this email, username, or phone number already exists",
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new user
    const user = new User({
      username,
      email,
      password: hashedPassword,
      mobileNumber,
      sex:        sex        || '',
      age:        age        || '',
      health:     health     || '',
      bloodGroup: bloodGroup || '',
      address:    address    || '',
    });

    await user.save();

    res.status(201).json({
      success: true,
      message: "User created successfully",
      data: {
        id:         user._id,
        username:   user.username,
        email:      user.email,
        mobileNumber: user.mobileNumber,
        sex:        user.sex,
        age:        user.age,
        health:     user.health,
        bloodGroup: user.bloodGroup,
        address:    user.address,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Login user
export const login = async (req, res) => {
  try {
    const { mobileNumber, password } = req.body;

    // Validate required fields
    if (!mobileNumber || !password) {
      return res.status(400).json({
        success: false,
        message: "Phone number and password are required",
      });
    }

    // Find user by mobileNumber
    const user = await User.findOne({ mobileNumber });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid phone number or password",
      });
    }

    // Compare passwords
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid phone number or password",
      });
    }

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        id:           user._id,
        username:     user.username,
        email:        user.email,
        mobileNumber: user.mobileNumber,
        sex:          user.sex,
        age:          user.age,
        health:       user.health,
        bloodGroup:   user.bloodGroup,
        address:      user.address,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Update user
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { username, email, mobileNumber, sex, age, health, bloodGroup, address } = req.body;

    const user = await User.findByIdAndUpdate(
      id,
      {
        username,
        email,
        mobileNumber,
        sex:        sex        ?? undefined,
        age:        age        ?? undefined,
        health:     health     ?? undefined,
        bloodGroup: bloodGroup ?? undefined,
        address:    address    ?? undefined,
        updatedAt: Date.now(),
      },
      { new: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "User updated successfully",
      data: user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Change password
export const changePassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'currentPassword and newPassword are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters' });
    }

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) return res.status(401).json({ success: false, message: 'Current password is incorrect' });

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    user.updatedAt = Date.now();
    await user.save();

    res.status(200).json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete user
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByIdAndDelete(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
