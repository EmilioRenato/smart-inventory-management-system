import { DeleteOutlined } from '@ant-design/icons';
import { Button, Empty, Form, Input, message, Modal, Select, Table, InputNumber } from 'antd';
import axios from 'axios';
import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import './cart.css';

const Cart = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { cartItems } = useSelector(state => state.rootReducer);

    const auth = JSON.parse(localStorage.getItem('auth'));
    const userId = auth?._id;

    const [subTotal, setSubTotal] = useState(0);
    const [billPopUp, setBillPopUp] = useState(false);
    const [form] = Form.useForm();

    const [paidTotal, setPaidTotal] = useState(0);

    // ===== Helpers =====
    const normalizeSizeOrders = (arr = []) =>
        Array.isArray(arr)
            ? arr
                  .map(x => ({ size: String(x?.size ?? '').trim(), quantity: Number(x?.quantity || 0) }))
                  .filter(x => x.size && x.quantity > 0)
            : [];

    // subtotal sugerido (precio normal)
    useEffect(() => {
        let temp = 0;
        cartItems.forEach(p => {
            temp += Number(p.price || 0) * Number(p.quantity || 0);
        });
        const st = Number(temp.toFixed(2));
        setSubTotal(st);
        setPaidTotal(st);
    }, [cartItems]);

    const discount = useMemo(() => Number((subTotal - paidTotal).toFixed(2)), [subTotal, paidTotal]);

    const handlerDelete = record => {
        dispatch({ type: 'DELETE_FROM_CART', payload: record });
    };

    const columns = [
        { title: 'Nombre', dataIndex: 'name' },
        {
            title: 'Precio',
            dataIndex: 'price',
            render: price => <strong>${price}</strong>,
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

    // ===== Descuento de stock por talla =====
    const applySizeDecrement = (currentSizeStocks, sizeOrders) => {
        const map = new Map();
        (currentSizeStocks || []).forEach(s => map.set(String(s.size), Number(s.stock || 0)));

        for (const row of sizeOrders) {
            const size = String(row.size);
            const qty = Number(row.quantity || 0);
            const prev = map.get(size) ?? 0;
            map.set(size, Math.max(0, prev - qty));
        }

        const newSizeStocks = Array.from(map.entries()).map(([size, stock]) => ({ size, stock }));
        const total = newSizeStocks.reduce((sum, x) => sum + Number(x.stock || 0), 0);
        return { newSizeStocks, total };
    };

    // ===== Agrupar items por producto (para descontar M y XL del mismo producto bien) =====
    const groupCartByProduct = () => {
        const map = new Map();

        for (const item of cartItems) {
            const pid = String(item._id);
            if (!map.has(pid)) {
                map.set(pid, {
                    productId: pid,
                    name: item.name,
                    hasSizes: Array.isArray(item.sizeStocks) && item.sizeStocks.length > 0,
                    sizeStocks: item.sizeStocks || [],
                    sizeOrders: [],
                    totalQty: 0,
                    stock: Number(item.stock || 0),
                });
            }

            const g = map.get(pid);
            g.totalQty += Number(item.quantity || 0);

            const so = normalizeSizeOrders(item.sizeOrders);
            if (so.length) g.sizeOrders.push(...so);
        }

        // consolidar sizeOrders por talla
        const grouped = [];
        for (const g of map.values()) {
            if (g.sizeOrders.length) {
                const m = new Map();
                g.sizeOrders.forEach(o => {
                    const key = String(o.size);
                    m.set(key, (m.get(key) || 0) + Number(o.quantity || 0));
                });
                g.sizeOrders = Array.from(m.entries()).map(([size, quantity]) => ({ size, quantity }));
            }
            grouped.push(g);
        }
        return grouped;
    };

    // ===== Autocompletar cliente por cédula =====
    const autoFillByCedula = async cedula => {
        const clean = String(cedula || '').trim();
        if (!clean || !userId) return;

        try {
            const { data } = await axios.get('/api/customers/get-customer-by-cedula', {
                params: { cedula: clean, createdBy: userId },
            });

            if (data?.customer) {
                form.setFieldsValue({
                    name: data.customer.name,
                    phone: String(data.customer.phone || ''),
                    address: data.customer.address,
                });
                message.success('Cliente encontrado ✅');
            }
        } catch (err) {
            console.log(err);
        }
    };

    const handlerSubmit = async values => {
        try {
            if (!userId) {
                message.error('Error de autenticación');
                return;
            }

            const sellerCode = String(values.sellerCode || '').replace(/\D/g, '').slice(0, 5);
            if (sellerCode.length !== 5) {
                message.error('El código del vendedor debe tener 5 dígitos');
                return;
            }

            if (!Number.isFinite(Number(paidTotal)) || Number(paidTotal) <= 0) {
                message.error('El precio a pagar debe ser mayor a 0');
                return;
            }

            if (Number(paidTotal) > Number(subTotal)) {
                message.error('El precio a pagar no puede ser mayor al sugerido');
                return;
            }

            // validar tallas si aplica
            for (const item of cartItems) {
                const hasSizes = Array.isArray(item?.sizeStocks) && item.sizeStocks.length > 0;
                const selected = normalizeSizeOrders(item?.sizeOrders);
                if (hasSizes && selected.length === 0) {
                    message.error(`Faltan tallas seleccionadas en: ${item?.name || 'Producto'}`);
                    return;
                }
            }

            // ✅ 0) asegurar cliente en BD (si existe se actualiza, si no se crea)
            await axios.post('/api/customers/add-customers', {
                cedula: values.cedula,
                name: values.name,
                phone: Number(values.phone),
                address: values.address,
                createdBy: userId,
            });

            const payload = {
                createdBy: userId,
                sellerCode,

                customerCedula: values.cedula,
                customerName: values.name,
                customerPhone: Number(values.phone),
                customerAddress: values.address,

                cartItems,
                suggestedTotal: subTotal,
                paidTotal: Number(Number(paidTotal).toFixed(2)),
                discountAmount: discount,

                paymentMethod: values.paymentMethod,
            };

            dispatch({ type: 'SHOW_LOADING' });

            // 1) crear nota
            const billRes = await axios.post('/api/bills/addbills', payload);

            // 2) descontar inventario (agrupado por producto y por talla)
            const grouped = groupCartByProduct();

            for (const g of grouped) {
                if (g.hasSizes && g.sizeOrders.length) {
                    const { newSizeStocks, total } = applySizeDecrement(g.sizeStocks, g.sizeOrders);

                    await axios.put('/api/products/updateproducts', {
                        productId: g.productId,
                        sizeStocks: newSizeStocks,
                        stock: total,
                    });
                } else {
                    await axios.put('/api/products/updateproducts', {
                        productId: g.productId,
                        stock: Math.max(0, Number(g.stock || 0) - Number(g.totalQty || 0)),
                    });
                }
            }

            message.success(billRes.data?.message || 'Nota de venta generada');

            // 3) limpiar y cerrar
            dispatch({ type: 'CLEAR_CART' });
            setBillPopUp(false);
            form.resetFields();
            dispatch({ type: 'HIDE_LOADING' });
            navigate('/bills');
        } catch (error) {
            dispatch({ type: 'HIDE_LOADING' });
            message.error(error.response?.data?.message || 'Error creating bill');
            console.log(error);
        }
    };

    return (
        <Layout>
            <h2>Carrito</h2>

            {cartItems.length === 0 ? (
                <div className="empty-cart">
                    <h2>Carrito vacío</h2>
                    <Empty />
                </div>
            ) : (
                <div>
                    <Table dataSource={cartItems} columns={columns} bordered rowKey={r => r.cartKey || r._id} />

                    <div className="subTotal">
                        <h2>
                            Precio sugerido: <span>${subTotal.toFixed(2)}</span>
                        </h2>

                        <Button onClick={() => setBillPopUp(true)} className="add-new">
                            Generar nota de venta
                        </Button>
                    </div>

                    <Modal title="Crear nota de venta" visible={billPopUp} onCancel={() => setBillPopUp(false)} footer={false}>
                        <Form layout="vertical" onFinish={handlerSubmit} form={form}>
                            <Form.Item
                                name="sellerCode"
                                label="Código del vendedor (5 dígitos)"
                                rules={[{ required: true, message: 'Ingresa el código del vendedor' }]}
                            >
                                <Input maxLength={5} />
                            </Form.Item>

                            <Form.Item name="cedula" label="Cédula / RUC" rules={[{ required: true, message: 'Ingresa cédula o RUC' }]}>
                                <Input onBlur={e => autoFillByCedula(e.target.value)} />
                            </Form.Item>

                            <Form.Item name="name" label="Nombre del cliente" rules={[{ required: true, message: 'Ingresa nombre' }]}>
                                <Input />
                            </Form.Item>

                            <Form.Item name="phone" label="Teléfono" rules={[{ required: true, message: 'Ingresa teléfono' }]}>
                                <Input />
                            </Form.Item>

                            <Form.Item name="address" label="Dirección" rules={[{ required: true, message: 'Ingresa dirección' }]}>
                                <Input />
                            </Form.Item>

                            <Form.Item name="paymentMethod" label="Método de pago" rules={[{ required: true, message: 'Selecciona método' }]}>
                                <Select>
                                    <Select.Option value="cash">Efectivo</Select.Option>
                                    <Select.Option value="transfer">Transferencia</Select.Option>
                                    <Select.Option value="card">Tarjeta</Select.Option>
                                </Select>
                            </Form.Item>

                            <div style={{ marginTop: 10 }}>
                                <p>
                                    <b>Precio sugerido:</b> ${subTotal.toFixed(2)}
                                </p>

                                <p style={{ marginBottom: 6 }}>
                                    <b>Precio a pagar (negociado):</b>
                                </p>

                                <InputNumber
                                    min={0}
                                    value={paidTotal}
                                    onChange={val => setPaidTotal(Number(val || 0))}
                                    style={{ width: '100%' }}
                                />

                                <p style={{ marginTop: 10 }}>
                                    <b>Descuento aplicado:</b> ${discount.toFixed(2)}
                                </p>
                            </div>

                            <div className="form-btn-add">
                                <Button htmlType="submit" className="add-new">
                                    Generar nota de venta
                                </Button>
                            </div>
                        </Form>
                    </Modal>
                </div>
            )}
        </Layout>
    );
};

export default Cart;