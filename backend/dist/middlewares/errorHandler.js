"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const errors_1 = require("../utils/errors");
const errorHandler = (err, req, res, next) => {
    console.error(err);
    if (err instanceof errors_1.AppError) {
        return res.status(err.statusCode).json({
            success: false,
            error: err.message
        });
    }
    return res.status(500).json({
        success: false,
        error: 'Internal Server Error'
    });
};
exports.errorHandler = errorHandler;
