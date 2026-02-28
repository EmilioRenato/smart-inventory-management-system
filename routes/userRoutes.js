import express from 'express';
import { loginController, registerController, getUserByCodeController } from '../controllers/userController.js';

const userRouter = express.Router();

userRouter.post('/register', registerController);
userRouter.post('/login', loginController);

// ✅ NUEVO: validar código asesor y obtener nombre
userRouter.get('/by-code', getUserByCodeController);

export default userRouter;