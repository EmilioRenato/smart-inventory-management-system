import User from '../models/userModel.js';
import bcrypt from 'bcryptjs';

// REGISTER
export const registerController = async (req, res) => {
    try {
        const { name, email, password, adminKey } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ message: 'Faltan campos obligatorios' });
        }

        const exist = await User.findOne({ email: email.trim().toLowerCase() });
        if (exist) {
            return res.status(400).json({ message: 'El correo ya está registrado' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const role = adminKey && process.env.ADMIN_KEY && adminKey === process.env.ADMIN_KEY ? 'admin' : 'asesor';

        const user = await User.create({
            name,
            email: email.trim().toLowerCase(),
            password: hashedPassword,
            role,
        });

        const safeUser = {
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            code: user.code,
        };

        return res.status(201).json({ message: 'Usuario creado', user: safeUser });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: 'Error en registro' });
    }
};

// LOGIN
export const loginController = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email: email.trim().toLowerCase() });
        if (!user) return res.status(400).json({ message: 'Credenciales incorrectas' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: 'Credenciales incorrectas' });

        const safeUser = {
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            code: user.code,
        };

        return res.status(200).json({ user: safeUser, message: 'Login correcto' });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: 'Error en login' });
    }
};

// ✅ NUEVO: buscar usuario por código (validar vendedor)
export const getUserByCodeController = async (req, res) => {
    try {
        const code = String(req.query.code || '').trim();
        if (!code) return res.status(400).json({ message: 'code is required' });

        const user = await User.findOne({ code }).select('_id name email role code');
        if (!user) return res.status(404).json({ message: 'Código no existe' });

        return res.status(200).json({ user });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: 'Error buscando usuario por código' });
    }
};