"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function generateSessionId() {
    const str = Math.random()
        .toString(36)
        .substr(2, 9);
    const num = Math.floor(Math.random() * 10);
    return `${str}-${num}`;
}
exports.generateSessionId = generateSessionId;
;
