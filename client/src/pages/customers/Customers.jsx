import {
    DeleteOutlined,
    EditOutlined,
    SearchOutlined,
    DownloadOutlined,
} from '@ant-design/icons';
import { Button, Form, Input, Modal, Table, message } from 'antd';
import axios from 'axios';
import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import Layout from '../../components/Layout';

const Customers = () => {
    const dispatch = useDispatch();
    const [form] = Form.useForm();

    const [customersData, setCustomersData] = useState([]);
    const [popModal, setPopModal] = useState(false);
    const [editCustomer, setEditCustomer] = useState(null);
    const [search, setSearch] = useState('');

    const getAllCustomers = async () => {
        try {
            dispatch({ type: 'SHOW_LOADING' });
            const { data } = await axios.get('/api/customers/get-customers');
            setCustomersData(Array.isArray(data) ? data : []);
            dispatch({ type: 'HIDE_LOADING' });
        } catch (error) {
            dispatch({ type: 'HIDE_LOADING' });
            console.log(error);
            message.error('Error cargando clientes');
        }
    };

    useEffect(() => {
        getAllCustomers();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const filteredCustomers = useMemo(() => {
        if (!search) return customersData;

        const query = search.toLowerCase();

        return customersData.filter(c =>
            String(c?.name || '').toLowerCase().includes(query) ||
            String(c?.cedula || '').toLowerCase().includes(query) ||
            String(c?.phone || '').toLowerCase().includes(query) ||
            String(c?.email || '').toLowerCase().includes(query)
        );
    }, [customersData, search]);

    const handlerSubmit = async values => {
        try {
            dispatch({ type: 'SHOW_LOADING' });

            if (editCustomer) {
                await axios.put('/api/customers/update-customers', {
                    ...values,
                    customerId: editCustomer._id,
                });
                message.success('Cliente actualizado');
            } else {
                await axios.post('/api/customers/add-customers', values);
                message.success('Cliente guardado');
            }

            dispatch({ type: 'HIDE_LOADING' });
            setPopModal(false);
            setEditCustomer(null);
            form.resetFields();
            getAllCustomers();
        } catch (error) {
            dispatch({ type: 'HIDE_LOADING' });
            console.log(error);
            message.error(
                error?.response?.data?.message || 'Error guardando cliente'
            );
        }
    };

    const handleEdit = record => {
        setEditCustomer(record);
        form.setFieldsValue(record);
        setPopModal(true);
    };

    const handleDelete = async record => {
        try {
            dispatch({ type: 'SHOW_LOADING' });
            await axios.post('/api/customers/delete-customers', {
                customerId: record._id,
            });
            dispatch({ type: 'HIDE_LOADING' });
            message.success('Cliente eliminado');
            getAllCustomers();
        } catch (error) {
            dispatch({ type: 'HIDE_LOADING' });
            console.log(error);
            message.error('Error eliminando cliente');
        }
    };

    const handleExportExcel = () => {
        window.open('/api/customers/export-excel', '_blank');
    };

    const columns = [
        {
            title: 'Cédula / RUC',
            dataIndex: 'cedula',
            width: 140,
            render: cedula => cedula || '-',
        },
        {
            title: 'Nombre',
            dataIndex: 'name',
            width: 190,
        },
        {
            title: 'Teléfono',
            dataIndex: 'phone',
            width: 120,
            render: phone => phone || '-',
        },
        {
            title: 'Correo',
            dataIndex: 'email',
            width: 220,
            render: email => email || '-',
        },
        {
            title: 'Dirección',
            dataIndex: 'address',
            width: 220,
            render: address => address || '-',
        },
        {
            title: 'Acción',
            width: 120,
            render: (_, record) => (
                <div
                    style={{
                        display: 'flex',
                        gap: 10,
                        alignItems: 'center',
                    }}
                >
                    <EditOutlined
                        style={{ color: '#1677ff', cursor: 'pointer' }}
                        onClick={() => handleEdit(record)}
                    />
                    <DeleteOutlined
                        style={{ color: '#ff4d4f', cursor: 'pointer' }}
                        onClick={() => handleDelete(record)}
                    />
                </div>
            ),
        },
    ];

    return (
        <Layout>
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 12,
                    flexWrap: 'wrap',
                    marginBottom: 16,
                }}
            >
                <h2 style={{ margin: 0 }}>Clientes</h2>

                <div
                    style={{
                        display: 'flex',
                        gap: 10,
                        flexWrap: 'wrap',
                        width: '100%',
                        maxWidth: 620,
                        justifyContent: 'flex-end',
                    }}
                >
                    <Input
                        placeholder="Buscar cliente..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        suffix={<SearchOutlined />}
                        style={{ flex: 1, minWidth: 220 }}
                    />

                    <Button
                        icon={<DownloadOutlined />}
                        onClick={handleExportExcel}
                    >
                        Exportar Excel
                    </Button>

                    <Button
                        type="primary"
                        onClick={() => {
                            setEditCustomer(null);
                            form.resetFields();
                            setPopModal(true);
                        }}
                    >
                        Agregar Cliente
                    </Button>
                </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
                <Table
                    dataSource={filteredCustomers}
                    columns={columns}
                    rowKey="_id"
                    bordered
                    size="small"
                    scroll={{ x: 900 }}
                    pagination={{ pageSize: 8 }}
                />
            </div>

            <Modal
                title={editCustomer ? 'Editar cliente' : 'Agregar cliente'}
                visible={popModal}
                onCancel={() => {
                    setPopModal(false);
                    setEditCustomer(null);
                    form.resetFields();
                }}
                footer={false}
                width={720}
                bodyStyle={{ padding: 16 }}
            >
                <Form layout="vertical" form={form} onFinish={handlerSubmit}>
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns:
                                'repeat(auto-fit, minmax(220px, 1fr))',
                            gap: 12,
                        }}
                    >
                        <Form.Item
                            name="cedula"
                            label="Cédula / RUC"
                            rules={[
                                {
                                    required: true,
                                    message: 'Ingresa cédula o RUC',
                                },
                            ]}
                        >
                            <Input />
                        </Form.Item>

                        <Form.Item
                            name="name"
                            label="Nombre"
                            rules={[
                                {
                                    required: true,
                                    message: 'Ingresa nombre',
                                },
                            ]}
                        >
                            <Input />
                        </Form.Item>

                        <Form.Item
                            name="phone"
                            label="Teléfono"
                            rules={[
                                {
                                    required: true,
                                    message: 'Ingresa teléfono',
                                },
                            ]}
                        >
                            <Input />
                        </Form.Item>

                        <Form.Item
                            name="email"
                            label="Correo electrónico"
                            rules={[
                                {
                                    type: 'email',
                                    message: 'Ingresa un correo válido',
                                },
                            ]}
                        >
                            <Input placeholder="cliente@correo.com" />
                        </Form.Item>

                        <Form.Item
                            name="address"
                            label="Dirección"
                            rules={[
                                {
                                    required: true,
                                    message: 'Ingresa dirección',
                                },
                            ]}
                        >
                            <Input />
                        </Form.Item>
                    </div>

                    <div
                        style={{
                            marginTop: 16,
                            display: 'flex',
                            justifyContent: 'flex-end',
                            gap: 10,
                            flexWrap: 'wrap',
                        }}
                    >
                        <Button
                            onClick={() => {
                                setPopModal(false);
                                setEditCustomer(null);
                                form.resetFields();
                            }}
                        >
                            Cancelar
                        </Button>

                        <Button type="primary" htmlType="submit">
                            {editCustomer ? 'Actualizar' : 'Guardar'}
                        </Button>
                    </div>
                </Form>
            </Modal>
        </Layout>
    );
};

export default Customers;