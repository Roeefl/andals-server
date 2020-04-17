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
const express_1 = __importDefault(require("express"));
const colyseus_1 = require("colyseus");
const ERROR_ROOM_UNAVAILABLE = '@colyseus/monitor: Room is not available anymore';
const monitorColumns = [
    'roomId',
    'name',
    'clients',
    'maxClients',
    'locked',
    'elapsedTime'
];
function API() {
    const api = express_1.default.Router();
    api.get('/rooms', (req, res) => __awaiter(this, void 0, void 0, function* () {
        try {
            const rooms = yield colyseus_1.matchMaker.query({});
            let connections = 0;
            res.json({
                monitorColumns,
                rooms: rooms.map(room => {
                    const data = room.toJSON();
                    connections += room.clients;
                    // additional data
                    data.locked = room.locked || false;
                    data.private = room.private;
                    data.maxClients = `${room.maxClients}`;
                    data.elapsedTime = Date.now() - new Date(room.createdAt).getTime();
                    return data;
                }),
                totalPlayers: connections
                // cpu: await osUtils.cpu.usage(),
                // memory: await osUtils.mem.used()
            });
        }
        catch (err) {
            const { message } = err;
            console.error(message);
            res.status(500);
            res.json({ message });
        }
    }));
    // api.post('/rooms')
    // api.put('/rooms)
    // api.delete('/rooms')
    api.get('/room', (req, res) => __awaiter(this, void 0, void 0, function* () {
        const { roomId } = req.query;
        const stringifiedRoomId = String(roomId);
        try {
            const inspectData = yield colyseus_1.matchMaker.remoteRoomCall(stringifiedRoomId, 'getInspectData');
            res.json(inspectData);
        }
        catch (e) {
            const message = `${ERROR_ROOM_UNAVAILABLE}: ${stringifiedRoomId}`;
            console.error(message);
            res.status(500);
            res.json({ message });
        }
    }));
    // api.post('/room')
    // api.put('/room')
    // api.delete('/room')
    return api;
}
exports.API = API;
