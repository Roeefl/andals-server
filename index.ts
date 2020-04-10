import path from 'path';
import { createServer } from 'http';
const serveIndex = require('serve-index');
import express from 'express';
import cors from 'cors';
import { Server } from 'colyseus';
import { monitor } from '@colyseus/monitor';
// import socialRoutes from '@colyseus/social/express';

import { API } from './src/api';
import GameRoom from './src/rooms/GameRoom';

const port = Number(process.env.PORT || 2567);
const app = express();

app.use(cors());
app.use(express.json())

const server = createServer(app);
const gameServer = new Server({
  server
});

// Register ChatRoom with initial options, as "chat_with_options"
// onInit(options) will receive client join options + options registered here.
gameServer.define("gameRoom", GameRoom, {
  customOptions: "you can use me on Room#onCreate"
});

app.use('/', serveIndex(path.join(__dirname, 'static'), { 'icons': true }))
app.use('/', express.static(path.join(__dirname, 'static')));

const router = express.Router();
// router.use('/', express.static(frontendDirectory));
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
console.info(`Listening on ws://localhost:${port}`)
