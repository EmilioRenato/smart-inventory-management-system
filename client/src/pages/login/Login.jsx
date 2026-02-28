import { Button, Form, Input, message } from 'antd';
import FormItem from 'antd/lib/form/FormItem';
import axios from 'axios';
import React, { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import logo from '../../asset/images/brand-logo.png';

const Login = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const handlerSubmit = async value => {
        try {
            dispatch({ type: 'SHOW_LOADING' });

            const res = await axios.post('/api/users/login', value);

            dispatch({ type: 'HIDE_LOADING' });

            // ✅ BLINDADO: dependiendo de tu backend, el user puede venir en res.data.user o res.data
            const user = res?.data?.user ? res.data.user : res?.data?.user?.user ? res.data.user.user : res?.data;

            if (!user?._id) {
                message.error('Respuesta inválida del servidor (no llegó user)');
                return;
            }

            // ✅ Guardar SOLO lo necesario (incluye role y code)
            const safeUser = {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                code: user.code,
            };

            localStorage.setItem('auth', JSON.stringify(safeUser));
            message.success('Inicio de sesión correcto');
            navigate('/');
        } catch (error) {
            dispatch({ type: 'HIDE_LOADING' });
            message.error(error?.response?.data?.message || 'Error al iniciar sesión');
        }
    };

    useEffect(() => {
        if (localStorage.getItem('auth')) {
            navigate('/');
        }
    }, [navigate]);

    return (
        <div className="form">
            <img src={logo} alt="logo" className="brand-logo-lg" />
            <h2>Bienvenido al Sistema de Gestión de Inventario</h2>
            <p>Iniciar sesión</p>

            <div className="form-group">
                <Form layout="vertical" onFinish={handlerSubmit}>
                    <FormItem name="email" label="Correo electrónico" rules={[{ required: true, message: 'Ingresa tu correo' }]}>
                        <Input placeholder="Ingresa tu correo" />
                    </FormItem>

                    <FormItem name="password" label="Contraseña" rules={[{ required: true, message: 'Ingresa tu contraseña' }]}>
                        <Input type="password" placeholder="Ingresa tu contraseña" />
                    </FormItem>

                    <div className="form-btn-add">
                        <Button htmlType="submit" className="add-new">
                            Ingresar
                        </Button>

                        <Link className="form-other" to="/register">
                            Registrarse
                        </Link>
                    </div>
                </Form>
            </div>

            <small>Powered by Binary Brigade</small>
        </div>
    );
};

export default Login;