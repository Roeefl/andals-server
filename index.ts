const cors = require('cors');

import express, { Application, Request, Response, Router } from 'express';
import path from 'path';
import { createServer } from 'http';
import { Server } from 'colyseus';
import BaseGame from './src/rooms/BaseGame';
import FirstMenGame from './src/rooms/FirstMenGame';
import { ROOM_TYPE_BASE_GAME, ROOM_TYPE_FIRST_MEN } from './src/specs/roomTypes';
import { setApiRoutes } from './src/api';

const port = 1337;

const app: Application = express();
app.use(express.json());
app.use(cors());

const router: Router = express.Router();
// router.use('/api', getAPI());

app.get('/', function(req: Request, res: Response) {
  res.sendFile(path.join(__dirname + '/index.html'));
});

setApiRoutes(app);

const server = createServer(app);
const gameServer = new Server({
  server
});

gameServer.define(ROOM_TYPE_BASE_GAME, BaseGame);
gameServer.define(ROOM_TYPE_FIRST_MEN, FirstMenGame);

gameServer.onShutdown(() => {
  console.info('game server is going down.');
});

gameServer.listen(port);
console.info('Server Started.');
