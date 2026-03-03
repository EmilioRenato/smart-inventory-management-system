import Bills from '../models/billsModel.js';
import Product from '../models/productModel.js';
import User from '../models/userModel.js';

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}
function endOfDay(date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}
function startOfMonth(date) {
  const d = new Date(date);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}
function startOfYear(date) {
  const d = new Date(date);
  d.setMonth(0, 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

const categoryLabel = cat => {
  if (cat === 'pizzas') return 'Equipo de fútbol';
  if (cat === 'burgers') return 'Zapatos';
  if (cat === 'drinks') return 'Ropa deportiva';
  return cat || 'Sin categoría';
};

const getStockHealth = product => {
  const sizeStocks = Array.isArray(product?.sizeStocks) ? product.sizeStocks : [];
  if (!sizeStocks.length) return { level: 'none', min: null };

  let min = Infinity;
  for (const s of sizeStocks) {
    const st = Number(s?.stock || 0);
    if (st < min) min = st;
  }

  if (min < 5) return { level: 'red', min };
  if (min <= 20) return { level: 'yellow', min };
  return { level: 'green', min };
};

// GET /api/dashboard/summary
export const getDashboardSummaryController = async (req, res) => {
  try {
    // ⚠️ IMPORTANTE:
    // Aquí hacemos dashboard GLOBAL: todos ven todo.
    // Si luego quieres multi-tienda, lo filtramos por createdBy (tu decides).
    const now = new Date();

    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const monthStart = startOfMonth(now);
    const yearStart = startOfYear(now);

    const bills = await Bills.find({}).sort({ createdAt: -1 });

    // ===== KPIs ventas =====
    const sumPaid = arr => arr.reduce((s, b) => s + Number(b.paidTotal || 0), 0);
    const sumSuggested = arr => arr.reduce((s, b) => s + Number(b.suggestedTotal || 0), 0);
    const sumDiscountAmt = arr => arr.reduce((s, b) => s + Number(b.discountAmount || 0), 0);

    const billsToday = bills.filter(b => new Date(b.createdAt) >= todayStart && new Date(b.createdAt) <= todayEnd);
    const billsMonth = bills.filter(b => new Date(b.createdAt) >= monthStart);
    const billsYear = bills.filter(b => new Date(b.createdAt) >= yearStart);

    const paidToday = Number(sumPaid(billsToday).toFixed(2));
    const paidMonth = Number(sumPaid(billsMonth).toFixed(2));
    const paidYear = Number(sumPaid(billsYear).toFixed(2));

    const suggestedToday = Number(sumSuggested(billsToday).toFixed(2));
    const suggestedMonth = Number(sumSuggested(billsMonth).toFixed(2));
    const suggestedYear = Number(sumSuggested(billsYear).toFixed(2));

    const discountAmtToday = Number(sumDiscountAmt(billsToday).toFixed(2));
    const discountAmtMonth = Number(sumDiscountAmt(billsMonth).toFixed(2));
    const discountAmtYear = Number(sumDiscountAmt(billsYear).toFixed(2));

    const discountPct = (suggested, paid) => {
      if (!suggested || suggested <= 0) return 0;
      const pct = ((suggested - paid) / suggested) * 100;
      return Number(Math.max(0, pct).toFixed(2));
    };

    const discountPctToday = discountPct(suggestedToday, paidToday);
    const discountPctMonth = discountPct(suggestedMonth, paidMonth);
    const discountPctYear = discountPct(suggestedYear, paidYear);

    const ticketAvg = (paid, count) => (count ? Number((paid / count).toFixed(2)) : 0);

    // ===== Unidades vendidas =====
    let unitsToday = 0;
    let unitsMonth = 0;
    let unitsYear = 0;

    const countUnits = bill => {
      const items = Array.isArray(bill.cartItems) ? bill.cartItems : [];
      let u = 0;
      for (const it of items) u += Number(it.quantity || 0);
      return u;
    };

    for (const b of billsToday) unitsToday += countUnits(b);
    for (const b of billsMonth) unitsMonth += countUnits(b);
    for (const b of billsYear) unitsYear += countUnits(b);

    // ===== Ventas por día (últimos 30 días) =====
    const days = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const s = startOfDay(d);
      const e = endOfDay(d);
      const dayBills = bills.filter(b => new Date(b.createdAt) >= s && new Date(b.createdAt) <= e);
      const total = Number(sumPaid(dayBills).toFixed(2));
      days.push({
        key: s.toISOString().slice(0, 10),
        date: s.toISOString().slice(0, 10),
        total,
        count: dayBills.length,
      });
    }

    // ===== Ventas por mes (últimos 12 meses) =====
    const months = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now);
      d.setMonth(d.getMonth() - i);
      const mStart = startOfMonth(d);
      const next = new Date(mStart);
      next.setMonth(next.getMonth() + 1);

      const monthBills = bills.filter(b => {
        const t = new Date(b.createdAt);
        return t >= mStart && t < next;
      });

      const total = Number(sumPaid(monthBills).toFixed(2));
      const label = `${mStart.getFullYear()}-${String(mStart.getMonth() + 1).padStart(2, '0')}`;
      months.push({
        key: label,
        month: label,
        total,
        count: monthBills.length,
      });
    }

    // ===== Ventas por año (últimos 5 años) =====
    const years = [];
    for (let i = 4; i >= 0; i--) {
      const y = now.getFullYear() - i;
      const yStart = new Date(y, 0, 1, 0, 0, 0, 0);
      const yEnd = new Date(y + 1, 0, 1, 0, 0, 0, 0);

      const yearBills = bills.filter(b => {
        const t = new Date(b.createdAt);
        return t >= yStart && t < yEnd;
      });

      const total = Number(sumPaid(yearBills).toFixed(2));
      years.push({ key: String(y), year: String(y), total, count: yearBills.length });
    }

    // ===== Stats por vendedor =====
    // Usamos sellerCode y sellerName ya guardados en Bills
    const sellerMap = new Map();

    for (const b of bills) {
      const code = String(b.sellerCode || '').trim();
      const name = String(b.sellerName || '').trim() || 'Sin nombre';
      const key = code ? `${code}` : '00000';

      if (!sellerMap.has(key)) {
        sellerMap.set(key, {
          sellerCode: key,
          sellerName: name,
          billsCount: 0,
          paidTotal: 0,
          suggestedTotal: 0,
          discountAmount: 0,
          units: 0,
        });
      }
      const s = sellerMap.get(key);
      s.billsCount += 1;
      s.paidTotal += Number(b.paidTotal || 0);
      s.suggestedTotal += Number(b.suggestedTotal || 0);
      s.discountAmount += Number(b.discountAmount || 0);
      s.units += countUnits(b);
    }

    const sellers = Array.from(sellerMap.values())
      .map(s => {
        const pct = discountPct(s.suggestedTotal, s.paidTotal);
        return {
          ...s,
          paidTotal: Number(s.paidTotal.toFixed(2)),
          suggestedTotal: Number(s.suggestedTotal.toFixed(2)),
          discountAmount: Number(s.discountAmount.toFixed(2)),
          discountPct: pct,
          ticketAvg: ticketAvg(s.paidTotal, s.billsCount),
        };
      })
      .sort((a, b) => b.paidTotal - a.paidTotal);

    const bestSeller = sellers[0] || null;

    // ===== Top productos / menos vendidos =====
    const productSales = new Map();

    for (const b of bills) {
      const items = Array.isArray(b.cartItems) ? b.cartItems : [];
      for (const it of items) {
        const pid = String(it.productId || it._id || '');
        const name = String(it.name || '');
        const qty = Number(it.quantity || 0);

        const key = pid || name;
        if (!productSales.has(key)) {
          productSales.set(key, {
            productId: pid,
            name,
            units: 0,
            revenue: 0,
          });
        }
        const p = productSales.get(key);
        p.units += qty;
        // revenue basado en "precio normal * qty" (no el total negociado)
        p.revenue += Number(it.price || 0) * qty;
      }
    }

    const topProducts = Array.from(productSales.values())
      .map(p => ({
        ...p,
        revenue: Number(p.revenue.toFixed(2)),
      }))
      .sort((a, b) => b.units - a.units)
      .slice(0, 10);

    const lowProducts = Array.from(productSales.values())
      .sort((a, b) => a.units - b.units)
      .slice(0, 10);

    // ===== Inventario crítico por tallas =====
    const allProducts = await Product.find({}).sort({ createdAt: -1 });

    const inventoryByCategory = allProducts.map(p => {
      const health = getStockHealth(p);
      return {
        _id: p._id,
        name: p.name,
        category: p.category,
        categoryLabel: categoryLabel(p.category),
        price: Number(p.price || 0),
        stock: Number(p.stock || 0),
        sizeStocks: Array.isArray(p.sizeStocks) ? p.sizeStocks : [],
        healthLevel: health.level,
        minSizeStock: health.min,
      };
    });

    const lowStockProducts = inventoryByCategory
      .filter(p => p.healthLevel === 'red' || p.healthLevel === 'yellow')
      .sort((a, b) => {
        const aMin = a.minSizeStock ?? 999999;
        const bMin = b.minSizeStock ?? 999999;
        return aMin - bMin;
      })
      .slice(0, 20);

    // ===== Usuarios (admin + asesor) =====
    const allUsers = await User.find({})
      .select('_id name email role code createdAt')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      kpi: {
        today: {
          paidTotal: paidToday,
          suggestedTotal: suggestedToday,
          discountAmount: discountAmtToday,
          discountPct: discountPctToday,
          billsCount: billsToday.length,
          units: unitsToday,
          ticketAvg: ticketAvg(paidToday, billsToday.length),
        },
        month: {
          paidTotal: paidMonth,
          suggestedTotal: suggestedMonth,
          discountAmount: discountAmtMonth,
          discountPct: discountPctMonth,
          billsCount: billsMonth.length,
          units: unitsMonth,
          ticketAvg: ticketAvg(paidMonth, billsMonth.length),
        },
        year: {
          paidTotal: paidYear,
          suggestedTotal: suggestedYear,
          discountAmount: discountAmtYear,
          discountPct: discountPctYear,
          billsCount: billsYear.length,
          units: unitsYear,
          ticketAvg: ticketAvg(paidYear, billsYear.length),
        },
      },

      series: {
        days,
        months,
        years,
      },

      sellers: {
        list: sellers,
        bestSeller,
      },

      products: {
        topProducts,
        lowProducts,
      },

      inventory: {
        byCategory: inventoryByCategory,
        lowStockProducts,
      },

      users: allUsers,
    });
  } catch (error) {
    console.log('dashboard summary error:', error);
    return res.status(500).json({ message: 'Error dashboard summary' });
  }
};