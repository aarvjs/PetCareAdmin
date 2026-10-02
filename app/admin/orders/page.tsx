'use client';

import React, { useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Search, Filter, Eye, ShoppingCart, MapPin, Phone, Mail } from 'lucide-react';
import { INITIAL_ORDERS, Order } from '@/lib/mockData';

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>(INITIAL_ORDERS);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      o.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.customerPhone.includes(searchTerm);
    const matchesStatus = statusFilter === 'All' || o.orderStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const updateOrderStatus = (orderId: string, newStatus: Order['orderStatus']) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, orderStatus: newStatus } : o))
    );
    if (selectedOrder && selectedOrder.id === orderId) {
      setSelectedOrder((prev) => (prev ? { ...prev, orderStatus: newStatus } : null));
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <PageHeader
        title="Orders Management"
        subtitle="Track customer product orders, fulfillment statuses, and payment receipts."
      />

      {/* Filter Bar */}
      <Card padding="p-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#737780]" />
            <input
              type="text"
              placeholder="Search Order ID, customer name, phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#F8FAFC] border border-[#E8ECF0] focus:border-[#7567E8] rounded-xl pl-10 pr-4 py-2 text-xs text-[#25242A] focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <Filter className="w-4 h-4 text-[#737780]" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-[#F8FAFC] border border-[#E8ECF0] rounded-xl px-3 py-2 text-xs text-[#25242A]"
            >
              <option value="All">All Order Statuses</option>
              <option value="Processing">Processing</option>
              <option value="Shipped">Shipped</option>
              <option value="Delivered">Delivered</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Orders Table */}
      <Card padding="p-0" className="overflow-hidden">
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
              {filteredOrders.map((ord) => (
                <tr key={ord.id} className="hover:bg-[#F8FAFC]">
                  <td className="py-3 px-4 font-bold text-[#7567E8]">{ord.id}</td>
                  <td className="py-3 px-4">
                    <p className="font-semibold text-[#25242A]">{ord.customerName}</p>
                    <p className="text-[11px] text-[#737780]">{ord.customerPhone}</p>
                  </td>
                  <td className="py-3 px-4 font-semibold text-[#25242A]">{ord.itemsCount} items</td>
                  <td className="py-3 px-4 font-bold text-[#25242A]">${ord.amount.toFixed(2)}</td>
                  <td className="py-3 px-4">
                    <StatusBadge status={ord.paymentStatus} />
                  </td>
                  <td className="py-3 px-4">
                    <StatusBadge status={ord.orderStatus} />
                  </td>
                  <td className="py-3 px-4 text-[#737780]">{ord.date}</td>
                  <td className="py-3 px-4 text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedOrder(ord)}
                      icon={<Eye className="w-3.5 h-3.5 text-[#7567E8]" />}
                    >
                      Details
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Order Detail Modal */}
      <Modal
        isOpen={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        title={`Order Details: ${selectedOrder?.id}`}
        maxWidth="lg"
      >
        {selectedOrder && (
          <div className="space-y-6">
            {/* Customer & Address Block */}
            <div className="p-4 bg-[#F8FAFC] border border-[#E8ECF0] rounded-2xl grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <p className="font-bold text-[#7567E8] uppercase text-[10px] tracking-wider mb-1">
                  Customer Information
                </p>
                <p className="font-bold text-[#25242A] text-sm">{selectedOrder.customerName}</p>
                <p className="text-[#737780] flex items-center gap-1.5 mt-1">
                  <Mail className="w-3.5 h-3.5" /> {selectedOrder.customerEmail}
                </p>
                <p className="text-[#737780] flex items-center gap-1.5 mt-0.5">
                  <Phone className="w-3.5 h-3.5" /> {selectedOrder.customerPhone}
                </p>
              </div>

              <div>
                <p className="font-bold text-[#7567E8] uppercase text-[10px] tracking-wider mb-1">
                  Delivery Address
                </p>
                <p className="text-[#25242A] flex items-start gap-1.5 font-medium">
                  <MapPin className="w-3.5 h-3.5 text-[#E46A6A] shrink-0 mt-0.5" />
                  {selectedOrder.address}
                </p>
              </div>
            </div>

            {/* Items Breakdown Table */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#25242A] mb-3">
                Ordered Products
              </h4>
              <div className="border border-[#E8ECF0] rounded-2xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F8FAFC] text-[#737780] font-bold border-b border-[#E8ECF0]">
                    <tr>
                      <th className="py-2.5 px-3">Item</th>
                      <th className="py-2.5 px-3 text-center">Qty</th>
                      <th className="py-2.5 px-3 text-right">Price</th>
                      <th className="py-2.5 px-3 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E8ECF0]">
                    {selectedOrder.items.map((item, idx) => (
                      <tr key={idx}>
                        <td className="py-2.5 px-3 font-semibold text-[#25242A]">{item.name}</td>
                        <td className="py-2.5 px-3 text-center font-bold text-[#737780]">
                          x{item.quantity}
                        </td>
                        <td className="py-2.5 px-3 text-right">${item.price.toFixed(2)}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-[#25242A]">
                          ${(item.price * item.quantity).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Order Total Breakdown */}
            <div className="p-4 bg-white border border-[#E8ECF0] rounded-2xl space-y-2 text-xs">
              <div className="flex justify-between text-[#737780]">
                <span>Subtotal</span>
                <span>${selectedOrder.amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[#737780]">
                <span>Delivery Fee</span>
                <span className="text-[#35B779] font-bold">FREE</span>
              </div>
              <div className="flex justify-between text-sm font-extrabold text-[#25242A] pt-2 border-t border-[#E8ECF0]">
                <span>Total Amount</span>
                <span className="text-[#7567E8]">${selectedOrder.amount.toFixed(2)}</span>
              </div>
            </div>

            {/* Status Update Actions */}
            <div>
              <p className="text-xs font-bold text-[#25242A] mb-2">Update Order Status:</p>
              <div className="flex flex-wrap gap-2">
                {(['Processing', 'Shipped', 'Delivered', 'Cancelled'] as const).map((st) => (
                  <Button
                    key={st}
                    size="sm"
                    variant={selectedOrder.orderStatus === st ? 'primary' : 'outline'}
                    onClick={() => updateOrderStatus(selectedOrder.id, st)}
                  >
                    Mark {st}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
