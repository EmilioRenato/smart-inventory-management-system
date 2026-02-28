import { DeleteOutlined, EditOutlined, SearchOutlined } from '@ant-design/icons';
import { Button, Form, Input, Modal, Table, message } from 'antd';
import FormItem from 'antd/lib/form/FormItem';
import axios from 'axios';
import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import Layout from '../../components/Layout';

const Customers = () => {
    const [userId, setUserId] = useState(() => {
        const auth = localStorage.getItem('auth');
        return auth ? JSON.parse(auth)._id : null;
    });

    const dispatch = useDispatch();
    const [customersData, setCustomersData] = useState([]);
    const [popModal, setPopModal] = useState(false);
    const [editCustomer, setEditCustomer] = useState(null);

    // Buscar por nombre (frontend)
    const [searchName, setSearchName] = useState('');

    const [form] = Form.useForm();

    useEffect(() => {
        const auth = localStorage.getItem('auth');
        if (auth) setUserId(JSON.parse(auth)._id);
    }, []);

    const getAllCustomers = async () => {
        try {
            dispatch({ type: 'SHOW_LOADING' });

            const { data } = await axios.get('/api/customers/get-customers', {
                params: { createdBy: userId },
            });

            setCustomersData(data);
            dispatch({ type: 'HIDE_LOADING' });
        } catch (error) {
            dispatch({ type: 'HIDE_LOADING' });
            console.log(error);
        }
    };

    useEffect(() => {
        if (userId) getAllCustomers();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId]);

    const handlerSubmit = async value => {
        try {
            const customerData = {
                cedulaRuc: String(value.cedulaRuc || '').trim(),
                name: value.name,
                phone: String(value.phone || '').replace(/\D/g, ''),
                address: value.address,
                createdBy: userId,
            };

            dispatch({ type: 'SHOW_LOADING' });

            if (editCustomer) {
                await axios.put('/api/customers/update-customers', {
                    ...customerData,
                    customerId: editCustomer._id,
                });
                message.success('¡Cliente actualizado correctamente!');
            } else {
                const res = await axios.post('/api/customers/add-customers', customerData);

                // ✅ Si ya existe, solo mostrar mensaje y no duplicar
                if (res.data?.exists) {
                    message.info(res.data?.message || 'Cliente ya existente');
                } else {
                    message.success(res.data?.message || 'Cliente creado correctamente');
                }
            }

            await getAllCustomers();
            setPopModal(false);
            setEditCustomer(null);
            form.resetFields();

            dispatch({ type: 'HIDE_LOADING' });
        } catch (error) {
            dispatch({ type: 'HIDE_LOADING' });
            message.error('Error al guardar el cliente');
            console.log(error);
        }
    };

    const handleEdit = record => {
        setEditCustomer(record);
        form.setFieldsValue({
            cedulaRuc: record.cedulaRuc,
            name: record.name,
            phone: record.phone,
            address: record.address,
        });
        setPopModal(true);
    };

    const handleDelete = async record => {
        try {
            dispatch({ type: 'SHOW_LOADING' });
            await axios.post('/api/customers/delete-customers', { customerId: record._id });
            message.success('¡Cliente eliminado correctamente!');
            await getAllCustomers();
            dispatch({ type: 'HIDE_LOADING' });
        } catch (error) {
            dispatch({ type: 'HIDE_LOADING' });
            message.error('Error al eliminar el cliente');
            console.log(error);
        }
    };

    const filteredCustomers = useMemo(() => {
        const q = (searchName || '').trim().toLowerCase();
        if (!q) return customersData;

        return customersData.filter(c =>
            String(c?.name || '').toLowerCase().includes(q)
        );
    }, [customersData, searchName]);

    const columns = [
        {
            title: 'Cédula/RUC',
            dataIndex: 'cedulaRuc',
        },
        {
            title: 'Nombre',
            dataIndex: 'name',
        },
        {
            title: 'Teléfono',
            dataIndex: 'phone',
            render: phone => <span>+593 {phone}</span>,
        },
        {
            title: 'Dirección',
            dataIndex: 'address',
        },
        {
            title: 'Creado el',
            dataIndex: 'createdAt',
            render: createdAt => new Date(createdAt).toLocaleDateString(),
        },
        {
            title: 'Acciones',
            render: (_, record) => (
                <div>
                    <EditOutlined className="cart-edit mx-2" onClick={() => handleEdit(record)} />
                    <DeleteOutlined className="cart-action" onClick={() => handleDelete(record)} />
                </div>
            ),
        },
    ];

    return (
        <Layout>
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2>Clientes</h2>

                <div className="d-flex gap-3">
                    <Input
                        placeholder="Buscar por nombre"
                        value={searchName}
                        onChange={e => setSearchName(e.target.value)}
                        style={{ width: '220px' }}
                        suffix={<SearchOutlined />}
                        maxLength={60}
                    />

                    <Button
                        className="add-new"
                        onClick={() => {
                            setEditCustomer(null);
                            form.resetFields();
                            setPopModal(true);
                        }}
                    >
                        Agregar cliente
                    </Button>
                </div>
            </div>

            <Table
                dataSource={filteredCustomers}
                columns={columns}
                bordered
                pagination={false}
                rowKey="_id"
                locale={{
                    emptyText: searchName ? 'No se encontraron clientes coincidentes' : 'No hay clientes disponibles',
                }}
            />

            <Modal
                title={editCustomer ? 'Editar cliente' : 'Agregar nuevo cliente'}
                visible={popModal}
                onCancel={() => {
                    setPopModal(false);
                    setEditCustomer(null);
                    form.resetFields();
                }}
                footer={false}
            >
                <Form layout="vertical" onFinish={handlerSubmit} form={form}>
                    <FormItem
                        name="cedulaRuc"
                        label="Cédula o RUC"
                        rules={[{ required: true, message: 'Ingresa la cédula o RUC' }]}
                    >
                        <Input
                            maxLength={13}
                            onChange={e => {
                                const v = e.target.value.replace(/\s+/g, '');
                                form.setFieldsValue({ cedulaRuc: v });
                            }}
                        />
                    </FormItem>

                    <FormItem
                        name="name"
                        label="Nombre"
                        rules={[{ required: true, message: 'Ingresa el nombre' }]}
                    >
                        <Input />
                    </FormItem>

                    <FormItem
                        name="phone"
                        label="Teléfono"
                        rules={[
                            { required: true, message: 'Ingresa el teléfono' },
                            { pattern: /^\d+$/, message: 'Ingresa solo números' },
                        ]}
                    >
                        <Input
                            prefix="+593"
                            maxLength={15}
                            onChange={e => {
                                const value = e.target.value.replace(/\D/g, '');
                                form.setFieldsValue({ phone: value });
                            }}
                        />
                    </FormItem>

                    <FormItem
                        name="address"
                        label="Dirección"
                        rules={[{ required: true, message: 'Ingresa la dirección' }]}
                    >
                        <Input />
                    </FormItem>

                    <div className="form-btn-add">
                        <Button htmlType="submit" className="add-new">
                            {editCustomer ? 'Actualizar' : 'Guardar'}
                        </Button>
                    </div>
                </Form>
            </Modal>
        </Layout>
    );
};

export default Customers;