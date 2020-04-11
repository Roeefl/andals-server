import express from 'express';
import { matchMaker } from 'colyseus';

const ERROR_ROOM_UNAVAILABLE = '@colyseus/monitor: Room is not available anymore';

const monitorColumns = [
  'roomId',
  'name',
  'clients',
  'maxClients',
  'locked',
  'elapsedTime'
];

export function API () {
  const api = express.Router();

  api.get('/rooms', async (req: express.Request, res: express.Response) => {
    try {
      const rooms: any[] = await matchMaker.query({});
      let connections: number = 0;

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
    } catch (err) {
      const { message } = err;
      console.error(message);
      
      res.status(500);
      res.json({ message });
    }
  });

  // api.post('/rooms')
  // api.put('/rooms)
  // api.delete('/rooms')

  api.get('/room', async (req: express.Request, res: express.Response) => {
    const { roomId } = req.query;

    try {
      const inspectData = await matchMaker.remoteRoomCall(roomId, 'getInspectData');
      res.json(inspectData);
    } catch (e) {
      const message = `${ERROR_ROOM_UNAVAILABLE}: ${roomId}`;
      console.error(message);
      
      res.status(500);
      res.json({ message });
    }
  });

  // api.post('/room')
  // api.put('/room')
  // api.delete('/room')

  api.get('/room/call', async (req: express.Request, res: express.Response) => {
    const { roomId, method } = req.query;
    const args = JSON.parse(req.query.args);

    try {
        const data = await matchMaker.remoteRoomCall(roomId, method, args);
        res.json(data);
    } catch (e) {
      const message = `${ERROR_ROOM_UNAVAILABLE}: ${roomId}`;
      console.error(message);

      res.status(500);
      res.json({ message });
    }
  });

  return api;
}