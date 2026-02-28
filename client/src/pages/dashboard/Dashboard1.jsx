import React, { useEffect, useMemo, useState } from 'react';
import { Card, Col, Row, Select, Table, message as antdMessage } from 'antd';
import axios from 'axios';
import LayoutApp from '../../components/Layout';
import { useNavigate } from 'react-router-dom';

const Dashboard1 = () => {
    const navigate = useNavigate();

    // ✅ Bloqueo: solo ADMIN puede ver
    useEffect(() => {
        const auth = localStorage.getItem('auth') ? JSON.parse(localStorage.getItem('auth')) : null;
        if (!auth || auth.role !== 'admin') {
            antdMessage.error('No tienes permisos para ver el Dashboard');
            navigate('/');
        }
    }, [navigate]);

    const [bills, setBills] = useState([]);
    const [range, setRange] = useState('30D'); // ALL | TODAY | 7D | 30D
    const [loading, setLoading] = useState(false);

    const getBills = async () => {
        try {
            setLoading(true);

            // ✅ SIN createdBy -> dashboard global (pero igual solo lo ve admin)
            const { data } = await axios.get('/api/bills/getbills');
            setBills(Array.isArray(data) ? data : []);

            setLoading(false);
        } catch (err) {
            setLoading(false);
            antdMessage.error('Error cargando facturas');
            console.log(err);
        }
    };

    useEffect(() => {
        getBills();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fromDate = useMemo(() => {
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        if (range === 'TODAY') return startOfToday;
        if (range === '7D') return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        if (range === '30D') return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        return null; // ALL
    }, [range]);

    const filteredBills = useMemo(() => {
        if (!fromDate) return bills;
        return bills.filter(b => new Date(b.createdAt) >= fromDate);
    }, [bills, fromDate]);

    const { kpis, productAgg, sizeAgg } = useMemo(() => {
        let totalSales = 0;
        let totalBills = 0;
        let totalUnits = 0;

        const byProduct = {}; // key -> {name, category, units, revenue, lastSale}
        const bySize = {}; // key -> {name, size, units}

        filteredBills.forEach(bill => {
            totalBills += 1;
            totalSales += Number(bill.totalAmount || 0);

            const billDate = new Date(bill.createdAt);
            const items = Array.isArray(bill.cartItems) ? bill.cartItems : [];

            items.forEach(item => {
                const qty = Number(item.quantity || 0);
                const price = Number(item.price || 0);
                totalUnits += qty;

                const productKey = item.productId
                    ? String(item.productId)
                    : `${String(item.name || '').trim()}|${String(item.category || '').trim()}`;

                if (!byProduct[productKey]) {
                    byProduct[productKey] = {
                        name: item.name || 'Sin nombre',
                        category: item.category || '-',
                        units: 0,
                        revenue: 0,
                        lastSale: billDate,
                    };
                }

                byProduct[productKey].units += qty;
                byProduct[productKey].revenue += qty * price;

                if (billDate > byProduct[productKey].lastSale) {
                    byProduct[productKey].lastSale = billDate;
                }

                // top por talla
                const size = item.selectedSize ? String(item.selectedSize) : null;
                if (size) {
                    const sizeKey = `${productKey}|${size}`;
                    if (!bySize[sizeKey]) {
                        bySize[sizeKey] = {
                            name: item.name || 'Sin nombre',
                            size,
                            units: 0,
                        };
                    }
                    bySize[sizeKey].units += qty;
                }
            });
        });

        const productAggArr = Object.values(byProduct).map(x => ({
            ...x,
            lastSaleText: x.lastSale ? x.lastSale.toISOString().substring(0, 10) : '-',
        }));

        const sizeAggArr = Object.values(bySize);

        return {
            kpis: {
                totalSales,
                totalBills,
                totalUnits,
                avgTicket: totalBills ? totalSales / totalBills : 0,
            },
            productAgg: productAggArr,
            sizeAgg: sizeAggArr,
        };
    }, [filteredBills]);

    const mostSold = useMemo(() => {
        return [...productAgg].sort((a, b) => b.units - a.units).slice(0, 10);
    }, [productAgg]);

    const leastSold = useMemo(() => {
        return [...productAgg]
            .filter(p => p.units > 0)
            .sort((a, b) => a.units - b.units)
            .slice(0, 10);
    }, [productAgg]);

    const topSizes = useMemo(() => {
        return [...sizeAgg].sort((a, b) => b.units - a.units).slice(0, 10);
    }, [sizeAgg]);

    const columnsProducts = [
        { title: 'Producto', dataIndex: 'name' },
        { title: 'Categoría', dataIndex: 'category' },
        { title: 'Unidades', dataIndex: 'units' },
        {
            title: 'Ventas ($)',
            dataIndex: 'revenue',
            render: v => `$${Number(v || 0).toFixed(2)}`,
        },
        { title: 'Última venta', dataIndex: 'lastSaleText' },
    ];

    const columnsSizes = [
        { title: 'Producto', dataIndex: 'name' },
        { title: 'Talla', dataIndex: 'size' },
        { title: 'Unidades', dataIndex: 'units' },
    ];

    return (
        <LayoutApp>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ margin: 0 }}>Dashboard</h2>

                <Select value={range} onChange={setRange} style={{ width: 220 }}>
                    <Select.Option value="TODAY">Hoy</Select.Option>
                    <Select.Option value="7D">Últimos 7 días</Select.Option>
                    <Select.Option value="30D">Últimos 30 días</Select.Option>
                    <Select.Option value="ALL">Todo</Select.Option>
                </Select>
            </div>

            <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
                <Col xs={24} md={6}>
                    <Card>
                        <div style={{ fontSize: 12, opacity: 0.8 }}>Ventas</div>
                        <div style={{ fontSize: 24, fontWeight: 800 }}>${kpis.totalSales.toFixed(2)}</div>
                    </Card>
                </Col>
                <Col xs={24} md={6}>
                    <Card>
                        <div style={{ fontSize: 12, opacity: 0.8 }}>Facturas</div>
                        <div style={{ fontSize: 24, fontWeight: 800 }}>{kpis.totalBills}</div>
                    </Card>
                </Col>
                <Col xs={24} md={6}>
                    <Card>
                        <div style={{ fontSize: 12, opacity: 0.8 }}>Ticket promedio</div>
                        <div style={{ fontSize: 24, fontWeight: 800 }}>${kpis.avgTicket.toFixed(2)}</div>
                    </Card>
                </Col>
                <Col xs={24} md={6}>
                    <Card>
                        <div style={{ fontSize: 12, opacity: 0.8 }}>Unidades vendidas</div>
                        <div style={{ fontSize: 24, fontWeight: 800 }}>{kpis.totalUnits}</div>
                    </Card>
                </Col>
            </Row>

            <Row gutter={[16, 16]} style={{ marginTop: 8 }}>
                <Col xs={24} lg={12}>
                    <Card title="Top 10 productos más vendidos">
                        <Table
                            dataSource={mostSold}
                            columns={columnsProducts}
                            rowKey={(r, i) => `${r.name}-${r.category}-${i}`}
                            pagination={false}
                            loading={loading}
                        />
                    </Card>
                </Col>

                <Col xs={24} lg={12}>
                    <Card title="Top 10 productos menos vendidos">
                        <Table
                            dataSource={leastSold}
                            columns={columnsProducts}
                            rowKey={(r, i) => `${r.name}-${r.category}-${i}`}
                            pagination={false}
                            loading={loading}
                        />
                    </Card>
                </Col>

                <Col xs={24}>
                    <Card title="Top 10 tallas más vendidas">
                        <Table
                            dataSource={topSizes}
                            columns={columnsSizes}
                            rowKey={(r, i) => `${r.name}-${r.size}-${i}`}
                            pagination={false}
                            loading={loading}
                        />
                    </Card>
                </Col>
            </Row>
        </LayoutApp>
    );
};

export default Dashboard1;