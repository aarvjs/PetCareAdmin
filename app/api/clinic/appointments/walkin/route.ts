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
import { collection, query, where, getDocs, doc, setDoc, serverTimestamp } from 'firebase/firestore';

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  let raw10 = digits;
  if (digits.length === 12 && digits.startsWith('91')) {
    raw10 = digits.substring(2);
  } else if (digits.length === 11 && digits.startsWith('0')) {
    raw10 = digits.substring(1);
  } else if (digits.length > 10) {
    raw10 = digits.slice(-10);
  }
  return `+91${raw10}`;
}

/**
 * POST /api/clinic/appointments/walkin
 * Books a walk-in appointment directly from the Doctor Panel, registering a pet if needed,
 * and linking to the customer's phone number and verified UID if registered.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      customerName,
      customerPhone,
      customerAddress = '',
      existingPetId,
      newPet,
      serviceName = 'Veterinary Consultation',
      servicePrice,
      consultationFee,
      medicineCharges = 0,
      discount = 0,
      totalAmount,
      paymentStatus = 'Pending',
      paymentMethod = 'Cash',
      administeredItems = [],
      vitals,
      doctorId,
      doctorName,
      appointmentDate,
      appointmentTime,
      concernCategory = 'General Consultation',
      symptoms = '',
      notes = '',
      shopId = 'SHOP-D9E8',
      businessId = 'biz_1791736912551_weqjk8',
    } = body;

    // 1. Validation of essential booking fields
    if (!customerName?.trim() || !customerPhone?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Patient Owner Name and Mobile Number are required.' },
        { status: 400 }
      );
    }

    if (!appointmentDate?.trim() || !appointmentTime?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Appointment Date and Time Slot are required.' },
        { status: 400 }
      );
    }

    const normalizedPhone = normalizePhone(customerPhone);
    if (normalizedPhone.length !== 13) {
      return NextResponse.json(
        { success: false, error: 'Please provide a valid 10-digit mobile number.' },
        { status: 400 }
      );
    }

    // 2. Canonical Business Resolution
    let canonicalShopId = (shopId || 'SHOP-D9E8').trim();
    let canonicalBizId = (businessId || 'biz_1791736912551_weqjk8').trim();
    let canonicalBizName = 'Healthy Paws Pet Clinic';

    try {
      const bizDoc = await fetchFirestoreDocRest('businesses', canonicalBizId);
      if (bizDoc) {
        canonicalBizName = bizDoc.name || canonicalBizName;
        canonicalShopId = bizDoc.shopId || canonicalShopId;
      }
    } catch (_) {}

    // 3. Check if matching registered user account exists in `users`
    let existingUser: any = null;
    const phoneVariants = [
      normalizedPhone,
      normalizedPhone.substring(3), // 10 digits
      normalizedPhone.substring(1), // 91XXXXXXXXXX
    ];

    if (hasServiceAccount() && adminDb) {
      for (const p of phoneVariants) {
        const snap = await adminDb.collection('users').where('phoneNumber', '==', p).limit(1).get();
        if (!snap.empty) {
          existingUser = { uid: snap.docs[0].id, ...snap.docs[0].data() };
          break;
        }
      }
    } else {
      try {
        const clientDb = await getServerAuthenticatedDb();
        for (const p of phoneVariants) {
          const q = query(collection(clientDb, 'users'), where('phoneNumber', '==', p));
          const snap = await getDocs(q);
          if (!snap.empty) {
            existingUser = { uid: snap.docs[0].id, ...snap.docs[0].data() };
            break;
          }
        }
      } catch (_) {}
    }

    const isUnclaimed = !existingUser;
    const finalUserId = existingUser ? existingUser.uid : `unclaimed_${normalizedPhone}`;

    // 4. Slot Concurrency Check (Prevent double booking before any database writes)
    const allAppointments = await fetchFirestoreCollectionRest('appointments');
    const conflict = allAppointments.find((a) => {
      const sameDate = (a.appointmentDate || a.date) === appointmentDate.trim();
      const sameTime = (a.appointmentTime || a.time) === appointmentTime.trim();
      const sameDoctor = !doctorId || !a.doctorId || a.doctorId === doctorId;
      const isActive = a.status === 'Confirmed' || a.status === 'Pending';
      return sameDate && sameTime && sameDoctor && isActive;
    });

    if (conflict) {
      return NextResponse.json(
        {
          success: false,
          error: `The slot ${appointmentTime} on ${appointmentDate} is already booked. Please choose an alternate slot.`,
          conflict: true,
        },
        { status: 409 }
      );
    }

    // 5. Resolve Pet (Select Existing OR Register New)
    let finalPet: any = null;

    if (existingPetId) {
      // Doctor selected an existing pet for this owner
      let petDoc: any = null;
      if (hasServiceAccount() && adminDb) {
        const pSnap = await adminDb.collection('pets').doc(existingPetId).get();
        if (pSnap.exists) petDoc = { id: pSnap.id, ...pSnap.data() };
      } else {
        petDoc = await fetchFirestoreDocRest('pets', existingPetId);
      }

      if (!petDoc) {
        return NextResponse.json(
          { success: false, error: 'Selected pet record could not be found.' },
          { status: 404 }
        );
      }

      // Ensure pet belongs to the same business
      if (
        (petDoc.businessId && petDoc.businessId !== canonicalBizId) &&
        (petDoc.shopId && petDoc.shopId.toUpperCase() !== canonicalShopId.toUpperCase())
      ) {
        return NextResponse.json(
          { success: false, error: 'Access Denied: Pet belongs to a different clinic business.' },
          { status: 403 }
        );
      }

      finalPet = petDoc;
    } else {
      // Doctor is registering a new pet
      if (!newPet || !newPet.name?.trim()) {
        return NextResponse.json(
          { success: false, error: 'Pet Name is required for registration.' },
          { status: 400 }
        );
      }
      if (!newPet.species?.trim() || !newPet.breed?.trim()) {
        return NextResponse.json(
          { success: false, error: 'Pet Species and Breed are required.' },
          { status: 400 }
        );
      }
      if (!newPet.gender?.trim()) {
        return NextResponse.json(
          { success: false, error: 'Pet Gender is required.' },
          { status: 400 }
        );
      }

      // Generate or use doctor custom sequential registration number
      const prefix = (newPet.registrationPrefix || 'HPPC/P/').trim();
      let assignedRegNumber = (newPet.registrationNumber || '').trim();

      if (!assignedRegNumber) {
        if (hasServiceAccount() && adminDb) {
          const counterRef = adminDb.collection('counters').doc(`pets_${canonicalBizId}`);
          await adminDb.runTransaction(async (transaction) => {
            const counterDoc = await transaction.get(counterRef);
            let lastNumber = 0;
            if (counterDoc.exists) {
              lastNumber = counterDoc.data()?.lastNumber || 0;
            }
            const nextNumber = lastNumber + 1;
            assignedRegNumber = `${prefix}${String(nextNumber).padStart(2, '0')}`;

            transaction.set(
              counterRef,
              {
                businessId: canonicalBizId,
                shopId: canonicalShopId,
                prefix,
                lastNumber: nextNumber,
                updatedAt: new Date().toISOString(),
              },
              { merge: true }
            );
          });
        } else {
          let lastNumber = 0;
          try {
            const counterDoc = await fetchFirestoreDocRest('counters', `pets_${canonicalBizId}`);
            if (counterDoc && typeof counterDoc.lastNumber === 'number') {
              lastNumber = counterDoc.lastNumber;
            }
          } catch (_) {}

          const nextNumber = lastNumber + 1;
          assignedRegNumber = `${prefix}${String(nextNumber).padStart(2, '0')}`;

          try {
            await setFirestoreDocRest('counters', `pets_${canonicalBizId}`, {
              businessId: canonicalBizId,
              shopId: canonicalShopId,
              prefix,
              lastNumber: nextNumber,
              updatedAt: new Date().toISOString(),
            });
          } catch (_) {}
        }
      } else {
        // Custom registration number provided by doctor
        // If it ends with sequential digits, update counter if higher
        const match = assignedRegNumber.match(/(\d+)$/);
        if (match) {
          const num = parseInt(match[1], 10);
          try {
            const counterDoc = await fetchFirestoreDocRest('counters', `pets_${canonicalBizId}`);
            const currentLast = (counterDoc && typeof counterDoc.lastNumber === 'number') ? counterDoc.lastNumber : 0;
            if (num > currentLast) {
              await setFirestoreDocRest('counters', `pets_${canonicalBizId}`, {
                businessId: canonicalBizId,
                shopId: canonicalShopId,
                prefix,
                lastNumber: num,
                updatedAt: new Date().toISOString(),
              });
            }
          } catch (_) {}
        }
      }

      const newPetId = `pet_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const petPayload = {
        id: newPetId,
        registrationNumber: assignedRegNumber,
        ownerId: finalUserId,
        ownerName: customerName.trim(),
        ownerAddress: customerAddress.trim(),
        contactNumber: normalizedPhone,
        name: newPet.name.trim(),
        species: newPet.species.trim(),
        gender: newPet.gender.trim(),
        coatColour: (newPet.coatColour || '').trim(),
        breed: newPet.breed.trim(),
        dob: (newPet.dob || '').trim(),
        age: (newPet.age || '').trim(),
        photoUrl: newPet.photoUrl || '',
        storagePath: newPet.storagePath || '',
        businessId: canonicalBizId,
        shopId: canonicalShopId,
        status: 'Active',
        isUnclaimed,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        auditHistory: [
          {
            action: 'registered_by_doctor',
            registrationNumber: assignedRegNumber,
            registeredByDoctor: doctorName || 'Attending Doctor',
            timestamp: new Date().toISOString(),
          },
        ],
      };

      await setFirestoreDocRest('pets', newPetId, petPayload);
      finalPet = petPayload;
    }

    // 6. Generate Appointment
    const randomPart = Math.floor(100000 + Math.random() * 900000);
    const generatedAppointmentId = `APT-${randomPart}`;
    const docId = `apt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const effectiveConsultFee = typeof consultationFee === 'number'
      ? consultationFee
      : parseFloat(consultationFee) || (typeof servicePrice === 'number' ? servicePrice : parseFloat(servicePrice) || 0);

    const effectiveMedCharges = typeof medicineCharges === 'number' ? medicineCharges : parseFloat(medicineCharges) || 0;
    const effectiveDiscount = typeof discount === 'number' ? discount : parseFloat(discount) || 0;
    const calculatedTotal = typeof totalAmount === 'number'
      ? totalAmount
      : Math.max(0, effectiveConsultFee + effectiveMedCharges - effectiveDiscount);

    const appointmentPayload = {
      appointmentId: generatedAppointmentId,
        petId: finalPet.id,
        petName: finalPet.name,
        petType: finalPet.species,
        petRegistrationNumber: finalPet.registrationNumber || '',
        breed: finalPet.breed || '',
        age: finalPet.age || '',
        gender: finalPet.gender || '',
        userId: finalUserId,
        customerName: customerName.trim(),
        ownerName: customerName.trim(),
        customerPhone: normalizedPhone,
        ownerPhone: normalizedPhone,
        customerAddress: customerAddress.trim(),
        serviceName: serviceName.trim(),
        servicePrice: effectiveConsultFee,
        consultationFee: effectiveConsultFee,
        medicineCharges: effectiveMedCharges,
        discount: effectiveDiscount,
        totalAmount: calculatedTotal,
        paymentStatus: paymentStatus || 'Pending',
        paymentMethod: paymentMethod || 'Cash',
        isPaid: paymentStatus === 'Paid',
        administeredItems: Array.isArray(administeredItems) ? administeredItems : [],
        vitals: vitals || {},
        doctorId: doctorId || '',
        doctorName: doctorName || 'Dr. Ashwani Kumar Singh',
        shopId: canonicalShopId,
        businessId: canonicalBizId,
        businessName: canonicalBizName,
        appointmentDate: appointmentDate.trim(),
        appointmentTime: appointmentTime.trim(),
        concernCategory: concernCategory.trim(),
        symptoms: (symptoms || '').trim(),
        notes: (notes || '').trim(),
        status: 'Confirmed', // Confirmed directly by doctor
        isWalkIn: true,
        isUnclaimed,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await setFirestoreDocRest('appointments', docId, appointmentPayload);

      // If medicines/injections were administered, also update pet's clinical treatments array
      if (Array.isArray(administeredItems) && administeredItems.length > 0) {
        try {
          const treatmentRecord = {
            id: `treat_${docId}`,
            appointmentId: docId,
            date: appointmentDate.trim(),
            diagnosis: concernCategory || symptoms || 'Walk-in Consultation',
            doctorName: doctorName || 'Dr. Ashwani Kumar Singh',
            administeredItems,
            totalAmount: calculatedTotal,
            createdAt: new Date().toISOString(),
          };
          const currentTreatments = Array.isArray(finalPet.treatments) ? finalPet.treatments : [];
          await setFirestoreDocRest('pets', finalPet.id, {
            treatments: [...currentTreatments, treatmentRecord],
            updatedAt: new Date().toISOString(),
          });
        } catch (treatErr) {
          console.warn('[Walk-in Booking] Pet treatment sync warning:', treatErr);
        }
      }

    return NextResponse.json({
      success: true,
      message: 'Walk-in appointment booked and confirmed successfully!',
      id: docId,
      appointmentId: generatedAppointmentId,
      appointment: { id: docId, ...appointmentPayload },
      pet: finalPet,
      isExistingUser: Boolean(existingUser),
    });
  } catch (error: any) {
    console.error('[Walk-in Booking Error]', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to book walk-in appointment.' },
      { status: 500 }
    );
  }
}
