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
exports.AuthService = void 0;
//src/controllers/authServices.ts
const Bcrypt = require('bcrypt');
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const jwtSecret = process.env.JWT_SECRET || "";
class AuthService {
    static validateToken(decoded, request, h) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // 1. Check if JWT payload has the user ID
                const { id } = decoded.decoded.payload;
                if (!id) {
                    return { isValid: false };
                }
                // // 2. (Optional) Make an HTTP request to the "users" microservice
                // //    to confirm this user still exists or get user info.
                // //
                // //    The endpoint might be something like GET /users/:id
                // //    Adjust the URL + path to match your "users" API.
                // //
                // //    Also consider whether you need to handle 404 or 403 specifically.
                // const userServiceUrl = process.env.USER_SERVICE_URL || 'http://localhost:3001';
                // const response = await axios.get(`${userServiceUrl}/users/${id}`);
                // if (response.status !== 200) {
                //   // E.g., user was not found, or got an error from the users service.
                //   return { isValid: false };
                // }
                // // 3. If the users service returned a valid user object, store it in `credentials`.
                // const user = response.data;
                // 4. Return isValid: true along with the user as credentials
                return { isValid: true, credentials: { userId: id } };
            }
            catch (error) {
                console.error('Error validating token or fetching user:', error);
                return { isValid: false };
            }
        });
    }
}
exports.AuthService = AuthService;
