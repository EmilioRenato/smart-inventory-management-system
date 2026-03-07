import { Col, Empty, Row, Input } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import axios from 'axios';
import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import LayoutApp from '../../components/Layout';
import Product from '../../components/Product';
import './home.css';

import futbolImg from '../../asset/images/balon.png';
import zapatosImg from '../../asset/images/zapatos.png';
import ropaImg from '../../asset/images/deportes.png';
import allCategories from '../../asset/images/all-cat.png';

const Home = () => {
    const dispatch = useDispatch();

    const [productData, setProductData] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');

    const getAllProducts = async () => {
        try {
            dispatch({ type: 'SHOW_LOADING' });
            const { data } = await axios.get('/api/products/getproducts');
            setProductData(Array.isArray(data) ? data : []);
            dispatch({ type: 'HIDE_LOADING' });
        } catch (error) {
            dispatch({ type: 'HIDE_LOADING' });
            console.log(error);
        }
    };

    useEffect(() => {
        getAllProducts();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const categories = [
        { name: 'all', label: 'Todos', imageUrl: allCategories },
        { name: 'pizzas', label: 'Equipo de fútbol', imageUrl: futbolImg },
        { name: 'burgers', label: 'Zapatos', imageUrl: zapatosImg },
        { name: 'drinks', label: 'Ropa deportiva', imageUrl: ropaImg },
    ];

    const filteredProducts = useMemo(() => {
        let filtered = productData;

        if (selectedCategory !== 'all') {
            filtered = filtered.filter(
                product => product.category === selectedCategory
            );
        }

        if (searchQuery) {
            filtered = filtered.filter(product =>
                String(product?.name || '')
                    .toLowerCase()
                    .includes(searchQuery.toLowerCase())
            );
        }

        return filtered;
    }, [productData, selectedCategory, searchQuery]);

    return (
        <LayoutApp>
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 12,
                    flexWrap: 'wrap',
                    marginBottom: 18,
                }}
            >
                <h2 style={{ margin: 0 }}>Punto de venta</h2>

                <Input
                    placeholder="Buscar producto..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    suffix={<SearchOutlined />}
                    style={{
                        width: '100%',
                        maxWidth: 340,
                        minWidth: 220,
                    }}
                />
            </div>

            {productData.length === 0 ? (
                <div className="no-product">
                    <h3>No se encontraron productos</h3>
                    <Empty />
                </div>
            ) : (
                <>
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns:
                                'repeat(auto-fit, minmax(150px, 1fr))',
                            gap: 12,
                            marginBottom: 20,
                        }}
                    >
                        {categories.map(category => (
                            <div
                                key={category.name}
                                className={`categoryFlex ${
                                    selectedCategory === category.name
                                        ? 'category-active'
                                        : ''
                                }`}
                                onClick={() => setSelectedCategory(category.name)}
                                style={{
                                    cursor: 'pointer',
                                    borderRadius: 14,
                                    padding: 12,
                                    minHeight: 92,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: 10,
                                }}
                            >
                                <h3
                                    className="categoryName"
                                    style={{
                                        margin: 0,
                                        fontSize: 15,
                                        lineHeight: 1.2,
                                    }}
                                >
                                    {category.label}
                                </h3>

                                <img
                                    src={category.imageUrl}
                                    alt={category.label}
                                    style={{
                                        width: 52,
                                        height: 52,
                                        objectFit: 'contain',
                                        flexShrink: 0,
                                    }}
                                />
                            </div>
                        ))}
                    </div>

                    <Row gutter={[16, 16]}>
                        {filteredProducts.length === 0 ? (
                            <Col span={24}>
                                <Empty description="No se encontraron productos" />
                            </Col>
                        ) : (
                            filteredProducts.map(product => (
                                <Col
                                    xs={24}
                                    sm={12}
                                    md={12}
                                    lg={8}
                                    xl={6}
                                    key={product._id}
                                >
                                    <Product
                                        product={product}
                                        enableSizeSelect={true}
                                    />
                                </Col>
                            ))
                        )}
                    </Row>
                </>
            )}
        </LayoutApp>
    );
};

export default Home;