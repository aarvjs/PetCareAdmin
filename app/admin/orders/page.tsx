'use client';

import React, { useState, useEffect } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Search, Filter, Eye, ShoppingCart, MapPin, Phone, Mail, Loader2, Calendar, AlertCircle, Printer, FileDown, Receipt, X } from 'lucide-react';
import { useAuth } from '@/lib/authContext';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { downloadOrderInvoicePdf, triggerPrintInvoice } from '@/lib/invoiceGenerator';
import { OrderInvoicePrintable } from '@/components/admin/OrderInvoicePrintable';

export interface OrderItem {
  productId?: string;
  name: string;
  price?: string | number;
  unitPrice?: number;
  quantity: number;
  total?: number;
  variant?: string;
  image?: string;
}

export interface ShippingAddress {
  recipientName?: string;
  phoneNumber?: string;
  houseOrFlat?: string;
  streetOrLocality?: string;
  landmark?: string;
  city?: string;
  state?: string;
  pincode?: string;
  instructions?: string;
  fullAddress?: string;
}

export interface RealOrder {
  id: string;
  orderId?: string;
  shopId?: string;
  businessId?: string;
  businessName?: string;
  userId?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  deliveryAddress?: string;
  houseOrFlat?: string;
  streetOrLocality?: string;
  landmark?: string;
  city?: string;
  state?: string;
  pincode?: string;
  deliveryInstructions?: string;
  shippingAddress?: ShippingAddress;
  items?: OrderItem[];
  itemCount?: number;
  subtotal?: number;
  deliveryFee?: number;
  totalAmount?: number;
  paymentMethod?: string;
  paymentStatus?: string;
  status?: string;
  orderStatus?: string;
  createdAt?: any;
  updatedAt?: any;
}

export const VALID_ORDER_STATUSES = [
  'Placed',
  'Confirmed',
  'Processing',
  'Out for Delivery',
  'Delivered',
  'Cancelled',
];

export function parseDeliveryAddress(ord: RealOrder) {
  const ship = ord.shippingAddress || {};
  const house = ord.houseOrFlat || ship.houseOrFlat || '';
  const street = ord.streetOrLocality || ship.streetOrLocality || '';
  const landmark = ord.landmark || ship.landmark || '';
  const city = ord.city || ship.city || '';
  const state = ord.state || ship.state || '';
  const pincode = ord.pincode || ship.pincode || '';
  const instructions = ord.deliveryInstructions || ship.instructions || '';
  const recipient = ord.customerName || ship.recipientName || 'Customer';
  const phone = ord.customerPhone || ship.phoneNumber || '';
  const fullAddress = ord.deliveryAddress || ship.fullAddress || '';

  return {
    recipient,
    phone,
    house,
    street,
    landmark,
    city,
    state,
    pincode,
    instructions,
    fullAddress,
    hasStructured: Boolean(house || street || landmark || pincode || state),
  };
}

export default function AdminOrdersPage() {
  const { profile, business } = useAuth();
  const [orders, setOrders] = useState<RealOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<RealOrder | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>('Placed');
  const [statusFeedback, setStatusFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Sync selectedStatus whenever selectedOrder changes
  useEffect(() => {
    if (selectedOrder) {
      setSelectedStatus(selectedOrder.status || selectedOrder.orderStatus || 'Placed');
      setStatusFeedback(null);
    }
  }, [selectedOrder]);

  // 1. Real-time Firestore Listener strictly scoped by business
  useEffect(() => {
    if (!profile) return;
    setIsLoading(true);

    const targetShopId = profile.shopId;
    const targetBizId = profile.businessId;

    try {
      const ordersRef = collection(db, 'orders');
      const unsubscribe = onSnapshot(
        ordersRef,
        (snapshot) => {
          let list: RealOrder[] = snapshot.docs.map((d) => ({
            id: d.id,
            ...(d.data() as any),
          }));

          // Strict Business Isolation
          if (profile.role === 'admin' && (targetShopId || targetBizId)) {
            list = list.filter((ord) => {
              const matchesShop = targetShopId && ord.shopId === targetShopId;
              const matchesBiz = targetBizId && ord.businessId === targetBizId;
              return matchesShop || matchesBiz;
            });
          }

          // Sort by creation time desc
          list.sort((a, b) => {
            const timeA = new Date(a.createdAt?.toDate?.() || a.createdAt || 0).getTime();
            const timeB = new Date(b.createdAt?.toDate?.() || b.createdAt || 0).getTime();
            return timeB - timeA;
          });

          setOrders(list);
          setIsLoading(false);
        },
        (error) => {
          console.warn('[Orders onSnapshot Warning]', error);
          setIsLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (e) {
      console.warn('Orders listener setup error:', e);
      setIsLoading(false);
    }
  }, [profile]);

  // 2. Filter orders by search, status, and date range
  const filteredOrders = orders.filter((o) => {
    const oId = (o.orderId || o.id).toLowerCase();
    const cName = (o.customerName || '').toLowerCase();
    const cPhone = (o.customerPhone || '');
    const sTerm = searchTerm.toLowerCase().trim();

    const matchesSearch =
      !sTerm ||
      oId.includes(sTerm) ||
      cName.includes(sTerm) ||
      cPhone.includes(sTerm);

    const ordStatus = (o.status || 'Placed').toLowerCase();
    const matchesStatus =
      statusFilter === 'All' ||
      ordStatus === statusFilter.toLowerCase();

    let matchesDate = true;
    if (startDate || endDate) {
      const orderDate = new Date(o.createdAt?.toDate?.() || o.createdAt || 0);
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        if (orderDate < start) matchesDate = false;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (orderDate > end) matchesDate = false;
      }
    }

    return matchesSearch && matchesStatus && matchesDate;
  });

  // 3. Update order status in Firestore (Triggers live Flutter stream immediately)
  const updateOrderStatus = async (orderDocId: string, newStatus: string) => {
    if (!orderDocId || !newStatus) return;
    setIsUpdating(true);
    setStatusFeedback(null);

    try {
      const orderRef = doc(db, 'orders', orderDocId);
      await updateDoc(orderRef, {
        status: newStatus,
        orderStatus: newStatus,
        updatedAt: serverTimestamp(),
      });

      const now = new Date();
      if (selectedOrder && selectedOrder.id === orderDocId) {
        setSelectedOrder((prev) =>
          prev
            ? {
                ...prev,
                status: newStatus,
                orderStatus: newStatus,
                updatedAt: now,
              }
            : null
        );
      }

      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderDocId
            ? { ...o, status: newStatus, orderStatus: newStatus, updatedAt: now }
            : o
        )
      );

      setStatusFeedback({
        type: 'success',
        message: `Order status successfully updated to "${newStatus}". Customer app will update in real time.`,
      });
    } catch (error: any) {
      console.error('Failed to update order status:', error);
      setStatusFeedback({
        type: 'error',
        message: error?.message || 'Failed to update order status. Please check permissions.',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Just now';
    if (timestamp?.toDate) {
      const dt = timestamp.toDate();
      return `${dt.toLocaleDateString()} ${dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    if (typeof timestamp === 'string') {
      try {
        const dt = new Date(timestamp);
        return `${dt.toLocaleDateString()} ${dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      } catch (_) {
        return timestamp;
      }
    }
    return '';
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <PageHeader
        title="Orders Management"
        subtitle={`Track customer product orders, fulfillment statuses, and payment receipts${
          profile?.shopId ? ` (Shop ID: ${profile.shopId})` : ''
        }.`}
      />

      {/* Filter Bar with Search, Status, and Date Range */}
      <Card padding="p-4">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          <div className="relative w-full lg:w-72">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#737780]" />
            <input
              type="text"
              placeholder="Search Order ID, customer, phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#F8FAFC] border border-[#E8ECF0] focus:border-[#7567E8] rounded-xl pl-10 pr-4 py-2 text-xs text-[#25242A] focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-[#737780]" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-[#F8FAFC] border border-[#E8ECF0] rounded-xl px-3 py-2 text-xs text-[#25242A] font-medium"
              >
                <option value="All">All Statuses</option>
                <option value="Placed">Placed</option>
                <option value="Confirmed">Confirmed</option>
                <option value="Processing">Processing</option>
                <option value="Out for Delivery">Out for Delivery</option>
                <option value="Delivered">Delivered</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-[#737780]">
              <Calendar className="w-3.5 h-3.5 text-[#737780]" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-[#F8FAFC] border border-[#E8ECF0] rounded-xl px-2.5 py-1.5 text-xs text-[#25242A]"
                title="Filter by start date"
              />
              <span>to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-[#F8FAFC] border border-[#E8ECF0] rounded-xl px-2.5 py-1.5 text-xs text-[#25242A]"
                title="Filter by end date"
              />
            </div>

            {(searchTerm || statusFilter !== 'All' || startDate || endDate) && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('All');
                  setStartDate('');
                  setEndDate('');
                }}
                className="text-[11px] font-bold text-[#E46A6A] hover:underline flex items-center gap-1 ml-1"
              >
                <X className="w-3 h-3" /> Clear
              </button>
            )}
          </div>
        </div>
      </Card>

      {/* Orders Table */}
      <Card padding="p-0" className="overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-[#737780] flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-[#7567E8] mb-3" />
            <p className="text-xs font-semibold">Connecting to live orders stream...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-12 text-center text-[#737780]">
            <ShoppingCart className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-bold text-[#25242A]">No orders found</p>
            <p className="text-xs mt-1">
              {orders.length === 0
                ? 'No customer orders have been placed for this business yet.'
                : 'No orders match your active search and filter criteria.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8FAFC] text-[#737780] uppercase tracking-wider text-[10px] font-bold border-b border-[#E8ECF0]">
                <tr>
                  <th className="py-3.5 px-4">Order ID</th>
                  <th className="py-3.5 px-4">Customer</th>
                  <th className="py-3.5 px-4">Items</th>
                  <th className="py-3.5 px-4">Total Amount</th>
                  <th className="py-3.5 px-4">Payment</th>
                  <th className="py-3.5 px-4">Order Status</th>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8ECF0]">
                {filteredOrders.map((ord) => {
                  const displayId = ord.orderId || ord.id;
                  const count = ord.items?.length || ord.itemCount || 1;
                  const total = ord.totalAmount || 0;
                  const status = ord.status || 'Placed';
                  const payment = ord.paymentMethod || 'Cash on Delivery';

                  return (
                    <tr key={ord.id} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="py-3 px-4 font-bold text-[#7567E8]">{displayId}</td>
                      <td className="py-3 px-4">
                        <p className="font-semibold text-[#25242A]">{ord.customerName || 'Customer'}</p>
                        <p className="text-[11px] text-[#737780]">{ord.customerPhone || 'No phone'}</p>
                      </td>
                      <td className="py-3 px-4 font-semibold text-[#25242A]">
                        {count} item{count > 1 ? 's' : ''}
                      </td>
                      <td className="py-3 px-4 font-bold text-[#25242A]">₹{total.toFixed(0)}</td>
                      <td className="py-3 px-4">
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                          {payment}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={status} />
                      </td>
                      <td className="py-3 px-4 text-[#737780] whitespace-nowrap">{formatDate(ord.createdAt)}</td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => downloadOrderInvoicePdf(ord, business)}
                            title="Download Invoice PDF"
                            className="p-1.5 hover:bg-[#F1EEFF] text-[#7567E8] rounded-lg transition-colors border border-transparent hover:border-[#DDD6FE]"
                          >
                            <FileDown className="w-4 h-4" />
                          </button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedOrder(ord)}
                            icon={<Eye className="w-3.5 h-3.5 text-[#7567E8]" />}
                          >
                            Details
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Order Detail Modal */}
      <Modal
        isOpen={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        title={`Order Details: ${selectedOrder?.orderId || selectedOrder?.id}`}
        maxWidth="lg"
      >
        {selectedOrder && (
          <div className="space-y-6">
            {/* INVOICE & BILLING ACTIONS TOOLBAR */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-white border border-[#E8ECF0] rounded-2xl shadow-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#F5F3FF] flex items-center justify-center text-[#7567E8]">
                  <Receipt className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-[#25242A]">Tax Invoice & Bill of Supply</p>
                  <p className="text-[10px] text-[#737780]">Official printable clinic billing receipt</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={triggerPrintInvoice}
                  icon={<Printer className="w-3.5 h-3.5 text-[#7567E8]" />}
                  className="text-xs font-bold"
                >
                  Print Invoice
                </Button>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => downloadOrderInvoicePdf(selectedOrder, business)}
                  icon={<FileDown className="w-3.5 h-3.5" />}
                  className="text-xs font-bold"
                >
                  Download Invoice PDF
                </Button>
              </div>
            </div>

            {/* 1. TOP ORDER STATUS MANAGEMENT (Prominently placed immediately below modal header) */}
            <div className="p-4 bg-gradient-to-r from-[#F5F3FF] via-[#F8FAFC] to-[#EEF2FF] border border-[#DDD6FE] rounded-2xl shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#4C1D95] uppercase tracking-wider">
                    Current Status:
                  </span>
                  <StatusBadge status={selectedOrder.status || selectedOrder.orderStatus || 'Placed'} />
                </div>
                {selectedOrder.updatedAt && (
                  <span className="text-[11px] text-[#6D28D9] font-medium flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    Last Updated: {formatDate(selectedOrder.updatedAt)}
                  </span>
                )}
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-2.5 border-t border-[#E9D5FF]">
                <div className="flex-1">
                  <label htmlFor="order-status-dropdown" className="sr-only">
                    Select Order Status
                  </label>
                  <select
                    id="order-status-dropdown"
                    value={selectedStatus}
                    disabled={isUpdating}
                    onChange={(e) => {
                      setSelectedStatus(e.target.value);
                      setStatusFeedback(null);
                    }}
                    className="w-full bg-white border border-[#C4B5FD] text-[#25242A] text-xs font-semibold rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#7567E8] transition-all cursor-pointer disabled:opacity-50"
                  >
                    {VALID_ORDER_STATUSES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>

                <Button
                  size="sm"
                  variant="primary"
                  disabled={
                    isUpdating ||
                    selectedStatus === (selectedOrder.status || selectedOrder.orderStatus || 'Placed')
                  }
                  onClick={() => updateOrderStatus(selectedOrder.id, selectedStatus)}
                  className="whitespace-nowrap px-5 py-2.5 text-xs font-bold shrink-0"
                >
                  {isUpdating ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                      Saving Status...
                    </>
                  ) : (
                    'Update Status'
                  )}
                </Button>
              </div>

              {/* Status Update Feedback Alert */}
              {statusFeedback && (
                <div
                  className={`mt-3 p-3 rounded-xl text-xs flex items-center gap-2 transition-all ${
                    statusFeedback.type === 'success'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border border-rose-200'
                  }`}
                >
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span className="font-medium">{statusFeedback.message}</span>
                </div>
              )}
            </div>

            {/* 2. CUSTOMER & COMPLETE DELIVERY ADDRESS DETAILS */}
            {(() => {
              const addr = parseDeliveryAddress(selectedOrder);
              return (
                <div className="p-4 bg-[#F8FAFC] border border-[#E8ECF0] rounded-2xl grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
                  {/* Recipient & Contact Details */}
                  <div className="space-y-2">
                    <p className="font-bold text-[#7567E8] uppercase text-[10px] tracking-wider">
                      Customer & Recipient Details
                    </p>
                    <p className="font-bold text-[#25242A] text-sm">
                      {addr.recipient}
                    </p>
                    {addr.phone && (
                      <p className="text-[#25242A] flex items-center gap-2 font-medium">
                        <Phone className="w-3.5 h-3.5 text-[#7567E8]" />
                        <span>{addr.phone}</span>
                      </p>
                    )}
                    {selectedOrder.customerEmail && (
                      <p className="text-[#737780] flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-[#737780]" />
                        <span>{selectedOrder.customerEmail}</span>
                      </p>
                    )}
                    <div className="pt-2 border-t border-[#E8ECF0] space-y-1">
                      <p className="text-[#737780] flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-[#737780]" />
                        <span>Placed: {formatDate(selectedOrder.createdAt)}</span>
                      </p>
                      {selectedOrder.shopId && (
                        <p className="text-[11px] text-[#737780]">
                          <span className="font-semibold text-[#25242A]">Shop ID:</span> {selectedOrder.shopId}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Complete Delivery Address Section */}
                  <div className="space-y-2">
                    <p className="font-bold text-[#7567E8] uppercase text-[10px] tracking-wider">
                      Delivery Address
                    </p>

                    <div className="bg-white p-3.5 rounded-xl border border-[#E8ECF0] space-y-2 shadow-xs">
                      <div className="flex items-start gap-2.5">
                        <MapPin className="w-4 h-4 text-[#E46A6A] shrink-0 mt-0.5" />
                        <div className="space-y-1 text-[#25242A] leading-relaxed">
                          {addr.hasStructured ? (
                            <>
                              {addr.house && (
                                <p className="font-bold text-[#111827]">{addr.house}</p>
                              )}
                              {addr.street && (
                                <p className="text-[#4B5563]">{addr.street}</p>
                              )}
                              {addr.landmark && (
                                <p className="text-[#6B7280]">
                                  <span className="font-semibold">Landmark:</span> {addr.landmark}
                                </p>
                              )}
                              <p className="font-medium text-[#111827]">
                                {[addr.city, addr.state, addr.pincode ? `PIN: ${addr.pincode}` : '']
                                  .filter(Boolean)
                                  .join(', ')}
                              </p>
                            </>
                          ) : (
                            <p className="font-medium text-[#374151]">
                              {addr.fullAddress || 'No detailed address provided'}
                              {selectedOrder.city && !addr.fullAddress.includes(selectedOrder.city)
                                ? `, ${selectedOrder.city}`
                                : ''}
                            </p>
                          )}
                        </div>
                      </div>

                      {addr.instructions && (
                        <div className="mt-2 pt-2 border-t border-dashed border-[#E8ECF0] text-[11px] text-[#4338CA] bg-[#EEF2FF] p-2 rounded-lg">
                          <span className="font-bold">Instructions:</span> {addr.instructions}
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-t border-[#E8ECF0] flex items-center justify-between">
                      <span className="text-[#737780]">Payment:</span>
                      <span className="font-bold text-[#25242A] bg-slate-100 px-2.5 py-0.5 rounded-lg text-[11px]">
                        {selectedOrder.paymentMethod || 'Cash on Delivery'}
                        {selectedOrder.paymentStatus ? ` (${selectedOrder.paymentStatus})` : ''}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* 3. ORDERED PRODUCTS BREAKDOWN */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#25242A] mb-3">
                Ordered Products
              </h4>
              <div className="border border-[#E8ECF0] rounded-2xl overflow-hidden shadow-xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F8FAFC] text-[#737780] font-bold border-b border-[#E8ECF0]">
                    <tr>
                      <th className="py-2.5 px-3">Item</th>
                      <th className="py-2.5 px-3">Variant</th>
                      <th className="py-2.5 px-3 text-center">Qty</th>
                      <th className="py-2.5 px-3 text-right">Price</th>
                      <th className="py-2.5 px-3 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E8ECF0]">
                    {(selectedOrder.items || []).map((item, idx) => {
                      const unitP = item.unitPrice || parseFloat((item.price || '0').toString().replace(/[^\d.]/g, '')) || 0;
                      const lineTotal = item.total || unitP * (item.quantity || 1);

                      return (
                        <tr key={idx} className="hover:bg-[#F8FAFC]">
                          <td className="py-2.5 px-3 font-semibold text-[#25242A]">{item.name}</td>
                          <td className="py-2.5 px-3 text-[#737780]">{item.variant || 'Standard'}</td>
                          <td className="py-2.5 px-3 text-center font-bold text-[#737780]">x{item.quantity}</td>
                          <td className="py-2.5 px-3 text-right">₹{unitP.toFixed(0)}</td>
                          <td className="py-2.5 px-3 text-right font-bold text-[#25242A]">₹{lineTotal.toFixed(0)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 4. ORDER TOTAL BREAKDOWN */}
            <div className="p-4 bg-white border border-[#E8ECF0] rounded-2xl space-y-2 text-xs shadow-xs">
              <div className="flex justify-between text-[#737780]">
                <span>Subtotal</span>
                <span>₹{(selectedOrder.subtotal || selectedOrder.totalAmount || 0).toFixed(0)}</span>
              </div>
              <div className="flex justify-between text-[#737780]">
                <span>Delivery Fee</span>
                <span className="text-[#35B779] font-bold">
                  {(selectedOrder.deliveryFee || 0) === 0 ? 'FREE' : `₹${selectedOrder.deliveryFee?.toFixed(0)}`}
                </span>
              </div>
              <div className="flex justify-between text-sm font-extrabold text-[#25242A] pt-2 border-t border-[#E8ECF0]">
                <span>Total Amount</span>
                <span className="text-[#7567E8]">₹{(selectedOrder.totalAmount || 0).toFixed(0)}</span>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Hidden container for print-to-paper / browser print dialog */}
      {selectedOrder && (
        <OrderInvoicePrintable order={selectedOrder} bizInfo={business} />
      )}
    </div>
  );
}
