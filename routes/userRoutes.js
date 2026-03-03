import express from 'express';
import {
  loginController,
  registerController,
  getUsersController,
} from '../controllers/userController.js';

const userRouter = express.Router();

userRouter.post('/register', registerController);
userRouter.post('/login', loginController);

// ✅ para dashboard
userRouter.get('/get-users', getUsersController);

export default userRouter;