import React, { useMemo, useState } from 'react';
import { Button, Card, Modal, Table, InputNumber, message } from 'antd';
import { useDispatch } from 'react-redux';

const Product = ({ product, enableSizeSelect = false }) => {
    const dispatch = useDispatch();
    const { Meta } = Card;

    const [modalVisible, setModalVisible] = useState(false);
    const [rows, setRows] = useState([]);

    const sizes = useMemo(() => {
        const list = Array.isArray(product?.sizeStocks) ? product.sizeStocks : [];
        return list
            .map(x => ({ size: String(x.size), stock: Number(x.stock || 0) }))
            .filter(x => x.size && x.stock > 0);
    }, [product]);

    const openModal = () => {
        if (!product) return;

        if (Number(product?.stock || 0) <= 0) {
            message.error('No hay producto en stock');
            return;
        }

        // Si NO pedimos tallas, agrega 1 directo
        if (!enableSizeSelect || !Array.isArray(product?.sizeStocks) || product.sizeStocks.length === 0) {
            dispatch({
                type: 'ADD_TO_CART',
                payload: { ...product, quantity: 1 },
            });
            message.success('Agregado al carrito');
            return;
        }

        // Tabla de tallas
        const initial = sizes.map(s => ({
            key: String(s.size),
            size: String(s.size),
            available: Number(s.stock || 0),
            qty: 0,
        }));

        setRows(initial);
        setModalVisible(true);
    };

    const closeModal = () => {
        setModalVisible(false);
        setRows([]);
    };

    const addToCartWithSizes = () => {
        const selected = rows.filter(r => Number(r.qty || 0) > 0);

        if (!selected.length) {
            message.error('Selecciona al menos una talla');
            return;
        }

        for (const r of selected) {
            if (Number(r.qty) > Number(r.available)) {
                message.error(`Has superado el stock en talla ${r.size}`);
                return;
            }
        }

        // 1 item por talla
        selected.forEach(r => {
            const sizeOrders = [{ size: String(r.size), quantity: Number(r.qty) }];
            const cartKey = `${product._id}|${String(r.size)}`;

            dispatch({
                type: 'ADD_TO_CART',
                payload: {
                    ...product,
                    cartKey,
                    sizeOrders,
                    quantity: Number(r.qty),
                },
            });
        });

        message.success('Agregado al carrito');
        closeModal();
    };

    const columns = [
        { title: 'Talla', dataIndex: 'size' },
        { title: 'Disponible', dataIndex: 'available' },
        {
            title: 'Cantidad',
            dataIndex: 'qty',
            render: (_, record) => (
                <InputNumber
                    min={0}
                    max={record.available}
                    value={record.qty}
                    onChange={val => {
                        setRows(prev =>
                            prev.map(r =>
                                r.key === record.key ? { ...r, qty: Number(val || 0) } : r
                            )
                        );
                    }}
                />
            ),
        },
    ];

    return (
        <>
            <Card
                hoverable
                style={{ width: 240, marginBottom: 30 }}
                cover={
                    <img
                        alt={product?.name}
                        src={product?.image}
                        style={{ height: 200, objectFit: 'cover' }}
                        onError={e => {
                            e.currentTarget.src = 'https://via.placeholder.com/240x200?text=IMG';
                        }}
                    />
                }
            >
                <Meta title={product?.name} />
                <Meta title={`Precio: $${product?.price}`} />

                <p>
                    Stock:{' '}
                    {Number(product?.stock || 0) < 10 ? (
                        <span style={{ color: 'red' }}>{product?.stock}</span>
                    ) : (
                        <span style={{ color: 'green' }}>{product?.stock}</span>
                    )}
                </p>

                {Number(product?.stock || 0) === 0 && <Meta title="Estado:" description="Sin stock" />}

                <div className="product-btn">
                    <Button onClick={openModal}>Agregar al carrito</Button>
                </div>
            </Card>

            <Modal
                title={`Selecciona tallas: ${product?.name || ''}`}
                visible={modalVisible}          // ✅ AntD v4 usa visible
                onCancel={closeModal}
                footer={[
                    <Button key="cancel" onClick={closeModal}>
                        Cancelar
                    </Button>,
                    <Button key="ok" type="primary" onClick={addToCartWithSizes}>
                        Confirmar
                    </Button>,
                ]}
            >
                <Table dataSource={rows} columns={columns} pagination={false} rowKey="key" bordered />
            </Modal>
        </>
    );
};

export default Product;