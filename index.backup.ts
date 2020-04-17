require('dotenv').config();
const cors = require('cors');

import express from 'express';
import path from 'path';
import { createServer } from 'http';
import { Server } from 'colyseus';
import { monitor } from '@colyseus/monitor';
// import socialRoutes from '@colyseus/social/express';

import { API } from './src/api';
import BaseGame from './src/rooms/BaseGame';

// import { RoomOptions } from './src/interfaces';

const port = Number(process.env.SERVER_PORT || 2568);

const app = express();

app.use(cors());
app.use(express.json())

const server = createServer(app);
const gameServer = new Server({
  server
});

// Register ChatRoom with initial options, as "chat_with_options"
// onInit(options) will receive client join options + options registered here.
// const roomOptions: RoomOptions = {
//   roomTitle: "Test Game Room"
// };

// router.use('/', express.static(path));

// const router = express.Router();
// const monitorPath = path.join(__dirname, '/');
// router.use('/', express.static(monitorPath));

// router.use('/api', API());

app.get('/', function(req, res) {
  res.sendFile(path.join(__dirname + '/index.html'));
});

/**
 * Register @colyseus/social routes
 *
 * - uncomment if you want to use default authentication (https://docs.colyseus.io/authentication/)
 * - also uncomment the import statement
 */
// app.use("/", socialRoutes);

// register colyseus monitor AFTER registering your room handlers
app.use('/colyseus', monitor());

gameServer.onShutdown(() => console.info('game server is going down.'));

gameServer.listen(port);

const serverUrl = process.env.SERVER_URL || 'ws://localhost';
console.info(`Server Started | ${serverUrl}:${port}`);
