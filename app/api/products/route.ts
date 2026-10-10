import { NextResponse } from 'next/server';
import { collection, getDocs, doc, setDoc } from 'firebase/firestore';
import { isRequestAuthorizedAsProductAdmin, adminDb, hasServiceAccount, getSharedClientFirestore } from '@/lib/firebaseAdmin';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const petType = searchParams.get('petType');
    const status = searchParams.get('status');
    const forAdmin = searchParams.get('forAdmin') === 'true' || searchParams.get('includeDrafts') === 'true';

    let products: any[] = [];

    // 1. Admin SDK mode (only when service account credentials are available)
    if (hasServiceAccount() && adminDb) {
      try {
        const snapshot = await adminDb.collection('products').get();
        products = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      } catch (e) {
        console.warn('[Products GET] Admin SDK query failed, falling back to Client Web SDK:', e);
      }
    }

    // 2. Client Web SDK fallback mode
    if (products.length === 0) {
      try {
        const clientDb = getSharedClientFirestore();
        const snap = await getDocs(collection(clientDb, 'products'));
        products = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      } catch (e: any) {
        console.warn('[Products GET] Client SDK query restricted for unauthenticated server fetch:', e.message);
      }
    }

    const shopId = searchParams.get('shopId');

    if (category && category !== 'All') {
      products = products.filter((p: any) => p.category === category);
    }
    if (petType && petType !== 'All') {
      products = products.filter((p: any) => p.petType === petType || p.suitableAnimal === petType);
    }
    if (shopId && shopId !== 'All') {
      products = products.filter((p: any) => !p.shopId || p.shopId === shopId);
    }
    if (status && status !== 'All') {
      if (status === 'Published' || status === 'Active') {
        products = products.filter((p: any) => p.isPublished !== false);
      } else if (status === 'Draft' || status === 'Inactive') {
        products = products.filter((p: any) => p.isPublished === false);
      }
    } else if (!forAdmin) {
      // Default for customer-facing store listings: hide inactive/unpublished products
      products = products.filter((p: any) => p.isPublished !== false);
    }

    return NextResponse.json({ success: true, products });
  } catch (error: any) {
    console.error('[Products GET Fatal Error]', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch products.' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const requestId = `req_prod_${Date.now()}_${Math.random().toString(36).slice(-4)}`;

  try {
    const body = await request.json();

    // 1. Server-side Permission Check (blocks non-authorized Admins)
    const authCheck = await isRequestAuthorizedAsProductAdmin(request, body);
    if (!authCheck.authorized) {
      return NextResponse.json(
        { success: false, error: authCheck.error || 'Access Denied: You do not have permission to manage products.' },
        { status: authCheck.status || 403 }
      );
    }

    const {
      name,
      sku,
      sellingPrice,
      mrp,
      costPrice,
      category,
      subcategory,
      brand,
      petType,
      productType,
      shortDescription,
      fullDescription,
      stockQuantity,
      lowStockThreshold,
      allowBackorders,
      images = [],
      primaryImageIndex = 0,
      variants = [],
      ingredients,
      suitableAge,
      breedSuitability,
      weightKg,
      lengthCm,
      widthCm,
      heightCm,
      storageInstructions,
      shelfLife,
      countryOfOrigin,
      seoTitle,
      seoMetaDescription,
      slug,
      isPublished = true,
      isFeatured = false,
      isBestSeller = false,
      createdByUid = authCheck.uid || 'admin',
    } = body;

    // 2. Input Validation
    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, error: 'Product name is required.' },
        { status: 400 }
      );
    }

    if (!sku || !sku.trim()) {
      return NextResponse.json(
        { success: false, error: 'Product SKU code is required.' },
        { status: 400 }
      );
    }

    if (!sellingPrice || isNaN(parseFloat(sellingPrice)) || parseFloat(sellingPrice) < 0) {
      return NextResponse.json(
        { success: false, error: 'Valid selling price is required.' },
        { status: 400 }
      );
    }

    const cleanSku = sku.trim().toUpperCase();
    const cleanSlug = slug || name.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-');

    // 3. Unique SKU Validation Check
    if (hasServiceAccount() && adminDb) {
      const existingSkuSnap = await adminDb.collection('products').where('sku', '==', cleanSku).get();
      if (!existingSkuSnap.empty) {
        return NextResponse.json(
          { success: false, error: `SKU code "${cleanSku}" is already assigned to another product.` },
          { status: 409 }
        );
      }
    }

    // 4. Construct Product Document Object
    const productId = `prod_${Date.now()}_${Math.random().toString(36).slice(-6)}`;
    const now = new Date().toISOString();

    const numericSellingPrice = parseFloat(sellingPrice);
    const numericMrp = parseFloat(mrp) || numericSellingPrice;
    const discountPercent = numericMrp > numericSellingPrice ? Math.round(((numericMrp - numericSellingPrice) / numericMrp) * 100) : 0;

    const primaryImageUrl = images.length > 0 ? (typeof images[primaryImageIndex] === 'string' ? images[primaryImageIndex] : images[primaryImageIndex]?.url || images[0]?.url || images[0]) : '';

    const productDoc = {
      id: productId,
      name: name.trim(),
      slug: cleanSlug,
      sku: cleanSku,
      brand: brand || 'Healthy Paws',
      category: category || 'Food',
      subcategory: subcategory || 'Dry Food',
      petType: petType || 'Dog',
      suitableAnimal: petType || 'Dog',
      productType: productType || 'Physical Product',
      shortDescription: shortDescription || '',
      fullDescription: fullDescription || '',
      sellingPrice: numericSellingPrice,
      mrp: numericMrp,
      costPrice: costPrice ? parseFloat(costPrice) : null,
      discountPercent,
      currency: 'INR',
      stockQuantity: parseInt(stockQuantity) || 0,
      stock: parseInt(stockQuantity) || 0,
      lowStockThreshold: parseInt(lowStockThreshold) || 5,
      allowBackorders: !!allowBackorders,
      images,
      image: primaryImageUrl,
      primaryImage: primaryImageUrl,
      variants,
      ingredients: ingredients || '',
      suitableAge: suitableAge || 'All Life Stages',
      breedSuitability: breedSuitability || 'All Breeds',
      weightKg: weightKg || '',
      dimensions: {
        length: lengthCm || '',
        width: widthCm || '',
        height: heightCm || '',
      },
      storageInstructions: storageInstructions || '',
      shelfLife: shelfLife || '',
      countryOfOrigin: countryOfOrigin || 'India',
      seoTitle: seoTitle || `${name} | Healthy Paws Pet Clinic`,
      seoMetaDescription: seoMetaDescription || shortDescription || '',
      isPublished: !!isPublished,
      isFeatured: !!isFeatured,
      isBestSeller: !!isBestSeller,
      shopId: authCheck.shopId || body.shopId || '',
      businessId: authCheck.businessId || body.businessId || '',
      createdBy: createdByUid,
      createdAt: now,
      updatedAt: now,
    };

    // 5. Save to Firestore
    if (adminDb) {
      try {
        await adminDb.collection('products').doc(productId).set(productDoc);
      } catch (adminErr: any) {
        console.warn('[Products POST] Admin SDK write failed, falling back to Client SDK:', adminErr.message);
        const clientDb = getSharedClientFirestore();
        await setDoc(doc(clientDb, 'products', productId), productDoc);
      }
    } else {
      const clientDb = getSharedClientFirestore();
      await setDoc(doc(clientDb, 'products', productId), productDoc);
    }

    return NextResponse.json({
      success: true,
      message: `Product "${name}" created successfully!`,
      product: productDoc,
      requestId,
    });
  } catch (error: any) {
    console.error(`[Create Product Error][${requestId}]`, error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create product document.' },
      { status: 500 }
    );
  }
}
