import Customer from '../models/customerModel.js';

// Obtener todos (si quieres filtrar por createdBy, lo hacemos luego)
export const getCustomerController = async (req, res) => {
    try {
        const customers = await Customer.find().sort({ createdAt: -1 });
        res.status(200).send(customers);
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Error obteniendo clientes' });
    }
};

// ✅ NUEVO: buscar por cédula/ruc (para autocompletar)
export const getCustomerByCedulaController = async (req, res) => {
    try {
        const { cedula, createdBy } = req.query;

        const clean = String(cedula || '').trim();
        if (!clean || !createdBy) return res.status(200).json([]);

        const customer = await Customer.findOne({
            createdBy,
            cedula: clean,
        }).sort({ createdAt: -1 });

        if (!customer) return res.status(200).json([]);

        return res.status(200).json([customer]);
    } catch (error) {
        console.error('Error searching customer by cedula:', error);
        res.status(500).json({ message: 'Error buscando cliente por cédula' });
    }
};

// Mantengo tu búsqueda por teléfono (por si la sigues usando en Customers page)
export const getCustomersByNumberController = async (req, res) => {
    try {
        const { phone, createdBy } = req.query;

        if (!phone || !createdBy) {
            return res.status(200).json([]);
        }

        const customers = await Customer.find({ createdBy })
            .limit(50)
            .sort({ createdAt: -1 });

        const filtered = customers.filter(c => String(c.phone || '').includes(String(phone)));

        res.status(200).json(filtered);
    } catch (error) {
        console.error('Error searching customers:', error);
        res.status(500).json({ message: 'Error searching customers' });
    }
};

// ✅ ADD: si existe cedula+createdBy => NO duplicar
export const addCustomerController = async (req, res) => {
    try {
        const { cedula, name, phone, address, createdBy } = req.body;

        if (!cedula || !name || !phone || !address || !createdBy) {
            return res.status(400).json({ message: 'Todos los campos son obligatorios' });
        }

        const cleanCedula = String(cedula).trim();

        const exist = await Customer.findOne({ createdBy, cedula: cleanCedula }).select('_id');
        if (exist) {
            return res.status(409).json({ message: 'Cliente ya existente' });
        }

        const newCustomer = new Customer({
            cedula: cleanCedula,
            name: String(name).trim(),
            phone: Number(phone),
            address: String(address).trim(),
            createdBy,
        });

        const savedCustomer = await newCustomer.save();

        res.status(200).json({
            message: 'Cliente creado correctamente',
            customer: savedCustomer,
        });
    } catch (error) {
        // Por si dispara el unique index
        if (error?.code === 11000) {
            return res.status(409).json({ message: 'Cliente ya existente' });
        }
        console.error('Error in addCustomerController:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const updateCustomerController = async (req, res) => {
    try {
        await Customer.findOneAndUpdate({ _id: req.body.customerId }, req.body, { new: true });
        res.status(201).json('Customer Updated!');
    } catch (error) {
        res.status(400).send(error);
        console.log(error);
    }
};

export const deleteCustomerController = async (req, res) => {
    try {
        await Customer.findOneAndDelete({ _id: req.body.customerId });
        res.status(200).json('Customer Deleted!');
    } catch (error) {
        res.status(400).send(error);
        console.log(error);
    }
};