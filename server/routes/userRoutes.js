import express from "express";
import { getUsers, getUserById, signup, login, updateUser, deleteUser, changePassword } from "../controllers/UserController.js";

const router = express.Router();

router.get('/', getUsers);
router.post('/signup', signup);
router.post('/login', login);
router.get('/:id', getUserById);
router.put('/:id', updateUser);
router.put('/:id/change-password', changePassword);
router.delete('/:id', deleteUser);

export default router;
