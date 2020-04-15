require('dotenv').config();
const cors = require('cors');

import express from 'express';
import path from 'path';
import { createServer } from 'http';
import { Server } from 'colyseus';
import { monitor } from '@colyseus/monitor';
// import socialRoutes from '@colyseus/social/express';
const serveIndex = require('serve-index');

import { API } from './src/api';
import BaseGame from './src/rooms/BaseGame';
import FirstMenGame from './src/rooms/FirstMenGame';

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
gameServer.define('baseGame', BaseGame); // , roomOptions
gameServer.define('firstMen', FirstMenGame);

// router.use('/', express.static(frontendDirectory));
app.use('/', serveIndex(path.join(__dirname, 'static'), { 'icons': true }))

const monitorPath = path.join(__dirname, 'static');
const router = express.Router();
router.use('/', express.static(monitorPath));
router.use('/api', API());

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
console.info(`Started Server on: ${serverUrl}:${port}`);
