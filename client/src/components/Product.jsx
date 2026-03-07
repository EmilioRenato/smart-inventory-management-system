import React, { useMemo, useState } from 'react';
import { Button, Card, Modal, Table, InputNumber, message } from 'antd';
import { useDispatch } from 'react-redux';

const Product = ({ product, enableSizeSelect = false }) => {
    const dispatch = useDispatch();
    const { Meta } = Card;

    const [modalVisible, setModalVisible] = useState(false);
    const [rows, setRows] = useState([]);

    const sizes = useMemo(() => {
        const list = Array.isArray(product?.sizeStocks)
            ? product.sizeStocks
            : [];

        return list
            .map(x => ({
                size: String(x.size),
                stock: Number(x.stock || 0),
            }))
            .filter(x => x.size && x.stock > 0);
    }, [product]);

    const openModal = () => {
        if (!product) return;

        if (Number(product?.stock || 0) <= 0) {
            message.error('No hay producto en stock');
            return;
        }

        if (
            !enableSizeSelect ||
            !Array.isArray(product?.sizeStocks) ||
            product.sizeStocks.length === 0
        ) {
            dispatch({
                type: 'ADD_TO_CART',
                payload: { ...product, quantity: 1 },
            });

            message.success('Agregado al carrito');
            return;
        }

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

        selected.forEach(r => {
            const sizeOrders = [
                { size: String(r.size), quantity: Number(r.qty) },
            ];
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
                                r.key === record.key
                                    ? { ...r, qty: Number(val || 0) }
                                    : r
                            )
                        );
                    }}
                    style={{ width: '100%' }}
                />
            ),
        },
    ];

    return (
        <>
            <Card
                hoverable
                style={{
                    width: '100%',
                    marginBottom: 0,
                    borderRadius: 16,
                    overflow: 'hidden',
                }}
                bodyStyle={{
                    padding: 14,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                }}
                cover={
                    <div
                        style={{
                            width: '100%',
                            height: 220,
                            overflow: 'hidden',
                            background: '#f7f7f7',
                        }}
                    >
                        <img
                            alt={product?.name}
                            src={product?.image}
                            style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                                display: 'block',
                            }}
                            onError={e => {
                                e.currentTarget.src =
                                    'https://via.placeholder.com/500x350?text=IMG';
                            }}
                        />
                    </div>
                }
            >
                <Meta
                    title={
                        <div
                            style={{
                                fontSize: 15,
                                fontWeight: 700,
                                lineHeight: 1.3,
                                minHeight: 40,
                            }}
                        >
                            {product?.name}
                        </div>
                    }
                />

                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 10,
                        flexWrap: 'wrap',
                    }}
                >
                    <div style={{ fontSize: 18, fontWeight: 800 }}>
                        ${Number(product?.price || 0).toFixed(2)}
                    </div>

                    <div style={{ fontSize: 14 }}>
                        Stock:{' '}
                        {Number(product?.stock || 0) < 10 ? (
                            <span style={{ color: 'red', fontWeight: 700 }}>
                                {product?.stock}
                            </span>
                        ) : (
                            <span style={{ color: 'green', fontWeight: 700 }}>
                                {product?.stock}
                            </span>
                        )}
                    </div>
                </div>

                {Number(product?.stock || 0) === 0 && (
                    <div
                        style={{
                            background: '#fff1f0',
                            color: '#cf1322',
                            border: '1px solid #ffa39e',
                            borderRadius: 10,
                            padding: '6px 10px',
                            fontSize: 13,
                            fontWeight: 600,
                        }}
                    >
                        Sin stock
                    </div>
                )}

                <div className="product-btn" style={{ marginTop: 4 }}>
                    <Button
                        onClick={openModal}
                        block
                        disabled={Number(product?.stock || 0) === 0}
                    >
                        Agregar al carrito
                    </Button>
                </div>
            </Card>

            <Modal
                title={`Selecciona tallas: ${product?.name || ''}`}
                visible={modalVisible}
                onCancel={closeModal}
                width={700}
                bodyStyle={{ padding: 12 }}
                footer={[
                    <Button key="cancel" onClick={closeModal}>
                        Cancelar
                    </Button>,
                    <Button
                        key="ok"
                        type="primary"
                        onClick={addToCartWithSizes}
                    >
                        Confirmar
                    </Button>,
                ]}
            >
                <div style={{ overflowX: 'auto' }}>
                    <Table
                        dataSource={rows}
                        columns={columns}
                        pagination={false}
                        rowKey="key"
                        bordered
                        size="small"
                    />
                </div>
            </Modal>
        </>
    );
};

export default Product;