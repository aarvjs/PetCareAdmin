'use client';

import React, { useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { INITIAL_CATEGORIES, Category } from '@/lib/mockData';

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>(INITIAL_CATEGORIES);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCat, setSelectedCat] = useState<Category | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    petType: 'Dog & Cat',
    image: '',
  });

  const handleOpenModal = (cat?: Category) => {
    if (cat) {
      setSelectedCat(cat);
      setFormData({ name: cat.name, petType: cat.petType, image: cat.image });
    } else {
      setSelectedCat(null);
      setFormData({ name: '', petType: 'Dog & Cat', image: '' });
    }
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedCat) {
      setCategories((prev) =>
        prev.map((c) =>
          c.id === selectedCat.id
            ? { ...c, name: formData.name, petType: formData.petType }
            : c
        )
      );
    } else {
      const newCat: Category = {
        id: `CAT-0${categories.length + 1}`,
        name: formData.name,
        petType: formData.petType,
        productCount: 0,
        status: 'Active',
        image: formData.image || 'https://images.unsplash.com/photo-1589924691995-400dc9ecc119?w=200&auto=format&fit=crop',
      };
      setCategories((prev) => [...prev, newCat]);
    }
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <PageHeader
        title="Categories Management"
        subtitle="Organize product lines and pet types across the e-commerce store."
        action={
          <Button onClick={() => handleOpenModal()} icon={<Plus className="w-4 h-4" />}>
            Add Category
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {categories.map((cat) => (
          <Card key={cat.id} padding="p-5" className="relative group">
            <div className="flex items-center gap-4 mb-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={cat.image}
                alt={cat.name}
                className="w-14 h-14 rounded-2xl object-cover border border-[#E8ECF0]"
              />
              <div>
                <h3 className="text-base font-bold text-[#25242A]">{cat.name}</h3>
                <p className="text-xs text-[#737780] font-medium">{cat.petType}</p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-[#E8ECF0] text-xs font-semibold">
              <span className="text-[#7567E8] bg-[#F1EEFF] px-2.5 py-1 rounded-full">
                {cat.productCount} Products
              </span>
              <StatusBadge status={cat.status} />
            </div>

            <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 backdrop-blur-xs p-1 rounded-xl shadow-xs border border-[#E8ECF0]">
              <button
                onClick={() => handleOpenModal(cat)}
                className="p-1 text-[#737780] hover:text-[#7567E8]"
              >
                <Edit className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setCategories((prev) => prev.filter((c) => c.id !== cat.id))}
                className="p-1 text-[#737780] hover:text-[#E46A6A]"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </Card>
        ))}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedCat ? 'Edit Category' : 'Add New Category'}
        maxWidth="md"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="Category Name"
            placeholder="e.g. Health Supplements"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />

          <div>
            <label className="block text-xs font-semibold text-[#25242A] uppercase tracking-wider mb-1.5">
              Pet Type
            </label>
            <select
              value={formData.petType}
              onChange={(e) => setFormData({ ...formData, petType: e.target.value })}
              className="w-full bg-white border border-[#E8ECF0] rounded-xl px-4 py-2.5 text-sm text-[#25242A]"
            >
              <option value="Dog & Cat">Dog & Cat</option>
              <option value="Dog Only">Dog Only</option>
              <option value="Cat Only">Cat Only</option>
              <option value="All Pets">All Pets</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E8ECF0]">
            <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Save Category</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
