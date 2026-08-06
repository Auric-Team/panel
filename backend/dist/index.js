"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const sqlite_1 = require("./db/sqlite");
const routes_1 = __importDefault(require("./routes"));
const errorHandler_1 = require("./middlewares/errorHandler");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const app = (0, express_1.default)();
app.set('trust proxy', true);
app.use((0, cors_1.default)({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.options('*', (0, cors_1.default)());
app.use(express_1.default.json({ limit: '15mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '15mb' }));
const uploadsDir = path_1.default.resolve(process.cwd(), 'uploads');
if (!fs_1.default.existsSync(uploadsDir)) {
    fs_1.default.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express_1.default.static(uploadsDir));
// Root status endpoint
app.get('/', (req, res) => {
    res.json({
        status: 'online',
        message: 'AXIOS Executive Control Server Running',
        version: '2.0.0',
        timestamp: new Date().toISOString(),
        endpoints: {
            health: '/api/stats',
            verifyKey: '/api/verify',
            auth: '/api/auth/login',
            keys: '/api/keys',
            users: '/api/users'
        }
    });
});
// API Routes
app.use('/api', routes_1.default);
// Global Error Handler
app.use(errorHandler_1.errorHandler);
const PORT = process.env.PORT || 20067;
async function startServer() {
    await (0, sqlite_1.initDb)();
    app.listen(PORT, () => {
        console.log(`[Axios Backend] Express & SQLite server running on http://0.0.0.0:${PORT}`);
    });
}
startServer();
