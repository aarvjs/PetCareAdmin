import { NextResponse } from 'next/server';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { isRequestAuthorizedAsProductAdmin, adminDb, hasServiceAccount, getSharedClientFirestore } from '@/lib/firebaseAdmin';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await request.json();

    // Permission Check
    const authCheck = await isRequestAuthorizedAsProductAdmin(request, body);
    if (!authCheck.authorized) {
      return NextResponse.json(
        { success: false, error: authCheck.error || 'Permission denied.' },
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
      images,
      primaryImageIndex = 0,
      variants,
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
      isPublished,
      isFeatured,
      isBestSeller,
    } = body;

    const numericSellingPrice = sellingPrice !== undefined ? parseFloat(sellingPrice) : undefined;
    const numericMrp = mrp !== undefined ? parseFloat(mrp) : numericSellingPrice;
    const discountPercent = numericMrp && numericSellingPrice && numericMrp > numericSellingPrice ? Math.round(((numericMrp - numericSellingPrice) / numericMrp) * 100) : 0;

    const primaryImageUrl = Array.isArray(images) && images.length > 0
      ? (typeof images[primaryImageIndex] === 'string' ? images[primaryImageIndex] : images[primaryImageIndex]?.url || images[0]?.url || images[0])
      : undefined;

    const updateFields: Record<string, any> = {
      updatedAt: new Date().toISOString(),
    };

    if (name !== undefined) updateFields.name = name.trim();
    if (sku !== undefined) updateFields.sku = sku.trim().toUpperCase();
    if (numericSellingPrice !== undefined) updateFields.sellingPrice = numericSellingPrice;
    if (numericMrp !== undefined) updateFields.mrp = numericMrp;
    if (costPrice !== undefined) updateFields.costPrice = costPrice ? parseFloat(costPrice) : null;
    if (discountPercent !== undefined) updateFields.discountPercent = discountPercent;
    if (category !== undefined) updateFields.category = category;
    if (subcategory !== undefined) updateFields.subcategory = subcategory;
    if (brand !== undefined) updateFields.brand = brand;
    if (petType !== undefined) {
      updateFields.petType = petType;
      updateFields.suitableAnimal = petType;
    }
    if (productType !== undefined) updateFields.productType = productType;
    if (shortDescription !== undefined) updateFields.shortDescription = shortDescription;
    if (fullDescription !== undefined) updateFields.fullDescription = fullDescription;
    if (stockQuantity !== undefined) {
      updateFields.stockQuantity = parseInt(stockQuantity) || 0;
      updateFields.stock = parseInt(stockQuantity) || 0;
    }
    if (lowStockThreshold !== undefined) updateFields.lowStockThreshold = parseInt(lowStockThreshold) || 5;
    if (allowBackorders !== undefined) updateFields.allowBackorders = !!allowBackorders;
    if (images !== undefined) updateFields.images = images;
    if (primaryImageUrl !== undefined) {
      updateFields.image = primaryImageUrl;
      updateFields.primaryImage = primaryImageUrl;
    }
    if (variants !== undefined) updateFields.variants = variants;
    if (ingredients !== undefined) updateFields.ingredients = ingredients;
    if (suitableAge !== undefined) updateFields.suitableAge = suitableAge;
    if (breedSuitability !== undefined) updateFields.breedSuitability = breedSuitability;
    if (weightKg !== undefined) updateFields.weightKg = weightKg;
    if (lengthCm !== undefined || widthCm !== undefined || heightCm !== undefined) {
      updateFields.dimensions = {
        length: lengthCm || '',
        width: widthCm || '',
        height: heightCm || '',
      };
    }
    if (storageInstructions !== undefined) updateFields.storageInstructions = storageInstructions;
    if (shelfLife !== undefined) updateFields.shelfLife = shelfLife;
    if (countryOfOrigin !== undefined) updateFields.countryOfOrigin = countryOfOrigin;
    if (seoTitle !== undefined) updateFields.seoTitle = seoTitle;
    if (seoMetaDescription !== undefined) updateFields.seoMetaDescription = seoMetaDescription;
    if (isPublished !== undefined) updateFields.isPublished = !!isPublished;
    if (isFeatured !== undefined) updateFields.isFeatured = !!isFeatured;
    if (isBestSeller !== undefined) updateFields.isBestSeller = !!isBestSeller;

    if (hasServiceAccount() && adminDb) {
      await adminDb.collection('products').doc(id).update(updateFields);
    } else {
      const clientDb = getSharedClientFirestore();
      await updateDoc(doc(clientDb, 'products', id), updateFields);
    }

    return NextResponse.json({
      success: true,
      message: 'Product updated successfully!',
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update product.' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const authCheck = await isRequestAuthorizedAsProductAdmin(request);
    if (!authCheck.authorized) {
      return NextResponse.json(
        { success: false, error: authCheck.error || 'Permission denied.' },
        { status: authCheck.status || 403 }
      );
    }

    if (hasServiceAccount() && adminDb) {
      await adminDb.collection('products').doc(id).delete();
    } else {
      const clientDb = getSharedClientFirestore();
      await deleteDoc(doc(clientDb, 'products', id));
    }

    return NextResponse.json({
      success: true,
      message: `Product ${id} deleted successfully.`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete product.' },
      { status: 500 }
    );
  }
}
