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

    // =============================
    // GET PRODUCTS GLOBAL
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
        }
    };

    useEffect(() => {
        getAllProducts();
    }, []);

    const categories = [
        { name: 'all', label: 'Todos', imageUrl: allCategories },
        { name: 'pizzas', label: 'Equipo de fútbol', imageUrl: futbolImg },
        { name: 'burgers', label: 'Zapatos', imageUrl: zapatosImg },
        { name: 'drinks', label: 'Ropa deportiva', imageUrl: ropaImg },
    ];

    // =============================
    // FILTRO POR CATEGORÍA + BUSCADOR
    // =============================
    const filteredProducts = useMemo(() => {
        let filtered = productData;

        if (selectedCategory !== 'all') {
            filtered = filtered.filter(
                product => product.category === selectedCategory
            );
        }

        if (searchQuery) {
            filtered = filtered.filter(product =>
                product.name.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        return filtered;
    }, [productData, selectedCategory, searchQuery]);

    return (
        <LayoutApp>
            <div className="d-flex justify-content-between align-items-center mb-3">
                <h2>Punto de venta</h2>

                <Input
                    placeholder="Buscar producto..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    suffix={<SearchOutlined />}
                    style={{ width: 250 }}
                />
            </div>

            {productData.length === 0 ? (
                <div className="no-product">
                    <h3>No se encontraron productos</h3>
                    <Empty />
                </div>
            ) : (
                <>
                    <div className="category">
                        {categories.map(category => (
                            <div
                                key={category.name}
                                className={`categoryFlex ${
                                    selectedCategory === category.name
                                        ? 'category-active'
                                        : ''
                                }`}
                                onClick={() =>
                                    setSelectedCategory(category.name)
                                }
                            >
                                <h3 className="categoryName">
                                    {category.label}
                                </h3>
                                <img
                                    src={category.imageUrl}
                                    alt={category.label}
                                    height={60}
                                    width={60}
                                />
                            </div>
                        ))}
                    </div>

                    <Row>
                        {filteredProducts.length === 0 ? (
                            <Col span={24}>
                                <Empty description="No se encontraron productos" />
                            </Col>
                        ) : (
                            filteredProducts.map(product => (
                                <Col
                                    xs={24}
                                    sm={6}
                                    md={6}
                                    lg={6}
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