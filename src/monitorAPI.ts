// import express from 'express';

// const UNAVAILABLE_ROOM_ERROR = "@colyseus/monitor: room $roomId is not available anymore.";

// export function getAPI() {
//     const api = express.Router();

//     api.get("/room", async (req: express.Request, res: express.Response) => {
//         const roomId = req.query.roomId;
//         try {
//             const inspectData = await matchMaker.remoteRoomCall(roomId, "getInspectData");
//             res.json(inspectData);
//         } catch (e) {
//             const message = UNAVAILABLE_ROOM_ERROR.replace("$roomId", roomId);
//             console.error(message);
//             res.status(500);
//             res.json({ message });
//         }
//     });

//     api.get("/room/call", async (req: express.Request, res: express.Response) => {
//         const roomId = req.query.roomId;
//         const method = req.query.method;
//         const args = JSON.parse(req.query.args);

//         try {
//             const data = await matchMaker.remoteRoomCall(roomId, method, args);
//             res.json(data);
//         } catch (e) {
//             const message = UNAVAILABLE_ROOM_ERROR.replace("$roomId", roomId);
//             console.error(message);
//             res.status(500);
//             res.json({ message });
//         }
//     });

//     return api;
// }