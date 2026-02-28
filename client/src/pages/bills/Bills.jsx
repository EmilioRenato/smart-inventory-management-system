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

            const { data } = await axios.get('/api/bills/getbills');

            const sortedData = (data || []).sort(
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
    }, []);

    const invoiceNo = useMemo(() => {
        if (!selectedBill) return '000';
        const idx = billsData.findIndex(b => b._id === selectedBill._id);
        const n = idx >= 0 ? idx + 1 : 1;
        return String(n).padStart(3, '0');
    }, [selectedBill, billsData]);

    const columns = [
        {
            title: 'N.º',
            render: (_, __, index) => String(index + 1).padStart(3, '0'),
        },
        { title: 'Cliente', dataIndex: 'customerName' },
        { title: 'Cédula', dataIndex: 'customerCedula' },
        {
            title: 'Total',
            dataIndex: 'paidTotal',
            render: v => <b>${Number(v || 0).toFixed(2)}</b>,
        },
        {
            title: 'Acción',
            render: (_, record) => (
                <EyeOutlined
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
                    title="Detalle de la nota"
                    width={420}
                    visible={popModal}
                    onCancel={() => setPopModal(false)}
                    footer={false}
                >
                    <div ref={componentRef}>
                        <h3>Nota N.º {invoiceNo}</h3>

                        <p><b>Cliente:</b> {selectedBill.customerName}</p>
                        <p><b>Cédula:</b> {selectedBill.customerCedula}</p>
                        <p><b>Teléfono:</b> {selectedBill.customerPhone}</p>
                        <p><b>Dirección:</b> {selectedBill.customerAddress}</p>

                        <hr />

                        <p><b>Precio sugerido:</b> ${Number(selectedBill.suggestedTotal || 0).toFixed(2)}</p>
                        <p><b>Descuento:</b> ${Number(selectedBill.discountAmount || 0).toFixed(2)}</p>
                        <p><b>Total a pagar:</b> ${Number(selectedBill.paidTotal || 0).toFixed(2)}</p>

                        <hr />

                        <p>
                            <b>Atendido por:</b> {selectedBill.sellerName}
                            {' '}({selectedBill.sellerCode})
                        </p>

                        <p>Gracias por su compra</p>
                    </div>

                    <Button onClick={handlePrint} className="add-new">
                        Imprimir
                    </Button>
                </Modal>
            )}
        </Layout>
    );
};

export default Bills;