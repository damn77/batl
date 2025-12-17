import Joi from 'joi';

export const updatePointTableSchema = Joi.object({
    points: Joi.number().integer().min(0).required()
});

export function validatePointTableUpdate(data) {
    const { error, value } = updatePointTableSchema.validate(data);
    if (error) {
        const validationError = new Error(`Validation error: ${error.details[0].message}`);
        validationError.statusCode = 400;
        throw validationError;
    }
    return value;
}
