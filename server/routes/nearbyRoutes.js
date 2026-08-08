import express from 'express';
import { getNearby } from '../agents/NearbyController.js';

const router = express.Router();

// GET /api/nearby?lat=&lng=&category=&specialty=
router.get('/nearby', getNearby);

export default router;
