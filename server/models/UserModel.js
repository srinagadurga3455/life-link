import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  mobileNumber: {
    type: String,
    required: true,
  },
  sex: {
    type: String,
    default: '',
  },
  age: {
    type: String,
    default: '',
  },
  health: {
    type: String,
    default: '',
  },
  bloodGroup: {
    type: String,
    default: '',
  },
  address: {
    type: String,
    default: '',
  },
  address: {
    type: String,
    default: '',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  }
});

export default mongoose.model("User", UserSchema);
