'use client';

import React, { useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Search, Mail, Phone, ShoppingBag, Eye, Calendar } from 'lucide-react';
import { INITIAL_CUSTOMERS, Customer } from '@/lib/mockData';

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>(INITIAL_CUSTOMERS);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.includes(searchTerm)
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <PageHeader
        title="Customer Directory"
        subtitle="Manage pet parent profiles, order histories, and lifetime spend."
      />

      <Card padding="p-4">
        <div className="relative w-full max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#737780]" />
          <input
            type="text"
            placeholder="Search customer name, email or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#F8FAFC] border border-[#E8ECF0] focus:border-[#7567E8] rounded-xl pl-10 pr-4 py-2 text-xs text-[#25242A] focus:outline-none"
          />
        </div>
      </Card>

      <Card padding="p-0" className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8FAFC] text-[#737780] uppercase tracking-wider text-[10px] font-bold border-b border-[#E8ECF0]">
              <tr>
                <th className="py-3.5 px-4">Customer</th>
                <th className="py-3.5 px-4">Contact</th>
                <th className="py-3.5 px-4">Total Orders</th>
                <th className="py-3.5 px-4">Lifetime Spend</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8ECF0]">
              {filtered.map((cust) => (
                <tr key={cust.id} className="hover:bg-[#F8FAFC]">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-[#F1EEFF] text-[#7567E8] flex items-center justify-center font-bold text-xs">
                        {(cust.name || cust.email || 'Customer').slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-[#25242A]">{cust.name}</p>
                        <p className="text-[11px] text-[#737780]">Registered: {cust.joinDate}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <p className="text-[#25242A] font-medium">{cust.email}</p>
                    <p className="text-[#737780]">{cust.phone}</p>
                  </td>
                  <td className="py-3 px-4 font-bold text-[#25242A]">{cust.ordersCount} orders</td>
                  <td className="py-3 px-4 font-extrabold text-[#7567E8]">
                    ${cust.totalSpend.toFixed(2)}
                  </td>
                  <td className="py-3 px-4">
                    <StatusBadge status={cust.status} />
                  </td>
                  <td className="py-3 px-4 text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedCustomer(cust)}
                      icon={<Eye className="w-3.5 h-3.5 text-[#7567E8]" />}
                    >
                      View Profile
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal
        isOpen={!!selectedCustomer}
        onClose={() => setSelectedCustomer(null)}
        title="Customer Profile Details"
        maxWidth="md"
      >
        {selectedCustomer && (
          <div className="space-y-4 text-xs">
            <div className="flex items-center gap-4 p-4 bg-[#F1EEFF] rounded-2xl">
              <div className="w-12 h-12 rounded-full bg-[#7567E8] text-white flex items-center justify-center font-bold text-base">
                {(selectedCustomer.name || selectedCustomer.email || 'Customer').slice(0, 2).toUpperCase()}
              </div>
              <div>
                <h3 className="text-base font-bold text-[#25242A]">{selectedCustomer.name}</h3>
                <p className="text-[#737780]">Member since {selectedCustomer.joinDate}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 p-4 bg-white border border-[#E8ECF0] rounded-2xl">
              <div>
                <span className="text-[#737780]">Registered Pets:</span>
                <p className="font-bold text-[#25242A] text-sm">{selectedCustomer.petsCount} Pets</p>
              </div>
              <div>
                <span className="text-[#737780]">Lifetime Spend:</span>
                <p className="font-bold text-[#7567E8] text-sm">${selectedCustomer.totalSpend.toFixed(2)}</p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="font-bold text-[#25242A]">Contact Details</p>
              <div className="p-3 bg-[#F8FAFC] border border-[#E8ECF0] rounded-xl space-y-1">
                <p className="flex items-center gap-2"><Mail className="w-4 h-4 text-[#7567E8]" /> {selectedCustomer.email}</p>
                <p className="flex items-center gap-2"><Phone className="w-4 h-4 text-[#7567E8]" /> {selectedCustomer.phone}</p>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
