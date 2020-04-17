import express, { Application, Request, Response } from 'express';
import path from 'path';
import { createServer } from 'http';
import { Server } from 'colyseus';
import BaseGame from './src/rooms/BaseGame';

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

gameServer.define('baseGame', BaseGame);
gameServer.onShutdown(() => {
  console.info('game server is going down.');
});

gameServer.listen(port);
console.info('Server Started.');
