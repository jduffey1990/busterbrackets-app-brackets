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
exports.breakdownRoutes = void 0;
const breakdownService_1 = require("../controllers/breakdownService");
exports.breakdownRoutes = [
    {
        // Authenticated by default (jwt). The server owns the whole flow:
        // load bracket + tournament data, compare, prompt, and call OpenAI.
        method: 'GET',
        path: '/breakdown',
        handler: (request, h) => __awaiter(void 0, void 0, void 0, function* () {
            var _a;
            const id = request.query.id;
            if (!id) {
                return h.response({ error: 'Bracket id is required' }).code(400);
            }
            try {
                const result = yield breakdownService_1.BreakdownService.buildBreakdown(id);
                if (!result) {
                    return h.response({ error: `No bracket found for id ${id}` }).code(404);
                }
                return result;
            }
            catch (err) {
                console.error('Breakdown generation failed:', (_a = err === null || err === void 0 ? void 0 : err.message) !== null && _a !== void 0 ? _a : err);
                return h.response({ error: 'Failed to generate breakdown' }).code(502);
            }
        }),
    },
];
