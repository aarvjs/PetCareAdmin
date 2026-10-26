'use client';

import React, { useState, useEffect } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import {
  Plus,
  Clock,
  Edit,
  Trash2,
  Sparkles,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Search,
  IndianRupee,
} from 'lucide-react';
import { useAuth } from '@/lib/authContext';
import { db } from '@/lib/firebase';
import {
  collection,
  onSnapshot,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
} from 'firebase/firestore';
import {
  uploadFileToFirebaseStorage,
  getServiceImageStoragePath,
  validateImageFile,
} from '@/lib/storage';

export interface DoctorServiceDoc {
  id: string;
  name: string;
  category: string;
  description: string;
  price: number;
  duration: string;
  image: string;
  storagePath?: string;
  status: 'Active' | 'Inactive';
  businessId: string;
  shopId: string;
  createdAt?: any;
  updatedAt?: any;
}

const STANDARD_CLINIC_SERVICES = [
  {
    name: 'Veterinary Consultation',
    category: 'Consultation',
    description: 'Comprehensive physical examination and specialist consultation for pet illness, nutrition & wellness.',
    price: 499,
    duration: '30 mins',
    image: 'https://images.unsplash.com/photo-1628009368231-7bb7cfcb0def?w=500&auto=format&fit=crop',
    status: 'Active' as const,
  },
  {
    name: 'Vaccination & Immunization',
    category: 'Preventive Care',
    description: 'Core & non-core vaccines for puppies, adult dogs, kittens & adult cats with complete vaccination booklet.',
    price: 499,
    duration: '20 mins',
    image: 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=500&auto=format&fit=crop',
    status: 'Active' as const,
  },
  {
    name: 'General Health Checkup',
    category: 'Wellness',
    description: 'Full vital signs assessment, weight monitoring, dental inspection, and preventative wellness evaluation.',
    price: 799,
    duration: '45 mins',
    image: 'https://images.unsplash.com/photo-1576201836106-db1758fd1c97?w=500&auto=format&fit=crop',
    status: 'Active' as const,
  },
  {
    name: 'Deworming & Parasite Care',
    category: 'Preventive Care',
    description: 'Internal worm eradication, tick & flea treatment, and preventative parasite care.',
    price: 299,
    duration: '15 mins',
    image: 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=500&auto=format&fit=crop',
    status: 'Active' as const,
  },
  {
    name: 'Pet Grooming & Medicated Spa',
    category: 'Grooming',
    description: 'Full coat wash with medicated shampoo, nail trimming, ear cleaning, and hygienic coat trimming.',
    price: 999,
    duration: '60 mins',
    image: 'https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?w=500&auto=format&fit=crop',
    status: 'Active' as const,
  },
  {
    name: 'Dental Care & Cleaning',
    category: 'Preventive Care',
    description: 'Oral hygiene examination, gentle tartar scraping, breath freshening, and gum health inspection.',
    price: 599,
    duration: '30 mins',
    image: 'https://images.unsplash.com/photo-1548767797-d8c844163c4c?w=500&auto=format&fit=crop',
    status: 'Active' as const,
  },
];

export default function DoctorServicesPage() {
  const { profile, business } = useAuth();

  const [services, setServices] = useState<DoctorServiceDoc[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<DoctorServiceDoc | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete Dialog State
  const [serviceToDelete, setServiceToDelete] = useState<DoctorServiceDoc | null>(null);

  // Form Fields
  const [formData, setFormData] = useState({
    name: '',
    category: 'Consultation',
    description: '',
    price: '',
    duration: '30 mins',
    image: '',
    storagePath: '',
    status: 'Active' as 'Active' | 'Inactive',
  });

  // Image Upload State
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Multi-tenant business IDs
  const targetBizId = profile?.businessId || business?.id || 'biz_1791736912551_weqjk8';
  const targetShopId = profile?.shopId || business?.shopId || 'SHOP-D9E8';

  // 1. Real-time Firestore sync
  useEffect(() => {
    setIsLoading(true);
    const servicesRef = collection(db, 'services');
    const q = query(servicesRef);

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        let list: DoctorServiceDoc[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            name: data.name || 'Unnamed Service',
            category: data.category || 'Consultation',
            description: data.description || '',
            price: typeof data.price === 'number' ? data.price : parseFloat(data.price) || 0,
            duration: data.duration || '30 mins',
            image: data.image || '',
            storagePath: data.storagePath || '',
            status: data.status === 'Inactive' ? 'Inactive' : 'Active',
            businessId: data.businessId || '',
            shopId: data.shopId || '',
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
          };
        });

        // Strict multi-tenant filtering
        list = list.filter((s) => {
          const matchBiz = targetBizId && s.businessId === targetBizId;
          const matchShop = targetShopId && s.shopId?.toUpperCase() === targetShopId.toUpperCase();
          return matchBiz || matchShop || (!s.businessId && !s.shopId);
        });

        setServices(list);
        setIsLoading(false);
      },
      (error) => {
        console.error('Error fetching doctor clinic services:', error);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [targetBizId, targetShopId]);

  // Handle Opening Create / Edit Modal
  const handleOpenAdd = (service?: DoctorServiceDoc) => {
    setFormError(null);
    if (service) {
      setSelectedService(service);
      setFormData({
        name: service.name,
        category: service.category,
        description: service.description,
        price: service.price.toString(),
        duration: service.duration,
        image: service.image || '',
        storagePath: service.storagePath || '',
        status: service.status,
      });
    } else {
      setSelectedService(null);
      setFormData({
        name: '',
        category: 'Consultation',
        description: '',
        price: '499',
        duration: '30 mins',
        image: '',
        storagePath: '',
        status: 'Active',
      });
    }
    setIsModalOpen(true);
  };

  // Image File Upload
  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateImageFile(file, 8);
    if (!validation.valid) {
      setFormError(validation.error || 'Invalid image file.');
      return;
    }

    setFormError(null);
    setUploadingImage(true);
    setUploadProgress(0);

    const tempServiceId = selectedService?.id || `ser_${Date.now()}`;
    const storagePath = getServiceImageStoragePath(targetBizId, tempServiceId, file.name);

    try {
      const result = await uploadFileToFirebaseStorage(file, storagePath, (progress) => {
        setUploadProgress(progress.progressPercent);
      });

      setFormData((prev) => ({
        ...prev,
        image: result.downloadUrl,
        storagePath: result.storagePath,
      }));
    } catch (err: any) {
      console.error('Service image upload error:', err);
      setFormError(err.message || 'Failed to upload service image.');
    } finally {
      setUploadingImage(false);
    }
  };

  // Save Service to Firestore
  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setFormError('Service name is required.');
      return;
    }

    const priceNum = parseFloat(formData.price) || 0;
    if (priceNum < 0) {
      setFormError('Price must be a valid positive amount.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      const serviceId = selectedService ? selectedService.id : `ser_${Date.now()}`;
      const serviceRef = doc(db, 'services', serviceId);

      const payload = {
        name: formData.name.trim(),
        category: formData.category.trim(),
        description: formData.description.trim(),
        price: priceNum,
        duration: formData.duration.trim(),
        image: formData.image.trim(),
        storagePath: formData.storagePath.trim(),
        status: formData.status,
        businessId: targetBizId,
        shopId: targetShopId,
        updatedAt: serverTimestamp(),
        ...(selectedService ? {} : { createdAt: serverTimestamp() }),
      };

      await setDoc(serviceRef, payload, { merge: true });
      setIsModalOpen(false);
    } catch (err: any) {
      console.error('Error saving clinic service:', err);
      setFormError(err.message || 'Failed to save service.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle Published Status
  const handleToggleStatus = async (service: DoctorServiceDoc) => {
    try {
      const nextStatus = service.status === 'Active' ? 'Inactive' : 'Active';
      const serviceRef = doc(db, 'services', service.id);
      await updateDoc(serviceRef, {
        status: nextStatus,
        updatedAt: serverTimestamp(),
      });
    } catch (err: any) {
      console.error('Error toggling service status:', err);
    }
  };

  // Delete Service
  const handleConfirmDelete = async () => {
    if (!serviceToDelete) return;
    try {
      await deleteDoc(doc(db, 'services', serviceToDelete.id));
      setServiceToDelete(null);
    } catch (err: any) {
      console.error('Error deleting service:', err);
    }
  };

  // Seed Standard Services (1-Click Initialization)
  const handleSeedStandardServices = async () => {
    setIsSubmitting(true);
    try {
      for (let i = 0; i < STANDARD_CLINIC_SERVICES.length; i++) {
        const item = STANDARD_CLINIC_SERVICES[i];
        const id = `ser_std_0${i + 1}`;
        const ref = doc(db, 'services', id);
        await setDoc(
          ref,
          {
            ...item,
            businessId: targetBizId,
            shopId: targetShopId,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      }
    } catch (err: any) {
      console.error('Error seeding standard services:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered Services for Table/Grid
  const filteredServices = services.filter((s) => {
    const matchesCategory = categoryFilter === 'All' || s.category.toLowerCase() === categoryFilter.toLowerCase();
    if (!matchesCategory) return false;
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      s.name.toLowerCase().includes(term) ||
      s.description.toLowerCase().includes(term) ||
      s.category.toLowerCase().includes(term)
    );
  });

  const activeCount = services.filter((s) => s.status === 'Active').length;
  const inactiveCount = services.filter((s) => s.status === 'Inactive').length;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <PageHeader
        title="Clinic Services Catalog"
        subtitle={`Live catalog of veterinary packages, checkup fees, and bookable treatments for ${business?.name || 'Healthy Paws Pet Clinic'}.`}
        action={
          <div className="flex items-center gap-2">
            {services.length === 0 && !isLoading && (
              <Button
                variant="outline"
                onClick={handleSeedStandardServices}
                disabled={isSubmitting}
                icon={<Sparkles className="w-4 h-4 text-[#7567E8]" />}
              >
                Seed Standard Services
              </Button>
            )}
            <Button onClick={() => handleOpenAdd()} icon={<Plus className="w-4 h-4" />}>
              Add Clinic Service
            </Button>
          </div>
        }
      />

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-[#E8ECF0] rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-[#737780] uppercase tracking-wider">Total Services</p>
            <p className="text-2xl font-extrabold text-[#25242A] mt-1">{services.length}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#F1EEFF] text-[#7567E8] flex items-center justify-center font-bold">
            {services.length}
          </div>
        </div>
        <div className="bg-white border border-[#E8ECF0] rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-[#737780] uppercase tracking-wider">Active in App</p>
            <p className="text-2xl font-extrabold text-[#00A86B] mt-1">{activeCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#00A86B] flex items-center justify-center font-bold">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
        <div className="bg-white border border-[#E8ECF0] rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-[#737780] uppercase tracking-wider">Draft / Inactive</p>
            <p className="text-2xl font-extrabold text-[#737780] mt-1">{inactiveCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-gray-50 text-[#737780] flex items-center justify-center font-bold">
            <EyeOff className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-[#E8ECF0] rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[#737780] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search service name, category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-[#E8ECF0] rounded-xl text-xs text-[#25242A] focus:outline-none focus:border-[#7567E8]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          {['All', 'Consultation', 'Preventive Care', 'Wellness', 'Grooming', 'Surgery'].map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
                categoryFilter === cat
                  ? 'bg-[#7567E8] text-white'
                  : 'bg-[#F8F9FA] text-[#737780] hover:bg-[#F1EEFF] hover:text-[#7567E8]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Zero State with Seeding Option */}
      {!isLoading && services.length === 0 && (
        <div className="bg-white border border-[#E8ECF0] rounded-2xl p-12 text-center max-w-xl mx-auto space-y-4">
          <div className="w-14 h-14 bg-[#F1EEFF] rounded-2xl flex items-center justify-center mx-auto text-[#7567E8]">
            <Sparkles className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-[#25242A]">No Services Found</h3>
            <p className="text-xs text-[#737780] mt-1 leading-relaxed">
              Create a healthcare service or initialize with standard veterinary consultation, vaccination, and wellness packages to show them in the customer app.
            </p>
          </div>
          <div className="pt-2 flex justify-center gap-3">
            <Button
              onClick={handleSeedStandardServices}
              disabled={isSubmitting}
              icon={<Sparkles className="w-4 h-4" />}
            >
              {isSubmitting ? 'Seeding Services...' : 'Seed Standard Clinic Services'}
            </Button>
            <Button variant="outline" onClick={() => handleOpenAdd()}>
              Create Custom Service
            </Button>
          </div>
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white border border-[#E8ECF0] rounded-2xl p-6 h-48 animate-pulse" />
          ))}
        </div>
      )}

      {/* Services Grid */}
      {!isLoading && services.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredServices.map((ser) => (
            <Card key={ser.id} className="relative flex flex-col justify-between hover:shadow-md transition-shadow">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#7567E8] bg-[#F1EEFF] px-2.5 py-1 rounded-md">
                    {ser.category}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleStatus(ser)}
                      title={ser.status === 'Active' ? 'Click to Unpublish from App' : 'Click to Publish to App'}
                      className="cursor-pointer"
                    >
                      <StatusBadge status={ser.status} />
                    </button>
                  </div>
                </div>

                <div className="flex gap-3 mb-3">
                  {ser.image ? (
                    <img
                      src={ser.image}
                      alt={ser.name}
                      className="w-16 h-16 rounded-xl object-cover border border-[#E8ECF0] flex-shrink-0"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-[#F5F3FF] border border-[#E9E5FF] flex items-center justify-center text-[#7567E8] flex-shrink-0">
                      <Sparkles className="w-6 h-6" />
                    </div>
                  )}
                  <div>
                    <h3 className="text-base font-bold text-[#25242A] leading-tight mb-1">{ser.name}</h3>
                    <p className="text-xs text-[#737780] leading-relaxed line-clamp-2">{ser.description}</p>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-[#E8ECF0] flex items-center justify-between mt-2">
                <div>
                  <span className="text-lg font-extrabold text-[#7567E8]">
                    ₹{ser.price.toLocaleString('en-IN')}
                  </span>
                  <span className="text-xs text-[#737780] font-medium ml-2 inline-flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> {ser.duration}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleToggleStatus(ser)}
                    title={ser.status === 'Active' ? 'Hide from Customer App' : 'Show in Customer App'}
                    icon={ser.status === 'Active' ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  >
                    {ser.status === 'Active' ? 'Hide' : 'Show'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleOpenAdd(ser)}
                    icon={<Edit className="w-3.5 h-3.5" />}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-[#E46A6A] hover:bg-red-50 hover:border-red-200"
                    onClick={() => setServiceToDelete(ser)}
                    icon={<Trash2 className="w-3.5 h-3.5" />}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add / Edit Service Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedService ? 'Edit Clinic Service' : 'Add Clinic Healthcare Service'}
        maxWidth="md"
      >
        <form onSubmit={handleSaveService} className="space-y-4">
          {formError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-[#E46A6A] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <Input
            label="Service Title"
            placeholder="e.g. Vaccination & Immunization"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#25242A] uppercase tracking-wider mb-1.5">
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full bg-white border border-[#E8ECF0] rounded-xl px-4 py-2.5 text-sm text-[#25242A] focus:outline-none focus:border-[#7567E8]"
              >
                <option value="Consultation">Consultation</option>
                <option value="Preventive Care">Preventive Care</option>
                <option value="Wellness">Wellness</option>
                <option value="Grooming">Grooming</option>
                <option value="Surgery">Surgery</option>
                <option value="Diagnostics">Diagnostics</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#25242A] uppercase tracking-wider mb-1.5">
                Price (₹ INR)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[#737780]">₹</span>
                <input
                  type="number"
                  placeholder="499"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  className="w-full bg-white border border-[#E8ECF0] rounded-xl pl-8 pr-4 py-2.5 text-sm text-[#25242A] focus:outline-none focus:border-[#7567E8]"
                  required
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Duration"
              placeholder="e.g. 30 mins"
              value={formData.duration}
              onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
              required
            />

            <div>
              <label className="block text-xs font-semibold text-[#25242A] uppercase tracking-wider mb-1.5">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as 'Active' | 'Inactive' })}
                className="w-full bg-white border border-[#E8ECF0] rounded-xl px-4 py-2.5 text-sm text-[#25242A] focus:outline-none focus:border-[#7567E8]"
              >
                <option value="Active">Active (Visible & Bookable in App)</option>
                <option value="Inactive">Inactive (Hidden Draft)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#25242A] uppercase tracking-wider mb-1.5">
              Service Description
            </label>
            <textarea
              rows={3}
              placeholder="Clear summary of what is provided during this consultation or healthcare service..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full bg-white border border-[#E8ECF0] rounded-xl px-4 py-2.5 text-sm text-[#25242A] focus:outline-none focus:border-[#7567E8]"
            />
          </div>

          {/* Service Image Upload */}
          <div>
            <label className="block text-xs font-semibold text-[#25242A] uppercase tracking-wider mb-1.5">
              Service Image (Firebase Storage)
            </label>
            <div className="flex items-center gap-4">
              {formData.image ? (
                <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-[#E8ECF0] flex-shrink-0">
                  <img src={formData.image} alt="Preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, image: '', storagePath: '' })}
                    className="absolute top-1 right-1 w-5 h-5 bg-black/60 text-white rounded-full flex items-center justify-center text-xs"
                  >
                    ×
                  </button>
                </div>
              ) : (
                <label className="border-2 border-dashed border-[#E8ECF0] hover:border-[#7567E8] rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer w-full text-center transition-colors">
                  <UploadCloud className="w-6 h-6 text-[#7567E8] mb-1" />
                  <span className="text-xs font-bold text-[#25242A]">Upload Image</span>
                  <span className="text-[10px] text-[#737780]">JPG, PNG, WebP up to 8MB</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageFileChange}
                    className="hidden"
                    disabled={uploadingImage}
                  />
                </label>
              )}
            </div>

            {uploadingImage && (
              <div className="mt-2 space-y-1">
                <div className="flex justify-between text-[11px] text-[#737780]">
                  <span>Uploading to Firebase Storage...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div
                    className="bg-[#7567E8] h-1.5 rounded-full transition-all duration-200"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E8ECF0]">
            <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || uploadingImage}>
              {isSubmitting ? 'Saving...' : 'Save Service'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!serviceToDelete}
        onClose={() => setServiceToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Healthcare Service"
        message={`Are you sure you want to delete "${serviceToDelete?.name}"? Customers will no longer see or be able to book this service in the app.`}
        confirmLabel="Delete Service"
      />
    </div>
  );
}
