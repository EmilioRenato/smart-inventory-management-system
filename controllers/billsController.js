import Bills from '../models/billsModel.js';

// GET bills (ahora muestra todas; si viene createdBy lo usa como filtro opcional)
export const getBillsController = async (req, res) => {
    try {
        const { createdBy } = req.query;

        const query = createdBy ? { createdBy } : {};
        const bills = await Bills.find(query).sort({ createdAt: -1 });

        res.status(200).send(bills);
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Error fetching bills' });
    }
};

// ADD bill (createdBy ya no es obligatorio; si llega se guarda)
export const addBillsController = async (req, res) => {
    try {
        const newBills = new Bills(req.body);
        await newBills.save();

        // devuelvo el documento creado (mejor para el frontend)
        res.status(200).send(newBills);
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Error creating bill' });
    }
};