import React, { useEffect, useMemo, useState } from 'react';
import { Card, Col, Row, Table, Tag, message, Tabs, Progress, Button } from 'antd';
import axios from 'axios';
import LayoutApp from '../../components/Layout';

const { TabPane } = Tabs;

const colorByLevel = lvl => {
  if (lvl === 'red') return 'red';
  if (lvl === 'yellow') return 'gold';
  if (lvl === 'green') return 'green';
  return 'default';
};

const labelByLevel = lvl => {
  if (lvl === 'red') return 'Crítico';
  if (lvl === 'yellow') return 'Bajo';
  if (lvl === 'green') return 'Ok';
  return 'Sin tallas';
};

// Pie chart simple con conic-gradient (sin librerías)
const SellerPie = ({ data }) => {
  const total = data.reduce((s, x) => s + Number(x.value || 0), 0);
  const safe = total > 0 ? total : 1;

  const colors = ['#1677ff', '#52c41a', '#faad14', '#eb2f96', '#13c2c2', '#722ed1', '#f5222d', '#2f54eb'];
  let acc = 0;

  const stops = data.map((d, idx) => {
    const pct = (Number(d.value || 0) / safe) * 100;
    const start = acc;
    const end = acc + pct;
    acc = end;
    const c = colors[idx % colors.length];
    return { ...d, pct, start, end, color: c };
  });

  const bg = `conic-gradient(${stops.map(s => `${s.color} ${s.start}% ${s.end}%`).join(', ')})`;

  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
      <div
        style={{
          width: 170,
          height: 170,
          borderRadius: '50%',
          background: bg,
          boxShadow: '0 10px 20px rgba(0,0,0,0.08)',
          border: '6px solid #fff',
        }}
        title="Ventas por vendedor"
      />
      <div style={{ minWidth: 260 }}>
        {stops.slice(0, 8).map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: s.color, display: 'inline-block' }} />
            <span style={{ fontWeight: 700 }}>{s.label}</span>
            <span style={{ marginLeft: 'auto', opacity: 0.8 }}>
              ${Number(s.value || 0).toFixed(2)} ({s.pct.toFixed(1)}%)
            </span>
          </div>
        ))}
        {data.length > 8 && <div style={{ opacity: 0.7 }}>+ {data.length - 8} vendedores más</div>}
      </div>
    </div>
  );
};

const Dashboard1 = () => {
  const [summary, setSummary] = useState(null);

  const fetchSummary = async () => {
    try {
      const { data } = await axios.get('/api/dashboard/summary');
      setSummary(data);
    } catch (err) {
      console.log(err);
      message.error('Error cargando dashboard');
    }
  };

  // ✅ Descarga Excel SIN usar React Router
  const downloadCustomersExcel = async () => {
    try {
      const res = await axios.get('/api/customers/export-excel', {
        responseType: 'blob',
      });

      const blob = new Blob([res.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `clientes_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.log(err);
      message.error('No se pudo descargar el Excel (revisa backend / ruta).');
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  const kpi = summary?.kpi || {};
  const users = summary?.users || [];
  const inventory = summary?.inventory || {};
  const sellers = summary?.sellers || {};
  const series = summary?.series || {};
  const productStats = summary?.products || {};

  const pieData = useMemo(() => {
    const list = Array.isArray(sellers.list) ? sellers.list : [];
    const top = list.slice(0, 6);
    const rest = list.slice(6);

    const mapped = top.map(s => ({
      label: `${s.sellerName} (${s.sellerCode})`,
      value: Number(s.paidTotal || 0),
    }));

    const otherVal = rest.reduce((sum, x) => sum + Number(x.paidTotal || 0), 0);
    if (rest.length) mapped.push({ label: 'Otros', value: Number(otherVal.toFixed(2)) });

    return mapped.filter(x => x.value > 0);
  }, [sellers]);

  const userColumns = [
    { title: 'Nombre', dataIndex: 'name' },
    { title: 'Correo', dataIndex: 'email' },
    {
      title: 'Rol',
      dataIndex: 'role',
      render: r => (r === 'admin' ? <Tag color="gold">ADMIN</Tag> : <Tag color="blue">ASESOR</Tag>),
    },
    { title: 'Código', dataIndex: 'code', render: c => <b>{c}</b> },
    { title: 'Creado', dataIndex: 'createdAt', render: d => (d ? new Date(d).toLocaleDateString() : '') },
  ];

  const invColumns = [
    { title: 'Producto', dataIndex: 'name' },
    { title: 'Categoría', dataIndex: 'categoryLabel' },
    { title: 'Stock total', dataIndex: 'stock', render: v => <b>{v}</b> },
    {
      title: 'Estado por tallas',
      render: (_, r) => <Tag color={colorByLevel(r.healthLevel)}>{labelByLevel(r.healthLevel)}</Tag>,
    },
    {
      title: 'Mínimo por talla',
      dataIndex: 'minSizeStock',
      render: v => (v === null || v === undefined ? <span style={{ opacity: 0.7 }}>—</span> : <b>{v}</b>),
    },
  ];

  const sellerColumns = [
    {
      title: 'Vendedor',
      render: (_, r) => (
        <div>
          <div style={{ fontWeight: 800 }}>{r.sellerName}</div>
          <div style={{ fontSize: 12, opacity: 0.7 }}>
            Código: <b>{r.sellerCode}</b>
          </div>
        </div>
      ),
    },
    { title: 'Ventas ($)', dataIndex: 'paidTotal', render: v => <b>${Number(v || 0).toFixed(2)}</b> },
    { title: 'Notas', dataIndex: 'billsCount', render: v => <b>{v}</b> },
    { title: 'Unidades', dataIndex: 'units', render: v => <b>{v}</b> },
    { title: 'Ticket prom.', dataIndex: 'ticketAvg', render: v => <b>${Number(v || 0).toFixed(2)}</b> },
    {
      title: 'Descuento',
      dataIndex: 'discountPct',
      render: v => (
        <div style={{ minWidth: 130 }}>
          <Progress percent={Math.min(100, Number(v || 0))} size="small" />
          <div style={{ fontSize: 12, opacity: 0.75 }}>{Number(v || 0).toFixed(2)}%</div>
        </div>
      ),
    },
  ];

  const seriesCols = labelKey => [
    { title: labelKey === 'date' ? 'Día' : labelKey === 'month' ? 'Mes' : 'Año', dataIndex: labelKey },
    { title: 'Ventas ($)', dataIndex: 'total', render: v => <b>${Number(v || 0).toFixed(2)}</b> },
    { title: 'Notas', dataIndex: 'count', render: v => <b>{v}</b> },
  ];

  const topProdCols = [
    { title: 'Producto', dataIndex: 'name' },
    { title: 'Unidades', dataIndex: 'units', render: v => <b>{v}</b> },
    { title: 'Ingreso (aprox.)', dataIndex: 'revenue', render: v => <b>${Number(v || 0).toFixed(2)}</b> },
  ];

  if (!summary) {
    return (
      <LayoutApp>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h2 style={{ margin: 0 }}>Dashboard</h2>
          <Button type="primary" onClick={downloadCustomersExcel}>
            Exportar clientes (Excel)
          </Button>
        </div>
        <div style={{ opacity: 0.7 }}>Cargando...</div>
      </LayoutApp>
    );
  }

  const KpiCard = ({ title, value, sub }) => (
    <Card>
      <div style={{ fontSize: 12, opacity: 0.7 }}>{title}</div>
      <div style={{ fontSize: 26, fontWeight: 900 }}>{value}</div>
      {sub ? <div style={{ fontSize: 12, opacity: 0.75, marginTop: 6 }}>{sub}</div> : null}
    </Card>
  );

  const today = kpi.today || {};
  const month = kpi.month || {};
  const year = kpi.year || {};

  return (
    <LayoutApp>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <h2 style={{ margin: 0 }}>Dashboard</h2>

        <Button type="primary" onClick={downloadCustomersExcel}>
          Exportar clientes (Excel)
        </Button>
      </div>

      <Tabs defaultActiveKey="today">
        <TabPane tab="Hoy" key="today">
          <Row gutter={[16, 16]}>
            <Col xs={24} md={6}>
              <KpiCard title="Ventas" value={`$${Number(today.paidTotal || 0).toFixed(2)}`} sub={`Notas: ${today.billsCount || 0}`} />
            </Col>
            <Col xs={24} md={6}>
              <KpiCard title="Ticket promedio" value={`$${Number(today.ticketAvg || 0).toFixed(2)}`} sub={`Unidades: ${today.units || 0}`} />
            </Col>
            <Col xs={24} md={6}>
              <KpiCard title="Descuento promedio" value={`${Number(today.discountPct || 0).toFixed(2)}%`} sub={`Sugerido: $${Number(today.suggestedTotal || 0).toFixed(2)}`} />
            </Col>
            <Col xs={24} md={6}>
              <KpiCard title="Descuento ($)" value={`$${Number(today.discountAmount || 0).toFixed(2)}`} sub="(solo informativo)" />
            </Col>
          </Row>
        </TabPane>

        <TabPane tab="Este mes" key="month">
          <Row gutter={[16, 16]}>
            <Col xs={24} md={6}>
              <KpiCard title="Ventas" value={`$${Number(month.paidTotal || 0).toFixed(2)}`} sub={`Notas: ${month.billsCount || 0}`} />
            </Col>
            <Col xs={24} md={6}>
              <KpiCard title="Ticket promedio" value={`$${Number(month.ticketAvg || 0).toFixed(2)}`} sub={`Unidades: ${month.units || 0}`} />
            </Col>
            <Col xs={24} md={6}>
              <KpiCard title="Descuento promedio" value={`${Number(month.discountPct || 0).toFixed(2)}%`} sub={`Sugerido: $${Number(month.suggestedTotal || 0).toFixed(2)}`} />
            </Col>
            <Col xs={24} md={6}>
              <KpiCard title="Descuento ($)" value={`$${Number(month.discountAmount || 0).toFixed(2)}`} sub="(solo informativo)" />
            </Col>
          </Row>
        </TabPane>

        <TabPane tab="Este año" key="year">
          <Row gutter={[16, 16]}>
            <Col xs={24} md={6}>
              <KpiCard title="Ventas" value={`$${Number(year.paidTotal || 0).toFixed(2)}`} sub={`Notas: ${year.billsCount || 0}`} />
            </Col>
            <Col xs={24} md={6}>
              <KpiCard title="Ticket promedio" value={`$${Number(year.ticketAvg || 0).toFixed(2)}`} sub={`Unidades: ${year.units || 0}`} />
            </Col>
            <Col xs={24} md={6}>
              <KpiCard title="Descuento promedio" value={`${Number(year.discountPct || 0).toFixed(2)}%`} sub={`Sugerido: $${Number(year.suggestedTotal || 0).toFixed(2)}`} />
            </Col>
            <Col xs={24} md={6}>
              <KpiCard title="Descuento ($)" value={`$${Number(year.discountAmount || 0).toFixed(2)}`} sub="(solo informativo)" />
            </Col>
          </Row>
        </TabPane>
      </Tabs>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={10}>
          <Card title="Usuarios (admin + asesores)">
            <Table dataSource={users} columns={userColumns} rowKey="_id" pagination={{ pageSize: 6 }} />
          </Card>
        </Col>

        <Col xs={24} lg={14}>
          <Card title={`Vendedores (mejor: ${sellers?.bestSeller?.sellerName || '—'} | ${sellers?.bestSeller?.sellerCode || ''})`}>
            <SellerPie data={pieData.length ? pieData : [{ label: 'Sin ventas', value: 1 }]} />
            <div style={{ marginTop: 16 }}>
              <Table
                dataSource={Array.isArray(sellers.list) ? sellers.list : []}
                columns={sellerColumns}
                rowKey={r => `${r.sellerCode}-${r.sellerName}`}
                pagination={{ pageSize: 6 }}
              />
            </div>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <Card title="Ventas por día (últimos 30 días)">
            <Table dataSource={Array.isArray(series.days) ? series.days : []} columns={seriesCols('date')} rowKey="key" pagination={{ pageSize: 8 }} />
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title="Ventas por mes (últimos 12 meses)">
            <Table dataSource={Array.isArray(series.months) ? series.months : []} columns={seriesCols('month')} rowKey="key" pagination={{ pageSize: 8 }} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <Card title="Ventas por año (últimos 5 años)">
            <Table dataSource={Array.isArray(series.years) ? series.years : []} columns={seriesCols('year')} rowKey="key" pagination={false} />
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title="Productos (Top / Menos vendidos)">
            <Row gutter={[12, 12]}>
              <Col xs={24} md={12}>
                <div style={{ fontWeight: 800, marginBottom: 8 }}>Top 10</div>
                <Table
                  dataSource={Array.isArray(productStats.topProducts) ? productStats.topProducts : []}
                  columns={topProdCols}
                  rowKey={(r, i) => `${r.productId || r.name}-${i}`}
                  pagination={{ pageSize: 5 }}
                  size="small"
                />
              </Col>
              <Col xs={24} md={12}>
                <div style={{ fontWeight: 800, marginBottom: 8 }}>Menos vendidos</div>
                <Table
                  dataSource={Array.isArray(productStats.lowProducts) ? productStats.lowProducts : []}
                  columns={topProdCols}
                  rowKey={(r, i) => `${r.productId || r.name}-${i}`}
                  pagination={{ pageSize: 5 }}
                  size="small"
                />
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={24}>
          <Card title="Inventario por categoría (semaforo por tallas)">
            <Table dataSource={Array.isArray(inventory.byCategory) ? inventory.byCategory : []} columns={invColumns} rowKey="_id" pagination={{ pageSize: 10 }} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={24}>
          <Card title="Productos con stock bajo (por tallas)">
            <Table dataSource={Array.isArray(inventory.lowStockProducts) ? inventory.lowStockProducts : []} columns={invColumns} rowKey="_id" pagination={{ pageSize: 10 }} />
          </Card>
        </Col>
      </Row>
    </LayoutApp>
  );
};

export default Dashboard1;