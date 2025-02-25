//src/controllers/authServices.ts
const Bcrypt = require('bcrypt');
import Jwt from '@hapi/jwt';
import dotenv from 'dotenv';

import { Bracket } from '../models/bracket'; // Assuming you have a User type
import { Request, ResponseToolkit } from '@hapi/hapi';
import { DatabaseService } from './mongodb.service'; 
import { Db, ObjectId } from 'mongodb';
import { BracketService } from './bracketService';

dotenv.config();
const jwtSecret = process.env.JWT_SECRET || ""

export class AuthService {
  public static async validateToken(decoded: any, request: Request, h: ResponseToolkit) {
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
      return { isValid: true, credentials: {userId: id} };
    } catch (error) {
      console.error('Error validating token or fetching user:', error);
      return { isValid: false };
    }
  }
}