import { matchMaker } from 'colyseus';
import osUtils from 'node-os-utils';
import express, { Application } from 'express';
import buildingCosts from './specs/buildingCosts';
import { clansManifest } from './specs/wildlings';

const DEFAULT_COLUMNS: string[] = [
  'roomId',
  'processId',
  'name',
  'roomTitle',
  'clients',
  'maxClients',
  'locked',
  'private',
  'createdAt',
  'elapsedTime',
];

export function setApiRoutes(app: Application) {
  // const api = express.Router();

  function onError(res: express.Response, err: any) {
    const { message } = err;
    console.error(message);
    
    res.status(500);
    res.json({ message });
  }

  app.get('/api', async (req: express.Request, res: express.Response) => {
    try {
      const rooms: any[] = await matchMaker.query({});
      let connections: number = 0;

      res.json({
        columns: DEFAULT_COLUMNS,
        rooms: rooms.map(room => {
          const roomData = room.toJSON();

          connections += room.clients;

          roomData.locked = room.locked || false;
          roomData.private = room.private;
          roomData.maxClients = `${room.maxClients}`;
          roomData.elapsedTime = Date.now() - new Date(room.createdAt).getTime();
          roomData.roomTitle = (room.metadata || {}).roomTitle;

          return roomData;
        }),
        connections,
        cpu: await osUtils.cpu.usage(),
        memory: await osUtils.mem.used()
      });
    } catch (err) {
      onError(res, err);
    }
  });

  app.get('/api/buildingCosts', async (req: express.Request, res: express.Response) => {
    try {
      res.json({ buildingCosts }); 
    } catch (err) {
      onError(res, err);
    }
  });

  app.get('/api/clans', async (req: express.Request, res: express.Response) => {
    try {
      res.json({ clans: clansManifest }); 
    } catch (err) {
      onError(res, err);
    }
  });

  // return api;
};
