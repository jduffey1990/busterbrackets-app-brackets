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
Object.defineProperty(exports, "__esModule", { value: true });
exports.newsRoutes = void 0;
const newsService_1 = require("../controllers/newsService");
exports.newsRoutes = [
    {
        method: 'GET',
        path: '/news',
        handler: (request, h) => __awaiter(void 0, void 0, void 0, function* () {
            try {
                return yield newsService_1.NewsService.getLatest();
            }
            catch (error) {
                console.error('Failed to fetch news:', error);
                return h.response({ error: 'News is unavailable right now' }).code(502);
            }
        }),
    },
];
