import Bills from '../models/billsModel.js';
import User from '../models/userModel.js';

// GET bills (GLOBAL)
export const getBillsController = async (req, res) => {
  try {
    const bills = await Bills.find().sort({ createdAt: -1 });
    return res.status(200).json(bills);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: 'Error fetching bills' });
  }
};

// ADD bill (nota de venta)
export const addBillsController = async (req, res) => {
  try {
    const {
      createdBy,

      sellerCode,

      customerCedula,
      customerName,
      customerPhone,
      customerAddress,

      cartItems,
      paymentMethod,

      // estos pueden venir o los calculamos
      paidTotal,
    } = req.body;

    if (!createdBy) return res.status(400).json({ message: 'createdBy is required' });

    // vendedor obligatorio
    if (!sellerCode) return res.status(400).json({ message: 'sellerCode is required' });
    const cleanCode = String(sellerCode).replace(/\D/g, '').slice(0, 5);
    if (cleanCode.length !== 5) return res.status(400).json({ message: 'El código del vendedor debe tener 5 dígitos' });

    const seller = await User.findOne({ code: cleanCode }).select('_id name code role');
    if (!seller) return res.status(400).json({ message: 'No existe un vendedor con ese código' });

    // cliente
    if (!customerCedula) return res.status(400).json({ message: 'customerCedula is required' });
    if (!customerName) return res.status(400).json({ message: 'customerName is required' });
    if (!customerPhone) return res.status(400).json({ message: 'customerPhone is required' });
    if (!customerAddress) return res.status(400).json({ message: 'customerAddress is required' });

    // carrito
    if (!Array.isArray(cartItems) || cartItems.length === 0) {
      return res.status(400).json({ message: 'cartItems is required' });
    }

    // calcular suggestedTotal (precio normal)
    const suggestedTotal = Number(
      cartItems.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0).toFixed(2)
    );

    // paidTotal (precio final negociado) obligatorio
    const paid = Number(paidTotal);
    if (!Number.isFinite(paid) || paid <= 0) {
      return res.status(400).json({ message: 'paidTotal is required and must be > 0' });
    }
    if (paid > suggestedTotal) {
      return res.status(400).json({ message: 'El precio a pagar no puede ser mayor al precio sugerido' });
    }

    const discountAmount = Number((suggestedTotal - paid).toFixed(2));

    const billDoc = await Bills.create({
      createdBy,

      sellerCode: cleanCode,
      sellerName: seller.name,
      sellerUserId: seller._id,

      customerCedula: String(customerCedula).trim(),
      customerName: String(customerName).trim(),
      customerPhone: Number(customerPhone),
      customerAddress: String(customerAddress).trim(),

      cartItems: cartItems.map(it => ({
        productId: it._id || it.productId,
        name: it.name,
        image: it.image,
        price: Number(it.price || 0),
        quantity: Number(it.quantity || 0),
        sizeOrders: Array.isArray(it.sizeOrders) ? it.sizeOrders : [],
      })),

      suggestedTotal,
      paidTotal: Number(paid.toFixed(2)),
      discountAmount,

      paymentMethod,
    });

    return res.status(200).json({
      message: 'Nota de venta creada correctamente',
      bill: billDoc,
    });
  } catch (error) {
    console.log('Error creating bill:', error);
    return res.status(500).json({
      message: 'Error creating bill',
      error: error?.message || String(error),
    });
  }
};