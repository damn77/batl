import * as pointTableService from '../services/pointTableService.js';
import { validatePointTableUpdate } from './validators/pointTableValidators.js';

export async function getAllPointTables(req, res, next) {
    try {
        const tables = await pointTableService.getAllPointTables();
        res.json(tables);
    } catch (error) {
        next(error);
    }
}

export async function getPointTablesForRange(req, res, next) {
    try {
        const { range } = req.params;
        const table = pointTableService.getPointTableForRange(range);
        res.json(table);
    } catch (error) {
        next(error);
    }
}

export async function updatePointTable(req, res, next) {
    try {
        const { id } = req.params;
        const validatedData = validatePointTableUpdate(req.body);
        const updated = await pointTableService.updatePointTableValue(id, validatedData.points);
        res.json(updated);
    } catch (error) {
        next(error);
    }
}
