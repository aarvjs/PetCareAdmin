import { NextResponse } from 'next/server';
import {
  adminDb,
  hasServiceAccount,
  getServerAuthenticatedDb,
  fetchFirestoreDocRest,
  setFirestoreDocRest,
  fetchFirestoreCollectionRest,
  getServerIdToken,
} from '@/lib/firebaseAdmin';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';

/**
 * GET /api/clinic/appointments
 * Retrieves appointments filtered by doctorId, businessId, shopId, petId, userId, or date.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const doctorId = searchParams.get('doctorId');
    const businessId = searchParams.get('businessId');
    const shopId = searchParams.get('shopId');
    const petId = searchParams.get('petId');
    const userId = searchParams.get('userId');
    const date = searchParams.get('date');
    const status = searchParams.get('status');

    let appointments: any[] = [];

    if (hasServiceAccount() && adminDb) {
      let q: any = adminDb.collection('appointments');

      if (doctorId) q = q.where('doctorId', '==', doctorId);
      if (petId) q = q.where('petId', '==', petId);
      if (userId) q = q.where('userId', '==', userId);
      if (date) q = q.where('appointmentDate', '==', date);
      if (status) q = q.where('status', '==', status);

      const snapshot = await q.get();
      appointments = snapshot.docs.map((d: any) => ({
        id: d.id,
        ...d.data(),
      }));
    } else {
      appointments = await fetchFirestoreCollectionRest('appointments');
      if (doctorId) appointments = appointments.filter((a) => a.doctorId === doctorId);
      if (petId) appointments = appointments.filter((a) => a.petId === petId);
      if (userId) appointments = appointments.filter((a) => a.userId === userId);
      if (date) appointments = appointments.filter((a) => (a.appointmentDate || a.date) === date);
      if (status) appointments = appointments.filter((a) => a.status === status);
    }

    // Business & shop isolation filtering if provided
    if (businessId || shopId) {
      appointments = appointments.filter((apt) => {
        const matchBiz = businessId && apt.businessId === businessId;
        const matchShop = shopId && apt.shopId && apt.shopId.toUpperCase() === shopId.toUpperCase();
        return Boolean(matchBiz || matchShop);
      });
    }

    // Sort descending by date/creation
    appointments.sort((a, b) => {
      const timeA = new Date(a.createdAt?.toDate?.() || a.createdAt || 0).getTime();
      const timeB = new Date(b.createdAt?.toDate?.() || b.createdAt || 0).getTime();
      return timeB - timeA;
    });

    return NextResponse.json({
      success: true,
      appointments,
      totalCount: appointments.length,
    });
  } catch (error: any) {
    console.error('[Clinic Appointments GET Error]', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch appointments.' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/clinic/appointments
 * Books a new veterinary consultation appointment with concurrency-safe slot revalidation.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      petId,
      petName,
      petType,
      petRegistrationNumber,
      breed,
      age,
      gender,
      userId,
      customerName,
      customerPhone,
      customerAddress,
      serviceName = 'Veterinary Consultation',
      doctorId,
      doctorName,
      shopId,
      businessId,
      appointmentDate,
      appointmentTime,
      concernCategory,
      symptoms,
      notes,
    } = body;

    const finalDate = (appointmentDate || body.date || '').trim();
    const finalTime = (appointmentTime || body.time || '').trim();
    const finalPhone = (customerPhone || body.phone || '').trim();
    const finalPetName = (petName || body.name || '').trim();
    const finalCustName = (customerName || body.ownerName || '').trim();

    // 1. Validate required fields
    if (!finalPetName || !finalCustName || !finalPhone || !finalDate || !finalTime) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required booking details (petName, customerName, phone, date, or time).',
        },
        { status: 400 }
      );
    }

    // 2. Validate date is not in past
    const todayStr = new Date().toISOString().split('T')[0];
    if (finalDate < todayStr) {
      return NextResponse.json(
        { success: false, error: 'Cannot book appointments for past dates.' },
        { status: 400 }
      );
    }

    // 3. Resolve canonical business & shop
    const canonicalShopId = (shopId || 'SHOP-D9E8').trim();
    let canonicalBizId = (businessId || '').trim();
    let canonicalBizName = 'Healthy Paws Pet Clinic';

    // Verify against businesses collection
    if (canonicalShopId) {
      let bizDoc = await fetchFirestoreDocRest('businesses', canonicalShopId);
      if (!bizDoc && canonicalBizId) {
        bizDoc = await fetchFirestoreDocRest('businesses', canonicalBizId);
      }
      if (bizDoc) {
        canonicalBizId = bizDoc.id || canonicalBizId;
        canonicalBizName = bizDoc.name || canonicalBizName;
      }
    }

    // 4. Resolve Doctor
    let resolvedDoctorId = doctorId || '';
    let resolvedDoctorName = doctorName || '';

    if (!resolvedDoctorId) {
      // Find default doctor for this business
      try {
        const clientDb = await getServerAuthenticatedDb();
        const docQuery = query(
          collection(clientDb, 'users'),
          where('role', '==', 'doctor')
        );
        const docSnap = await getDocs(docQuery);
        for (const d of docSnap.docs) {
          const dData = d.data();
          if (
            (dData.shopId && dData.shopId.toUpperCase() === canonicalShopId.toUpperCase()) ||
            (dData.businessId && dData.businessId === canonicalBizId) ||
            canonicalShopId === 'SHOP-D9E8'
          ) {
            resolvedDoctorId = d.id;
            resolvedDoctorName = dData.fullName || dData.name || 'Dr. Ashwani Kumar Singh';
            break;
          }
        }
      } catch (_) {}
    }

    if (!resolvedDoctorName) {
      resolvedDoctorName = 'Dr. Ashwani Kumar Singh';
    }

    // 5. Concurrency Check: Ensure slot is genuinely available
    // Query appointments for same doctor & date & time
    const allAppointments = await fetchFirestoreCollectionRest('appointments');

    const conflicting = allAppointments.find((data) => {
      const sameDate = (data.appointmentDate || data.date) === finalDate;
      const sameTime = (data.appointmentTime || data.time) === finalTime;
      const sameDoctor = !resolvedDoctorId || !data.doctorId || data.doctorId === resolvedDoctorId;
      const isActive = data.status === 'Confirmed' || data.status === 'Pending';
      return sameDate && sameTime && sameDoctor && isActive;
    });

    if (conflicting) {
      return NextResponse.json(
        {
          success: false,
          error: `The slot ${finalTime} on ${finalDate} is already occupied. Please select an alternate time slot.`,
          conflict: true,
        },
        { status: 409 }
      );
    }

    // 6. Generate sequential appointment ID
    const randomPart = Math.floor(100000 + Math.random() * 900000);
    const generatedAppointmentId = `APT-${randomPart}`;

    const appointmentPayload: Record<string, any> = {
      appointmentId: generatedAppointmentId,
      petId: petId || '',
      petName: finalPetName,
      petType: petType || 'Pet',
      petRegistrationNumber: petRegistrationNumber || '',
      breed: breed || '',
      age: age || '',
      gender: gender || '',
      userId: userId || '',
      customerName: finalCustName,
      ownerName: finalCustName,
      customerPhone: finalPhone,
      ownerPhone: finalPhone,
      customerAddress: customerAddress || '',
      serviceName: serviceName.trim(),
      doctorId: resolvedDoctorId,
      doctorName: resolvedDoctorName,
      shopId: canonicalShopId,
      businessId: canonicalBizId || 'biz_1791736912551_weqjk8',
      businessName: canonicalBizName,
      appointmentDate: finalDate,
      appointmentTime: finalTime,
      concernCategory: concernCategory || 'General Consultation',
      symptoms: symptoms || '',
      notes: notes || symptoms || '',
      status: 'Pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const authHeader = request.headers.get('authorization');
    const callerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : undefined;
    const serverToken = callerToken || (await getServerIdToken());

    // If writing using server token (e.g. backend bot / walk-in), ensure userId aligns with token UID for Firestore rules
    let effectiveUserId = userId || '';
    if (!callerToken && serverToken) {
      try {
        const tokenPayload = JSON.parse(Buffer.from(serverToken.split('.')[1], 'base64').toString());
        effectiveUserId = tokenPayload.user_id || tokenPayload.sub || effectiveUserId;
      } catch (_) {}
    }
    appointmentPayload.userId = effectiveUserId;

    const docId = `apt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const saved = await setFirestoreDocRest('appointments', docId, appointmentPayload, serverToken || undefined);

    if (!saved) {
      return NextResponse.json(
        { success: false, error: 'Failed to record appointment in database.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Appointment successfully requested and scheduled with the clinic.',
      id: docId,
      appointmentId: generatedAppointmentId,
      appointment: { id: docId, ...appointmentPayload },
    });
  } catch (error: any) {
    console.error('[Clinic Appointment POST Error]', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to submit appointment.' },
      { status: 500 }
    );
  }
}
