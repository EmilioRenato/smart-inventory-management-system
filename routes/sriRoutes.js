import express from 'express';
import {
  createSriFromBillController,
  generateSriXmlController,
  signSriXmlController,
  sendSriToReceptionController,
  checkSriAuthorizationController,
  getSriInvoicesController,
  getSriInvoiceByIdController,
} from '../controllers/sriController.js';

const sriRouter = express.Router();

sriRouter.post('/create-from-bill', createSriFromBillController);
sriRouter.post('/generate-xml', generateSriXmlController);
sriRouter.post('/sign-xml', signSriXmlController);
sriRouter.post('/send-reception', sendSriToReceptionController);
sriRouter.post('/check-authorization', checkSriAuthorizationController);

sriRouter.get('/get-sri-invoices', getSriInvoicesController);
sriRouter.get('/get-sri-invoice/:id', getSriInvoiceByIdController);

export default sriRouter;