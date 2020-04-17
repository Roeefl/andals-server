import express from 'express';
import path from 'path';
import { createServer } from 'http';
import { Server } from 'colyseus';
import BaseGame from './src/rooms/BaseGame';

const port = 1337;

const app = express();
app.use(express.json());
app.get('/', function(req, res) {
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
