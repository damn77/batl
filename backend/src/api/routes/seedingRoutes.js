import express from 'express';
import { getSeedingScore, bulkCalculateSeedingScores } from '../seedingController.js';

const router = express.Router();

router.get('/:entityType/:entityId/category/:categoryId', getSeedingScore);
router.post('/bulk', bulkCalculateSeedingScores);

export default router;
