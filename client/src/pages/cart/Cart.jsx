import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { Button, Empty, Form, Input, message, Modal, Select, Table, InputNumber } from 'antd';
import FormItem from 'antd/lib/form/FormItem';
import axios from 'axios';
import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import './cart.css';

const Cart = () => {
    const [userId, setUserId] = useState(() => {
        const auth = localStorage.getItem('auth');
        return auth ? JSON.parse(auth)._id : null;
    });

    useEffect(() => {
        const auth = localStorage.getItem('auth');
        if (auth) setUserId(JSON.parse(auth)._id);
    }, []);

    const [subTotal, setSubTotal] = useState(0);
    const [billPopUp, setBillPopUp] = useState(false);
    const [form] = Form.useForm();

    const dispatch = useDispatch();
    const navigate = useNavigate();

    const { cartItems } = useSelector(state => state.rootReducer);

    // Modal editar tallas
    const [editSizesOpen, setEditSizesOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [qtyBySize, setQtyBySize] = useState({});

    const normalize = (arr = []) =>
        Array.isArray(arr)
            ? arr
                  .map(x => ({ size: String(x?.size ?? '').trim(), quantity: Number(x?.quantity || 0) }))
                  .filter(x => x.size && x.quantity > 0)
            : [];

    const sizeSummary = item => {
        const arr = normalize(item?.sizeOrders);
        if (!arr.length) return '-';
        return arr.map(x => `${x.size}: ${x.quantity}`).join(' | ');
    };

    const openEditSizes = item => {
        setEditingItem(item);
        const map = {};
        normalize(item?.sizeOrders).forEach(o => (map[String(o.size)] = Number(o.quantity || 0)));
        setQtyBySize(map);
        setEditSizesOpen(true);
    };

    const closeEditSizes = () => {
        setEditSizesOpen(false);
        setEditingItem(null);
        setQtyBySize({});
    };

    const sizeStocksOfEditing = useMemo(() => {
        return Array.isArray(editingItem?.sizeStocks) ? editingItem.sizeStocks : [];
    }, [editingItem]);

    const saveEditedSizes = () => {
        if (!editingItem?._id) return;

        const sizeOrders = Object.entries(qtyBySize)
            .map(([size, quantity]) => ({ size: String(size), quantity: Number(quantity || 0) }))
            .filter(x => x.quantity > 0);

        if (!sizeOrders.length) {
            message.error('Selecciona al menos una talla');
            return;
        }

        // validar stock real por talla
        for (const row of sizeOrders) {
            const found = sizeStocksOfEditing.find(s => String(s.size) === String(row.size));
            const avail = Number(found?.stock || 0);
            if (row.quantity > avail) {
                message.error(`Has superado el stock en talla ${row.size}`);
                return;
            }
        }

        dispatch({ type: 'UPDATE_CART_SIZES', payload: { _id: editingItem._id, sizeOrders } });
        message.success('Tallas actualizadas');
        closeEditSizes();
    };

    const handlerDelete = record => {
        dispatch({ type: 'DELETE_FROM_CART', payload: record });
    };

    useEffect(() => {
        let temp = 0;
        cartItems.forEach(p => {
            temp += Number(p.price || 0) * Number(p.quantity || 0);
        });
        setSubTotal(temp);
    }, [cartItems]);

    const columns = [
        { title: 'Nombre', dataIndex: 'name' },
        {
            title: 'Imagen',
            dataIndex: 'image',
            render: (image, record) => <img src={image} alt={record.name} height={60} width={60} />,
        },
        {
            title: 'Precio',
            dataIndex: 'price',
            render: price => <strong>${price}</strong>,
        },
        {
            title: 'Tallas',
            render: (_, record) => (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span>{sizeSummary(record)}</span>
                    {normalize(record?.sizeOrders).length > 0 && (
                        <Button size="small" icon={<EditOutlined />} onClick={() => openEditSizes(record)}>
                            Editar
                        </Button>
                    )}
                </div>
            ),
        },
        {
            title: 'Cantidad',
            dataIndex: 'quantity',
            render: q => <strong>{q}</strong>,
        },
        {
            title: 'Acción',
            render: (_, record) => <DeleteOutlined className="cart-action" onClick={() => handlerDelete(record)} />,
        },
    ];

    const handlerSubmit = async value => {
        try {
            if (!userId) {
                message.error('Error de autenticación. Inicia sesión nuevamente.');
                return;
            }

            // ✅ validación tallas obligatoria si el producto tiene sizeStocks
            for (const item of cartItems) {
                const productHasSizes = Array.isArray(item?.sizeStocks) && item.sizeStocks.length > 0;
                const selected = normalize(item?.sizeOrders);

                if (productHasSizes && selected.length === 0) {
                    message.error(`Faltan tallas seleccionadas en: ${item?.name || 'Producto'}`);
                    return;
                }
            }

            const newObject = {
                customerCedula: value.cedula,
                customerName: value.name,
                customerPhone: Number(value.phone),
                customerAddress: value.address,
                cartItems,
                subTotal: Number(subTotal.toFixed(2)),
                tax: 0,
                totalAmount: Number(subTotal.toFixed(2)),
                paymentMethod: value.paymentMethod,
                createdBy: userId,
            };

            // ✅ check stock por talla
            for (const item of cartItems) {
                const selected = normalize(item?.sizeOrders);
                const currentSizeStocks = Array.isArray(item?.sizeStocks) ? item.sizeStocks : [];

                if (currentSizeStocks.length) {
                    for (const row of selected) {
                        const found = currentSizeStocks.find(s => String(s.size) === String(row.size));
                        const avail = Number(found?.stock || 0);
                        if (row.quantity > avail) {
                            message.error(`Solo hay ${avail} en stock para ${item.name} talla ${row.size}`);
                            return;
                        }
                    }
                } else {
                    if (Number(item.stock || 0) < Number(item.quantity || 0)) {
                        message.error(`Solo hay ${item.stock} en stock para ${item.name}`);
                        return;
                    }
                }
            }

            dispatch({ type: 'SHOW_LOADING' });

            // Generar nota
            await axios.post('/api/bills/addbills', newObject);

            // ✅ actualizar stock por talla correctamente
            for (const item of cartItems) {
                const selected = normalize(item?.sizeOrders);
                const currentSizeStocks = Array.isArray(item?.sizeStocks) ? item.sizeStocks : [];

                // Con tallas
                if (currentSizeStocks.length && selected.length) {
                    const updatedSizeStocks = currentSizeStocks.map(s => {
                        const row = selected.find(x => String(x.size) === String(s.size));
                        const dec = Number(row?.quantity || 0);
                        return { ...s, stock: Math.max(0, Number(s.stock || 0) - dec) };
                    });

                    const newTotal = updatedSizeStocks.reduce((sum, x) => sum + Number(x.stock || 0), 0);

                    // ✅ IMPORTANTE: productId REAL (no concatenado)
                    await axios.put('/api/products/updateproducts', {
                        productId: item._id,
                        sizeStocks: updatedSizeStocks,
                        stock: newTotal,
                    });
                } else {
                    // Sin tallas
                    await axios.put('/api/products/updateproducts', {
                        productId: item._id,
                        stock: Math.max(0, Number(item.stock || 0) - Number(item.quantity || 0)),
                    });
                }
            }

            dispatch({ type: 'CLEAR_CART' });
            setBillPopUp(false);
            form.resetFields();
            dispatch({ type: 'HIDE_LOADING' });

            message.success('Nota de venta generada correctamente');
            navigate('/bills');
        } catch (error) {
            dispatch({ type: 'HIDE_LOADING' });
            message.error(error?.response?.data?.message || 'Error al generar nota de venta');
            console.log(error);
        }
    };

    return (
        <Layout>
            <h2>Carrito</h2>

            {cartItems.length === 0 ? (
                <div className="empty-cart">
                    <h2 className="empty-text">¡El carrito está vacío!</h2>
                    <Empty />
                </div>
            ) : (
                <div>
                    <Table dataSource={cartItems} columns={columns} bordered rowKey="_id" />

                    <div className="subTotal">
                        <h2>
                            Sub Total: <span>${subTotal.toFixed(2)}</span>
                        </h2>
                        <Button onClick={() => setBillPopUp(true)} className="add-new">
                            Generar nota de venta
                        </Button>
                    </div>

                    <Modal title="Crear nota de venta" visible={billPopUp} onCancel={() => setBillPopUp(false)} footer={false}>
                        <Form layout="vertical" onFinish={handlerSubmit} form={form}>
                            <FormItem name="cedula" label="Cédula o RUC" rules={[{ required: true, message: 'Ingresa cédula o RUC' }]}>
                                <Input />
                            </FormItem>

                            <FormItem name="name" label="Nombre del cliente" rules={[{ required: true, message: 'Ingresa el nombre' }]}>
                                <Input />
                            </FormItem>

                            <FormItem name="phone" label="Teléfono" rules={[{ required: true, message: 'Ingresa el teléfono' }]}>
                                <Input prefix="+593" />
                            </FormItem>

                            <FormItem name="address" label="Dirección" rules={[{ required: true, message: 'Ingresa la dirección' }]}>
                                <Input />
                            </FormItem>

                            <Form.Item name="paymentMethod" label="Método de pago" rules={[{ required: true, message: 'Selecciona método de pago' }]}>
                                <Select>
                                    <Select.Option value="efectivo">Efectivo</Select.Option>
                                    <Select.Option value="transferencia">Transferencia</Select.Option>
                                    <Select.Option value="tarjeta">Tarjeta</Select.Option>
                                </Select>
                            </Form.Item>

                            <div className="total">
                                <span>SubTotal: ${subTotal.toFixed(2)}</span>
                                <h3>Total: ${subTotal.toFixed(2)}</h3>
                            </div>

                            <div className="form-btn-add">
                                <Button htmlType="submit" className="add-new">
                                    Generar nota de venta
                                </Button>
                            </div>
                        </Form>
                    </Modal>

                    {/* Modal editar tallas */}
                    <Modal
                        title={`Editar tallas: ${editingItem?.name || ''}`}
                        visible={editSizesOpen}
                        onCancel={closeEditSizes}
                        footer={false}
                        width={520}
                    >
                        <Table
                            dataSource={sizeStocksOfEditing.filter(x => Number(x.stock || 0) > 0)}
                            columns={[
                                { title: 'Talla', dataIndex: 'size' },
                                { title: 'Disponible', dataIndex: 'stock' },
                                {
                                    title: 'Cantidad',
                                    render: (_, record) => {
                                        const size = String(record.size);
                                        const max = Number(record.stock || 0);
                                        const val = Number(qtyBySize[size] || 0);

                                        return (
                                            <InputNumber
                                                min={0}
                                                max={max}
                                                value={val}
                                                onChange={v => {
                                                    const next = { ...qtyBySize, [size]: Number(v || 0) };
                                                    if (!next[size]) delete next[size];
                                                    setQtyBySize(next);
                                                }}
                                            />
                                        );
                                    },
                                },
                            ]}
                            pagination={false}
                            rowKey={r => String(r.size)}
                            bordered
                        />

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
                            <Button onClick={closeEditSizes}>Cancelar</Button>
                            <Button type="primary" onClick={saveEditedSizes}>
                                Guardar
                            </Button>
                        </div>
                    </Modal>
                </div>
            )}
        </Layout>
    );
};

export default Cart;