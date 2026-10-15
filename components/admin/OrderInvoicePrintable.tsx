'use client';

import React from 'react';
import { RealOrder, parseDeliveryAddress } from '@/app/admin/orders/page';
import { generateInvoiceNumber, formatInvoiceDate, InvoiceBusinessInfo } from '@/lib/invoiceGenerator';

interface OrderInvoicePrintableProps {
  order: RealOrder;
  bizInfo?: InvoiceBusinessInfo | null;
}

export const OrderInvoicePrintable: React.FC<OrderInvoicePrintableProps> = ({ order, bizInfo }) => {
  const invoiceNum = generateInvoiceNumber(order);
  const invoiceDate = formatInvoiceDate(order.createdAt);
  const orderId = order.orderId || order.id;
  const clinicName = bizInfo?.name || order.businessName || 'Healthy Paws Pet Clinic';
  const clinicPhone = bizInfo?.phone || '+91 91401 30314';
  const clinicEmail = bizInfo?.email || 'contact@healthypawspet.in';
  const clinicAddress = [bizInfo?.address, bizInfo?.city, bizInfo?.state].filter(Boolean).join(', ') || 'Pet Healthcare & Commerce Center';
  const shopId = order.shopId || bizInfo?.shopId || 'SHOP-D9E8';
  const addr = parseDeliveryAddress(order);

  const subtotal = order.subtotal || order.totalAmount || 0;
  const deliveryFee = order.deliveryFee || 0;
  const totalAmount = order.totalAmount || subtotal + deliveryFee;

  return (
    <div id="invoice-printable-container" className="hidden print:block bg-white text-[#1F2937] p-8 max-w-[210mm] mx-auto text-xs leading-relaxed">
      {/* Top Brand Banner */}
      <div className="border-b-2 border-[#7567E8] pb-4 mb-6 flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-black text-[#25242A] tracking-tight">{clinicName}</h1>
          <p className="text-gray-500 font-medium text-[11px] mt-0.5">{clinicAddress}</p>
          <p className="text-gray-500 text-[11px]">Phone: {clinicPhone} | Email: {clinicEmail}</p>
          <p className="text-[#7567E8] font-bold text-[11px] mt-1">Shop ID: {shopId}</p>
          {bizInfo?.gstin && <p className="text-gray-600 text-[11px]">GSTIN: {bizInfo.gstin}</p>}
        </div>

        <div className="text-right">
          <div className="inline-block bg-[#F5F3FF] border border-[#DDD6FE] text-[#7567E8] font-black px-3 py-1 rounded text-sm uppercase tracking-wider mb-2">
            Tax Invoice / Bill
          </div>
          <p className="font-bold text-gray-800 text-xs">Invoice #: <span className="font-mono text-[#7567E8]">{invoiceNum}</span></p>
          <p className="text-gray-600 text-[11px]">Date: {invoiceDate}</p>
          <p className="text-gray-600 text-[11px]">Order ID: <span className="font-mono">{orderId}</span></p>
        </div>
      </div>

      {/* Two-Column Bill-To & Payment Details */}
      <div className="grid grid-cols-2 gap-8 mb-6 bg-[#F9FAFB] p-4 rounded-xl border border-gray-200">
        <div>
          <h2 className="text-[10px] uppercase font-black tracking-wider text-gray-500 mb-1.5">Billed & Shipped To:</h2>
          <p className="font-bold text-gray-900 text-sm">{addr.recipient}</p>
          {addr.phone && <p className="text-gray-700">Phone: {addr.phone}</p>}
          {order.customerEmail && <p className="text-gray-600">Email: {order.customerEmail}</p>}
          <div className="mt-2 text-gray-800 leading-snug">
            {addr.hasStructured ? (
              <>
                {addr.house && <p className="font-semibold">{addr.house}</p>}
                {addr.street && <p>{addr.street}</p>}
                {addr.landmark && <p className="text-gray-600 text-[11px]">Landmark: {addr.landmark}</p>}
                <p>{[addr.city, addr.state, addr.pincode ? `PIN: ${addr.pincode}` : ''].filter(Boolean).join(', ')}</p>
              </>
            ) : (
              <p>{addr.fullAddress || 'Delivery Address on file'}</p>
            )}
          </div>
        </div>

        <div>
          <h2 className="text-[10px] uppercase font-black tracking-wider text-gray-500 mb-1.5">Payment & Fulfillment:</h2>
          <p className="text-gray-700"><span className="font-semibold text-gray-900">Payment Method:</span> {order.paymentMethod || 'Cash on Delivery'}</p>
          <p className="text-gray-700"><span className="font-semibold text-gray-900">Payment Status:</span> {order.paymentStatus || 'Pending'}</p>
          <p className="text-gray-700"><span className="font-semibold text-gray-900">Order Status:</span> {order.status || order.orderStatus || 'Placed'}</p>
          <p className="text-gray-700"><span className="font-semibold text-gray-900">Fulfillment:</span> Direct Clinic Delivery</p>
          {addr.instructions && (
            <div className="mt-2 text-[11px] text-gray-600 bg-white p-2 rounded border border-gray-200">
              <span className="font-bold">Instructions:</span> {addr.instructions}
            </div>
          )}
        </div>
      </div>

      {/* Itemized Table */}
      <div className="mb-6 border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#7567E8] text-white font-bold">
            <tr>
              <th className="py-2.5 px-3 w-8 text-center">#</th>
              <th className="py-2.5 px-3">Item Description</th>
              <th className="py-2.5 px-3">Variant</th>
              <th className="py-2.5 px-3 text-center">Qty</th>
              <th className="py-2.5 px-3 text-right">Unit Price</th>
              <th className="py-2.5 px-3 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {(order.items || []).map((item, idx) => {
              const unitP = item.unitPrice || parseFloat((item.price || '0').toString().replace(/[^\d.]/g, '')) || 0;
              const lineTotal = item.total || unitP * (item.quantity || 1);
              return (
                <tr key={idx} className="odd:bg-white even:bg-[#F9FAFB]">
                  <td className="py-2 px-3 text-center text-gray-500">{idx + 1}</td>
                  <td className="py-2 px-3 font-semibold text-gray-900">{item.name}</td>
                  <td className="py-2 px-3 text-gray-600">{item.variant || 'Standard'}</td>
                  <td className="py-2 px-3 text-center font-bold text-gray-800">x{item.quantity}</td>
                  <td className="py-2 px-3 text-right text-gray-700">₹{unitP.toFixed(2)}</td>
                  <td className="py-2 px-3 text-right font-bold text-gray-900">₹{lineTotal.toFixed(2)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Summary Totals Table */}
      <div className="flex justify-end mb-8">
        <div className="w-72 bg-[#F9FAFB] p-3.5 rounded-xl border border-gray-200 space-y-2 text-xs">
          <div className="flex justify-between text-gray-600">
            <span>Subtotal:</span>
            <span>₹{subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>Delivery Fee:</span>
            <span className={deliveryFee === 0 ? 'text-emerald-600 font-bold' : ''}>
              {deliveryFee === 0 ? 'FREE' : `₹${deliveryFee.toFixed(2)}`}
            </span>
          </div>
          <div className="border-t border-gray-300 pt-2 flex justify-between font-black text-sm text-[#7567E8]">
            <span>Total Amount Payable:</span>
            <span>₹{totalAmount.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Footer & Signature */}
      <div className="border-t border-gray-200 pt-4 flex justify-between items-end text-gray-500 text-[10px]">
        <div>
          <p className="font-semibold text-gray-700">Thank you for choosing {clinicName}!</p>
          <p>This is a computer-generated invoice. No physical signature is required.</p>
          <p>For any queries or returns, please contact {clinicPhone}.</p>
        </div>

        <div className="text-right">
          <p className="font-bold text-gray-700">For {clinicName}</p>
          <div className="h-10"></div>
          <p className="border-t border-gray-400 pt-1 text-gray-600 font-medium">Authorized Signatory</p>
        </div>
      </div>
    </div>
  );
};
