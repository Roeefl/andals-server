
import express, { Application, Request, Response, Router } from 'express';
import path from 'path';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'colyseus';
import { monitor } from '@colyseus/monitor';
import BaseGame from './src/rooms/BaseGame';
import FirstMenGame from './src/rooms/FirstMenGame';
import { ROOM_TYPE_BASE_GAME, ROOM_TYPE_FIRST_MEN } from './src/specs/roomTypes';
import { setApiRoutes } from './src/api';

require('dotenv').config();

const PORT = Number(process.env.PORT || process.env.SERVER_PORT || 1337);

const app: Application = express();
app.use(cors());
app.use(express.json());

setApiRoutes(app);

// const router: Router = express.Router();

const server = createServer(app);
const gameServer = new Server({
  server,
  express: app
});

gameServer.define(ROOM_TYPE_BASE_GAME, BaseGame);
gameServer.define(ROOM_TYPE_FIRST_MEN, FirstMenGame);

// router.use('/', express.static(monitorPath));
app.use('/colyseus', monitor());

app.get('/', function(req: Request, res: Response) {
  res.sendFile(path.join(__dirname + '/index.html'));
});

const monitorPath = path.join(__dirname + '/src/monitor/dist/index.html')
app.get('/monitor', function(req: Request, res: Response) {
  res.sendFile(monitorPath);
});

gameServer.onShutdown(() => {
  console.info('game server is going down.');
});
gameServer.listen(PORT);

const serverUrl = process.env.SERVER_URL || 'ws://localhost';
console.info(`Server Started at: ${serverUrl}:${PORT}`);
