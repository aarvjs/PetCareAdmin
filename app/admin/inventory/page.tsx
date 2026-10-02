'use client';

import React, { useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Search, AlertTriangle, Boxes, Save } from 'lucide-react';
import { INITIAL_PRODUCTS, Product } from '@/lib/mockData';

export default function AdminInventoryPage() {
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [searchTerm, setSearchTerm] = useState('');

  const handleStockUpdate = (productId: string, newStock: number) => {
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id === productId) {
          let status: Product['status'] = 'In Stock';
          if (newStock === 0) status = 'Out of Stock';
          else if (newStock <= 10) status = 'Low Stock';
          return { ...p, stock: newStock, status };
        }
        return p;
      })
    );
  };

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <PageHeader
        title="Inventory & Stock Control"
        subtitle="Monitor product stock levels, adjust quantities, and set low stock alerts."
      />

      <Card padding="p-4">
        <div className="relative w-full max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#737780]" />
          <input
            type="text"
            placeholder="Search SKU code or product name..."
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
                <th className="py-3.5 px-4">Product Name</th>
                <th className="py-3.5 px-4">SKU Code</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">Stock Level</th>
                <th className="py-3.5 px-4">Stock Status</th>
                <th className="py-3.5 px-4 text-right">Update Stock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8ECF0]">
              {filtered.map((p) => {
                const isLow = p.status === 'Low Stock' || p.stock <= 10;
                return (
                  <tr
                    key={p.id}
                    className={`transition-colors ${isLow ? 'bg-[#FFF8E6]/40' : 'hover:bg-[#F8FAFC]'}`}
                  >
                    <td className="py-3 px-4 font-bold text-[#25242A]">
                      <div className="flex items-center gap-2">
                        {isLow && <AlertTriangle className="w-4 h-4 text-[#D97706] shrink-0" />}
                        <span>{p.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-[#737780] font-mono">{p.sku}</td>
                    <td className="py-3 px-4 font-medium text-[#25242A]">{p.category}</td>
                    <td className="py-3 px-4 font-bold text-[#25242A]">{p.stock} units</td>
                    <td className="py-3 px-4">
                      <StatusBadge status={p.status} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <input
                          type="number"
                          defaultValue={p.stock}
                          onBlur={(e) => handleStockUpdate(p.id, parseInt(e.target.value) || 0)}
                          className="w-20 bg-white border border-[#E8ECF0] rounded-lg px-2 py-1 text-center font-bold text-xs"
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
