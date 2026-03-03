import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import mongoose from 'mongoose';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';

import billsRouter from './routes/billsRoutes.js';
import customerRouter from './routes/customersRoutes.js';
import productRouter from './routes/productsRoutes.js';
import userRouter from './routes/userRoutes.js';
import dashboardRouter from './routes/dashboardRoutes.js';

dotenv.config();

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to DB'))
  .catch(err => console.log(err.message));

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(morgan('dev'));

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).send('API funcionando correctamente ✅');
});

// Routes (API)
app.use('/api/products', productRouter);
app.use('/api/users', userRouter);
app.use('/api/bills', billsRouter);
app.use('/api/customers', customerRouter);
app.use('/api/dashboard', dashboardRouter);

// ✅ Servir React en PRODUCCIÓN (1 solo link)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (process.env.NODE_ENV === 'production') {
  const buildPath = path.join(__dirname, 'client', 'build');
  app.use(express.static(buildPath));

  // cualquier ruta que no sea /api -> React
  app.get('*', (req, res) => {
    res.sendFile(path.join(buildPath, 'index.html'));
  });
} else {
  // En desarrollo, la raíz solo responde algo simple
  app.get('/', (req, res) => {
    res.status(200).send('Backend corriendo (modo desarrollo) ✅');
  });
}

// Port
const PORT = process.env.PORT || 5000;

// Listen
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});