'use client';

import React, { useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ImageUploader } from '@/components/ui/ImageUploader';
import {
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Package,
  Layers,
  Sparkles,
  Truck,
  Globe,
  Tag,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  X,
  Star,
  Flame,
} from 'lucide-react';
import { INITIAL_PRODUCTS, Product } from '@/lib/mockData';

interface ProductVariant {
  name: string;
  value: string;
  price: string;
  stock: string;
  sku: string;
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedPetType, setSelectedPetType] = useState('All');

  // Modal & Edit View State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Complete Multi-Section Form State
  const [formData, setFormData] = useState({
    name: '',
    subtitle: '',
    slug: '',
    brand: '',
    category: 'Food',
    subcategory: 'Dry Food',
    petType: 'Dog',
    productType: 'Physical Product',
    sku: '',
    barcode: '',
    images: [] as string[],
    primaryImageIndex: 0,
    shortDescription: '',
    fullDescription: '',
    sellingPrice: '',
    mrp: '',
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
    storageInstructions: 'Store in a cool, dry place',
    countryOfOrigin: 'India',
    manufacturer: '',
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
      seoTitle: prev.seoTitle === '' ? `${name} | PetCare Store` : prev.seoTitle,
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

  const handleOpenForm = (productToEdit?: Product) => {
    if (productToEdit) {
      setSelectedProduct(productToEdit);
      setFormData({
        name: productToEdit.name,
        subtitle: 'Premium quality formula for active pets',
        slug: productToEdit.name.toLowerCase().replace(/[\s_]/g, '-'),
        brand: productToEdit.brand,
        category: productToEdit.category,
        subcategory: 'Dry Food',
        petType: productToEdit.petType,
        productType: 'Physical Product',
        sku: productToEdit.sku,
        barcode: '8901234567890',
        images: [productToEdit.image],
        primaryImageIndex: 0,
        shortDescription: productToEdit.description,
        fullDescription: productToEdit.description,
        sellingPrice: productToEdit.price.toString(),
        mrp: productToEdit.discountPrice ? (productToEdit.price * 1.2).toFixed(2) : '',
        taxOption: 'Inclusive of GST (18%)',
        stockQuantity: productToEdit.stock.toString(),
        lowStockThreshold: '10',
        allowBackorders: false,
        variants: [
          { name: 'Weight', value: productToEdit.weight || '2.5 kg', price: productToEdit.price.toString(), stock: productToEdit.stock.toString(), sku: productToEdit.sku }
        ],
        ingredients: 'Chicken meat, green peas, omega 3 oil',
        material: '100% Organic',
        suitableAge: 'All Life Stages',
        breedSuitability: 'All Breeds',
        weightDimensions: productToEdit.weight || '2.5 kg',
        usageInstructions: 'Serve according to daily weight recommendations.',
        storageInstructions: 'Store in a cool dry place away from sunlight.',
        countryOfOrigin: 'India',
        manufacturer: 'NutriPet India Pvt Ltd',
        shelfLife: '18 Months',
        safetyInfo: 'Keep out of reach of children.',
        weightKg: '2.5',
        lengthCm: '30',
        widthCm: '20',
        heightCm: '10',
        freeShipping: true,
        seoTitle: `${productToEdit.name} | PetCare Store`,
        seoMetaDescription: productToEdit.description,
        isPublished: true,
        isFeatured: true,
        isBestSeller: false,
      });
    } else {
      setSelectedProduct(null);
      setFormData({
        name: '',
        subtitle: '',
        slug: '',
        brand: '',
        category: 'Food',
        subcategory: 'Dry Food',
        petType: 'Dog',
        productType: 'Physical Product',
        sku: '',
        barcode: '',
        images: [],
        primaryImageIndex: 0,
        shortDescription: '',
        fullDescription: '',
        sellingPrice: '',
        mrp: '',
        taxOption: 'Inclusive of GST (18%)',
        stockQuantity: '',
        lowStockThreshold: '10',
        allowBackorders: false,
        variants: [],
        ingredients: '',
        material: '',
        suitableAge: 'All Life Stages',
        breedSuitability: 'All Breeds',
        weightDimensions: '',
        usageInstructions: '',
        storageInstructions: 'Store in a cool, dry place',
        countryOfOrigin: 'India',
        manufacturer: '',
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

  const handleSaveProduct = (e: React.FormEvent, isDraft = false) => {
    e.preventDefault();
    const priceNum = parseFloat(formData.sellingPrice) || 0;
    const stockNum = parseInt(formData.stockQuantity) || 0;
    const mrpNum = formData.mrp ? parseFloat(formData.mrp) : undefined;

    let status: 'In Stock' | 'Low Stock' | 'Out of Stock' = 'In Stock';
    if (stockNum === 0) status = 'Out of Stock';
    else if (stockNum <= parseInt(formData.lowStockThreshold)) status = 'Low Stock';

    const primaryImg =
      formData.images[formData.primaryImageIndex] ||
      formData.images[0] ||
      'https://images.unsplash.com/photo-1589924691995-400dc9ecc119?w=300&auto=format&fit=crop';

    if (selectedProduct) {
      setProducts((prev) =>
        prev.map((p) =>
          p.id === selectedProduct.id
            ? {
                ...p,
                name: formData.name,
                category: formData.category,
                petType: formData.petType,
                brand: formData.brand || 'PetCare Brand',
                price: priceNum,
                discountPrice: mrpNum,
                stock: stockNum,
                sku: formData.sku,
                status,
                description: formData.fullDescription || formData.shortDescription,
                image: primaryImg,
              }
            : p
        )
      );
    } else {
      const newProduct: Product = {
        id: `PRD-${Math.floor(100 + Math.random() * 900)}`,
        name: formData.name,
        category: formData.category,
        petType: formData.petType,
        brand: formData.brand || 'PetCare Brand',
        price: priceNum,
        discountPrice: mrpNum,
        stock: stockNum,
        sku: formData.sku || `SKU-${Date.now().toString().slice(-6)}`,
        status,
        image: primaryImg,
        description: formData.fullDescription || formData.shortDescription,
      };
      setProducts((prev) => [newProduct, ...prev]);
    }

    setIsFormOpen(false);
  };

  const handleDeleteConfirm = () => {
    if (selectedProduct) {
      setProducts((prev) => prev.filter((p) => p.id !== selectedProduct.id));
      setSelectedProduct(null);
    }
  };

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.brand.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
    const matchesPetType = selectedPetType === 'All' || p.petType === selectedPetType;

    return matchesSearch && matchesCategory && matchesPetType;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* PAGE HEADER */}
      <PageHeader
        title="Products Management"
        subtitle="Create, edit, and publish e-commerce products with complete specs, pricing, and variants."
        action={
          !isFormOpen && (
            <Button onClick={() => handleOpenForm()} icon={<Plus className="w-4 h-4" />}>
              Add New Product
            </Button>
          )
        }
      />

      {/* FORM VIEW OR TABLE LIST VIEW */}
      {isFormOpen ? (
        <form onSubmit={(e) => handleSaveProduct(e, false)} className="space-y-8">
          {/* Top Form Sticky Header Bar */}
          <div className="bg-white border border-[#E8ECF0] rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 sticky top-16 z-20 shadow-xs">
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
              <Button variant="secondary" type="button" onClick={(e) => handleSaveProduct(e, true)}>
                Save as Draft
              </Button>
              <Button type="submit" icon={<CheckCircle2 className="w-4 h-4" />}>
                Publish Product
              </Button>
            </div>
          </div>

          {/* DESKTOP SPLIT LAYOUT: Main Form (Left 8 Cols) + Live Preview (Right 4 Cols) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* LEFT MAIN FORM SECTIONS */}
            <div className="lg:col-span-8 space-y-6">
              {/* SECTION 1: BASIC INFORMATION */}
              <Card className="space-y-4">
                <div className="flex items-center gap-2 border-b border-[#E8ECF0] pb-3">
                  <Package className="w-4 h-4 text-[#7567E8]" />
                  <h3 className="text-sm font-extrabold uppercase tracking-wider text-[#25242A]">
                    1. Basic Product Information
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <Input
                      label="Product Name"
                      placeholder="e.g. Chicken & Green Pea Recipe"
                      value={formData.name}
                      onChange={(e) => handleNameChange(e.target.value)}
                      required
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <Input
                      label="Product Subtitle / Tagline"
                      placeholder="e.g. Holistic grain-free recipe for active dogs"
                      value={formData.subtitle}
                      onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                    />
                  </div>

                  <div>
                    <Input
                      label="Product URL Slug"
                      placeholder="chicken-green-pea-recipe"
                      value={formData.slug}
                      onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                      helperText="Auto-generated URL identifier"
                    />
                  </div>

                  <div>
                    <Input
                      label="Brand Name"
                      placeholder="e.g. NutriPet Prime"
                      value={formData.brand}
                      onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#25242A] uppercase tracking-wider mb-1.5">
                      Category
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full bg-white border border-[#E8ECF0] rounded-xl px-4 py-2.5 text-sm text-[#25242A] focus:border-[#7567E8] focus:outline-none"
                    >
                      <option value="Food">Food</option>
                      <option value="Toys">Toys</option>
                      <option value="Treats">Treats</option>
                      <option value="Grooming">Grooming</option>
                      <option value="Care">Care</option>
                      <option value="Healthcare">Healthcare</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#25242A] uppercase tracking-wider mb-1.5">
                      Subcategory
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Dry Dog Food"
                      value={formData.subcategory}
                      onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })}
                      className="w-full bg-white border border-[#E8ECF0] rounded-xl px-4 py-2.5 text-sm text-[#25242A]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#25242A] uppercase tracking-wider mb-1.5">
                      Target Pet Type
                    </label>
                    <select
                      value={formData.petType}
                      onChange={(e) => setFormData({ ...formData, petType: e.target.value })}
                      className="w-full bg-white border border-[#E8ECF0] rounded-xl px-4 py-2.5 text-sm text-[#25242A] focus:border-[#7567E8] focus:outline-none"
                    >
                      <option value="Dog">Dog</option>
                      <option value="Cat">Cat</option>
                      <option value="Bird">Bird</option>
                      <option value="Fish">Fish</option>
                      <option value="Other">Other Pets</option>
                    </select>
                  </div>

                  <div>
                    <Input
                      label="SKU Code"
                      placeholder="NP-CHK-25KG"
                      value={formData.sku}
                      onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    />
                  </div>

                  <div>
                    <Input
                      label="Barcode / GTIN (Optional)"
                      placeholder="8901234567890"
                      value={formData.barcode}
                      onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    />
                  </div>
                </div>
              </Card>

              {/* SECTION 2: PRODUCT IMAGES MULTI-UPLOAD */}
              <Card className="space-y-4">
                <div className="flex items-center justify-between border-b border-[#E8ECF0] pb-3">
                  <div className="flex items-center gap-2">
                    <UploadCloud className="w-4 h-4 text-[#7567E8]" />
                    <h3 className="text-sm font-extrabold uppercase tracking-wider text-[#25242A]">
                      2. Product Images Gallery
                    </h3>
                  </div>
                  <span className="text-xs text-[#737780] font-medium">Multiple images supported</span>
                </div>

                <ImageUploader
                  initialImages={formData.images}
                  onChange={(imgs) => setFormData({ ...formData, images: imgs })}
                />

                {formData.images.length > 0 && (
                  <div className="p-3 bg-[#F8FAFC] border border-[#E8ECF0] rounded-xl text-xs text-[#737780] flex items-center justify-between">
                    <span>Selected Primary Image index: {formData.primaryImageIndex + 1}</span>
                    <span className="text-[#7567E8] font-bold">Primary Thumbnail Set</span>
                  </div>
                )}
              </Card>

              {/* SECTION 3: DESCRIPTION */}
              <Card className="space-y-4">
                <div className="flex items-center gap-2 border-b border-[#E8ECF0] pb-3">
                  <Layers className="w-4 h-4 text-[#7567E8]" />
                  <h3 className="text-sm font-extrabold uppercase tracking-wider text-[#25242A]">
                    3. Product Description
                  </h3>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#25242A] uppercase tracking-wider mb-1.5">
                    Short Description
                  </label>
                  <textarea
                    rows={2}
                    maxLength={160}
                    placeholder="Brief 1-2 sentence overview for product cards..."
                    value={formData.shortDescription}
                    onChange={(e) => setFormData({ ...formData, shortDescription: e.target.value })}
                    className="w-full bg-white border border-[#E8ECF0] rounded-xl px-4 py-2.5 text-sm text-[#25242A] focus:border-[#7567E8]"
                  />
                  <span className="text-[11px] text-[#737780] block text-right">
                    {formData.shortDescription.length} / 160 chars
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#25242A] uppercase tracking-wider mb-1.5">
                    Full Product Description
                  </label>
                  <textarea
                    rows={5}
                    placeholder="Complete detailed product story, benefits, nutritional values..."
                    value={formData.fullDescription}
                    onChange={(e) => setFormData({ ...formData, fullDescription: e.target.value })}
                    className="w-full bg-white border border-[#E8ECF0] rounded-xl px-4 py-2.5 text-sm text-[#25242A] focus:border-[#7567E8]"
                  />
                </div>
              </Card>

              {/* SECTION 4: PRICING (INR FORMATTING) */}
              <Card className="space-y-4">
                <div className="flex items-center justify-between border-b border-[#E8ECF0] pb-3">
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-[#7567E8]" />
                    <h3 className="text-sm font-extrabold uppercase tracking-wider text-[#25242A]">
                      4. Pricing & Taxes (₹ INR)
                    </h3>
                  </div>
                  {calculatedDiscount > 0 && (
                    <span className="text-xs font-extrabold text-[#35B779] bg-[#DFF7EE] px-2.5 py-1 rounded-full">
                      {calculatedDiscount}% Discount Applied
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Input
                    label="Selling Price (₹)"
                    type="number"
                    step="1"
                    placeholder="899"
                    value={formData.sellingPrice}
                    onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })}
                    required
                  />
                  <Input
                    label="Original Price / MRP (₹)"
                    type="number"
                    step="1"
                    placeholder="1099"
                    value={formData.mrp}
                    onChange={(e) => setFormData({ ...formData, mrp: e.target.value })}
                  />
                  <div>
                    <label className="block text-xs font-semibold text-[#25242A] uppercase tracking-wider mb-1.5">
                      Tax / GST Setting
                    </label>
                    <select
                      value={formData.taxOption}
                      onChange={(e) => setFormData({ ...formData, taxOption: e.target.value })}
                      className="w-full bg-white border border-[#E8ECF0] rounded-xl px-4 py-2.5 text-sm text-[#25242A]"
                    >
                      <option value="Inclusive of GST (18%)">Inclusive of GST (18%)</option>
                      <option value="Inclusive of GST (12%)">Inclusive of GST (12%)</option>
                      <option value="Excluding GST">Excluding GST</option>
                    </select>
                  </div>
                </div>
              </Card>

              {/* SECTION 5: INVENTORY */}
              <Card className="space-y-4">
                <div className="flex items-center gap-2 border-b border-[#E8ECF0] pb-3">
                  <Package className="w-4 h-4 text-[#7567E8]" />
                  <h3 className="text-sm font-extrabold uppercase tracking-wider text-[#25242A]">
                    5. Inventory Management
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Available Stock Quantity"
                    type="number"
                    placeholder="45"
                    value={formData.stockQuantity}
                    onChange={(e) => setFormData({ ...formData, stockQuantity: e.target.value })}
                    required
                  />
                  <Input
                    label="Low Stock Alert Threshold"
                    type="number"
                    placeholder="10"
                    value={formData.lowStockThreshold}
                    onChange={(e) => setFormData({ ...formData, lowStockThreshold: e.target.value })}
                  />
                </div>
              </Card>

              {/* SECTION 6: DYNAMIC PRODUCT VARIANTS */}
              <Card className="space-y-4">
                <div className="flex items-center justify-between border-b border-[#E8ECF0] pb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#7567E8]" />
                    <h3 className="text-sm font-extrabold uppercase tracking-wider text-[#25242A]">
                      6. Product Variants (Weight, Size, Pack)
                    </h3>
                  </div>
                  <Button type="button" size="sm" variant="outline" onClick={addVariant} icon={<Plus className="w-3.5 h-3.5" />}>
                    Add Variant
                  </Button>
                </div>

                {formData.variants.length === 0 ? (
                  <p className="text-xs text-[#737780] text-center py-2 font-medium">
                    No variants added. Product will be sold as a single item.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {formData.variants.map((varItem, vIdx) => (
                      <div key={vIdx} className="p-3 bg-[#F8FAFC] border border-[#E8ECF0] rounded-xl flex items-center gap-3">
                        <input
                          type="text"
                          placeholder="Type (e.g. Weight)"
                          value={varItem.name}
                          onChange={(e) => {
                            const updated = [...formData.variants];
                            updated[vIdx].name = e.target.value;
                            setFormData({ ...formData, variants: updated });
                          }}
                          className="w-28 bg-white border border-[#E8ECF0] rounded-lg px-3 py-1.5 text-xs"
                        />
                        <input
                          type="text"
                          placeholder="Value (e.g. 1 kg)"
                          value={varItem.value}
                          onChange={(e) => {
                            const updated = [...formData.variants];
                            updated[vIdx].value = e.target.value;
                            setFormData({ ...formData, variants: updated });
                          }}
                          className="w-28 bg-white border border-[#E8ECF0] rounded-lg px-3 py-1.5 text-xs font-bold"
                        />
                        <input
                          type="number"
                          placeholder="Price (₹)"
                          value={varItem.price}
                          onChange={(e) => {
                            const updated = [...formData.variants];
                            updated[vIdx].price = e.target.value;
                            setFormData({ ...formData, variants: updated });
                          }}
                          className="w-24 bg-white border border-[#E8ECF0] rounded-lg px-3 py-1.5 text-xs font-bold text-[#7567E8]"
                        />
                        <button
                          type="button"
                          onClick={() => removeVariant(vIdx)}
                          className="p-1.5 text-[#E46A6A] hover:bg-red-50 rounded-lg ml-auto"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              {/* SECTION 7: SPECIFICATIONS */}
              <Card className="space-y-4">
                <div className="flex items-center gap-2 border-b border-[#E8ECF0] pb-3">
                  <Layers className="w-4 h-4 text-[#7567E8]" />
                  <h3 className="text-sm font-extrabold uppercase tracking-wider text-[#25242A]">
                    7. Product Specifications
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Ingredients / Material"
                    placeholder="Real chicken, organic oats, aloe vera..."
                    value={formData.ingredients}
                    onChange={(e) => setFormData({ ...formData, ingredients: e.target.value })}
                  />
                  <Input
                    label="Suitable Pet Age"
                    placeholder="All Life Stages or Puppy (2-12 months)"
                    value={formData.suitableAge}
                    onChange={(e) => setFormData({ ...formData, suitableAge: e.target.value })}
                  />
                  <Input
                    label="Breed Suitability"
                    placeholder="All Breeds or Medium-Large Dogs"
                    value={formData.breedSuitability}
                    onChange={(e) => setFormData({ ...formData, breedSuitability: e.target.value })}
                  />
                  <Input
                    label="Shelf Life / Expiry"
                    placeholder="18 Months from MFG"
                    value={formData.shelfLife}
                    onChange={(e) => setFormData({ ...formData, shelfLife: e.target.value })}
                  />
                </div>
              </Card>

              {/* SECTION 8: SHIPPING */}
              <Card className="space-y-4">
                <div className="flex items-center justify-between border-b border-[#E8ECF0] pb-3">
                  <div className="flex items-center gap-2">
                    <Truck className="w-4 h-4 text-[#7567E8]" />
                    <h3 className="text-sm font-extrabold uppercase tracking-wider text-[#25242A]">
                      8. Shipping & Packaging
                    </h3>
                  </div>
                  <label className="flex items-center gap-2 text-xs font-bold text-[#35B779] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.freeShipping}
                      onChange={(e) => setFormData({ ...formData, freeShipping: e.target.checked })}
                      className="rounded text-[#35B779]"
                    />
                    Free Shipping Eligible
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <Input
                    label="Weight (kg)"
                    placeholder="2.5"
                    value={formData.weightKg}
                    onChange={(e) => setFormData({ ...formData, weightKg: e.target.value })}
                  />
                  <Input
                    label="Length (cm)"
                    placeholder="30"
                    value={formData.lengthCm}
                    onChange={(e) => setFormData({ ...formData, lengthCm: e.target.value })}
                  />
                  <Input
                    label="Width (cm)"
                    placeholder="20"
                    value={formData.widthCm}
                    onChange={(e) => setFormData({ ...formData, widthCm: e.target.value })}
                  />
                  <Input
                    label="Height (cm)"
                    placeholder="10"
                    value={formData.heightCm}
                    onChange={(e) => setFormData({ ...formData, heightCm: e.target.value })}
                  />
                </div>
              </Card>

              {/* SECTION 9: SEO */}
              <Card className="space-y-4">
                <div className="flex items-center gap-2 border-b border-[#E8ECF0] pb-3">
                  <Globe className="w-4 h-4 text-[#7567E8]" />
                  <h3 className="text-sm font-extrabold uppercase tracking-wider text-[#25242A]">
                    9. Search Engine Optimization (SEO)
                  </h3>
                </div>

                <Input
                  label="SEO Title"
                  placeholder="Chicken & Green Pea Recipe | PetCare Kanpur"
                  value={formData.seoTitle}
                  onChange={(e) => setFormData({ ...formData, seoTitle: e.target.value })}
                />
                <div>
                  <label className="block text-xs font-semibold text-[#25242A] uppercase tracking-wider mb-1.5">
                    Meta Description
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Buy healthy chicken dry dog food in Swaroop Nagar, Kanpur..."
                    value={formData.seoMetaDescription}
                    onChange={(e) => setFormData({ ...formData, seoMetaDescription: e.target.value })}
                    className="w-full bg-white border border-[#E8ECF0] rounded-xl px-4 py-2.5 text-sm text-[#25242A]"
                  />
                </div>
              </Card>

              {/* SECTION 10: PRODUCT STATUS & BADGES */}
              <Card className="space-y-4">
                <div className="flex items-center gap-2 border-b border-[#E8ECF0] pb-3">
                  <Star className="w-4 h-4 text-[#7567E8]" />
                  <h3 className="text-sm font-extrabold uppercase tracking-wider text-[#25242A]">
                    10. Visibility & Badges
                  </h3>
                </div>

                <div className="flex flex-wrap gap-6 text-xs font-bold text-[#25242A]">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isFeatured}
                      onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
                      className="rounded text-[#7567E8]"
                    />
                    <span>Featured Product</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isBestSeller}
                      onChange={(e) => setFormData({ ...formData, isBestSeller: e.target.checked })}
                      className="rounded text-[#7567E8]"
                    />
                    <span>Best Seller Badge</span>
                  </label>
                </div>
              </Card>
            </div>

            {/* RIGHT SIDEBAR: Live Product Preview Summary */}
            <div className="lg:col-span-4 sticky top-36 space-y-4">
              <div className="bg-white border border-[#E8ECF0] rounded-3xl p-5 shadow-lg space-y-4">
                <div className="flex items-center justify-between border-b border-[#E8ECF0] pb-3">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-[#7567E8] flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" /> Live Product Preview
                  </span>
                  <span className="text-[10px] font-bold text-[#35B779] bg-[#DFF7EE] px-2 py-0.5 rounded-full">
                    Store View
                  </span>
                </div>

                {/* Preview Image */}
                <div className="aspect-square w-full bg-[#F8FAFC] rounded-2xl overflow-hidden border border-[#E8ECF0] relative">
                  {formData.images.length > 0 ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={formData.images[formData.primaryImageIndex] || formData.images[0]}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-[#737780]">
                      <Package className="w-12 h-12 mb-2 stroke-1" />
                      <span className="text-xs font-medium">No Image Uploaded</span>
                    </div>
                  )}

                  {/* Discount Badge */}
                  {calculatedDiscount > 0 && (
                    <span className="absolute top-3 left-3 bg-[#E46A6A] text-white text-[11px] font-extrabold px-2.5 py-1 rounded-lg shadow-xs">
                      {calculatedDiscount}% OFF
                    </span>
                  )}
                </div>

                {/* Preview Text */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-[#737780] font-bold">
                    <span>{formData.brand || 'Brand'}</span>
                    <span className="text-[#7567E8] uppercase">{formData.category}</span>
                  </div>

                  <h4 className="text-base font-extrabold text-[#25242A] leading-tight">
                    {formData.name || 'Product Title Preview'}
                  </h4>

                  {formData.subtitle && (
                    <p className="text-xs text-[#737780] font-medium">{formData.subtitle}</p>
                  )}

                  <div className="flex items-baseline gap-2 pt-1">
                    <span className="text-2xl font-black text-[#7567E8]">
                      ₹{formData.sellingPrice || '0'}
                    </span>
                    {formData.mrp && (
                      <span className="text-xs text-[#737780] line-through">
                        ₹{formData.mrp}
                      </span>
                    )}
                  </div>
                </div>

                {/* Stock Status Badge */}
                <div className="pt-3 border-t border-[#E8ECF0] flex items-center justify-between text-xs">
                  <span className="text-[#737780] font-medium">Availability:</span>
                  <StatusBadge
                    status={
                      (parseInt(formData.stockQuantity) || 0) > 10
                        ? 'In Stock'
                        : (parseInt(formData.stockQuantity) || 0) > 0
                        ? 'Low Stock'
                        : 'Out of Stock'
                    }
                  />
                </div>
              </div>
            </div>
          </div>
        </form>
      ) : (
        /* TABLE PRODUCTS LIST VIEW */
        <div className="space-y-6">
          <Card padding="p-4">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="relative w-full md:w-80">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#737780]" />
                <input
                  type="text"
                  placeholder="Search product name, SKU, brand..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-[#F8FAFC] border border-[#E8ECF0] focus:border-[#7567E8] rounded-xl pl-10 pr-4 py-2 text-xs text-[#25242A] focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto">
                <Filter className="w-4 h-4 text-[#737780]" />
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="bg-[#F8FAFC] border border-[#E8ECF0] rounded-xl px-3 py-2 text-xs text-[#25242A]"
                >
                  <option value="All">All Categories</option>
                  <option value="Food">Food</option>
                  <option value="Toys">Toys</option>
                  <option value="Treats">Treats</option>
                  <option value="Grooming">Grooming</option>
                  <option value="Care">Care</option>
                </select>

                <select
                  value={selectedPetType}
                  onChange={(e) => setSelectedPetType(e.target.value)}
                  className="bg-[#F8FAFC] border border-[#E8ECF0] rounded-xl px-3 py-2 text-xs text-[#25242A]"
                >
                  <option value="All">All Pet Types</option>
                  <option value="Dog">Dog</option>
                  <option value="Cat">Cat</option>
                </select>
              </div>
            </div>
          </Card>

          <Card padding="p-0" className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8FAFC] text-[#737780] uppercase tracking-wider text-[10px] font-bold border-b border-[#E8ECF0]">
                  <tr>
                    <th className="py-3.5 px-4">Product</th>
                    <th className="py-3.5 px-4">Category</th>
                    <th className="py-3.5 px-4">Pet Type</th>
                    <th className="py-3.5 px-4">Price (₹)</th>
                    <th className="py-3.5 px-4">Stock</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8ECF0]">
                  {filteredProducts.map((p) => (
                    <tr key={p.id} className="hover:bg-[#F8FAFC]">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={p.image}
                            alt={p.name}
                            className="w-10 h-10 rounded-xl object-cover border border-[#E8ECF0] bg-white"
                          />
                          <div>
                            <p className="font-bold text-[#25242A]">{p.name}</p>
                            <p className="text-[11px] text-[#737780]">SKU: {p.sku}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-semibold text-[#25242A]">{p.category}</td>
                      <td className="py-3 px-4 text-[#737780]">{p.petType}</td>
                      <td className="py-3 px-4 font-bold text-[#7567E8]">
                        ₹{(p.price * 80).toFixed(0)}
                      </td>
                      <td className="py-3 px-4 font-semibold text-[#25242A]">{p.stock} units</td>
                      <td className="py-3 px-4">
                        <StatusBadge status={p.status} />
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenForm(p)}
                            className="p-1.5 text-[#737780] hover:text-[#7567E8] hover:bg-[#F1EEFF] rounded-lg transition-colors"
                            title="Edit Product"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedProduct(p);
                              setIsDeleteModalOpen(true);
                            }}
                            className="p-1.5 text-[#737780] hover:text-[#E46A6A] hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete Product"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Product?"
        message={`Are you sure you want to delete "${selectedProduct?.name}"? This action cannot be undone.`}
        confirmLabel="Delete Product"
      />
    </div>
  );
}
