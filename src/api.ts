import express, { Application } from 'express';
import buildingCosts from './specs/buildingCosts';

export function setApiRoutes(app: Application) {
  // const api = express.Router();

  app.get('/api/buildingCosts', async (req: express.Request, res: express.Response) => {
    try {
      res.json({ buildingCosts }); 
    } catch (err) {
      const { message } = err;
      console.error(message);
      
      res.status(500);
      res.json({ message });
    }
  });

  // return api;
};
