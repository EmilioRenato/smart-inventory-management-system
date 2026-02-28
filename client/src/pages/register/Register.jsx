import { Button, Form, Input, message } from 'antd';
import FormItem from 'antd/lib/form/FormItem';
import axios from 'axios';
import React, { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import logo from '../../asset/images/brand-logo.png';

const Register = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const handlerSubmit = async value => {
        try {
            dispatch({ type: 'SHOW_LOADING' });

            const res = await axios.post('/api/users/register', value);

            dispatch({ type: 'HIDE_LOADING' });

            message.success(res?.data?.message || 'Usuario creado. Inicia sesión.');

            // ✅ Importantísimo: NO guardes auth aquí, fuerza a login para que quede role/code correcto
            navigate('/login');
        } catch (error) {
            dispatch({ type: 'HIDE_LOADING' });
            message.error(error?.response?.data?.message || 'Error al registrarse');
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
            <p>Crear cuenta</p>

            <div className="form-group">
                <Form layout="vertical" onFinish={handlerSubmit}>
                    <FormItem name="name" label="Nombre" rules={[{ required: true, message: 'Ingresa tu nombre' }]}>
                        <Input placeholder="Ingresa tu nombre" />
                    </FormItem>

                    <FormItem name="email" label="Correo electrónico" rules={[{ required: true, message: 'Ingresa tu correo' }]}>
                        <Input placeholder="Ingresa tu correo" />
                    </FormItem>

                    <FormItem name="password" label="Contraseña" rules={[{ required: true, message: 'Ingresa tu contraseña' }]}>
                        <Input.Password placeholder="Ingresa tu contraseña" />
                    </FormItem>

                    {/* ✅ Clave para crear admin */}
                    <FormItem name="adminKey" label="Clave de administrador (opcional)">
                        <Input.Password placeholder="Solo si vas a crear un ADMIN" />
                    </FormItem>

                    <div className="form-btn-add">
                        <Button htmlType="submit" className="add-new">
                            Registrar
                        </Button>

                        <Link className="form-other" to="/login">
                            Ya tengo cuenta
                        </Link>
                    </div>
                </Form>
            </div>

            <small>Powered by Binary Brigade</small>
        </div>
    );
};

export default Register;