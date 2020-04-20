import express from 'express';
import { matchMaker } from 'colyseus';
import buildingCosts from './specs/buildingCosts';

const ERROR_ROOM_UNAVAILABLE = '@colyseus/monitor: Room is not available anymore';

const monitorColumns = [
  'roomId',
  'name',
  'clients',
  'maxClients',
  'locked',
  'elapsedTime'
];

export function API() {
  const api = express.Router();

  api.get('/buildingCosts', async (req: express.Request, res: express.Response) => {
    try {
      res.json({ buildingCosts }); 
    } catch (err) {
      const { message } = err;
      console.error(message);
      
      res.status(500);
      res.json({ message });
    }
  });

  // api.get('/rooms', async (req: express.Request, res: express.Response) => {
  //   try {
  //     const rooms: any[] = await matchMaker.query({});
  //     let connections: number = 0;

  //     res.json({
  //       monitorColumns,
  //       rooms: rooms.map(room => {
  //         const data = room.toJSON();

  //         connections += room.clients;

  //         // additional data
  //         data.locked = room.locked || false;
  //         data.private = room.private;

  //         data.maxClients = `${room.maxClients}`;

  //         data.elapsedTime = Date.now() - new Date(room.createdAt).getTime();
  //         return data;
  //       }),
  //         totalPlayers: connections
  //         // cpu: await osUtils.cpu.usage(),
  //         // memory: await osUtils.mem.used()
  //     });
  //   } catch (err) {
  //     const { message } = err;
  //     console.error(message);
      
  //     res.status(500);
  //     res.json({ message });
  //   }
  // });

  // api.post('/rooms')
  // api.put('/rooms)
  // api.delete('/rooms')

  // api.get('/room', async (req: express.Request, res: express.Response) => {
  //   const { roomId } = req.query;
  //   const stringifiedRoomId = String(roomId);

  //   try {
  //     const inspectData = await matchMaker.remoteRoomCall(stringifiedRoomId, 'getInspectData');
  //     res.json(inspectData);
  //   } catch (e) {
  //     const message = `${ERROR_ROOM_UNAVAILABLE}: ${stringifiedRoomId}`;
  //     console.error(message);
      
  //     res.status(500);
  //     res.json({ message });
  //   }
  // });

  // api.post('/room')
  // api.put('/room')
  // api.delete('/room')
  return api;
}