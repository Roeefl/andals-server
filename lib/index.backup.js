"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require('dotenv').config();
const cors = require('cors');
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path"));
const http_1 = require("http");
const colyseus_1 = require("colyseus");
const monitor_1 = require("@colyseus/monitor");
const BaseGame_1 = __importDefault(require("./src/rooms/BaseGame"));
const FirstMenGame_1 = __importDefault(require("./src/rooms/FirstMenGame"));
// import { RoomOptions } from './src/interfaces';
const port = Number(process.env.SERVER_PORT || 2568);
const app = express_1.default();
app.use(cors());
app.use(express_1.default.json());
const server = http_1.createServer(app);
const gameServer = new colyseus_1.Server({
    server
});
// Register ChatRoom with initial options, as "chat_with_options"
// onInit(options) will receive client join options + options registered here.
// const roomOptions: RoomOptions = {
//   roomTitle: "Test Game Room"
// };
gameServer.define('baseGame', BaseGame_1.default); // , roomOptions
gameServer.define('firstMen', FirstMenGame_1.default);
// router.use('/', express.static(path));
// const router = express.Router();
// const monitorPath = path.join(__dirname, '/');
// router.use('/', express.static(monitorPath));
// router.use('/api', API());
app.get('/', function (req, res) {
    res.sendFile(path_1.default.join(__dirname + '/index.html'));
});
/**
 * Register @colyseus/social routes
 *
 * - uncomment if you want to use default authentication (https://docs.colyseus.io/authentication/)
 * - also uncomment the import statement
 */
// app.use("/", socialRoutes);
// register colyseus monitor AFTER registering your room handlers
app.use('/colyseus', monitor_1.monitor());
gameServer.onShutdown(() => console.info('game server is going down.'));
gameServer.listen(port);
const serverUrl = process.env.SERVER_URL || 'ws://localhost';
console.info(`Server Started | ${serverUrl}:${port}`);
