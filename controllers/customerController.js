import Customer from '../models/customerModel.js';
import ExcelJS from 'exceljs';

// GET CUSTOMERS (GLOBAL)
export const getCustomerController = async (req, res) => {
  try {
    const customers = await Customer.find().sort({ createdAt: -1 });
    res.status(200).send(customers);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'Error obteniendo clientes' });
  }
};

// GET by cedula/RUC (autocompletar)
export const getCustomerByCedulaController = async (req, res) => {
  try {
    const { cedula, createdBy } = req.query;
    if (!cedula || !createdBy) {
      return res.status(200).json({ customer: null });
    }

    const clean = String(cedula).trim();
    const customer = await Customer.findOne({ createdBy, cedula: clean });

    return res.status(200).json({ customer: customer || null });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: 'Error searching customer' });
  }
};

// POST add customer (si existe, actualiza; si no, crea)
export const addCustomerController = async (req, res) => {
  try {
    const { cedula, name, phone, address, email, createdBy } = req.body;

    if (!cedula || !name || !phone || !address || !createdBy) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const cleanCedula = String(cedula).trim();
    const cleanEmail = String(email || '').trim().toLowerCase();

    const existing = await Customer.findOne({ createdBy, cedula: cleanCedula });

    if (existing) {
      existing.name = name;
      existing.phone = phone;
      existing.address = address;
      existing.email = cleanEmail;
      await existing.save();

      return res.status(200).json({
        message: 'Cliente ya existente. Se actualizó.',
        customer: existing,
      });
    }

    const newCustomer = await Customer.create({
      cedula: cleanCedula,
      name,
      phone,
      address,
      email: cleanEmail,
      createdBy,
    });

    return res.status(200).json({
      message: 'Cliente creado correctamente',
      customer: newCustomer,
    });
  } catch (error) {
    console.log(error);
    if (String(error?.code) === '11000') {
      return res.status(400).json({ message: 'Cliente ya existe con esa cédula' });
    }
    return res.status(500).json({
      message: 'Internal server error',
      error: error.message,
    });
  }
};

// PUT update
export const updateCustomerController = async (req, res) => {
  try {
    const { customerId, email } = req.body;

    if (!customerId) {
      return res.status(400).json({ message: 'customerId is required' });
    }

    const payload = {
      ...req.body,
      email: String(email || '').trim().toLowerCase(),
    };

    await Customer.findOneAndUpdate({ _id: customerId }, payload, { new: true });

    return res.status(200).json({ message: 'Cliente actualizado' });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: 'Error updating customer' });
  }
};

// DELETE
export const deleteCustomerController = async (req, res) => {
  try {
    await Customer.findOneAndDelete({ _id: req.body.customerId });
    return res.status(200).json({ message: 'Cliente eliminado' });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: 'Error deleting customer' });
  }
};

// ✅ EXPORT EXCEL
export const exportCustomersExcelController = async (req, res) => {
  try {
    const customers = await Customer.find().sort({ createdAt: -1 });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Clientes');

    sheet.columns = [
      { header: 'Cédula/RUC', key: 'cedula', width: 18 },
      { header: 'Nombre', key: 'name', width: 28 },
      { header: 'Teléfono', key: 'phone', width: 16 },
      { header: 'Dirección', key: 'address', width: 35 },
      { header: 'Correo', key: 'email', width: 30 },
      { header: 'Creado por (ID)', key: 'createdBy', width: 26 },
      { header: 'Fecha creación', key: 'createdAt', width: 18 },
    ];

    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

    customers.forEach(c => {
      sheet.addRow({
        cedula: c.cedula || '',
        name: c.name || '',
        phone: c.phone ?? '',
        address: c.address || '',
        email: c.email || '',
        createdBy: c.createdBy || '',
        createdAt: c.createdAt
          ? new Date(c.createdAt).toLocaleDateString()
          : '',
      });
    });

    sheet.eachRow((row, rowNumber) => {
      row.eachCell(cell => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
        if (rowNumber !== 1) {
          cell.alignment = { vertical: 'middle', horizontal: 'left' };
        }
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="clientes_${new Date()
        .toISOString()
        .slice(0, 10)}.xlsx"`
    );

    return res.status(200).send(Buffer.from(buffer));
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      message: 'Error exportando Excel',
      error: error?.message,
    });
  }
};