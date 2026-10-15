import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { RealOrder, parseDeliveryAddress } from '@/app/admin/orders/page';

export interface InvoiceBusinessInfo {
  name?: string;
  address?: string;
  city?: string;
  state?: string;
  phone?: string;
  email?: string;
  gstin?: string;
  shopId?: string;
}

export function generateInvoiceNumber(order: RealOrder): string {
  if (order.orderId && order.orderId.startsWith('ORD-')) {
    return `INV-${order.orderId.replace('ORD-', '')}`;
  }
  const cleanId = (order.id || 'ORDER').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  return `INV-${cleanId.slice(-8)}`;
}

export function formatInvoiceDate(rawDate: any): string {
  if (!rawDate) return new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  if (rawDate?.toDate) {
    const dt = rawDate.toDate();
    return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }
  if (typeof rawDate === 'string') {
    try {
      const dt = new Date(rawDate);
      return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch (_) {
      return rawDate;
    }
  }
  return new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

/**
 * Generates and downloads a clean, professional vector A4 PDF invoice.
 */
export function downloadOrderInvoicePdf(order: RealOrder, bizInfo?: InvoiceBusinessInfo | null) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const invoiceNum = generateInvoiceNumber(order);
  const invoiceDate = formatInvoiceDate(order.createdAt);
  const orderId = order.orderId || order.id;
  const clinicName = bizInfo?.name || order.businessName || 'Healthy Paws Pet Clinic';
  const clinicPhone = bizInfo?.phone || '+91 91401 30314';
  const clinicEmail = bizInfo?.email || 'contact@healthypawspet.in';
  const clinicAddress = [bizInfo?.address, bizInfo?.city, bizInfo?.state].filter(Boolean).join(', ') || 'Pet Healthcare & Commerce Center';
  const shopId = order.shopId || bizInfo?.shopId || 'SHOP-D9E8';
  const addr = parseDeliveryAddress(order);

  // --- HEADER SECTION ---
  doc.setFillColor(117, 103, 232); // Primary Brand Purple
  doc.rect(0, 0, 210, 8, 'F');

  // Business Branding
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(37, 36, 42);
  doc.text(clinicName, 14, 22);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(115, 119, 128);
  doc.text(clinicAddress, 14, 28);
  doc.text(`Phone: ${clinicPhone} | Email: ${clinicEmail}`, 14, 33);
  doc.text(`Registered Shop ID: ${shopId}`, 14, 38);

  if (bizInfo?.gstin) {
    doc.text(`GSTIN: ${bizInfo.gstin}`, 14, 43);
  }

  // Invoice Title Badge
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(117, 103, 232);
  doc.text('TAX INVOICE', 196, 22, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(75, 85, 99);
  doc.text(`Invoice No: ${invoiceNum}`, 196, 28, { align: 'right' });
  doc.text(`Date: ${invoiceDate}`, 196, 33, { align: 'right' });
  doc.text(`Order ID: ${orderId}`, 196, 38, { align: 'right' });

  // Divider Line
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.5);
  doc.line(14, 46, 196, 46);

  // --- BILL TO / SHIP TO & ORDER DETAILS ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(37, 36, 42);
  doc.text('BILL TO / SHIP TO:', 14, 53);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(55, 65, 81);
  doc.text(`Customer: ${addr.recipient}`, 14, 59);
  if (addr.phone) doc.text(`Phone: ${addr.phone}`, 14, 64);
  if (order.customerEmail) doc.text(`Email: ${order.customerEmail}`, 14, 69);

  // Address line construction
  let addressLine1 = addr.house ? `${addr.house}, ${addr.street || ''}` : (addr.street || '');
  if (!addressLine1 && addr.fullAddress) addressLine1 = addr.fullAddress;
  let addressLine2 = [addr.landmark ? `Near ${addr.landmark}` : '', addr.city, addr.state, addr.pincode ? `PIN: ${addr.pincode}` : ''].filter(Boolean).join(', ');

  const currentY = order.customerEmail ? 74 : 69;
  if (addressLine1) {
    const splitAddr1 = doc.splitTextToSize(addressLine1, 85);
    doc.text(splitAddr1, 14, currentY);
  }
  if (addressLine2) {
    const splitAddr2 = doc.splitTextToSize(addressLine2, 85);
    doc.text(splitAddr2, 14, currentY + 5);
  }

  // Payment Details Block (Right Column)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(37, 36, 42);
  doc.text('PAYMENT DETAILS:', 125, 53);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(55, 65, 81);
  doc.text(`Payment Method: ${order.paymentMethod || 'Cash on Delivery'}`, 125, 59);
  doc.text(`Payment Status: ${order.paymentStatus || 'Pending'}`, 125, 64);
  doc.text(`Order Status: ${order.status || order.orderStatus || 'Placed'}`, 125, 69);
  doc.text(`Fulfillment: Clinic Direct Delivery`, 125, 74);

  // --- ITEMS TABLE ---
  const tableStartY = 88;
  const tableRows: any[] = (order.items || []).map((item, idx) => {
    const unitPrice = item.unitPrice || parseFloat((item.price || '0').toString().replace(/[^\d.]/g, '')) || 0;
    const qty = item.quantity || 1;
    const total = item.total || unitPrice * qty;
    return [
      (idx + 1).toString(),
      item.name || 'Pet Care Product',
      item.variant || 'Standard',
      qty.toString(),
      `Rs. ${unitPrice.toFixed(2)}`,
      `Rs. ${total.toFixed(2)}`,
    ];
  });

  if (tableRows.length === 0) {
    tableRows.push(['1', 'Pet Care Order Items', 'Standard', '1', `Rs. ${(order.totalAmount || 0).toFixed(2)}`, `Rs. ${(order.totalAmount || 0).toFixed(2)}`]);
  }

  autoTable(doc, {
    startY: tableStartY,
    margin: { left: 14, right: 14 },
    head: [['#', 'Item Description', 'Variant', 'Qty', 'Unit Price', 'Total']],
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: [117, 103, 232],
      textColor: [255, 255, 255],
      fontSize: 8.5,
      fontStyle: 'bold',
      halign: 'left',
    },
    styles: {
      fontSize: 8.5,
      textColor: [37, 36, 42],
      cellPadding: 3,
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 70 },
      2: { cellWidth: 32 },
      3: { cellWidth: 16, halign: 'center' },
      4: { cellWidth: 26, halign: 'right' },
      5: { cellWidth: 28, halign: 'right' },
    },
  });

  // Calculate position after table
  const finalY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 8 : 150;

  // --- SUMMARY TOTALS BOX ---
  const subtotal = order.subtotal || order.totalAmount || 0;
  const deliveryFee = order.deliveryFee || 0;
  const totalAmount = order.totalAmount || subtotal + deliveryFee;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(107, 114, 128);

  const labelX = 135;
  const valueX = 196;

  doc.text('Subtotal:', labelX, finalY);
  doc.text(`Rs. ${subtotal.toFixed(2)}`, valueX, finalY, { align: 'right' });

  doc.text('Delivery Fee:', labelX, finalY + 5);
  doc.text(deliveryFee === 0 ? 'FREE' : `Rs. ${deliveryFee.toFixed(2)}`, valueX, finalY + 5, { align: 'right' });

  doc.setDrawColor(229, 231, 235);
  doc.line(labelX, finalY + 8, valueX, finalY + 8);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(117, 103, 232);
  doc.text('Total Amount Payable:', labelX, finalY + 14);
  doc.text(`Rs. ${totalAmount.toFixed(2)}`, valueX, finalY + 14, { align: 'right' });

  // --- FOOTER & AUTHORIZED SIGNATURE ---
  const footerY = Math.max(finalY + 32, 260);

  doc.setDrawColor(229, 231, 235);
  doc.line(14, footerY, 196, footerY);

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(156, 163, 175);
  doc.text('Thank you for choosing Healthy Paws Pet Clinic for your pet care needs!', 14, footerY + 6);
  doc.text('This is a computer-generated tax invoice. No physical signature is required.', 14, footerY + 10);
  doc.text(`Generated securely by Healthy Paws Admin Portal on ${new Date().toLocaleDateString('en-IN')}`, 14, footerY + 14);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(75, 85, 99);
  doc.text('For ' + clinicName, 196, footerY + 6, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.text('Authorized Signatory', 196, footerY + 14, { align: 'right' });

  // Save the PDF
  const filename = `Invoice_${orderId}.pdf`;
  doc.save(filename);
}

/**
 * Triggers standard browser print flow with print-focused styling
 */
export function triggerPrintInvoice() {
  window.print();
}
