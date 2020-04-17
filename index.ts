import express, { Application, Request, Response } from 'express';
import path from 'path';
import { createServer } from 'http';
import { Server } from 'colyseus';
import BaseGame from './src/rooms/BaseGame';
import FirstMenGame from './src/rooms/FirstMenGame';
import { ROOM_TYPE_BASE_GAME, ROOM_TYPE_FIRST_MEN } from './src/roomTypes';

const port = 1337;

const app: Application = express();
app.use(express.json());

app.get('/', function(req: Request, res: Response) {
  res.sendFile(path.join(__dirname + '/index.html'));
});

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
