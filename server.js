import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import mongoose from 'mongoose';
import morgan from 'morgan';

import billsRouter from './routes/billsRoutes.js';
import customerRouter from './routes/customersRoutes.js';
import productRouter from './routes/productsRoutes.js';
import userRouter from './routes/userRoutes.js';

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
app.get('/', (req, res) => {
  res.status(200).send('API funcionando correctamente ✅');
});

// Routes
app.use('/api/products', productRouter);
app.use('/api/users', userRouter);
app.use('/api/bills', billsRouter);
app.use('/api/customers', customerRouter);

// Port
const PORT = process.env.PORT || 5000;

// Listen
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});