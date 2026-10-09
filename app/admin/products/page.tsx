'use client';

import React, { useState, useEffect } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ImageUploader, ImageAsset } from '@/components/ui/ImageUploader';
import { useAuth } from '@/lib/authContext';
import { db } from '@/lib/firebase';
import { collection, doc, setDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Package,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Star,
  ShieldAlert,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { Product } from '@/lib/mockData';

interface ProductVariant {
  name: string;
  value: string;
  price: string;
  stock: string;
  sku: string;
}

export default function AdminProductsPage() {
  const { profile, user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedPetType, setSelectedPetType] = useState('All');

  // Modal & Edit View State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);

  // Status & Feedback Alerts
  const [formError, setFormError] = useState<string>('');
  const [formSuccess, setFormSuccess] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  // Check Super Admin Permission Control for Admin
  const hasProductPermission = React.useMemo(() => {
    if (!profile) return true; // fallback while loading
    if (profile.role === 'super_admin') return true;
    if (profile.role === 'admin') {
      const perms = profile.permissions || [];
      if (
        perms.length === 0 ||
        perms.includes('products') ||
        perms.includes('p_products') ||
        perms.includes('dashboard') ||
        perms.includes('ALL_ACCESS')
      ) {
        return true;
      }
      return false;
    }
    return false;
  }, [profile]);

  const [togglingIds, setTogglingIds] = useState<string[]>([]);
  const [fetchError, setFetchError] = useState<string>('');

  // 1. Filtered products calculation
  const filteredProducts = React.useMemo(() => {
    return products.filter((p: any) => {
      const searchLower = searchTerm.toLowerCase().trim();
      const nameMatch = !searchLower || (p.name || '').toLowerCase().includes(searchLower);
      const skuMatch = !searchLower || (p.sku || '').toLowerCase().includes(searchLower);
      const brandMatch = !searchLower || (p.brand || '').toLowerCase().includes(searchLower);
      const searchOk = nameMatch || skuMatch || brandMatch;

      const catOk = selectedCategory === 'All' || p.category === selectedCategory;
      const petOk = selectedPetType === 'All' || p.petType === selectedPetType || p.suitableAnimal === selectedPetType;

      return searchOk && catOk && petOk;
    });
  }, [products, searchTerm, selectedCategory, selectedPetType]);

  // 2. Fetch products fallback helper
  const fetchProducts = async () => {
    setIsLoadingProducts(true);
    setFetchError('');
    try {
      const res = await fetch('/api/products?forAdmin=true');
      const data = await res.json();
      if (data.success && Array.isArray(data.products)) {
        setProducts(data.products);
      } else {
        setFetchError(data.error || 'Failed to fetch products from server API.');
      }
    } catch (err: any) {
      console.warn('Could not fetch products from server API:', err);
      setFetchError('Network error connecting to product catalog server.');
    } finally {
      setIsLoadingProducts(false);
    }
  };

  // 3. Real-time Firestore onSnapshot listener
  useEffect(() => {
    setIsLoadingProducts(true);
    setFetchError('');

    let unsubscribe: () => void = () => {};

    try {
      const productsRef = collection(db, 'products');
      unsubscribe = onSnapshot(
        productsRef,
        (snapshot) => {
          const productList: any[] = snapshot.docs.map((d) => ({
            id: d.id,
            ...d.data(),
          }));

          productList.sort((a, b) => {
            const timeA = new Date(a.createdAt || 0).getTime();
            const timeB = new Date(b.createdAt || 0).getTime();
            return timeB - timeA;
          });

          setProducts(productList);
          setIsLoadingProducts(false);
          setFetchError('');
        },
        (error: any) => {
          console.warn('[Products onSnapshot Warning]', error);
          setFetchError('Real-time connection interrupted. Fetching latest catalog...');
          fetchProducts();
        }
      );
    } catch (e: any) {
      console.warn('[onSnapshot Setup Warning]', e);
      fetchProducts();
    }

    return () => unsubscribe();
  }, []);

  // 4. Live Active/Inactive Status Toggle Switch
  const handleToggleStatus = async (productId: string, currentIsPublished: boolean) => {
    if (!hasProductPermission) {
      setFormError('Access Denied: Product modification permission has been disabled by Super Admin.');
      return;
    }

    if (togglingIds.includes(productId)) return;

    const newStatus = !currentIsPublished;

    // Optimistic UI Update
    setProducts((prev) =>
      prev.map((p: any) => (p.id === productId ? { ...p, isPublished: newStatus } : p))
    );
    setTogglingIds((prev) => [...prev, productId]);
    setFormError('');

    try {
      const idToken = user ? await user.getIdToken() : '';
      const res = await fetch(`/api/products/${productId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
        },
        body: JSON.stringify({ isPublished: newStatus }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        // Fall back to direct Firestore update with active Admin session
        await updateDoc(doc(db, 'products', productId), {
          isPublished: newStatus,
          updatedAt: new Date().toISOString(),
        });
      }
    } catch (err: any) {
      try {
        await updateDoc(doc(db, 'products', productId), {
          isPublished: newStatus,
          updatedAt: new Date().toISOString(),
        });
      } catch (dbErr: any) {
        // Revert optimistic UI if both API and client Firestore write fail
        setProducts((prev) =>
          prev.map((p: any) => (p.id === productId ? { ...p, isPublished: currentIsPublished } : p))
        );
        setFormError(`Status update failed: ${dbErr.message || 'Permission denied'}`);
      }
    } finally {
      setTogglingIds((prev) => prev.filter((id) => id !== productId));
    }
  };

  // Complete Multi-Section Form State
  const [formData, setFormData] = useState({
    name: '',
    subtitle: '',
    slug: '',
    brand: 'Healthy Paws',
    category: 'Food',
    subcategory: 'Dry Food',
    petType: 'Dog',
    productType: 'Physical Product',
    sku: '',
    barcode: '',
    images: [] as ImageAsset[],
    primaryImageIndex: 0,
    shortDescription: '',
    fullDescription: '',
    sellingPrice: '',
    mrp: '',
    costPrice: '',
    taxOption: 'Inclusive of GST (18%)',
    stockQuantity: '',
    lowStockThreshold: '10',
    allowBackorders: false,
    variants: [] as ProductVariant[],
    ingredients: '',
    material: '',
    suitableAge: 'All Life Stages',
    breedSuitability: 'All Breeds',
    weightDimensions: '',
    usageInstructions: '',
    storageInstructions: 'Store in a cool, dry place away from sunlight',
    countryOfOrigin: 'India',
    manufacturer: 'Healthy Paws Clinic India',
    shelfLife: '18 Months',
    safetyInfo: 'Keep out of reach of children.',
    weightKg: '',
    lengthCm: '',
    widthCm: '',
    heightCm: '',
    freeShipping: true,
    seoTitle: '',
    seoMetaDescription: '',
    isPublished: true,
    isFeatured: false,
    isBestSeller: false,
  });

  // Auto Generate Slug from Name
  const handleNameChange = (name: string) => {
    const slug = name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');

    setFormData((prev) => ({
      ...prev,
      name,
      slug: prev.slug === '' || prev.slug === slug.slice(0, -1) ? slug : prev.slug,
      seoTitle: prev.seoTitle === '' ? `${name} | Healthy Paws Pet Clinic` : prev.seoTitle,
    }));
  };

  // Add / Remove Variants
  const addVariant = () => {
    setFormData((prev) => ({
      ...prev,
      variants: [
        ...prev.variants,
        { name: 'Weight', value: '1 kg', price: prev.sellingPrice, stock: prev.stockQuantity, sku: '' },
      ],
    }));
  };

  const removeVariant = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      variants: prev.variants.filter((_, i) => i !== index),
    }));
  };

  // Auto Calculate Discount Percentage
  const calculatedDiscount = React.useMemo(() => {
    const sp = parseFloat(formData.sellingPrice) || 0;
    const mrp = parseFloat(formData.mrp) || 0;
    if (mrp > sp && mrp > 0) {
      return Math.round(((mrp - sp) / mrp) * 100);
    }
    return 0;
  }, [formData.sellingPrice, formData.mrp]);

  const handleOpenForm = (productToEdit?: any) => {
    setFormError('');
    setFormSuccess('');

    if (productToEdit) {
      setSelectedProduct(productToEdit);
      
      const parsedImages: ImageAsset[] = Array.isArray(productToEdit.images)
        ? productToEdit.images.map((img: any) => typeof img === 'string' ? { url: img } : img)
        : productToEdit.image ? [{ url: productToEdit.image }] : [];

      setFormData({
        name: productToEdit.name || '',
        subtitle: productToEdit.subtitle || 'Premium quality formula for pets',
        slug: productToEdit.slug || productToEdit.name.toLowerCase().replace(/[\s_]/g, '-'),
        brand: productToEdit.brand || 'Healthy Paws',
        category: productToEdit.category || 'Food',
        subcategory: productToEdit.subcategory || 'Dry Food',
        petType: productToEdit.petType || productToEdit.suitableAnimal || 'Dog',
        productType: productToEdit.productType || 'Physical Product',
        sku: productToEdit.sku || '',
        barcode: productToEdit.barcode || '',
        images: parsedImages,
        primaryImageIndex: 0,
        shortDescription: productToEdit.shortDescription || productToEdit.description || '',
        fullDescription: productToEdit.fullDescription || productToEdit.description || '',
        sellingPrice: (productToEdit.sellingPrice || productToEdit.price || '').toString(),
        mrp: (productToEdit.mrp || productToEdit.discountPrice || '').toString(),
        costPrice: (productToEdit.costPrice || '').toString(),
        taxOption: 'Inclusive of GST (18%)',
        stockQuantity: (productToEdit.stockQuantity || productToEdit.stock || '').toString(),
        lowStockThreshold: (productToEdit.lowStockThreshold || '10').toString(),
        allowBackorders: !!productToEdit.allowBackorders,
        variants: productToEdit.variants || [],
        ingredients: productToEdit.ingredients || '',
        material: productToEdit.material || '',
        suitableAge: productToEdit.suitableAge || 'All Life Stages',
        breedSuitability: productToEdit.breedSuitability || 'All Breeds',
        weightDimensions: productToEdit.weightDimensions || productToEdit.weight || '',
        usageInstructions: productToEdit.usageInstructions || '',
        storageInstructions: productToEdit.storageInstructions || 'Store in a cool, dry place',
        countryOfOrigin: productToEdit.countryOfOrigin || 'India',
        manufacturer: productToEdit.manufacturer || 'Healthy Paws',
        shelfLife: productToEdit.shelfLife || '18 Months',
        safetyInfo: productToEdit.safetyInfo || '',
        weightKg: productToEdit.weightKg || '',
        lengthCm: productToEdit.dimensions?.length || '',
        widthCm: productToEdit.dimensions?.width || '',
        heightCm: productToEdit.dimensions?.height || '',
        freeShipping: productToEdit.freeShipping !== false,
        seoTitle: productToEdit.seoTitle || `${productToEdit.name} | Healthy Paws Store`,
        seoMetaDescription: productToEdit.seoMetaDescription || '',
        isPublished: productToEdit.isPublished !== false,
        isFeatured: !!productToEdit.isFeatured,
        isBestSeller: !!productToEdit.isBestSeller,
      });
    } else {
      setSelectedProduct(null);
      setFormData({
        name: '',
        subtitle: '',
        slug: '',
        brand: 'Healthy Paws',
        category: 'Food',
        subcategory: 'Dry Food',
        petType: 'Dog',
        productType: 'Physical Product',
        sku: `SKU-${Date.now().toString().slice(-6)}`,
        barcode: '',
        images: [],
        primaryImageIndex: 0,
        shortDescription: '',
        fullDescription: '',
        sellingPrice: '',
        mrp: '',
        costPrice: '',
        taxOption: 'Inclusive of GST (18%)',
        stockQuantity: '25',
        lowStockThreshold: '5',
        allowBackorders: false,
        variants: [],
        ingredients: '',
        material: '',
        suitableAge: 'All Life Stages',
        breedSuitability: 'All Breeds',
        weightDimensions: '',
        usageInstructions: '',
        storageInstructions: 'Store in a cool, dry place away from sunlight',
        countryOfOrigin: 'India',
        manufacturer: 'Healthy Paws Clinic',
        shelfLife: '18 Months',
        safetyInfo: '',
        weightKg: '',
        lengthCm: '',
        widthCm: '',
        heightCm: '',
        freeShipping: true,
        seoTitle: '',
        seoMetaDescription: '',
        isPublished: true,
        isFeatured: false,
        isBestSeller: false,
      });
    }
    setIsFormOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent, forceDraft = false) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!hasProductPermission) {
      setFormError('Access Denied: Product creation permission has been disabled by Super Admin.');
      return;
    }

    if (!formData.name.trim()) {
      setFormError('Product name is required.');
      return;
    }

    if (!formData.sku.trim()) {
      setFormError('Product SKU code is required.');
      return;
    }

    if (!formData.sellingPrice || parseFloat(formData.sellingPrice) <= 0) {
      setFormError('Valid selling price is required.');
      return;
    }

    setIsSaving(true);

    try {
      const payload = {
        ...formData,
        isPublished: forceDraft ? false : formData.isPublished,
        createdBy: profile?.uid || user?.uid || 'admin',
      };

      const idToken = user ? await user.getIdToken() : '';
      const url = selectedProduct ? `/api/products/${selectedProduct.id}` : '/api/products';
      const method = selectedProduct ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setFormSuccess(data.message || 'Product saved successfully!');
        fetchProducts();
        setTimeout(() => setIsFormOpen(false), 1000);
        return;
      }

      // If server route fallback is restricted, save directly via Client SDK with logged-in Admin session
      const productId = selectedProduct?.id || `prod_${Date.now()}_${Math.random().toString(36).slice(-6)}`;
      const now = new Date().toISOString();
      const numericSellingPrice = parseFloat(formData.sellingPrice);
      const numericMrp = parseFloat(formData.mrp) || numericSellingPrice;
      const discountPercent = numericMrp > numericSellingPrice ? Math.round(((numericMrp - numericSellingPrice) / numericMrp) * 100) : 0;
      const primaryImageUrl = formData.images.length > 0 ? (typeof formData.images[formData.primaryImageIndex] === 'string' ? formData.images[formData.primaryImageIndex] : formData.images[formData.primaryImageIndex]?.url || formData.images[0]?.url || formData.images[0]) : '';

      const productDoc = {
        id: productId,
        name: formData.name.trim(),
        slug: formData.slug || formData.name.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-'),
        sku: formData.sku.trim().toUpperCase(),
        brand: formData.brand || 'Healthy Paws',
        category: formData.category || 'Food',
        subcategory: formData.subcategory || 'Dry Food',
        petType: formData.petType || 'Dog',
        suitableAnimal: formData.petType || 'Dog',
        productType: formData.productType || 'Physical Product',
        shortDescription: formData.shortDescription || '',
        fullDescription: formData.fullDescription || '',
        sellingPrice: numericSellingPrice,
        mrp: numericMrp,
        costPrice: formData.costPrice ? parseFloat(formData.costPrice) : null,
        discountPercent,
        currency: 'INR',
        stockQuantity: parseInt(formData.stockQuantity) || 0,
        stock: parseInt(formData.stockQuantity) || 0,
        lowStockThreshold: parseInt(formData.lowStockThreshold) || 5,
        allowBackorders: !!formData.allowBackorders,
        images: formData.images,
        image: primaryImageUrl,
        primaryImage: primaryImageUrl,
        variants: formData.variants,
        ingredients: formData.ingredients || '',
        suitableAge: formData.suitableAge || 'All Life Stages',
        breedSuitability: formData.breedSuitability || 'All Breeds',
        weightKg: formData.weightKg || '',
        dimensions: {
          length: formData.lengthCm || '',
          width: formData.widthCm || '',
          height: formData.heightCm || '',
        },
        storageInstructions: formData.storageInstructions || '',
        shelfLife: formData.shelfLife || '',
        countryOfOrigin: formData.countryOfOrigin || 'India',
        seoTitle: formData.seoTitle || `${formData.name} | Healthy Paws Pet Clinic`,
        seoMetaDescription: formData.seoMetaDescription || formData.shortDescription || '',
        isPublished: forceDraft ? false : !!formData.isPublished,
        isFeatured: !!formData.isFeatured,
        isBestSeller: !!formData.isBestSeller,
        createdBy: profile?.uid || user?.uid || 'admin',
        createdAt: selectedProduct?.createdAt || now,
        updatedAt: now,
      };

      await setDoc(doc(db, 'products', productId), productDoc, { merge: true });
      setFormSuccess('Product saved successfully!');
      fetchProducts();
      setTimeout(() => setIsFormOpen(false), 1000);
    } catch (err: any) {
      setFormError(err.message || 'Error saving product.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedProduct) return;
    try {
      const res = await fetch(`/api/products/${selectedProduct.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        fetchProducts();
      }
    } catch (e) {
      console.warn('Error deleting product:', e);
    } finally {
      setSelectedProduct(null);
      setIsDeleteModalOpen(false);
    }
  };



  return (
    <div className="space-y-6 animate-in fade-in duration-200 font-sans">
      {/* Super Admin Permission Warning Banner if product creation is revoked */}
      {!hasProductPermission && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-800 text-xs font-semibold flex items-start gap-3 shadow-xs">
          <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-extrabold text-sm block">Product Management Permission Restricted</span>
            <span className="text-amber-700">
              Super Admin has disabled product creation, editing, and deletion permissions for your account. You can view existing catalog products, but changes are restricted.
            </span>
          </div>
        </div>
      )}

      {/* PAGE HEADER */}
      <PageHeader
        title="Products & Catalog Management"
        subtitle="Manage inventory, pricing, Cloudinary media, pet details, variants, and store listings."
        action={
          !isFormOpen && (
            <Button
              onClick={() => handleOpenForm()}
              disabled={!hasProductPermission}
              icon={<Plus className="w-4 h-4" />}
            >
              Add New Product
            </Button>
          )
        }
      />

      {/* FORM VIEW OR TABLE LIST VIEW */}
      {isFormOpen ? (
        <form onSubmit={(e) => handleSaveProduct(e, false)} className="space-y-8">
          {/* Top Form Sticky Header Bar */}
          <div className="bg-white border border-[#E8ECF0] rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 sticky top-16 z-20 shadow-sm">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-[#7567E8]" />
              <h2 className="text-base font-extrabold text-[#25242A]">
                {selectedProduct ? `Editing Product: ${selectedProduct.name}` : 'New Product Creation'}
              </h2>
            </div>

            <div className="flex items-center gap-3">
              <Button variant="outline" type="button" onClick={() => setIsFormOpen(false)}>
                Cancel
              </Button>
              <Button variant="secondary" type="button" disabled={isSaving} onClick={(e) => handleSaveProduct(e, true)}>
                Save as Draft
              </Button>
              <Button type="submit" disabled={isSaving} icon={<CheckCircle2 className="w-4 h-4" />}>
                {isSaving ? 'Publishing...' : 'Publish Product'}
              </Button>
            </div>
          </div>

          {/* Feedback Alerts */}
          {formError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-600 text-xs font-semibold flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          {formSuccess && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-700 text-xs font-semibold flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
              <span>{formSuccess}</span>
            </div>
          )}

          {/* DESKTOP SPLIT LAYOUT: Main Form (Left 8 Cols) + Live Preview (Right 4 Cols) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* LEFT MAIN FORM SECTIONS */}
            <div className="lg:col-span-8 space-y-6">
              {/* SECTION 1: BASIC INFORMATION */}
              <Card>
                <div className="space-y-4">
                  <div className="border-b border-[#E8ECF0] pb-3 mb-2">
                    <h3 className="text-sm font-black text-[#25242A]">1. Basic Information</h3>
                    <p className="text-xs text-[#777980] font-medium">Product title, brand, category, SKU and descriptions</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Product Name *"
                      placeholder="e.g. Royal Canin Medium Adult Dry Dog Food"
                      value={formData.name}
                      onChange={(e) => handleNameChange(e.target.value)}
                      required
                    />
                    <Input
                      label="Brand / Manufacturer"
                      placeholder="e.g. Royal Canin / Pedigree"
                      value={formData.brand}
                      onChange={(e) => setFormData((p) => ({ ...p, brand: e.target.value }))}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#25242A] uppercase tracking-wider mb-2">
                        Suitable Pet Animal *
                      </label>
                      <select
                        value={formData.petType}
                        onChange={(e) => setFormData((p) => ({ ...p, petType: e.target.value }))}
                        className="w-full bg-[#F8FAFC] border border-[#E8ECF0] focus:border-[#7567E8] rounded-xl px-3.5 py-2.5 text-xs text-[#25242A] font-semibold outline-hidden"
                      >
                        <option value="Dog">Dog 🐶</option>
                        <option value="Cat">Cat 🐱</option>
                        <option value="Bird">Bird 🦜</option>
                        <option value="Fish">Fish 🐠</option>
                        <option value="Small Pet">Small Pet 🐹</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#25242A] uppercase tracking-wider mb-2">
                        Category *
                      </label>
                      <select
                        value={formData.category}
                        onChange={(e) => setFormData((p) => ({ ...p, category: e.target.value }))}
                        className="w-full bg-[#F8FAFC] border border-[#E8ECF0] focus:border-[#7567E8] rounded-xl px-3.5 py-2.5 text-xs text-[#25242A] font-semibold outline-hidden"
                      >
                        <option value="Food">Pet Food & Nutrition</option>
                        <option value="Treats">Treats & Chews</option>
                        <option value="Grooming">Grooming & Hygiene</option>
                        <option value="Healthcare">Healthcare & Supplements</option>
                        <option value="Toys">Toys & Accessories</option>
                        <option value="Beds & Collars">Beds, Leashes & Apparel</option>
                      </select>
                    </div>

                    <Input
                      label="SKU Code *"
                      placeholder="e.g. RC-MED-3KG"
                      value={formData.sku}
                      onChange={(e) => setFormData((p) => ({ ...p, sku: e.target.value }))}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#25242A] uppercase tracking-wider mb-2">
                      Short Overview Description
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Brief 1-2 sentence highlight for catalog cards..."
                      value={formData.shortDescription}
                      onChange={(e) => setFormData((p) => ({ ...p, shortDescription: e.target.value }))}
                      className="w-full bg-[#F8FAFC] border border-[#E8ECF0] focus:border-[#7567E8] rounded-xl p-3.5 text-xs text-[#25242A] font-medium outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#25242A] uppercase tracking-wider mb-2">
                      Full Product Details & Benefits
                    </label>
                    <textarea
                      rows={4}
                      placeholder="Detailed product information, key benefits, ingredients, and feeding guide..."
                      value={formData.fullDescription}
                      onChange={(e) => setFormData((p) => ({ ...p, fullDescription: e.target.value }))}
                      className="w-full bg-[#F8FAFC] border border-[#E8ECF0] focus:border-[#7567E8] rounded-xl p-3.5 text-xs text-[#25242A] font-medium outline-hidden"
                    />
                  </div>
                </div>
              </Card>

              {/* SECTION 2: MEDIA & CLOUDINARY IMAGES */}
              <Card>
                <div className="border-b border-[#E8ECF0] pb-3 mb-4">
                  <h3 className="text-sm font-black text-[#25242A]">2. Product Media & Cloudinary Storage</h3>
                  <p className="text-xs text-[#777980] font-medium">Upload high-res images directly to Cloudinary folder (healthy-paws/products)</p>
                </div>
                <ImageUploader
                  initialImages={formData.images}
                  primaryIndex={formData.primaryImageIndex}
                  onChange={(updatedImages, primaryIdx) =>
                    setFormData((p) => ({ ...p, images: updatedImages, primaryImageIndex: primaryIdx }))
                  }
                />
              </Card>

              {/* SECTION 3: PRICING & DISCOUNTS */}
              <Card>
                <div className="space-y-4">
                  <div className="border-b border-[#E8ECF0] pb-3 mb-2">
                    <h3 className="text-sm font-black text-[#25242A]">3. Pricing & Taxes</h3>
                    <p className="text-xs text-[#777980] font-medium">Set regular price, MRP, staff cost, and automatic discount calculation</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Input
                      label="Selling Price (₹) *"
                      type="number"
                      placeholder="e.g. 1499"
                      value={formData.sellingPrice}
                      onChange={(e) => setFormData((p) => ({ ...p, sellingPrice: e.target.value }))}
                      required
                    />
                    <Input
                      label="Regular MRP (₹)"
                      type="number"
                      placeholder="e.g. 1799"
                      value={formData.mrp}
                      onChange={(e) => setFormData((p) => ({ ...p, mrp: e.target.value }))}
                    />
                    <Input
                      label="Cost Price (Internal Staff Only ₹)"
                      type="number"
                      placeholder="e.g. 950"
                      value={formData.costPrice}
                      onChange={(e) => setFormData((p) => ({ ...p, costPrice: e.target.value }))}
                    />
                  </div>

                  {calculatedDiscount > 0 && (
                    <div className="p-3 bg-[#EAF8FE] border border-[#8ED8F8]/40 rounded-xl text-xs text-[#0284C7] font-bold flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      <span>Automatic Discount Applied: {calculatedDiscount}% OFF MRP</span>
                    </div>
                  )}
                </div>
              </Card>

              {/* SECTION 4: INVENTORY & STOCK */}
              <Card>
                <div className="space-y-4">
                  <div className="border-b border-[#E8ECF0] pb-3 mb-2">
                    <h3 className="text-sm font-black text-[#25242A]">4. Stock & Inventory Control</h3>
                    <p className="text-xs text-[#777980] font-medium">Manage warehouse quantity and low-stock alerts</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Input
                      label="Stock Quantity *"
                      type="number"
                      placeholder="e.g. 50"
                      value={formData.stockQuantity}
                      onChange={(e) => setFormData((p) => ({ ...p, stockQuantity: e.target.value }))}
                      required
                    />
                    <Input
                      label="Low Stock Alert Threshold"
                      type="number"
                      placeholder="e.g. 5"
                      value={formData.lowStockThreshold}
                      onChange={(e) => setFormData((p) => ({ ...p, lowStockThreshold: e.target.value }))}
                    />
                    <div className="flex items-center pt-6">
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-extrabold text-[#25242A]">
                        <input
                          type="checkbox"
                          checked={formData.allowBackorders}
                          onChange={(e) => setFormData((p) => ({ ...p, allowBackorders: e.target.checked }))}
                          className="rounded border-[#E8ECF0] text-[#7567E8]"
                        />
                        Allow Backorders when Out of Stock
                      </label>
                    </div>
                  </div>
                </div>
              </Card>

              {/* SECTION 5: VARIANTS */}
              <Card>
                <div className="space-y-4">
                  <div className="border-b border-[#E8ECF0] pb-3 mb-2">
                    <h3 className="text-sm font-black text-[#25242A]">5. Product Variants</h3>
                    <p className="text-xs text-[#777980] font-medium">Weight, size, flavor, or pack size options</p>
                  </div>

                  {formData.variants.map((v, i) => (
                    <div key={i} className="p-3.5 bg-[#F8FAFC] border border-[#E8ECF0] rounded-xl grid grid-cols-1 sm:grid-cols-5 gap-3 items-center">
                      <Input
                        label="Variant Name"
                        placeholder="Weight / Size"
                        value={v.name}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFormData((p) => ({
                            ...p,
                            variants: p.variants.map((varItem, idx) => (idx === i ? { ...varItem, name: val } : varItem)),
                          }));
                        }}
                      />
                      <Input
                        label="Option Value"
                        placeholder="3 kg"
                        value={v.value}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFormData((p) => ({
                            ...p,
                            variants: p.variants.map((varItem, idx) => (idx === i ? { ...varItem, value: val } : varItem)),
                          }));
                        }}
                      />
                      <Input
                        label="Variant Price (₹)"
                        placeholder="1499"
                        value={v.price}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFormData((p) => ({
                            ...p,
                            variants: p.variants.map((varItem, idx) => (idx === i ? { ...varItem, price: val } : varItem)),
                          }));
                        }}
                      />
                      <Input
                        label="Stock"
                        placeholder="20"
                        value={v.stock}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFormData((p) => ({
                            ...p,
                            variants: p.variants.map((varItem, idx) => (idx === i ? { ...varItem, stock: val } : varItem)),
                          }));
                        }}
                      />
                      <div className="pt-5 flex justify-end">
                        <Button variant="danger" size="sm" type="button" onClick={() => removeVariant(i)}>
                          Remove
                        </Button>
                      </div>
                    </div>
                  ))}

                  <Button variant="outline" size="sm" type="button" onClick={addVariant} icon={<Plus className="w-3.5 h-3.5" />}>
                    Add Variant Option
                  </Button>
                </div>
              </Card>

              {/* SECTION 6: PET SPECIFIC DETAILS */}
              <Card>
                <div className="space-y-4">
                  <div className="border-b border-[#E8ECF0] pb-3 mb-2">
                    <h3 className="text-sm font-black text-[#25242A]">6. Pet Product Specifications</h3>
                    <p className="text-xs text-[#777980] font-medium">Ingredients, age suitability, storage info, shelf life</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Input
                      label="Suitable Age Group"
                      placeholder="e.g. Puppy / Adult / All Stages"
                      value={formData.suitableAge}
                      onChange={(e) => setFormData((p) => ({ ...p, suitableAge: e.target.value }))}
                    />
                    <Input
                      label="Breed Suitability"
                      placeholder="e.g. All Breeds / Large Breed"
                      value={formData.breedSuitability}
                      onChange={(e) => setFormData((p) => ({ ...p, breedSuitability: e.target.value }))}
                    />
                    <Input
                      label="Shelf Life"
                      placeholder="e.g. 18 Months"
                      value={formData.shelfLife}
                      onChange={(e) => setFormData((p) => ({ ...p, shelfLife: e.target.value }))}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#25242A] uppercase tracking-wider mb-2">
                      Ingredients & Nutritional Information
                    </label>
                    <textarea
                      rows={2}
                      placeholder="e.g. Real Chicken Meat, Whole Brown Rice, Omega 3 Fatty Acids..."
                      value={formData.ingredients}
                      onChange={(e) => setFormData((p) => ({ ...p, ingredients: e.target.value }))}
                      className="w-full bg-[#F8FAFC] border border-[#E8ECF0] focus:border-[#7567E8] rounded-xl p-3.5 text-xs text-[#25242A] font-medium outline-hidden"
                    />
                  </div>
                </div>
              </Card>

              {/* SECTION 7: PUBLISHING & MERCHANDISING */}
              <Card>
                <div className="space-y-4">
                  <div className="border-b border-[#E8ECF0] pb-3 mb-2">
                    <h3 className="text-sm font-black text-[#25242A]">7. Merchandising & SEO</h3>
                    <p className="text-xs text-[#777980] font-medium">Status, featured badges, SEO meta tags</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-extrabold text-[#25242A]">
                      <input
                        type="checkbox"
                        checked={formData.isPublished}
                        onChange={(e) => setFormData((p) => ({ ...p, isPublished: e.target.checked }))}
                        className="rounded border-[#E8ECF0] text-[#7567E8]"
                      />
                      Publish Product to Store
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-extrabold text-[#25242A]">
                      <input
                        type="checkbox"
                        checked={formData.isFeatured}
                        onChange={(e) => setFormData((p) => ({ ...p, isFeatured: e.target.checked }))}
                        className="rounded border-[#E8ECF0] text-[#7567E8]"
                      />
                      Feature on Homepage
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-extrabold text-[#25242A]">
                      <input
                        type="checkbox"
                        checked={formData.isBestSeller}
                        onChange={(e) => setFormData((p) => ({ ...p, isBestSeller: e.target.checked }))}
                        className="rounded border-[#E8ECF0] text-[#7567E8]"
                      />
                      Mark as Best Seller
                    </label>
                  </div>

                  <Input
                    label="SEO Page Title"
                    placeholder="e.g. Buy Royal Canin Adult Dog Food Online | Healthy Paws"
                    value={formData.seoTitle}
                    onChange={(e) => setFormData((p) => ({ ...p, seoTitle: e.target.value }))}
                  />
                </div>
              </Card>
            </div>

            {/* RIGHT SIDE: LIVE PRODUCT PREVIEW CARD */}
            <div className="lg:col-span-4 sticky top-36 space-y-4">
              <Card>
                <div className="space-y-4">
                  <div className="border-b border-[#E8ECF0] pb-3">
                    <h3 className="text-sm font-black text-[#25242A]">Live Catalog Preview</h3>
                    <p className="text-xs text-[#777980] font-medium">How customers see this product in the store app</p>
                  </div>

                  <div className="aspect-square bg-[#F8FAFC] rounded-2xl overflow-hidden border border-[#E8ECF0] relative">
                    {formData.images.length > 0 ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={formData.images[formData.primaryImageIndex]?.url || formData.images[0]?.url}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-[#777980]">
                        <Package className="w-10 h-10 mb-2 opacity-40" />
                        <span className="text-xs font-semibold">No Image Uploaded</span>
                      </div>
                    )}

                    {calculatedDiscount > 0 && (
                      <span className="absolute top-3 right-3 bg-red-500 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow-xs">
                        {calculatedDiscount}% OFF
                      </span>
                    )}
                  </div>

                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#7567E8]">
                      {formData.brand || 'Healthy Paws'} • {formData.petType}
                    </span>
                    <h4 className="text-sm font-extrabold text-[#25242A] line-clamp-2">
                      {formData.name || 'Product Title Placeholder'}
                    </h4>
                    <p className="text-xs text-[#777980] line-clamp-2 mt-1">
                      {formData.shortDescription || 'Short product summary will appear here...'}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-[#E8ECF0] flex items-center justify-between">
                    <div>
                      <span className="text-base font-extrabold text-[#25242A]">
                        ₹{formData.sellingPrice || '0'}
                      </span>
                      {formData.mrp && parseFloat(formData.mrp) > parseFloat(formData.sellingPrice) && (
                        <span className="text-xs text-[#777980] line-through ml-2">₹{formData.mrp}</span>
                      )}
                    </div>

                    <StatusBadge
                      status={
                        parseInt(formData.stockQuantity) > 0 ? 'In Stock' : 'Out of Stock'
                      }
                    />
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </form>
      ) : (
        /* TABLE LIST VIEW */
        <div className="space-y-4">
          {fetchError && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between gap-4 text-xs text-amber-800 shadow-xs">
              <div className="flex items-center gap-2.5 font-bold">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                <span>{fetchError}</span>
              </div>
              <Button size="sm" variant="outline" onClick={fetchProducts} icon={<RefreshCw className="w-3.5 h-3.5" />}>
                Retry Catalog Sync
              </Button>
            </div>
          )}

          {/* SEARCH & FILTERS */}
          <div className="bg-white border border-[#E8ECF0] rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#777980] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search products by name, SKU or brand..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-[#F8FAFC] border border-[#E8ECF0] focus:border-[#7567E8] rounded-xl pl-10 pr-4 py-2.5 text-xs font-semibold text-[#25242A] outline-hidden"
              />
            </div>

            <div className="flex items-center gap-3">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-[#F8FAFC] border border-[#E8ECF0] rounded-xl px-3.5 py-2.5 text-xs font-semibold text-[#25242A] outline-hidden"
              >
                <option value="All">All Categories</option>
                <option value="Food">Food & Treats</option>
                <option value="Grooming">Grooming</option>
                <option value="Healthcare">Healthcare</option>
                <option value="Toys">Toys & Accessories</option>
              </select>

              <select
                value={selectedPetType}
                onChange={(e) => setSelectedPetType(e.target.value)}
                className="bg-[#F8FAFC] border border-[#E8ECF0] rounded-xl px-3.5 py-2.5 text-xs font-semibold text-[#25242A] outline-hidden"
              >
                <option value="All">All Pet Types</option>
                <option value="Dog">Dogs 🐶</option>
                <option value="Cat">Cats 🐱</option>
              </select>

              <Button variant="outline" onClick={fetchProducts} icon={<RefreshCw className="w-3.5 h-3.5" />}>
                Refresh
              </Button>
            </div>
          </div>

          {/* TABLE CONTAINER */}
          <div className="bg-white border border-[#E8ECF0] rounded-3xl overflow-hidden shadow-xs">
            {isLoadingProducts ? (
              <div className="py-16 text-center space-y-3">
                <Loader2 className="w-8 h-8 text-[#7567E8] animate-spin mx-auto" />
                <p className="text-xs font-semibold text-[#777980]">Loading catalog products from Firestore...</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="py-16 text-center space-y-3">
                <Package className="w-12 h-12 text-[#777980]/40 mx-auto" />
                <h3 className="text-sm font-extrabold text-[#25242A]">No Products Found</h3>
                <p className="text-xs text-[#777980] max-w-sm mx-auto">
                  No catalog items match your search filters or catalog is empty.
                </p>
                {hasProductPermission && (
                  <Button size="sm" onClick={() => handleOpenForm()} icon={<Plus className="w-3.5 h-3.5" />}>
                    Create First Product
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#F8FAFC] border-b border-[#E8ECF0] text-[#777980] font-bold uppercase tracking-wider text-[11px]">
                      <th className="py-3.5 px-4">Product Info</th>
                      <th className="py-3.5 px-4">Category & Pet</th>
                      <th className="py-3.5 px-4">Price</th>
                      <th className="py-3.5 px-4">Inventory</th>
                      <th className="py-3.5 px-4">Status & Visibility</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E8ECF0] font-medium text-[#25242A]">
                    {filteredProducts.map((p: any) => {
                      const primaryImg = p.image || p.primaryImage || (Array.isArray(p.images) && p.images.length > 0 ? (typeof p.images[0] === 'string' ? p.images[0] : p.images[0]?.url) : '');
                      const stockVal = p.stockQuantity ?? p.stock ?? 0;
                      const isActive = p.isPublished !== false;
                      const isToggling = togglingIds.includes(p.id);

                      return (
                        <tr key={p.id} className="hover:bg-[#F8FAFC]/80 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-11 h-11 rounded-xl bg-[#F8FAFC] border border-[#E8ECF0] overflow-hidden shrink-0">
                                {primaryImg ? (
                                  /* eslint-disable-next-line @next/next/no-img-element */
                                  <img src={primaryImg} alt={p.name} className="w-full h-full object-cover" />
                                ) : (
                                  <Package className="w-5 h-5 text-slate-400 m-3" />
                                )}
                              </div>
                              <div>
                                <span className="font-extrabold text-[#25242A] block line-clamp-1">{p.name}</span>
                                <span className="text-[11px] text-[#777980] font-semibold">SKU: {p.sku || p.id}</span>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <div>
                              <span className="font-bold text-[#25242A] block">{p.category || 'General'}</span>
                              <span className="text-[11px] text-[#7567E8] font-bold">{p.petType || p.suitableAnimal || 'Pet'}</span>
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <div>
                              <span className="font-extrabold text-[#25242A]">₹{p.sellingPrice || p.price || 0}</span>
                              {p.mrp && parseFloat(p.mrp) > parseFloat(p.sellingPrice || p.price || 0) && (
                                <span className="text-[10px] text-[#777980] line-through block">₹{p.mrp}</span>
                              )}
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <span className="font-bold">{stockVal} Units</span>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  role="switch"
                                  aria-checked={isActive}
                                  disabled={!hasProductPermission || isToggling}
                                  onClick={() => handleToggleStatus(p.id, isActive)}
                                  title={isActive ? 'Click to Deactivate Product' : 'Click to Activate Product'}
                                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                                    isActive ? 'bg-[#7567E8]' : 'bg-slate-300'
                                  } ${(!hasProductPermission || isToggling) ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                  <span
                                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                                      isActive ? 'translate-x-4' : 'translate-x-0'
                                    }`}
                                  />
                                </button>
                                <span className={`text-[11px] font-extrabold flex items-center gap-1 ${isActive ? 'text-emerald-600' : 'text-slate-400'}`}>
                                  {isToggling ? (
                                    <Loader2 className="w-3 h-3 animate-spin text-[#7567E8]" />
                                  ) : isActive ? (
                                    'Active'
                                  ) : (
                                    'Inactive'
                                  )}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={!hasProductPermission}
                                onClick={() => handleOpenForm(p)}
                                icon={<Edit className="w-3.5 h-3.5" />}
                              >
                                Edit
                              </Button>
                              <Button
                                variant="danger"
                                size="sm"
                                disabled={!hasProductPermission}
                                onClick={() => {
                                  setSelectedProduct(p);
                                  setIsDeleteModalOpen(true);
                                }}
                                icon={<Trash2 className="w-3.5 h-3.5" />}
                              >
                                Delete
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
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      <ConfirmDialog
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Product Document?"
        message={`Are you sure you want to delete "${selectedProduct?.name}"? This will permanently remove the product record from Cloud Firestore.`}
        confirmLabel="Delete Product"
      />
    </div>
  );
}
