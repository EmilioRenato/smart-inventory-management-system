import { EyeOutlined } from '@ant-design/icons';
import { Button, Modal, Table, message, Divider } from 'antd';
import axios from 'axios';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useReactToPrint } from 'react-to-print';
import Layout from '../../components/Layout';

const Bills = () => {
    const componentRef = useRef();
    const dispatch = useDispatch();

    const [billsData, setBillsData] = useState([]);
    const [popModal, setPopModal] = useState(false);
    const [selectedBill, setSelectedBill] = useState(null);

    const getAllBills = async () => {
        try {
            dispatch({ type: 'SHOW_LOADING' });

            const { data } = await axios.get('/api/bills/getbills');

            const sorted = Array.isArray(data)
                ? data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                : [];

            setBillsData(sorted);

            dispatch({ type: 'HIDE_LOADING' });
        } catch (error) {
            dispatch({ type: 'HIDE_LOADING' });
            message.error('Error al obtener las notas de venta');
            console.log(error);
        }
    };

    useEffect(() => {
        getAllBills();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const invoiceNo = useMemo(() => {
        if (!selectedBill) return '000';
        const idx = billsData.findIndex(b => b._id === selectedBill._id);
        const n = idx >= 0 ? billsData.length - idx : 1;
        return String(n).padStart(3, '0');
    }, [selectedBill, billsData]);

    const discountPercent = useMemo(() => {
        if (!selectedBill) return 0;
        const suggested = Number(selectedBill?.suggestedTotal || 0);
        const paid = Number(selectedBill?.paidTotal || selectedBill?.totalAmount || 0);
        if (!suggested || suggested <= 0) return 0;
        const pct = ((suggested - paid) / suggested) * 100;
        return pct > 0 ? Number(pct.toFixed(2)) : 0;
    }, [selectedBill]);

    const detailRows = useMemo(() => {
        if (!selectedBill?.cartItems?.length) return [];

        const rows = [];
        selectedBill.cartItems.forEach((it, i) => {
            const unitPrice = Number(it?.price || 0);

            if (Array.isArray(it.sizeOrders) && it.sizeOrders.length) {
                it.sizeOrders.forEach((so, j) => {
                    const qty = Number(so?.quantity || 0);
                    rows.push({
                        key: `${i}-${j}`,
                        producto: it?.name || 'Producto',
                        talla: String(so?.size ?? '-'),
                        cantidad: qty,
                        precioUnit: unitPrice,
                        subtotal: Number((unitPrice * qty).toFixed(2)),
                    });
                });
            } else {
                const qty = Number(it?.quantity || 0);
                rows.push({
                    key: `${i}-0`,
                    producto: it?.name || 'Producto',
                    talla: '-',
                    cantidad: qty,
                    precioUnit: unitPrice,
                    subtotal: Number((unitPrice * qty).toFixed(2)),
                });
            }
        });

        return rows;
    }, [selectedBill]);

    const columns = [
        {
            title: 'N.º Nota',
            render: (_, __, index) => String(billsData.length - index).padStart(3, '0'),
        },
        { title: 'Cliente', dataIndex: 'customerName' },
        { title: 'Cédula/RUC', dataIndex: 'customerCedula' },
        { title: 'Teléfono', dataIndex: 'customerPhone' },
        {
            title: 'Correo',
            dataIndex: 'customerEmail',
            render: v => v || '-',
        },
        {
            title: 'Total pagado',
            dataIndex: 'paidTotal',
            render: v => <b>${Number(v || 0).toFixed(2)}</b>,
        },
        {
            title: 'Acción',
            render: (_, record) => (
                <EyeOutlined
                    className="cart-edit eye"
                    onClick={() => {
                        setSelectedBill(record);
                        setPopModal(true);
                    }}
                />
            ),
        },
    ];

    const handlePrint = useReactToPrint({
        content: () => componentRef.current,
    });

    return (
        <Layout>
            <h2>Notas de venta</h2>

            <Table
                dataSource={billsData}
                columns={columns}
                bordered
                rowKey="_id"
            />

            {popModal && selectedBill && (
                <Modal
                    title="Detalle de la nota de venta"
                    width={720}
                    visible={popModal}
                    onCancel={() => {
                        setPopModal(false);
                        setSelectedBill(null);
                    }}
                    footer={false}
                >
                    <div
                        className="card"
                        ref={componentRef}
                        style={{ border: '1px solid #eee', borderRadius: 10 }}
                    >
                        <div className="cardHeader" style={{ padding: 14 }}>
                            <div
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'baseline',
                                }}
                            >
                                <h3 className="logo" style={{ margin: 0 }}>
                                    Nota de venta N.º {invoiceNo}
                                </h3>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: 12, color: '#666' }}>Fecha</div>
                                    <div style={{ fontWeight: 600 }}>
                                        {selectedBill?.createdAt
                                            ? new Date(selectedBill.createdAt).toLocaleString()
                                            : '-'}
                                    </div>
                                </div>
                            </div>

                            <Divider style={{ margin: '12px 0' }} />

                            <div
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: '1fr 1fr',
                                    gap: 10,
                                }}
                            >
                                <div>
                                    <div style={{ fontSize: 12, color: '#666' }}>Empresa</div>
                                    <div style={{ fontWeight: 700 }}>Quito, Ecuador</div>

                                    <div style={{ marginTop: 8, fontSize: 12, color: '#666' }}>
                                        Teléfono
                                    </div>
                                    <div style={{ fontWeight: 600 }}>+59362562513</div>
                                </div>

                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: 12, color: '#666' }}>Atendido por</div>
                                    <div style={{ fontWeight: 700 }}>
                                        {selectedBill?.sellerName || '—'}
                                    </div>
                                    <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                                        Código: <b>{selectedBill?.sellerCode || '—'}</b>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="cardBody" style={{ padding: 14 }}>
                            <Divider style={{ margin: '6px 0 14px' }} />

                            <div
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: '1fr 1fr',
                                    gap: 10,
                                }}
                            >
                                <div>
                                    <div style={{ fontSize: 12, color: '#666' }}>Cliente</div>
                                    <div style={{ fontWeight: 700 }}>
                                        {selectedBill.customerName}
                                    </div>
                                </div>
                                <div>
                                    <div style={{ fontSize: 12, color: '#666' }}>Cédula/RUC</div>
                                    <div style={{ fontWeight: 600 }}>
                                        {selectedBill.customerCedula || '-'}
                                    </div>
                                </div>
                                <div>
                                    <div style={{ fontSize: 12, color: '#666' }}>Teléfono</div>
                                    <div style={{ fontWeight: 600 }}>
                                        {selectedBill.customerPhone}
                                    </div>
                                </div>
                                <div>
                                    <div style={{ fontSize: 12, color: '#666' }}>Dirección</div>
                                    <div style={{ fontWeight: 600 }}>
                                        {selectedBill.customerAddress}
                                    </div>
                                </div>
                                <div>
                                    <div style={{ fontSize: 12, color: '#666' }}>Correo</div>
                                    <div style={{ fontWeight: 600 }}>
                                        {selectedBill.customerEmail || '-'}
                                    </div>
                                </div>
                            </div>

                            <Divider style={{ margin: '14px 0' }} />

                            <h4 style={{ marginBottom: 10 }}>Detalle de productos</h4>

                            <Table
                                dataSource={detailRows}
                                pagination={false}
                                bordered
                                size="small"
                                columns={[
                                    {
                                        title: 'Producto',
                                        dataIndex: 'producto',
                                    },
                                    {
                                        title: 'Talla',
                                        dataIndex: 'talla',
                                        width: 90,
                                    },
                                    {
                                        title: 'Cant.',
                                        dataIndex: 'cantidad',
                                        width: 80,
                                    },
                                    {
                                        title: 'P. Unit',
                                        dataIndex: 'precioUnit',
                                        width: 100,
                                        render: v => `$${Number(v || 0).toFixed(2)}`,
                                    },
                                    {
                                        title: 'Subtotal',
                                        dataIndex: 'subtotal',
                                        width: 110,
                                        render: v => <b>${Number(v || 0).toFixed(2)}</b>,
                                    },
                                ]}
                            />

                            <div
                                style={{
                                    marginTop: 14,
                                    display: 'flex',
                                    justifyContent: 'flex-end',
                                }}
                            >
                                <div style={{ width: 320 }}>
                                    <div
                                        style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            marginBottom: 6,
                                        }}
                                    >
                                        <span style={{ color: '#666' }}>Precio sugerido:</span>
                                        <b>${Number(selectedBill?.suggestedTotal || 0).toFixed(2)}</b>
                                    </div>

                                    <div
                                        style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            marginBottom: 6,
                                        }}
                                    >
                                        <span style={{ color: '#666' }}>Descuento aplicado:</span>
                                        <b>{discountPercent}%</b>
                                    </div>

                                    <Divider style={{ margin: '10px 0' }} />

                                    <div
                                        style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            fontSize: 16,
                                        }}
                                    >
                                        <span style={{ fontWeight: 700 }}>Total a pagar:</span>
                                        <span style={{ fontWeight: 800 }}>
                                            ${Number(selectedBill?.paidTotal || selectedBill?.totalAmount || 0).toFixed(2)}
                                        </span>
                                    </div>

                                    <div
                                        style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            marginTop: 6,
                                        }}
                                    >
                                        <span style={{ color: '#666' }}>Método de pago:</span>
                                        <b style={{ textTransform: 'capitalize' }}>
                                            {selectedBill?.paymentMethod || '-'}
                                        </b>
                                    </div>
                                </div>
                            </div>

                            <Divider style={{ margin: '14px 0' }} />

                            <div
                                className="footerThanks"
                                style={{ textAlign: 'center', color: '#333' }}
                            >
                                <span style={{ fontWeight: 700 }}>Gracias por su compra</span>
                            </div>
                        </div>
                    </div>

                    <div
                        className="bills-btn-add"
                        style={{ marginTop: 12, textAlign: 'right' }}
                    >
                        <Button onClick={handlePrint} className="add-new">
                            Imprimir nota
                        </Button>
                    </div>
                </Modal>
            )}
        </Layout>
    );
};

export default Bills;