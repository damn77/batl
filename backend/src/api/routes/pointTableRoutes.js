import express from 'express';
import {
    getAllPointTables,
    getPointTablesForRange,
    updatePointTable
} from '../pointTableController.js';
import { isAuthenticated } from '../../middleware/auth.js';
import { authorize } from '../../middleware/authorize.js';

const router = express.Router();

// All routes require ADMIN role (manage PointTable)
router.use(isAuthenticated);
router.use(authorize('manage', 'PointTable'));

router.get('/', getAllPointTables);
router.get('/:range', getPointTablesForRange);
router.put('/:id', updatePointTable);

export default router;
