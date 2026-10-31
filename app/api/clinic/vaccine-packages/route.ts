import { NextResponse } from 'next/server';
import {
  adminDb,
  hasServiceAccount,
  isRequestAuthorizedForClinicStaff,
  fetchFirestoreCollectionRest,
  setFirestoreDocRest,
} from '@/lib/firebaseAdmin';
import { DEFAULT_VACCINE_PACKAGES, VaccinePackage } from '@/lib/vaccineSchedule';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * GET /api/clinic/vaccine-packages
 * Lists all active/configured vaccine packages for the authorized clinic.
 */
export async function GET(request: Request) {
  try {
    const authCheck = await isRequestAuthorizedForClinicStaff(request);
    if (!authCheck.authorized) {
      return NextResponse.json(
        { success: false, error: authCheck.error || 'Unauthorized' },
        { status: authCheck.status || 401 }
      );
    }

    const targetBizId = authCheck.businessId;
    const targetShopId = authCheck.shopId;

    let packages: VaccinePackage[] = [];

    if (hasServiceAccount() && adminDb) {
      let q: any = adminDb.collection('vaccine_packages');
      if (authCheck.role !== 'super_admin' && targetBizId) {
        q = q.where('businessId', '==', targetBizId);
      }
      const snap = await q.get();
      packages = snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
    } else {
      try {
        const all = await fetchFirestoreCollectionRest('vaccine_packages', authCheck.token);
        packages = all.filter((pkg: any) => {
          if (authCheck.role === 'super_admin') return true;
          return (
            pkg.businessId === targetBizId ||
            pkg.shopId === targetShopId ||
            (!pkg.businessId && !pkg.shopId)
          );
        });
      } catch (err) {
        console.warn('[Vaccine Packages fetch error]', err);
      }
    }

    // Dynamic catalog: return configured packages without injecting hardcoded fake data
    packages.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

    return NextResponse.json({
      success: true,
      packages,
      totalCount: packages.length,
    });
  } catch (error: any) {
    console.error('[Vaccine Packages GET Error]', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch vaccine packages.' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/clinic/vaccine-packages
 * Creates a new vaccine package configuration with total doses and per-dose pricing.
 * Formula: Total Package Price = Total Doses * Price Per Dose
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const authCheck = await isRequestAuthorizedForClinicStaff(request, body);
    if (!authCheck.authorized) {
      return NextResponse.json(
        { success: false, error: authCheck.error || 'Unauthorized' },
        { status: authCheck.status || 401 }
      );
    }

    const {
      name,
      vaccineName,
      species = 'Dog',
      description = '',
      totalDoses,
      pricePerDose,
      intervalDays = 21,
      status = 'Active',
    } = body;

    if (!name?.trim()) {
      return NextResponse.json({ success: false, error: 'Package Name is required.' }, { status: 400 });
    }
    if (!vaccineName?.trim()) {
      return NextResponse.json({ success: false, error: 'Vaccine Name is required.' }, { status: 400 });
    }

    const parsedDoses = parseInt(totalDoses, 10);
    if (isNaN(parsedDoses) || parsedDoses <= 0) {
      return NextResponse.json(
        { success: false, error: 'Total doses in package must be at least 1.' },
        { status: 400 }
      );
    }

    const parsedPricePerDose = parseFloat(pricePerDose);
    if (isNaN(parsedPricePerDose) || parsedPricePerDose < 0) {
      return NextResponse.json(
        { success: false, error: 'Price per dose must be a valid positive number.' },
        { status: 400 }
      );
    }

    // Authoritative calculation on server
    const calculatedPackagePrice = Math.round(parsedDoses * parsedPricePerDose * 100) / 100;
    const nowIso = new Date().toISOString();
    const pkgId = `pkg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const newPackage: VaccinePackage = {
      id: pkgId,
      name: name.trim(),
      vaccineName: vaccineName.trim(),
      species: species || 'All',
      description: description.trim(),
      totalDoses: parsedDoses,
      pricePerDose: parsedPricePerDose,
      packagePrice: calculatedPackagePrice,
      intervalDays: parseInt(intervalDays, 10) || 21,
      status: status || 'Active',
      businessId: authCheck.businessId || 'biz_1791736912551_weqjk8',
      shopId: authCheck.shopId || 'SHOP-D9E8',
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    if (hasServiceAccount() && adminDb) {
      await adminDb.collection('vaccine_packages').doc(pkgId).set(newPackage);
    } else {
      await setFirestoreDocRest('vaccine_packages', pkgId, newPackage, authCheck.token);
    }

    return NextResponse.json({
      success: true,
      message: `Vaccine package "${newPackage.name}" created successfully with ${parsedDoses} doses @ ₹${parsedPricePerDose}/dose (Total: ₹${calculatedPackagePrice}).`,
      package: newPackage,
    });
  } catch (error: any) {
    console.error('[Vaccine Package POST Error]', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create vaccine package.' },
      { status: 500 }
    );
  }
}

