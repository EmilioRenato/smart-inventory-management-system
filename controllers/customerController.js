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
    if (!cedula || !createdBy) return res.status(200).json({ customer: null });

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
    const { cedula, name, phone, address, createdBy } = req.body;

    if (!cedula || !name || !phone || !address || !createdBy) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const cleanCedula = String(cedula).trim();

    const existing = await Customer.findOne({ createdBy, cedula: cleanCedula });

    if (existing) {
      existing.name = name;
      existing.phone = phone;
      existing.address = address;
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
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

// PUT update
export const updateCustomerController = async (req, res) => {
  try {
    const { customerId } = req.body;
    if (!customerId) return res.status(400).json({ message: 'customerId is required' });

    await Customer.findOneAndUpdate({ _id: customerId }, req.body, { new: true });
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

// ✅ EXPORT EXCEL (GLOBAL o por createdBy si lo envías)
export const exportCustomersExcelController = async (req, res) => {
  try {
    const { createdBy } = req.query;

    const filter = createdBy ? { createdBy } : {};
    const customers = await Customer.find(filter).sort({ createdAt: -1 });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Smart Inventory';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Clientes');

    sheet.columns = [
      { header: 'Cédula/RUC', key: 'cedula', width: 18 },
      { header: 'Nombre', key: 'name', width: 28 },
      { header: 'Teléfono', key: 'phone', width: 16 },
      { header: 'Dirección', key: 'address', width: 32 },
      { header: 'Creado por', key: 'createdBy', width: 26 },
      { header: 'Fecha registro', key: 'createdAt', width: 18 },
    ];

    // Header bonito
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).alignment = { vertical: 'middle' };

    customers.forEach(c => {
      sheet.addRow({
        cedula: c.cedula || '',
        name: c.name || '',
        phone: c.phone ?? '',
        address: c.address || '',
        createdBy: c.createdBy || '',
        createdAt: c.createdAt ? new Date(c.createdAt).toLocaleDateString() : '',
      });
    });

    // Bordes suaves
    sheet.eachRow((row, rowNumber) => {
      row.eachCell(cell => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          right: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        };
        if (rowNumber === 1) {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF3F4F6' },
          };
        }
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();

    const fileName = `clientes_${createdBy ? createdBy : 'global'}_${new Date()
      .toISOString()
      .slice(0, 10)}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    return res.status(200).send(Buffer.from(buffer));
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: 'Error exportando clientes a Excel' });
  }
};