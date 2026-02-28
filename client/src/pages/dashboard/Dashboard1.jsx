import React, { useEffect, useState, useMemo } from 'react';
import { Card, Row, Col, Table } from 'antd';
import axios from 'axios';
import LayoutApp from '../../components/Layout';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#845EC2'];

const Dashboard1 = () => {
  const [bills, setBills] = useState([]);
  const [products, setProducts] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const billsRes = await axios.get('/api/bills/getbills');
        const productsRes = await axios.get('/api/products/getproducts');

        setBills(Array.isArray(billsRes.data) ? billsRes.data : []);
        setProducts(Array.isArray(productsRes.data) ? productsRes.data : []);
      } catch (error) {
        console.log(error);
      }
    };

    fetchData();
  }, []);

  // ===========================
  // 🔹 MÉTRICAS VENTAS
  // ===========================

  const totalSales = useMemo(
    () =>
      bills.reduce(
        (sum, bill) => sum + Number(bill.paidTotal || 0),
        0
      ),
    [bills]
  );

  const totalUnits = useMemo(
    () =>
      bills.reduce(
        (sum, bill) =>
          sum +
          bill.cartItems.reduce(
            (acc, item) => acc + Number(item.quantity || 0),
            0
          ),
        0
      ),
    [bills]
  );

  const avgTicket = useMemo(
    () => (bills.length ? totalSales / bills.length : 0),
    [bills, totalSales]
  );

  const totalDiscount = useMemo(
    () =>
      bills.reduce(
        (sum, bill) => sum + Number(bill.discountAmount || 0),
        0
      ),
    [bills]
  );

  // ===========================
  // 🔹 VENTAS POR VENDEDOR
  // ===========================

  const salesBySeller = useMemo(() => {
    const map = {};

    bills.forEach(bill => {
      if (!bill.sellerName) return;

      if (!map[bill.sellerName]) {
        map[bill.sellerName] = {
          name: bill.sellerName,
          value: 0,
        };
      }

      map[bill.sellerName].value += Number(bill.paidTotal || 0);
    });

    return Object.values(map);
  }, [bills]);

  // ===========================
  // 🔹 INVENTARIO
  // ===========================

  const lowStockProducts = useMemo(
    () => products.filter(p => Number(p.stock || 0) > 0 && Number(p.stock) <= 10),
    [products]
  );

  const outOfStockProducts = useMemo(
    () => products.filter(p => Number(p.stock || 0) === 0),
    [products]
  );

  const totalStock = useMemo(
    () =>
      products.reduce(
        (sum, p) => sum + Number(p.stock || 0),
        0
      ),
    [products]
  );

  return (
    <LayoutApp>
      <h2>Dashboard General</h2>

      {/* MÉTRICAS PRINCIPALES */}
      <Row gutter={16}>
        <Col span={6}>
          <Card title="Ventas Totales">
            ${totalSales.toFixed(2)}
          </Card>
        </Col>

        <Col span={6}>
          <Card title="Ticket Promedio">
            ${avgTicket.toFixed(2)}
          </Card>
        </Col>

        <Col span={6}>
          <Card title="Unidades Vendidas">
            {totalUnits}
          </Card>
        </Col>

        <Col span={6}>
          <Card title="Descuentos Aplicados">
            ${totalDiscount.toFixed(2)}
          </Card>
        </Col>
      </Row>

      <br />

      {/* INVENTARIO */}
      <Row gutter={16}>
        <Col span={8}>
          <Card title="Total Productos">
            {products.length}
          </Card>
        </Col>

        <Col span={8}>
          <Card title="Stock Total">
            {totalStock}
          </Card>
        </Col>

        <Col span={8}>
          <Card title="Productos con Poco Stock">
            {lowStockProducts.length}
          </Card>
        </Col>
      </Row>

      <br />

      {/* TABLAS INVENTARIO */}
      <Row gutter={16}>
        <Col span={12}>
          <Card title="⚠ Productos con Poco Stock">
            <Table
              dataSource={lowStockProducts}
              columns={[
                { title: 'Producto', dataIndex: 'name' },
                { title: 'Stock', dataIndex: 'stock' },
              ]}
              pagination={false}
              rowKey="_id"
            />
          </Card>
        </Col>

        <Col span={12}>
          <Card title="❌ Sin Stock">
            <Table
              dataSource={outOfStockProducts}
              columns={[
                { title: 'Producto', dataIndex: 'name' },
              ]}
              pagination={false}
              rowKey="_id"
            />
          </Card>
        </Col>
      </Row>

      <br />

      {/* GRÁFICO PASTEL */}
      <Card title="Ventas por Vendedor">
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={salesBySeller}
              dataKey="value"
              nameKey="name"
              outerRadius={100}
              label
            >
              {salesBySeller.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </Card>
    </LayoutApp>
  );
};

export default Dashboard1;