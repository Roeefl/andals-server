
import express, { Application, Request, Response } from 'express';
import path from 'path';
import cors from 'cors';

require('dotenv').config();

const app: Application = express();
app.use(cors());
app.use(express.json());

app.get('/', function(req: Request, res: Response) {
  res.sendFile(path.join(__dirname + '/index.html'));
});

const serverUrl = process.env.SERVER_URL || 'ws://localhost';
console.info(`Server Started at: ${serverUrl}`);
