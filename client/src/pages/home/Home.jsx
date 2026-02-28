import { Col, Empty, Row } from 'antd';
import axios from 'axios';
import React, { useEffect, useState } from 'react';
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

    // 🔥 Ahora GLOBAL (sin createdBy)
    useEffect(() => {
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

        getAllProducts();
    }, [dispatch]);

    const categories = [
        { name: 'all', label: 'Todos', imageUrl: allCategories },
        { name: 'futbol', label: 'Equipo de fútbol', imageUrl: futbolImg },
        { name: 'zapatos', label: 'Zapatos', imageUrl: zapatosImg },
        { name: 'ropa', label: 'Ropa deportiva', imageUrl: ropaImg },
    ];

    const filteredProducts =
        selectedCategory === 'all'
            ? productData
            : productData.filter(
                  product => product.category === selectedCategory
              );

    return (
        <LayoutApp>
            <h2>Punto de venta</h2>

            {productData.length === 0 ? (
                <div className="no-product">
                    <h3 className="no-product-text">
                        No se encontraron productos
                    </h3>
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
                        {filteredProducts.map(product => (
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
                        ))}
                    </Row>
                </>
            )}
        </LayoutApp>
    );
};

export default Home;