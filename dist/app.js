"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// app.ts 
const Hapi = require('@hapi/hapi');
const dotenv_1 = __importDefault(require("dotenv"));
const mongodb_service_1 = require("./controllers/mongodb.service");
const authService_1 = require("./controllers/authService");
const bracketRoutes_1 = require("./routes/bracketRoutes");
dotenv_1.default.config();
const jwtSecret = process.env.JWT_SECRET;
const init = () => __awaiter(void 0, void 0, void 0, function* () {
    console.log('Initializing server...');
    const server = Hapi.server({
        port: 3000,
        host: '0.0.0.0',
        routes: {
            cors: {
                origin: ['http://localhost:4000'],
                credentials: true, // allow cookies / Authorization headers
                additionalHeaders: ['X-CSRFToken', 'Content-Type']
            },
        },
    });
    // 1. Connect to MongoDB once
    const dbService = mongodb_service_1.DatabaseService.getInstance();
    yield dbService.connect(); // This ensures `dbService.getDb()` is ready.
    yield server.register(require('@hapi/jwt'));
    server.auth.strategy('jwt', 'jwt', {
        keys: jwtSecret,
        verify: {
            aud: false,
            iss: false,
            sub: false,
            maxAgeSec: 14400, // Tokens expire in 4 hours
        },
        validate: authService_1.AuthService.validateToken
    });
    server.auth.default('jwt');
    // 3. Register routes
    server.route([...bracketRoutes_1.bracketRoutes]);
    yield server.start();
    console.log('Server running on %s', server.info.uri);
});
init().catch(err => {
    console.error('Failed to start the server:', err);
    process.exit(1);
});
process.on('unhandledRejection', (err) => {
    console.log(err);
    process.exit(1);
});
