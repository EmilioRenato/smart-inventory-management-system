import { DeleteOutlined, EditOutlined, SearchOutlined } from '@ant-design/icons';
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

  const auth = JSON.parse(localStorage.getItem('auth') || '{}');
  const userId = auth?._id || '';

  // =============================
  // GET CUSTOMERS (GLOBAL)
  // =============================
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

  // =============================
  // FILTRO BUSCADOR
  // =============================
  const filteredCustomers = useMemo(() => {
    if (!search) return customersData;

    const query = search.toLowerCase();

    return customersData.filter(c =>
      String(c?.name || '').toLowerCase().includes(query) ||
      String(c?.cedula || '').toLowerCase().includes(query) ||
      String(c?.email || '').toLowerCase().includes(query)
    );
  }, [customersData, search]);

  // =============================
  // GUARDAR CLIENTE
  // =============================
  const handlerSubmit = async values => {
    try {
      dispatch({ type: 'SHOW_LOADING' });

      const payload = {
        ...values,
        email: String(values?.email || '').trim().toLowerCase(),
      };

      if (editCustomer) {
        await axios.put('/api/customers/update-customers', {
          ...payload,
          customerId: editCustomer._id,
        });
        message.success('Cliente actualizado');
      } else {
        await axios.post('/api/customers/add-customers', {
          ...payload,
          createdBy: userId,
        });
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
      message.error(error?.response?.data?.message || 'Error guardando cliente');
    }
  };

  // =============================
  // EDITAR
  // =============================
  const handleEdit = record => {
    setEditCustomer(record);
    form.setFieldsValue({
      ...record,
      email: record?.email || '',
    });
    setPopModal(true);
  };

  // =============================
  // ELIMINAR
  // =============================
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

  const columns = [
    {
      title: 'Cédula / RUC',
      dataIndex: 'cedula',
      render: cedula => <b>{cedula || '-'}</b>,
    },
    {
      title: 'Nombre',
      dataIndex: 'name',
    },
    {
      title: 'Teléfono',
      dataIndex: 'phone',
    },
    {
      title: 'Dirección',
      dataIndex: 'address',
    },
    {
      title: 'Correo',
      dataIndex: 'email',
      render: email => email || '-',
    },
    {
      title: 'Acción',
      render: (_, record) => (
        <div>
          <EditOutlined
            className="cart-edit mx-2"
            onClick={() => handleEdit(record)}
          />
          <DeleteOutlined
            className="cart-action"
            onClick={() => handleDelete(record)}
          />
        </div>
      ),
    },
  ];

  return (
    <Layout>
      <div className="d-flex justify-content-between mb-3">
        <h2>Clientes</h2>

        <div className="d-flex gap-3">
          <Input
            placeholder="Buscar por nombre, cédula o correo"
            value={search}
            onChange={e => setSearch(e.target.value)}
            suffix={<SearchOutlined />}
            style={{ width: 280 }}
          />

          <Button
            className="add-new"
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

      <Table
        dataSource={filteredCustomers}
        columns={columns}
        bordered
        rowKey="_id"
      />

      <Modal
        title={editCustomer ? 'Editar Cliente' : 'Agregar Cliente'}
        visible={popModal}
        onCancel={() => {
          setPopModal(false);
          setEditCustomer(null);
          form.resetFields();
        }}
        footer={false}
      >
        <Form layout="vertical" form={form} onFinish={handlerSubmit}>
          <Form.Item
            name="cedula"
            label="Cédula / RUC"
            rules={[{ required: true, message: 'Ingresa cédula o RUC' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="name"
            label="Nombre"
            rules={[{ required: true, message: 'Ingresa nombre' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="phone"
            label="Teléfono"
            rules={[{ required: true, message: 'Ingresa teléfono' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="address"
            label="Dirección"
            rules={[{ required: true, message: 'Ingresa dirección' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="email"
            label="Correo"
            rules={[
              { required: false },
              { type: 'email', message: 'Ingresa un correo válido' },
            ]}
          >
            <Input placeholder="cliente@correo.com" />
          </Form.Item>

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