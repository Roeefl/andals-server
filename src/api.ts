import express, { Application } from 'express';
import buildingCosts from './specs/buildingCosts';
import { clansManifest } from './specs/wildlings';

export function setApiRoutes(app: Application) {
  // const api = express.Router();

  function onError(res: express.Response, err: any) {
    const { message } = err;
    console.error(message);
    
    res.status(500);
    res.json({ message });
  }

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
