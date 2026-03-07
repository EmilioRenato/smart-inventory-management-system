import Bills from '../models/billsModel.js';
import SriInvoice from '../models/sriInvoiceModel.js';
import { create } from 'xmlbuilder2';
import axios from 'axios';
import { parseStringPromise } from 'xml2js';

// ===== Helpers =====
const padLeft = (value, length) => String(value).padStart(length, '0');

const getEnvironmentCode = environment =>
  environment === 'PRODUCCION' ? '2' : '1';

const getTipoIdentificacionComprador = identificacion => {
  const clean = String(identificacion || '').replace(/\D/g, '');
  if (clean.length === 13) return '04'; // RUC
  if (clean.length === 10) return '05'; // cédula
  return '06'; // pasaporte/u otro
};

const formatDateDDMMYYYY = date => {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}${month}${year}`;
};

const formatIssueDate = date => {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

const escapeXmlText = value => String(value ?? '').trim();
const round2 = value => Number(Number(value || 0).toFixed(2));

const generateModulo11Digit = base => {
  let factor = 2;
  let total = 0;

  for (let i = base.length - 1; i >= 0; i--) {
    total += Number(base[i]) * factor;
    factor = factor === 7 ? 2 : factor + 1;
  }

  const mod = 11 - (total % 11);
  if (mod === 11) return '0';
  if (mod === 10) return '1';
  return String(mod);
};

const generateClaveAcceso = ({
  issueDate,
  codDoc,
  ruc,
  environmentCode,
  estab,
  ptoEmi,
  secuencial,
}) => {
  const codigoNumerico = String(Math.floor(Math.random() * 99999999)).padStart(
    8,
    '0'
  );
  const tipoEmision = '1';

  const base =
    issueDate +
    codDoc +
    ruc +
    environmentCode +
    estab +
    ptoEmi +
    secuencial +
    codigoNumerico +
    tipoEmision;

  return base + generateModulo11Digit(base);
};

const getNextSecuencial = async () => {
  const last = await SriInvoice.findOne().sort({ createdAt: -1 });
  if (!last?.secuencial) return '000000001';

  const current = Number(last.secuencial || 0);
  return String(current + 1).padStart(9, '0');
};

const getEmisorConfig = environment => {
  const ambiente = getEnvironmentCode(environment);

  return {
    ambiente,
    tipoEmision: '1',
    razonSocial: process.env.SRI_RAZON_SOCIAL || '',
    nombreComercial: process.env.SRI_NOMBRE_COMERCIAL || '',
    ruc: process.env.SRI_RUC || '',
    codDoc: '01',
    estab: padLeft(process.env.SRI_ESTAB || '001', 3),
    ptoEmi: padLeft(process.env.SRI_PTO_EMI || '001', 3),
    dirMatriz: process.env.SRI_DIR_MATRIZ || '',
    dirEstablecimiento:
      process.env.SRI_DIR_ESTABLECIMIENTO || process.env.SRI_DIR_MATRIZ || '',
    obligadoContabilidad:
      String(process.env.SRI_OBLIGADO_CONTABILIDAD || 'NO').toUpperCase() ===
      'SI'
        ? 'SI'
        : 'NO',
  };
};

const getIvaRate = () => {
  const raw = Number(process.env.SRI_IVA_RATE || 0.13);
  if (!Number.isFinite(raw) || raw < 0) return 0.13;
  return raw;
};

// Descompone importes cuando el precio ya INCLUYE IVA
const buildInvoiceBreakdown = sriInvoice => {
  const ivaRate = getIvaRate();
  const ivaPercent = round2(ivaRate * 100);

  const items = (sriInvoice.items || []).map((it, index) => {
    const unitPriceWithVat = Number(it.price || 0);
    const qty = Number(it.quantity || 0);

    const grossLine = round2(unitPriceWithVat * qty);

    const linePaidWithVat =
      Number(sriInvoice.suggestedTotal || 0) > 0
        ? round2(
            (grossLine / Number(sriInvoice.suggestedTotal || 1)) *
              Number(sriInvoice.paidTotal || 0)
          )
        : grossLine;

    const discountWithVat = round2(grossLine - linePaidWithVat);

    const baseLine = round2(linePaidWithVat / (1 + ivaRate));
    const ivaLine = round2(linePaidWithVat - baseLine);

    const unitPriceNoVat = round2(unitPriceWithVat / (1 + ivaRate));

    return {
      index,
      codigoPrincipal: String(index + 1).padStart(4, '0'),
      descripcion: escapeXmlText(it.name || 'Producto'),
      cantidad: qty.toFixed(2),
      precioUnitario: unitPriceNoVat.toFixed(2),
      descuento: round2(discountWithVat / (1 + ivaRate)).toFixed(2),
      precioTotalSinImpuesto: baseLine.toFixed(2),
      baseImponible: baseLine,
      valorIva: ivaLine,
      ivaPercent,
    };
  });

  const totalBase = round2(items.reduce((sum, x) => sum + x.baseImponible, 0));
  const totalIva = round2(items.reduce((sum, x) => sum + x.valorIva, 0));

  return {
    ivaRate,
    ivaPercent,
    items,
    totalBase,
    totalIva,
    importeTotal: round2(Number(sriInvoice.paidTotal || 0)),
    totalDescuentoSinIva: round2(
      items.reduce((sum, x) => sum + Number(x.descuento || 0), 0)
    ),
  };
};

const buildSriDraftXml = sriInvoice => {
  const emisor = getEmisorConfig(sriInvoice.environment);
  const issueDate = formatIssueDate(sriInvoice.createdAt || new Date());
  const tipoIdentificacionComprador = getTipoIdentificacionComprador(
    sriInvoice.customerCedula
  );

  const breakdown = buildInvoiceBreakdown(sriInvoice);

  const root = create({ version: '1.0', encoding: 'UTF-8' }).ele('factura', {
    id: 'comprobante',
    version: '1.1.0',
  });

  const infoTributaria = root.ele('infoTributaria');
  infoTributaria.ele('ambiente').txt(emisor.ambiente);
  infoTributaria.ele('tipoEmision').txt(emisor.tipoEmision);
  infoTributaria.ele('razonSocial').txt(emisor.razonSocial);
  infoTributaria.ele('nombreComercial').txt(emisor.nombreComercial);
  infoTributaria.ele('ruc').txt(emisor.ruc);
  infoTributaria.ele('claveAcceso').txt(sriInvoice.claveAcceso);
  infoTributaria.ele('codDoc').txt(emisor.codDoc);
  infoTributaria.ele('estab').txt(emisor.estab);
  infoTributaria.ele('ptoEmi').txt(emisor.ptoEmi);
  infoTributaria.ele('secuencial').txt(sriInvoice.secuencial);
  infoTributaria.ele('dirMatriz').txt(emisor.dirMatriz);

  const infoFactura = root.ele('infoFactura');
  infoFactura.ele('fechaEmision').txt(issueDate);
  infoFactura.ele('dirEstablecimiento').txt(emisor.dirEstablecimiento);
  infoFactura.ele('obligadoContabilidad').txt(emisor.obligadoContabilidad);
  infoFactura
    .ele('tipoIdentificacionComprador')
    .txt(tipoIdentificacionComprador);
  infoFactura
    .ele('razonSocialComprador')
    .txt(escapeXmlText(sriInvoice.customerName));
  infoFactura
    .ele('identificacionComprador')
    .txt(escapeXmlText(sriInvoice.customerCedula));
  infoFactura
    .ele('direccionComprador')
    .txt(escapeXmlText(sriInvoice.customerAddress));
  infoFactura
    .ele('totalSinImpuestos')
    .txt(breakdown.totalBase.toFixed(2));
  infoFactura
    .ele('totalDescuento')
    .txt(breakdown.totalDescuentoSinIva.toFixed(2));

  const totalConImpuestos = infoFactura.ele('totalConImpuestos');
  const totalImpuesto = totalConImpuestos.ele('totalImpuesto');
  totalImpuesto.ele('codigo').txt('2');
  totalImpuesto.ele('codigoPorcentaje').txt('2');
  totalImpuesto.ele('baseImponible').txt(breakdown.totalBase.toFixed(2));
  totalImpuesto.ele('valor').txt(breakdown.totalIva.toFixed(2));

  infoFactura.ele('propina').txt('0.00');
  infoFactura.ele('importeTotal').txt(breakdown.importeTotal.toFixed(2));
  infoFactura.ele('moneda').txt('DOLAR');

  const pagos = infoFactura.ele('pagos');
  const pago = pagos.ele('pago');
  pago.ele('formaPago').txt('01');
  pago.ele('total').txt(breakdown.importeTotal.toFixed(2));
  pago.ele('plazo').txt('0');
  pago.ele('unidadTiempo').txt('dias');

  const detallesNode = root.ele('detalles');
  breakdown.items.forEach(det => {
    const detalle = detallesNode.ele('detalle');
    detalle.ele('codigoPrincipal').txt(det.codigoPrincipal);
    detalle.ele('descripcion').txt(det.descripcion);
    detalle.ele('cantidad').txt(det.cantidad);
    detalle.ele('precioUnitario').txt(det.precioUnitario);
    detalle.ele('descuento').txt(det.descuento);
    detalle.ele('precioTotalSinImpuesto').txt(det.precioTotalSinImpuesto);

    const impuestos = detalle.ele('impuestos');
    const impuesto = impuestos.ele('impuesto');
    impuesto.ele('codigo').txt('2');
    impuesto.ele('codigoPorcentaje').txt('2');
    impuesto.ele('tarifa').txt(breakdown.ivaPercent.toFixed(2));
    impuesto.ele('baseImponible').txt(det.baseImponible.toFixed(2));
    impuesto.ele('valor').txt(det.valorIva.toFixed(2));
  });

  const infoAdicional = root.ele('infoAdicional');
  if (sriInvoice.customerEmail) {
    infoAdicional
      .ele('campoAdicional', { nombre: 'Email' })
      .txt(escapeXmlText(sriInvoice.customerEmail));
  }
  infoAdicional
    .ele('campoAdicional', { nombre: 'Telefono' })
    .txt(String(sriInvoice.customerPhone || ''));
  infoAdicional
    .ele('campoAdicional', { nombre: 'MetodoPago' })
    .txt(String(sriInvoice.paymentMethod || ''));

  return root.end({ prettyPrint: true });
};

// ===== SOAP helpers SRI =====
const getSriWsConfig = environment => {
  const isProd = environment === 'PRODUCCION';

  return {
    recepcionUrl: isProd
      ? 'https://cel.sri.gob.ec/comprobantes-electronicos-ws/RecepcionComprobantesOffline'
      : 'https://celcer.sri.gob.ec/comprobantes-electronicos-ws/RecepcionComprobantesOffline',
    autorizacionUrl: isProd
      ? 'https://cel.sri.gob.ec/comprobantes-electronicos-ws/AutorizacionComprobantesOffline'
      : 'https://celcer.sri.gob.ec/comprobantes-electronicos-ws/AutorizacionComprobantesOffline',
  };
};

const buildRecepcionSoapEnvelope = signedXml => {
  const xmlBase64 = Buffer.from(signedXml, 'utf8').toString('base64');

  return `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ec="http://ec.gob.sri.ws.recepcion">
  <soapenv:Header/>
  <soapenv:Body>
    <ec:validarComprobante>
      <xml>${xmlBase64}</xml>
    </ec:validarComprobante>
  </soapenv:Body>
</soapenv:Envelope>`;
};

const buildAutorizacionSoapEnvelope = claveAcceso => {
  return `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ec="http://ec.gob.sri.ws.autorizacion">
  <soapenv:Header/>
  <soapenv:Body>
    <ec:autorizacionComprobante>
      <claveAccesoComprobante>${claveAcceso}</claveAccesoComprobante>
    </ec:autorizacionComprobante>
  </soapenv:Body>
</soapenv:Envelope>`;
};

const findNode = (obj, targetKey) => {
  if (!obj || typeof obj !== 'object') return null;
  if (Object.prototype.hasOwnProperty.call(obj, targetKey)) return obj[targetKey];

  for (const key of Object.keys(obj)) {
    const found = findNode(obj[key], targetKey);
    if (found !== null && found !== undefined) return found;
  }
  return null;
};

const normalizeSoapValue = value => {
  if (Array.isArray(value)) return normalizeSoapValue(value[0]);
  if (value && typeof value === 'object' && '_' in value) return value._;
  return value;
};

// ===== Crear borrador SRI desde una nota =====
export const createSriFromBillController = async (req, res) => {
  try {
    const { billId } = req.body;

    if (!billId) {
      return res.status(400).json({ message: 'billId is required' });
    }

    const existing = await SriInvoice.findOne({ billId });
    if (existing) {
      return res.status(400).json({
        message: 'Esta nota de venta ya tiene una factura SRI creada',
        sriInvoice: existing,
      });
    }

    const bill = await Bills.findById(billId);
    if (!bill) {
      return res.status(404).json({ message: 'Nota de venta no encontrada' });
    }

    const emisor = getEmisorConfig('PRUEBAS');

    if (!emisor.ruc || !emisor.razonSocial || !emisor.nombreComercial) {
      return res.status(400).json({
        message: 'Faltan datos del emisor en variables de entorno SRI_*',
      });
    }

    const secuencial = await getNextSecuencial();
    const issueDate = formatDateDDMMYYYY(new Date());
    const claveAcceso = generateClaveAcceso({
      issueDate,
      codDoc: emisor.codDoc,
      ruc: emisor.ruc,
      environmentCode: emisor.ambiente,
      estab: emisor.estab,
      ptoEmi: emisor.ptoEmi,
      secuencial,
    });

    const sriInvoice = await SriInvoice.create({
      billId: bill._id,
      createdBy: bill.createdBy,

      sellerCode: bill.sellerCode,
      sellerName: bill.sellerName || '',

      customerCedula: bill.customerCedula,
      customerName: bill.customerName,
      customerPhone: bill.customerPhone,
      customerAddress: bill.customerAddress,
      customerEmail: String(bill.customerEmail || '').trim().toLowerCase(),

      items: (bill.cartItems || []).map(it => ({
        productId: it.productId,
        name: it.name,
        image: it.image || '',
        price: Number(it.price || 0),
        quantity: Number(it.quantity || 0),
        sizeOrders: Array.isArray(it.sizeOrders) ? it.sizeOrders : [],
      })),

      suggestedTotal: Number(bill.suggestedTotal || 0),
      paidTotal: Number(bill.paidTotal || 0),
      discountAmount: Number(bill.discountAmount || 0),
      paymentMethod: bill.paymentMethod,

      environment: 'PRUEBAS',
      status: 'BORRADOR',

      secuencial,
      claveAcceso,
    });

    return res.status(200).json({
      message: 'Borrador de factura SRI creado correctamente',
      sriInvoice,
    });
  } catch (error) {
    console.log('Error createSriFromBillController:', error);
    return res.status(500).json({
      message: 'Error creando borrador SRI',
      error: error?.message || String(error),
    });
  }
};

// ===== Generar XML borrador =====
export const generateSriXmlController = async (req, res) => {
  try {
    const { sriInvoiceId } = req.body;

    if (!sriInvoiceId) {
      return res.status(400).json({ message: 'sriInvoiceId is required' });
    }

    const sriInvoice = await SriInvoice.findById(sriInvoiceId);
    if (!sriInvoice) {
      return res.status(404).json({ message: 'Factura SRI no encontrada' });
    }

    const xml = buildSriDraftXml(sriInvoice);

    sriInvoice.xmlUnsigned = xml;
    sriInvoice.status = 'XML_GENERADO';
    await sriInvoice.save();

    return res.status(200).json({
      message: 'XML borrador generado correctamente',
      sriInvoice,
    });
  } catch (error) {
    console.log('Error generateSriXmlController:', error);
    return res.status(500).json({
      message: 'Error generando XML borrador',
      error: error?.message || String(error),
    });
  }
};

// ===== Firmar XML usando microservicio =====
export const signSriXmlController = async (req, res) => {
  try {
    const { sriInvoiceId, p12Base64, p12Password } = req.body;

    if (!sriInvoiceId) {
      return res.status(400).json({ message: 'sriInvoiceId is required' });
    }
    if (!p12Base64) {
      return res.status(400).json({ message: 'p12Base64 is required' });
    }
    if (!p12Password) {
      return res.status(400).json({ message: 'p12Password is required' });
    }

    const sriInvoice = await SriInvoice.findById(sriInvoiceId);
    if (!sriInvoice) {
      return res.status(404).json({ message: 'Factura SRI no encontrada' });
    }

    if (!sriInvoice.xmlUnsigned) {
      return res.status(400).json({
        message: 'Primero debes generar el XML borrador',
      });
    }

    const signerBaseUrl =
      process.env.SIGNER_SERVICE_URL || 'http://localhost:8081';

    const { data } = await axios.post(`${signerBaseUrl}/signer/sign`, {
      xml: sriInvoice.xmlUnsigned,
      p12Base64,
      p12Password,
    });

    if (!data?.success) {
      return res.status(400).json({
        message: data?.message || 'No se pudo firmar el XML',
        signerResponse: data,
      });
    }

    sriInvoice.xmlSigned = String(data.signedXml || '');
    sriInvoice.status = 'FIRMADA';
    sriInvoice.sriResponse = data;
    await sriInvoice.save();

    return res.status(200).json({
      message: 'XML firmado correctamente',
      sriInvoice,
    });
  } catch (error) {
    console.log('Error signSriXmlController:', error);
    return res.status(500).json({
      message: 'Error firmando XML',
      error: error?.response?.data || error?.message || String(error),
    });
  }
};

// ===== Enviar a recepción SRI =====
export const sendSriToReceptionController = async (req, res) => {
  try {
    const { sriInvoiceId } = req.body;

    if (!sriInvoiceId) {
      return res.status(400).json({ message: 'sriInvoiceId is required' });
    }

    const sriInvoice = await SriInvoice.findById(sriInvoiceId);
    if (!sriInvoice) {
      return res.status(404).json({ message: 'Factura SRI no encontrada' });
    }

    if (!sriInvoice.xmlSigned) {
      return res.status(400).json({
        message: 'Primero debes firmar el XML',
      });
    }

    const ws = getSriWsConfig(sriInvoice.environment);
    const envelope = buildRecepcionSoapEnvelope(sriInvoice.xmlSigned);

    const { data } = await axios.post(ws.recepcionUrl, envelope, {
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        SOAPAction: '',
      },
      timeout: 30000,
    });

    const parsed = await parseStringPromise(data, { explicitArray: false });

    const estadoNode = findNode(parsed, 'estado');
    const estado = normalizeSoapValue(estadoNode) || 'SIN_RESPUESTA';

    sriInvoice.sriResponse = {
      ...(sriInvoice.sriResponse || {}),
      recepcionRaw: data,
      recepcionParsed: parsed,
    };

    if (String(estado).toUpperCase() === 'RECIBIDA') {
      sriInvoice.status = 'ENVIADA';
    } else {
      sriInvoice.status = 'RECHAZADA';
    }

    await sriInvoice.save();

    return res.status(200).json({
      message: 'Respuesta de recepción obtenida',
      estado,
      sriInvoice,
    });
  } catch (error) {
    console.log('Error sendSriToReceptionController:', error);
    return res.status(500).json({
      message: 'Error enviando al SRI (recepción)',
      error: error?.response?.data || error?.message || String(error),
    });
  }
};

// ===== Consultar autorización SRI =====
export const checkSriAuthorizationController = async (req, res) => {
  try {
    const { sriInvoiceId } = req.body;

    if (!sriInvoiceId) {
      return res.status(400).json({ message: 'sriInvoiceId is required' });
    }

    const sriInvoice = await SriInvoice.findById(sriInvoiceId);
    if (!sriInvoice) {
      return res.status(404).json({ message: 'Factura SRI no encontrada' });
    }

    const ws = getSriWsConfig(sriInvoice.environment);
    const envelope = buildAutorizacionSoapEnvelope(sriInvoice.claveAcceso);

    const { data } = await axios.post(ws.autorizacionUrl, envelope, {
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        SOAPAction: '',
      },
      timeout: 30000,
    });

    const parsed = await parseStringPromise(data, { explicitArray: false });

    const estadoNode = findNode(parsed, 'estado');
    const estado = normalizeSoapValue(estadoNode) || 'SIN_RESPUESTA';

    const numeroAutorizacionNode = findNode(parsed, 'numeroAutorizacion');
    const fechaAutorizacionNode = findNode(parsed, 'fechaAutorizacion');

    sriInvoice.sriResponse = {
      ...(sriInvoice.sriResponse || {}),
      autorizacionRaw: data,
      autorizacionParsed: parsed,
    };

    if (String(estado).toUpperCase() === 'AUTORIZADO') {
      sriInvoice.status = 'AUTORIZADA';
      sriInvoice.authorizationNumber =
        normalizeSoapValue(numeroAutorizacionNode) || '';
      const fecha = normalizeSoapValue(fechaAutorizacionNode);
      sriInvoice.authorizationDate = fecha ? new Date(fecha) : null;
    }

    await sriInvoice.save();

    return res.status(200).json({
      message: 'Respuesta de autorización obtenida',
      estado,
      sriInvoice,
    });
  } catch (error) {
    console.log('Error checkSriAuthorizationController:', error);
    return res.status(500).json({
      message: 'Error consultando autorización SRI',
      error: error?.response?.data || error?.message || String(error),
    });
  }
};

// ===== Obtener todas las facturas SRI =====
export const getSriInvoicesController = async (req, res) => {
  try {
    const sriInvoices = await SriInvoice.find()
      .populate('billId')
      .sort({ createdAt: -1 });

    return res.status(200).json(sriInvoices);
  } catch (error) {
    console.log('Error getSriInvoicesController:', error);
    return res.status(500).json({
      message: 'Error obteniendo facturas SRI',
      error: error?.message || String(error),
    });
  }
};

// ===== Obtener una factura SRI por ID =====
export const getSriInvoiceByIdController = async (req, res) => {
  try {
    const { id } = req.params;

    const sriInvoice = await SriInvoice.findById(id).populate('billId');

    if (!sriInvoice) {
      return res.status(404).json({ message: 'Factura SRI no encontrada' });
    }

    return res.status(200).json(sriInvoice);
  } catch (error) {
    console.log('Error getSriInvoiceByIdController:', error);
    return res.status(500).json({
      message: 'Error obteniendo factura SRI',
      error: error?.message || String(error),
    });
  }
};