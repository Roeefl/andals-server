"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path"));
const http_1 = require("http");
const colyseus_1 = require("colyseus");
const BaseGame_1 = __importDefault(require("./src/rooms/BaseGame"));
const port = 1337;
const app = express_1.default();
app.use(express_1.default.json());
app.get('/', function (req, res) {
    res.sendFile(path_1.default.join(__dirname + '/index.html'));
});
const server = http_1.createServer(app);
const gameServer = new colyseus_1.Server({
    server
});
gameServer.define('baseGame', BaseGame_1.default);
gameServer.onShutdown(() => {
    console.info('game server is going down.');
});
gameServer.listen(port);
console.info('Server Started.');
