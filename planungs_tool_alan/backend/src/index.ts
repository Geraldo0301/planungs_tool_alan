import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import materialsRouter from './routes/materials';
import { errorHandler } from './middleware/errorHandler'
import { timeStamp } from 'console';

const app: Application = express();
const PORT = process.env.PORT || 5000;

/**
  * Security Middleware Configuration 
  * Restricts CORS access exclusively to Vite client origins and enforces JSON body parsing.
 */

app.use(cors({
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));
/**
 * Request Logger Middleware
 * Logs incoming HTTP requests with ISO timestamp for server-side debugging.
 */

app.use((req: Request, _res: Response, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

/**
 * Domain API routes
 */
app.use('/api/materials', materialsRouter);

/**
 * Health-check Endpoint
 * Validates active backend execution status for monitoring layers
 */
app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
        status: 'OK',
        service: 'HORSCH API',
        plant: 'Werk 3000 Schwandorf',
        timestamp: new Date().toISOString(),
    });
});

/**
 * Root Informational Endpoint
 * Returns basic API metadata when accessing the root URL directly
 * (MUST BE MOUNTED BEFORE THE 404 HANDLER)
 */

app.get('/', (_req: Request, res: Response) => {
    res.json({
        system: 'HORSCH TOOL',
        status: 'Running',
        endpoints: {
            health: '/api/health',
            materials: '/api/materials',
        },
    });
});

/**
 * Centralized Error Middleware
 * Catches thrown errors across all controllers. Must be the final app.use module
 */
app.use(errorHandler);

app.listen(PORT, () => {
    console.log(`================================================`); 
    console.log(`  HORSCH TOOL Backend running`); 
    console.log(`  URL: http://localhost:${PORT}`); 
    console.log(`================================================`);
});