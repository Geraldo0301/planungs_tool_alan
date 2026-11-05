import { time, timeStamp } from 'console';
import { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
    statusCode?: number;
}

/*
* * Centralized error-handling middleware. 
* Ensures that, in the event of any unexpected failure, the backend returns structured JSON 
* and does not reveal infrastructure details or cause the process to crash. 
*/

export const errorHandler = (
    err: AppError,
    _req: Request,
    res: Response,
    _next: NextFunction
) => {
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error in Backend';

    console.error(`[ERROR] Code ${message}: ${err.stack || message}`,);

    return res.status(statusCode).json({
        error: {
            message, statusCode, timeStamp: new Date().toISOString(),
        },
    });
}
export default errorHandler;