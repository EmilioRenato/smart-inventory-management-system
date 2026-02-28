import { DeleteOutlined, EditOutlined, SearchOutlined } from '@ant-design/icons';
import { Button, Empty, Form, Input, Modal, Select, Table, message } from 'antd';
import axios from 'axios';
import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import LayoutApp from '../../components/Layout';


const Products = () => {
    const dispatch = useDispatch();

    // ✅ Hooks siempre arriba (no condicionales)
    const [userId, setUserId] = useState(null);

    const [productData, setProductData] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');

    const [popModal, setPopModal] = useState(false);
    const [editProduct, setEditProduct] = useState(null);

    const [stockModal, setStockModal] = useState(false);
    const [stockProduct, setStockProduct] = useState(null);

    const [form] = Form.useForm();

    // UI tallas
    const [sizeStocksUI, setSizeStocksUI] = useState([]);
    const [size, setSize] = useState(undefined);
    const [sizeStock, setSizeStock] = useState('');

    // ✅ leer userId
    useEffect(() => {
        const auth = localStorage.getItem('auth');
        if (auth) {
            const parsed = JSON.parse(auth);
            setUserId(parsed?._id || null);
        }
    }, []);

    // ===== opciones de tallas =====
    const shoeSizes = useMemo(() => Array.from({ length: 45 - 36 + 1 }, (_, i) => String(36 + i)), []);
    const letterSizes = useMemo(() => ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'], []);
    const footballNumericSizes = useMemo(() => Array.from({ length: 16 - 6 + 1 }, (_, i) => String(6 + i)), []);

    const categoryWatch = Form.useWatch('category', form);

    const availableSizes = useMemo(() => {
        if (categoryWatch === 'burgers') return shoeSizes; // zapatos
        if (categoryWatch === 'drinks') return letterSizes; // ropa
        if (categoryWatch === 'pizzas') return [...footballNumericSizes, ...letterSizes]; // equipo fútbol (mixto)
        return [];
    }, [categoryWatch, shoeSizes, letterSizes, footballNumericSizes]);

    const calcTotalStock = list => (list || []).reduce((sum, x) => sum + Number(x?.stock || 0), 0);

    const normalizeSizeStocks = list =>
        (Array.isArray(list) ? list : [])
            .map(x => ({ size: String(x.size), stock: Number(x.stock || 0) }))
            .filter(x => x.size);

    // ✅ sumar stock si talla existe
    const addOrSumSize = () => {
        if (!categoryWatch) return message.error('Selecciona primero la categoría');
        if (!size) return message.error('Selecciona una talla');
        if (!availableSizes.includes(String(size))) return message.error('Esa talla no es válida para esta categoría');

        const st = Number(sizeStock);
        if (!Number.isFinite(st) || st <= 0) return message.error('Ingresa un stock válido');

        setSizeStocksUI(prev => {
            const current = normalizeSizeStocks(prev);
            const idx = current.findIndex(x => x.size === String(size));
            if (idx >= 0) {
                // ✅ SUMA, no reemplaza
                const updated = [...current];
                updated[idx] = { ...updated[idx], stock: updated[idx].stock + st };
                return updated;
            }
            return [...current, { size: String(size), stock: st }];
        });

        setSize(undefined);
        setSizeStock('');
    };

    const removeSize = s => {
        setSizeStocksUI(prev => normalizeSizeStocks(prev).filter(x => x.size !== String(s)));
    };

    // ===== GET products =====
    const getAllProducts = async (search = '') => {
        try {
            if (!userId) return;

            dispatch({ type: 'SHOW_LOADING' });

            const { data } = await axios.get('/api/products/getproducts', {
                params: { createdBy: userId, search },
            });

            setProductData(Array.isArray(data) ? data : []);

            dispatch({ type: 'HIDE_LOADING' });
        } catch (error) {
            dispatch({ type: 'HIDE_LOADING' });
            console.log(error);
        }
    };

    useEffect(() => {
        if (!userId) return;
        getAllProducts('');
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId]);

    useEffect(() => {
        if (!userId) return;
        const timer = setTimeout(() => getAllProducts(searchQuery), 300);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchQuery, userId]);

    // ===== delete =====
    const handlerDelete = async record => {
        try {
            dispatch({ type: 'SHOW_LOADING' });
            await axios.post('/api/products/deleteproducts', { productId: record._id });
            message.success('Producto eliminado correctamente');
            dispatch({ type: 'HIDE_LOADING' });
            getAllProducts(searchQuery);
        } catch (error) {
            dispatch({ type: 'HIDE_LOADING' });
            message.error('Error al eliminar');
            console.log(error);
        }
    };

    // ===== stock modal =====
    const openStockModal = record => {
        setStockProduct(record);
        setStockModal(true);
    };

    // ===== submit add/edit =====
    const handlerSubmit = async values => {
        try {
            if (!userId) return message.error('Usuario no autenticado');
            const cleanName = String(values.name || '').trim();
            if (!cleanName) return message.error('Ingresa el nombre');

            const finalSizes = normalizeSizeStocks(sizeStocksUI);
            if (!finalSizes.length) return message.error('Agrega al menos una talla');

            const payload = {
                name: cleanName,
                category: values.category,
                price: Number(values.price),
                image: values.image,
                createdBy: userId,
                sizeStocks: finalSizes,
                stock: calcTotalStock(finalSizes),
            };

            dispatch({ type: 'SHOW_LOADING' });

            if (editProduct?._id) {
                await axios.put('/api/products/updateproducts', {
                    ...payload,
                    productId: editProduct._id,
                });
                message.success('Producto actualizado');
            } else {
                await axios.post('/api/products/addproducts', payload);
                message.success('Producto creado');
            }

            dispatch({ type: 'HIDE_LOADING' });

            setPopModal(false);
            setEditProduct(null);
            form.resetFields();
            setSizeStocksUI([]);
            setSize(undefined);
            setSizeStock('');

            getAllProducts(searchQuery);
        } catch (error) {
            dispatch({ type: 'HIDE_LOADING' });
            message.error(error?.response?.data?.message || 'Error');
            console.log(error);
        }
    };

    // ===== table columns =====
    const columns = [
        { title: 'Nombre', dataIndex: 'name' },
        {
            title: 'Imagen',
            dataIndex: 'image',
            render: (image, record) => (
                <img
                    src={image}
                    alt={record.name}
                    height={60}
                    width={60}
                    style={{ objectFit: 'cover' }}
                    onError={e => {
                        e.currentTarget.src = 'https://via.placeholder.com/60?text=IMG';
                    }}
                />
            ),
        },
        {
            title: 'Precio',
            dataIndex: 'price',
            render: price => <span>${price}</span>,
        },
        {
            title: 'Stock',
            dataIndex: 'stock',
            render: (stock, record) => (
                <Button type="link" style={{ padding: 0 }} onClick={() => openStockModal(record)}>
                    {Number(stock) < 10 ? (
                        <span style={{ color: 'red' }}>{stock}</span>
                    ) : (
                        <span style={{ color: 'green' }}>{stock}</span>
                    )}
                </Button>
            ),
        },
        {
            title: 'Acciones',
            render: (_, record) => (
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <EditOutlined
                        className="cart-edit"
                        onClick={() => {
                            setEditProduct(record);
                            setPopModal(true);

                            form.setFieldsValue({
                                name: record.name,
                                category: record.category,
                                price: record.price,
                                image: record.image,
                            });

                            setSizeStocksUI(normalizeSizeStocks(record.sizeStocks));
                            setSize(undefined);
                            setSizeStock('');
                        }}
                    />
                    <DeleteOutlined className="cart-action" onClick={() => handlerDelete(record)} />
                </div>
            ),
        },
    ];

    const stockColumns = [
        { title: 'Talla', dataIndex: 'size' },
        { title: 'Stock', dataIndex: 'stock' },
    ];

    return (
        <LayoutApp>
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2>Productos</h2>

                <div className="d-flex gap-3">
                    <Input
                        placeholder="Buscar por nombre del producto"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        style={{ width: 240 }}
                        suffix={<SearchOutlined />}
                    />

                    <Button
                        className="add-new"
                        onClick={() => {
                            setEditProduct(null);
                            setPopModal(true);
                            form.resetFields();
                            setSizeStocksUI([]);
                            setSize(undefined);
                            setSizeStock('');
                        }}
                    >
                        Agregar producto
                    </Button>
                </div>
            </div>

            <Table
                dataSource={productData}
                columns={columns}
                bordered
                pagination={false}
                rowKey="_id"
                locale={{
                    emptyText: searchQuery ? 'No se encontraron productos' : 'No hay productos',
                }}
            />

            {/* Modal stock por talla */}
            {stockModal && (
                <Modal
                    title={`Stock por talla${stockProduct?.name ? `: ${stockProduct.name}` : ''}`}
                    visible={stockModal}
                    onCancel={() => {
                        setStockModal(false);
                        setStockProduct(null);
                    }}
                    footer={false}
                    width={420}
                >
                    {Array.isArray(stockProduct?.sizeStocks) && stockProduct.sizeStocks.length ? (
                        <>
                            <Table
                                dataSource={normalizeSizeStocks(stockProduct.sizeStocks)}
                                columns={stockColumns}
                                pagination={false}
                                bordered
                                rowKey={(r, i) => `${r.size}-${i}`}
                            />
                            <div style={{ marginTop: 12, textAlign: 'right' }}>
                                <b>Total:</b> {stockProduct?.stock ?? 0}
                            </div>
                        </>
                    ) : (
                        <Empty description="Este producto no tiene tallas registradas" />
                    )}
                </Modal>
            )}

            {/* Modal agregar/editar */}
            {popModal && (
                <Modal
                    title={editProduct ? 'Editar producto' : 'Agregar producto'}
                    visible={popModal}
                    onCancel={() => {
                        setPopModal(false);
                        setEditProduct(null);
                        form.resetFields();
                        setSizeStocksUI([]);
                        setSize(undefined);
                        setSizeStock('');
                    }}
                    footer={false}
                >
                    <Form layout="vertical" onFinish={handlerSubmit} form={form}>
                        <Form.Item
                            name="name"
                            label="Nombre"
                            rules={[{ required: true, message: 'Ingresa el nombre' }]}
                        >
                            <Input placeholder="Ej: Chaquetas deportivas" />
                        </Form.Item>

                        <Form.Item
                            name="category"
                            label="Categoría"
                            rules={[{ required: true, message: 'Selecciona una categoría' }]}
                        >
                            <Select
                                onChange={() => {
                                    setSizeStocksUI([]);
                                    setSize(undefined);
                                    setSizeStock('');
                                }}
                            >
                                <Select.Option value="pizzas">Equipo de fútbol</Select.Option>
                                <Select.Option value="burgers">Zapatos</Select.Option>
                                <Select.Option value="drinks">Ropa deportiva</Select.Option>
                            </Select>
                        </Form.Item>

                        {categoryWatch ? (
                            <>
                                <Form.Item label="Talla">
                                    <Select
                                        value={size}
                                        onChange={v => setSize(v)}
                                        placeholder="Selecciona una talla"
                                    >
                                        {availableSizes.map(s => (
                                            <Select.Option key={s} value={s}>
                                                {s}
                                            </Select.Option>
                                        ))}
                                    </Select>
                                </Form.Item>

                                <Form.Item label="Stock a agregar (se suma)">
                                    <Input
                                        value={sizeStock}
                                        onChange={e => setSizeStock(e.target.value)}
                                        placeholder="Ej: 10"
                                    />
                                </Form.Item>

                                <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                                    <Button type="primary" onClick={addOrSumSize}>
                                        Agregar stock a talla
                                    </Button>
                                    <div style={{ marginLeft: 'auto' }}>
                                        <b>Total:</b> {calcTotalStock(sizeStocksUI)}
                                    </div>
                                </div>

                                {sizeStocksUI.length ? (
                                    <Table
                                        dataSource={normalizeSizeStocks(sizeStocksUI)}
                                        pagination={false}
                                        bordered
                                        rowKey={(r, i) => `${r.size}-${i}`}
                                        columns={[
                                            { title: 'Talla', dataIndex: 'size' },
                                            { title: 'Stock', dataIndex: 'stock' },
                                            {
                                                title: 'Quitar',
                                                render: (_, r) => (
                                                    <Button danger onClick={() => removeSize(r.size)}>
                                                        Quitar
                                                    </Button>
                                                ),
                                            },
                                        ]}
                                    />
                                ) : (
                                    <Empty description="Aún no agregas tallas" />
                                )}
                            </>
                        ) : (
                            <Empty description="Selecciona una categoría para habilitar tallas" />
                        )}

                        <Form.Item
                            name="price"
                            label="Precio"
                            rules={[{ required: true, message: 'Ingresa el precio' }]}
                        >
                            <Input placeholder="Ej: 20" />
                        </Form.Item>

                        <Form.Item
                            name="image"
                            label="URL de imagen"
                            rules={[{ required: true, message: 'Ingresa la URL de imagen' }]}
                        >
                            <Input placeholder="https://..." />
                        </Form.Item>

                        <div className="form-btn-add">
                            <Button htmlType="submit" className="add-new">
                                {editProduct ? 'Guardar' : 'Agregar'}
                            </Button>
                        </div>
                    </Form>
                </Modal>
            )}
        </LayoutApp>
    );
};

export default Products;