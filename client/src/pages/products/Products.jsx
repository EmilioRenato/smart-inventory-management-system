import { DeleteOutlined, EditOutlined, SearchOutlined } from '@ant-design/icons';
import { Button, Empty, Form, Input, Modal, Select, Table, message } from 'antd';
import axios from 'axios';
import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import LayoutApp from '../../components/Layout';

const Products = () => {
    const dispatch = useDispatch();
    const [form] = Form.useForm();

    // ✅ sacar userId para createdBy
    const [userId, setUserId] = useState(null);

    const [productData, setProductData] = useState([]);
    const [popModal, setPopModal] = useState(false);
    const [editProduct, setEditProduct] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    // ✅ Modal stock por talla
    const [stockModal, setStockModal] = useState(false);
    const [stockProduct, setStockProduct] = useState(null);

    // ======== TALLAS =========
    const shoeSizes = useMemo(() => Array.from({ length: 45 - 36 + 1 }, (_, i) => String(36 + i)), []);
    const letterSizes = useMemo(() => ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'], []);
    const footballNumericSizes = useMemo(() => Array.from({ length: 16 - 6 + 1 }, (_, i) => String(6 + i)), []);

    const categoryWatch = Form.useWatch('category', form);
    const sizeWatch = Form.useWatch('size', form);
    const sizeStockWatch = Form.useWatch('sizeStock', form);

    const [sizeStocksUI, setSizeStocksUI] = useState([]);

    useEffect(() => {
        const auth = localStorage.getItem('auth');
        if (auth) {
            const parsed = JSON.parse(auth);
            setUserId(parsed?._id || null);
        }
    }, []);

    const availableSizes = useMemo(() => {
        if (categoryWatch === 'burgers') return shoeSizes; // Zapatos
        if (categoryWatch === 'drinks') return letterSizes; // Ropa deportiva
        if (categoryWatch === 'pizzas') return [...footballNumericSizes, ...letterSizes]; // Equipo fútbol
        return [];
    }, [categoryWatch, shoeSizes, letterSizes, footballNumericSizes]);

    const calcTotalStock = arr => (arr || []).reduce((sum, x) => sum + Number(x?.stock || 0), 0);

    const mergeSizeStocksSum = (currentList, newEntry) => {
        // si ya existe la talla, SUMA (no reemplaza)
        const idx = currentList.findIndex(x => String(x.size) === String(newEntry.size));
        if (idx >= 0) {
            const updated = [...currentList];
            updated[idx] = {
                size: String(newEntry.size),
                stock: Number(updated[idx].stock || 0) + Number(newEntry.stock || 0),
            };
            return updated;
        }
        return [...currentList, { size: String(newEntry.size), stock: Number(newEntry.stock || 0) }];
    };

    const addSizeToList = () => {
        const size = String(sizeWatch || '').trim();
        const st = Number(sizeStockWatch || 0);

        if (!categoryWatch) return message.error('Selecciona primero la categoría');
        if (!size) return message.error('Selecciona una talla');
        if (!availableSizes.includes(size)) return message.error('Esa talla no es válida para esta categoría');
        if (!Number.isFinite(st) || st <= 0) return message.error('Ingresa un stock válido');

        setSizeStocksUI(prev => mergeSizeStocksSum(prev, { size, stock: st }));
        form.setFieldsValue({ size: undefined, sizeStock: undefined });
    };

    const removeSizeFromList = size => {
        setSizeStocksUI(prev => prev.filter(x => String(x.size) !== String(size)));
    };

    // =============================
    // GET PRODUCTS (GLOBAL)
    // =============================
    const getAllProducts = async () => {
        try {
            dispatch({ type: 'SHOW_LOADING' });
            const { data } = await axios.get('/api/products/getproducts');
            setProductData(Array.isArray(data) ? data : []);
            dispatch({ type: 'HIDE_LOADING' });
        } catch (error) {
            dispatch({ type: 'HIDE_LOADING' });
            console.log(error);
            message.error('Error cargando productos');
        }
    };

    useEffect(() => {
        getAllProducts();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // =============================
    // FILTRO BUSCADOR
    // =============================
    const filteredProducts = useMemo(() => {
        if (!searchQuery) return productData;
        return productData.filter(product => String(product?.name || '').toLowerCase().includes(searchQuery.toLowerCase()));
    }, [productData, searchQuery]);

    // =============================
    // EDITAR
    // =============================
    const handleEdit = record => {
        setEditProduct(record);

        form.setFieldsValue({
            name: record?.name,
            price: record?.price,
            category: record?.category,
            image: record?.image,
            size: undefined,
            sizeStock: undefined,
        });

        setSizeStocksUI(Array.isArray(record?.sizeStocks) ? record.sizeStocks : []);
        setPopModal(true);
    };

    // =============================
    // ELIMINAR
    // =============================
    const handleDelete = async record => {
        try {
            dispatch({ type: 'SHOW_LOADING' });
            await axios.post('/api/products/deleteproducts', { productId: record._id });
            dispatch({ type: 'HIDE_LOADING' });
            message.success('Producto eliminado');
            getAllProducts();
        } catch (error) {
            dispatch({ type: 'HIDE_LOADING' });
            console.log(error);
            message.error('Error eliminando producto');
        }
    };

    const categoryLabel = c => {
        if (c === 'pizzas') return 'Equipo de fútbol';
        if (c === 'burgers') return 'Zapatos';
        if (c === 'drinks') return 'Ropa deportiva';
        return c;
    };

    // ✅ abrir modal stock por talla
    const openStockModal = record => {
        setStockProduct(record);
        setStockModal(true);
    };

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
            render: price => <b>${price}</b>,
        },
        {
            title: 'Stock',
            dataIndex: 'stock',
            render: (stock, record) => (
                <Button type="link" style={{ padding: 0, height: 'auto' }} onClick={() => openStockModal(record)}>
                    {Number(stock) < 10 ? <span style={{ color: 'red' }}>{stock}</span> : <span style={{ color: 'green' }}>{stock}</span>}
                </Button>
            ),
        },
        {
            title: 'Categoría',
            dataIndex: 'category',
            render: c => categoryLabel(c),
        },
        {
            title: 'Acción',
            render: (_, record) => (
                <div>
                    <EditOutlined className="cart-edit mx-2" onClick={() => handleEdit(record)} />
                    <DeleteOutlined className="cart-action" onClick={() => handleDelete(record)} />
                </div>
            ),
        },
    ];

    // =============================
    // GUARDAR PRODUCTO
    // =============================
    const handlerSubmit = async values => {
        try {
            if (!userId) return message.error('No se detectó usuario logueado. Cierra sesión e ingresa de nuevo.');

            const cleanName = String(values?.name || '').trim();
            const cleanImage = String(values?.image || '').trim();

            if (!cleanName) return message.error('Falta el nombre');
            if (!values?.category) return message.error('Falta la categoría');
            if (values?.price === undefined || values?.price === null || values?.price === '') return message.error('Falta el precio');
            if (!cleanImage) return message.error('Falta la URL de imagen');

            if (!sizeStocksUI.length) return message.error('Agrega al menos una talla con stock');

            const payload = {
                name: cleanName,
                category: values.category,
                price: Number(values.price),
                image: cleanImage,
                sizeStocks: sizeStocksUI,
                stock: calcTotalStock(sizeStocksUI),
                createdBy: userId, // ✅ obligatorio
            };

            dispatch({ type: 'SHOW_LOADING' });

            if (editProduct) {
                await axios.put('/api/products/updateproducts', {
                    ...payload,
                    productId: editProduct._id,
                });
                message.success('Producto actualizado');
            } else {
                await axios.post('/api/products/addproducts', payload);
                message.success('Producto agregado');
            }

            dispatch({ type: 'HIDE_LOADING' });

            setPopModal(false);
            setEditProduct(null);
            form.resetFields();
            setSizeStocksUI([]);
            getAllProducts();
        } catch (error) {
            dispatch({ type: 'HIDE_LOADING' });
            console.log(error);
            message.error(error?.response?.data?.message || 'Error guardando producto');
        }
    };

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
                        placeholder="Buscar producto"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        suffix={<SearchOutlined />}
                        style={{ width: 250 }}
                    />

                    <Button
                        className="add-new"
                        onClick={() => {
                            setEditProduct(null);
                            form.resetFields();
                            setSizeStocksUI([]);
                            setPopModal(true);
                        }}
                    >
                        Agregar producto
                    </Button>
                </div>
            </div>

            <Table dataSource={filteredProducts} columns={columns} bordered rowKey="_id" />

            {/* ✅ Modal: Stock por talla */}
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
                                dataSource={stockProduct.sizeStocks}
                                columns={stockColumns}
                                pagination={false}
                                rowKey={(r, i) => `${r.size}-${i}`}
                                bordered
                            />
                            <div style={{ marginTop: 12, textAlign: 'right' }}>
                                <b>Total:</b> {stockProduct.stock}
                            </div>
                        </>
                    ) : (
                        <Empty description="Este producto no tiene tallas registradas" />
                    )}
                </Modal>
            )}

            <Modal
                title={editProduct ? 'Editar producto' : 'Agregar producto'}
                visible={popModal}
                onCancel={() => {
                    setPopModal(false);
                    setEditProduct(null);
                    form.resetFields();
                    setSizeStocksUI([]);
                }}
                footer={false}
            >
                <Form layout="vertical" form={form} onFinish={handlerSubmit}>
                    <Form.Item name="name" label="Nombre" rules={[{ required: true, message: 'Ingresa nombre' }]}>
                        <Input placeholder="Ej: Chaqueta deportiva" />
                    </Form.Item>

                    <Form.Item name="category" label="Categoría" rules={[{ required: true, message: 'Selecciona categoría' }]}>
                        <Select
                            placeholder="Selecciona..."
                            onChange={() => {
                                setSizeStocksUI([]);
                                form.setFieldsValue({ size: undefined, sizeStock: undefined });
                            }}
                        >
                            <Select.Option value="pizzas">Equipo de fútbol</Select.Option>
                            <Select.Option value="burgers">Zapatos</Select.Option>
                            <Select.Option value="drinks">Ropa deportiva</Select.Option>
                        </Select>
                    </Form.Item>

                    {categoryWatch ? (
                        <>
                            <Form.Item name="size" label="Talla">
                                <Select placeholder="Selecciona una talla">
                                    {availableSizes.map(s => (
                                        <Select.Option key={s} value={s}>
                                            {s}
                                        </Select.Option>
                                    ))}
                                </Select>
                            </Form.Item>

                            <Form.Item name="sizeStock" label="Stock de esta talla">
                                <Input type="number" placeholder="Ej: 10" />
                            </Form.Item>

                            <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
                                <Button type="primary" onClick={addSizeToList}>
                                    Agregar talla
                                </Button>

                                <div style={{ marginLeft: 'auto' }}>
                                    <b>Total:</b> {calcTotalStock(sizeStocksUI)}
                                </div>
                            </div>

                            {sizeStocksUI.length ? (
                                <Table
                                    dataSource={sizeStocksUI}
                                    pagination={false}
                                    bordered
                                    rowKey={(r, i) => `${r.size}-${i}`}
                                    columns={[
                                        { title: 'Talla', dataIndex: 'size' },
                                        { title: 'Stock', dataIndex: 'stock' },
                                        {
                                            title: 'Quitar',
                                            render: (_, r) => (
                                                <Button danger onClick={() => removeSizeFromList(r.size)}>
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

                    <Form.Item name="price" label="Precio" rules={[{ required: true, message: 'Ingresa precio' }]}>
                        <Input type="number" />
                    </Form.Item>

                    <Form.Item name="image" label="URL de imagen" rules={[{ required: true, message: 'Ingresa URL de imagen' }]}>
                        <Input placeholder="https://..." />
                    </Form.Item>

                    <div className="form-btn-add">
                        <Button htmlType="submit" className="add-new">
                            {editProduct ? 'Actualizar' : 'Guardar'}
                        </Button>
                    </div>
                </Form>
            </Modal>
        </LayoutApp>
    );
};

export default Products;