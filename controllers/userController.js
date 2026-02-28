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

    const role =
      adminKey && process.env.ADMIN_KEY && String(adminKey).trim() === String(process.env.ADMIN_KEY).trim()
        ? 'admin'
        : 'asesor';

    const user = await User.create({
      name: String(name).trim(),
      email: email.trim().toLowerCase(),
      password: hashedPassword,
      role,
      // code se genera en el modelo (pre validate)
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
    console.log('REGISTER ERROR:', error);

    if (String(error?.code) === '11000') {
      const field = Object.keys(error?.keyPattern || {})[0] || 'campo';
      return res.status(400).json({ message: `Ya existe un usuario con este ${field}` });
    }

    return res.status(500).json({ message: 'Error en registro' });
  }
};

// LOGIN
export const loginController = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) return res.status(400).json({ message: 'Faltan credenciales' });

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
    console.log('LOGIN ERROR:', error);
    return res.status(500).json({ message: 'Error en login' });
  }
};

// ✅ GET USER BY CODE (para validar código de vendedor en ventas)
export const getUserByCodeController = async (req, res) => {
  try {
    const { code } = req.query;

    if (!code) return res.status(400).json({ message: 'code es requerido' });

    const clean = String(code).trim();

    const user = await User.findOne({ code: clean }).select('_id name email role code');
    if (!user) return res.status(404).json({ message: 'Código de usuario no encontrado' });

    return res.status(200).json({ user });
  } catch (error) {
    console.log('GET USER BY CODE ERROR:', error);
    return res.status(500).json({ message: 'Error buscando usuario por código' });
  }
};