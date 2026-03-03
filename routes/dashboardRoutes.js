import express from 'express';
import { getDashboardSummaryController } from '../controllers/dashboardController.js';

const dashboardRouter = express.Router();

dashboardRouter.get('/summary', getDashboardSummaryController);

export default dashboardRouter;
