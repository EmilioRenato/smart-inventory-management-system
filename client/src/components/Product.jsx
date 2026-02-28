import React, { useMemo, useState } from 'react';
import { Button, Card, Modal, Table, InputNumber, message } from 'antd';
import { useDispatch } from 'react-redux';

const Product = ({ product, enableSizeSelect = false }) => {
    const dispatch = useDispatch();

    const [open, setOpen] = useState(false);
    const [rows, setRows] = useState([]);

    const sizes = useMemo(() => {
        const list = Array.isArray(product?.sizeStocks) ? product.sizeStocks : [];
        return list.filter(x => Number(x?.stock || 0) > 0);
    }, [product]);

    const openModal = () => {
        if (!product) return;

        if (Number(product?.stock || 0) <= 0) {
            message.error('No hay producto en stock');
            return;
        }

        // Si no quieres selección de tallas, agrega 1 item directo
        if (!enableSizeSelect) {
            dispatch({
                type: 'ADD_TO_CART',
                payload: { ...product, quantity: 1 },
            });
            message.success('Agregado al carrito');
            return;
        }

        // Armar tabla de tallas disponibles
        const initial = sizes.map(s => ({
            key: String(s.size),
            size: String(s.size),
            available: Number(s.stock || 0),
            qty: 0,
        }));

        setRows(initial);
        setOpen(true);
    };

    const closeModal = () => {
        setOpen(false);
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

        // Agrega 1 item por talla (así el carrito distingue tallas)
        selected.forEach(r => {
            dispatch({
                type: 'ADD_TO_CART',
                payload: {
                    ...product,
                    selectedSize: r.size,
                    quantity: Number(r.qty),
                },
            });
        });

        message.success('Agregado al carrito');
        closeModal();
    };

    const { Meta } = Card;

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
                        alt={product?.name || 'producto'}
                        src={product?.image}
                        style={{ height: 200, width: '100%', objectFit: 'cover' }}
                        onError={e => {
                            e.currentTarget.src = 'https://via.placeholder.com/240x200?text=IMG';
                        }}
                    />
                }
            >
                <Meta title={product?.name || ''} />
                <Meta title={`Precio: $${product?.price ?? ''}`} />

                <p>
                    Stock:{' '}
                    {Number(product?.stock || 0) < 10 ? (
                        <span style={{ color: 'red' }}>{product?.stock}</span>
                    ) : (
                        <span style={{ color: 'green' }}>{product?.stock}</span>
                    )}
                </p>

                {Number(product?.stock || 0) === 0 && (
                    <Meta title="Estado:" description="Agotado" />
                )}

                <div className="product-btn">
                    <Button onClick={openModal}>Agregar al carrito</Button>
                </div>
            </Card>

            <Modal
                title={`Selecciona tallas: ${product?.name || ''}`}
                visible={open}
                onCancel={closeModal}
                footer={false}
                width={520}
            >
                <Table
                    dataSource={rows}
                    columns={columns}
                    pagination={false}
                    bordered
                />

                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        marginTop: 12,
                        gap: 8,
                    }}
                >
                    <Button onClick={closeModal}>Cancelar</Button>
                    <Button type="primary" onClick={addToCartWithSizes}>
                        Confirmar
                    </Button>
                </div>
            </Modal>
        </>
    );
};

export default Product;