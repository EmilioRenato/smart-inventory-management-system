import { EyeOutlined } from '@ant-design/icons';
import { Button, Modal, Table, message } from 'antd';
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

            // ✅ SIN createdBy -> muestra todas las facturas
            const { data } = await axios.get('/api/bills/getbills');

            const sortedData = (Array.isArray(data) ? data : []).sort(
                (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
            );

            setBillsData(sortedData);
            dispatch({ type: 'HIDE_LOADING' });
        } catch (error) {
            dispatch({ type: 'HIDE_LOADING' });
            message.error('Error al obtener las facturas');
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
        const n = idx >= 0 ? idx + 1 : 1;
        return String(n).padStart(3, '0');
    }, [selectedBill, billsData]);

    const columns = [
        {
            title: 'N.º Factura',
            render: (_, record, index) => String(index + 1).padStart(3, '0'),
        },
        {
            title: 'Nombre del cliente',
            dataIndex: 'customerName',
        },
        {
            title: 'Teléfono',
            dataIndex: 'customerPhone',
        },
        {
            title: 'Dirección',
            dataIndex: 'customerAddress',
        },
        {
            title: 'Subtotal',
            dataIndex: 'subTotal',
        },
        {
            title: 'Impuesto',
            dataIndex: 'tax',
        },
        {
            title: 'Total',
            dataIndex: 'totalAmount',
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
            <h2>Todas las facturas</h2>

            <Table dataSource={billsData} columns={columns} bordered rowKey="_id" />

            {popModal && selectedBill && (
                <Modal
                    title="Detalles de la factura"
                    width={400}
                    visible={popModal}
                    onCancel={() => setPopModal(false)}
                    footer={false}
                >
                    <div className="card" ref={componentRef}>
                        <div className="cardHeader">
                            <h3 className="logo">Factura N.º {invoiceNo}</h3>
                            <span>
                                Teléfono: <b>+59362562513</b>
                            </span>
                            <span>
                                Dirección: <b>Quito, Ecuador</b>
                            </span>
                        </div>

                        <div className="cardBody">
                            <div className="group">
                                <span>Nombre del cliente:</span>
                                <span>
                                    <b>{selectedBill.customerName}</b>
                                </span>
                            </div>
                            <div className="group">
                                <span>Teléfono del cliente:</span>
                                <span>
                                    <b>{selectedBill.customerPhone}</b>
                                </span>
                            </div>
                            <div className="group">
                                <span>Dirección del cliente:</span>
                                <span>
                                    <b>{selectedBill.customerAddress}</b>
                                </span>
                            </div>
                            <div className="group">
                                <span>Fecha:</span>
                                <span>
                                    <b>{new Date(selectedBill.createdAt).toLocaleDateString()}</b>
                                </span>
                            </div>
                            <div className="group">
                                <span>Total a pagar:</span>
                                <span>
                                    <b>${selectedBill.totalAmount}</b>
                                </span>
                            </div>
                        </div>

                        <div className="cardFooter">
                            <h4>Detalle de la compra</h4>

                            {(selectedBill.cartItems || []).map((product, index) => (
                                <div className="footerCard" key={index}>
                                    <div className="group">
                                        <span>Producto:</span>
                                        <span>
                                            <b>{product.name}</b>
                                        </span>
                                    </div>
                                    <div className="group">
                                        <span>Cantidad:</span>
                                        <span>
                                            <b>{product.quantity}</b>
                                        </span>
                                    </div>
                                    <div className="group">
                                        <span>Precio:</span>
                                        <span>
                                            <b>${product.price}</b>
                                        </span>
                                    </div>
                                </div>
                            ))}

                            <div className="footerCardTotal">
                                <div className="group">
                                    <h3>Total:</h3>
                                    <h3>
                                        <b>${selectedBill.totalAmount}</b>
                                    </h3>
                                </div>
                            </div>

<div className="footerThanks">
    <span>
        <b>Atendido por:</b> {selectedBill?.advisorName || '---'}
    </span>
    <br />
    <span>Gracias por su compra</span>
</div>
                        </div>
                    </div>

                    <div className="bills-btn-add">
                        <Button onClick={handlePrint} className="add-new">
                            Imprimir factura
                        </Button>
                    </div>
                </Modal>
            )}
        </Layout>
    );
};

export default Bills;