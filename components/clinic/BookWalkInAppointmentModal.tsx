'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import {
  Plus,
  User,
  Dog,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  UploadCloud,
  Loader2,
  Check,
  Trash2,
  Receipt,
  Hash,
  Edit3,
} from 'lucide-react';
import { useAuth } from '@/lib/authContext';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query } from 'firebase/firestore';
import {
  uploadFileToFirebaseStorage,
  getPetPhotoStoragePath,
  validateImageFile,
} from '@/lib/storage';
import { generateSlotsForDay, DEFAULT_WEEKLY_SCHEDULE, DaySchedule } from '@/lib/clinicSchedule';
import { safeFetchJson } from '@/lib/safeFetch';

interface ExistingPet {
  id: string;
  name: string;
  species: string;
  breed: string;
  gender: string;
  dob: string;
  age?: string;
  coatColour?: string;
  registrationNumber?: string;
  photoUrl?: string;
}

interface ServiceOption {
  id: string;
  name: string;
  category: string;
  price: number;
  duration: string;
}

export interface AdministeredMedicineItem {
  id: string;
  medicineId?: string;
  name: string;
  type: string;
  dosage: string;
  quantity: string;
  unit: string;
  charge: string;
}

interface BookWalkInAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (newAppointment: any) => void;
}

export const BookWalkInAppointmentModal: React.FC<BookWalkInAppointmentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { profile, user, business } = useAuth();

  const targetBizId = profile?.businessId || business?.id || 'biz_1791736912551_weqjk8';
  const targetShopId = profile?.shopId || business?.shopId || 'SHOP-D9E8';
  const doctorUid = profile?.uid || user?.uid || '';
  const doctorFullName = profile?.fullName || (profile as any)?.name || 'Dr. Ashwani Kumar Singh';

  // Step 1: Owner Info & Lookup
  const [phone, setPhone] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [ownerAddress, setOwnerAddress] = useState('');
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [lookupResult, setLookupResult] = useState<{
    userExists: boolean;
    user: any;
    pets: ExistingPet[];
  } | null>(null);

  // Step 2: Pet Selection or New Pet
  const [selectedPetId, setSelectedPetId] = useState<string>('new');
  const [petName, setPetName] = useState('');
  const [petSpecies, setPetSpecies] = useState('Dog');
  const [petBreed, setPetBreed] = useState('');
  const [petGender, setPetGender] = useState('Male');
  const [petDob, setPetDob] = useState('');
  const [petAge, setPetAge] = useState('');
  const [petCoatColour, setPetCoatColour] = useState('');
  const [petPhotoUrl, setPetPhotoUrl] = useState('');
  const [petPhotoStoragePath, setPetPhotoStoragePath] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Registration Number & Prefix (Editable)
  const [regPrefix, setRegPrefix] = useState('HPPC/P/');
  const [regNumber, setRegNumber] = useState('');
  const [isEditingRegNumber, setIsEditingRegNumber] = useState(false);

  // Step 3: Service & Consultation
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [selectedService, setSelectedService] = useState<ServiceOption | null>(null);
  const [consultationFee, setConsultationFee] = useState<string>('500');
  const [appointmentDate, setAppointmentDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('');
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [concernCategory, setConcernCategory] = useState('General Consultation');
  const [symptoms, setSymptoms] = useState('');
  const [notes, setNotes] = useState('');

  // Step 4: Administered Medicines & Injections (Inventory & Custom)
  const [administeredItems, setAdministeredItems] = useState<AdministeredMedicineItem[]>([]);
  const [inventoryList, setInventoryList] = useState<any[]>([]);
  const [isLoadingInventory, setIsLoadingInventory] = useState(false);

  // Step 5: Billing & Payment
  const [discount, setDiscount] = useState<string>('0');
  const [paymentStatus, setPaymentStatus] = useState<'Paid' | 'Pending'>('Paid');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'UPI' | 'Card' | 'Online'>('Cash');

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // 1. Fetch next expected Pet Registration Number from API
  useEffect(() => {
    if (!isOpen) return;
    fetch(`/api/pets/next-reg-number?businessId=${encodeURIComponent(targetBizId)}&shopId=${encodeURIComponent(targetShopId)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data?.success) {
          const pref = data.prefix || 'HPPC/P/';
          setRegPrefix(pref);
          if (!regNumber) {
            setRegNumber(data.nextRegistrationNumber || `${pref}01`);
          }
        }
      })
      .catch((err) => console.warn('[Walk-in Modal] Reg number preview warning:', err));
  }, [isOpen, targetBizId, targetShopId]);

  // 2. Load active services live from Firestore
  useEffect(() => {
    if (!isOpen) return;
    const servicesRef = collection(db, 'services');
    const unsubscribe = onSnapshot(
      query(servicesRef),
      (snap) => {
        const list: ServiceOption[] = [];
        snap.docs.forEach((d) => {
          const data = d.data();
          if (data.status !== 'Inactive') {
            const matchesBiz = !data.businessId || data.businessId === targetBizId;
            const matchesShop = !data.shopId || data.shopId.toUpperCase() === targetShopId.toUpperCase();
            if (matchesBiz || matchesShop) {
              list.push({
                id: d.id,
                name: data.name || 'Veterinary Consultation',
                category: data.category || 'Consultation',
                price: typeof data.price === 'number' ? data.price : parseFloat(data.price) || 0,
                duration: data.duration || '30 mins',
              });
            }
          }
        });

        setServices(list);
        if (list.length > 0 && !selectedService) {
          setSelectedService(list[0]);
          setConsultationFee(String(list[0].price || 500));
        }
      },
      (err) => {
        console.error('Error fetching services for walkin:', err);
      }
    );
    return () => unsubscribe();
  }, [isOpen, targetBizId, targetShopId]);

  // 3. Load clinic inventory for medicines & injections
  useEffect(() => {
    if (!isOpen) return;
    setIsLoadingInventory(true);
    fetch('/api/clinic/inventory', {
      headers: {
        'Content-Type': 'application/json',
        'x-user-uid': profile?.uid || user?.uid || '',
      },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data?.success && Array.isArray(data.items)) {
          setInventoryList(data.items);
        }
      })
      .catch((err) => console.warn('[Walk-in Modal] Inventory load warning:', err))
      .finally(() => setIsLoadingInventory(false));
  }, [isOpen, profile, user]);

  // 4. Compute available time slots whenever appointmentDate changes
  useEffect(() => {
    if (!appointmentDate) return;

    const dateObj = new Date(appointmentDate + 'T00:00:00');
    const dayNames: DaySchedule['dayOfWeek'][] = [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ];
    const dayName = dayNames[dateObj.getDay()];

    const dayConfig: DaySchedule = DEFAULT_WEEKLY_SCHEDULE.find((d) => d.dayOfWeek === dayName) || {
      dayOfWeek: dayName,
      isEnabled: true,
      startTime: '10:00',
      endTime: '20:00',
      slotDurationMinutes: 30,
      breaks: [{ name: 'Lunch Break', startTime: '13:00', endTime: '14:00' }],
    };

    const unsubscribe = onSnapshot(collection(db, 'appointments'), (snap) => {
      const existing = snap.docs.map((d) => ({
        id: d.id,
        appointmentDate: d.data().appointmentDate || d.data().date,
        appointmentTime: d.data().appointmentTime || d.data().time,
        status: d.data().status,
        doctorId: d.data().doctorId,
      }));

      const available = generateSlotsForDay(dayConfig, existing, appointmentDate);
      setAvailableSlots(available);

      if (available.length > 0 && (!selectedTimeSlot || !available.includes(selectedTimeSlot))) {
        setSelectedTimeSlot(available[0]);
      } else if (available.length === 0) {
        setSelectedTimeSlot('');
      }
    });

    return () => unsubscribe();
  }, [appointmentDate]);

  // 5. Automatic Patient Lookup on typing 10 digits
  useEffect(() => {
    const cleanDigits = phone.replace(/\D/g, '');
    const isTenOrTwelve =
      cleanDigits.length === 10 || (cleanDigits.length === 12 && cleanDigits.startsWith('91'));

    if (!isTenOrTwelve) {
      setLookupResult(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLookingUp(true);
      setFormError(null);
      try {
        let authToken: string | undefined = undefined;
        if (user) {
          try {
            authToken = await user.getIdToken();
          } catch {
            // ignore
          }
        }

        const { data } = await safeFetchJson<{
          success: boolean;
          userExists: boolean;
          user: any;
          pets: ExistingPet[];
          error?: string;
        }>(`/api/clinic/patient/lookup?phone=${encodeURIComponent(cleanDigits)}&shopId=${encodeURIComponent(targetShopId)}&businessId=${encodeURIComponent(targetBizId)}`, {
          headers: {
            ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
          },
        });

        if (data && data.success) {
          setLookupResult({
            userExists: data.userExists,
            user: data.user,
            pets: data.pets || [],
          });

          if (data.user?.fullName && !ownerName) {
            setOwnerName(data.user.fullName);
          }
          if (data.user?.address && !ownerAddress) {
            setOwnerAddress(data.user.address);
          }

          if (data.pets && data.pets.length > 0) {
            setSelectedPetId(data.pets[0].id);
          } else {
            setSelectedPetId('new');
          }
        }
      } catch (err) {
        console.warn('Patient lookup warning:', err);
      } finally {
        setIsLookingUp(false);
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [phone, targetBizId, targetShopId]);

  // 6. Handle Pet Photo Upload
  const handlePhotoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateImageFile(file);
    if (!validation.valid) {
      setFormError(validation.error || 'Invalid photo file.');
      return;
    }

    setUploadingPhoto(true);
    setUploadProgress(10);
    setFormError(null);

    try {
      const tempPetId = `pet_${Date.now()}`;
      const storagePath = getPetPhotoStoragePath(targetBizId, tempPetId, file.name);

      const result = await uploadFileToFirebaseStorage(
        file,
        storagePath,
        (prog) => setUploadProgress(prog.progressPercent)
      );

      setPetPhotoUrl(result.downloadUrl);
      setPetPhotoStoragePath(storagePath);
    } catch (err: any) {
      console.error('Pet photo upload error:', err);
      setFormError(err.message || 'Failed to upload pet photo.');
    } finally {
      setUploadingPhoto(false);
      setUploadProgress(0);
    }
  };

  // Medicine Item management
  const handleAddMedicineItem = () => {
    const newItem: AdministeredMedicineItem = {
      id: `med_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: '',
      type: 'Injection',
      dosage: '',
      quantity: '1',
      unit: 'dose',
      charge: '0',
    };
    setAdministeredItems((prev) => [...prev, newItem]);
  };

  const handleRemoveMedicineItem = (id: string) => {
    setAdministeredItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleUpdateMedicineItem = (id: string, updates: Partial<AdministeredMedicineItem>) => {
    setAdministeredItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  };

  const handleSelectInventoryItem = (itemId: string, selectedInvId: string) => {
    const inv = inventoryList.find((i) => i.id === selectedInvId);
    if (!inv) return;

    const isInjection =
      inv.category?.toLowerCase().includes('inject') ||
      inv.route?.toLowerCase().includes('inject') ||
      inv.name?.toLowerCase().includes('inj');

    handleUpdateMedicineItem(itemId, {
      medicineId: inv.id,
      name: inv.name,
      type: isInjection ? 'Injection' : 'Tablet',
      dosage: inv.dosage || inv.strength || '',
      unit: inv.unit || 'unit',
      charge: String(inv.sellingPrice ?? inv.price ?? 0),
    });
  };

  // Billing calculation
  const consultNum = Math.max(0, parseFloat(consultationFee) || 0);
  const totalMedsCharge = administeredItems.reduce((acc, item) => {
    const charge = parseFloat(item.charge) || 0;
    const qty = parseFloat(item.quantity) || 1;
    return acc + charge * qty;
  }, 0);
  const discountNum = Math.max(0, parseFloat(discount) || 0);
  const grandTotal = Math.max(0, consultNum + totalMedsCharge - discountNum);

  // Form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSuccessMessage(null);

    const cleanDigits = phone.replace(/\D/g, '');
    if (cleanDigits.length < 10) {
      setFormError('Please enter a valid 10-digit mobile number for the pet parent.');
      return;
    }

    if (!ownerName.trim()) {
      setFormError('Pet Parent / Owner Full Name is required.');
      return;
    }

    if (selectedPetId === 'new') {
      if (!petName.trim()) {
        setFormError('Pet Name is required.');
        return;
      }
      if (!petSpecies.trim()) {
        setFormError('Pet Species is required.');
        return;
      }
      if (!petBreed.trim()) {
        setFormError('Pet Breed is required.');
        return;
      }
      if (!petGender.trim()) {
        setFormError('Pet Gender is required.');
        return;
      }
    }

    if (!appointmentDate.trim() || !selectedTimeSlot.trim()) {
      setFormError('Please select a consultation date and available time slot.');
      return;
    }

    setIsSubmitting(true);

    try {
      const bookingPayload = {
        customerName: ownerName.trim(),
        customerPhone: phone.trim(),
        customerAddress: ownerAddress.trim(),
        existingPetId: selectedPetId !== 'new' ? selectedPetId : undefined,
        newPet:
          selectedPetId === 'new'
            ? {
                name: petName.trim(),
                species: petSpecies.trim(),
                breed: petBreed.trim(),
                gender: petGender.trim(),
                dob: petDob.trim(),
                age: petAge.trim(),
                coatColour: petCoatColour.trim(),
                photoUrl: petPhotoUrl.trim(),
                storagePath: petPhotoStoragePath.trim(),
                registrationPrefix: regPrefix.trim(),
                registrationNumber: regNumber.trim(),
              }
            : undefined,
        serviceName: selectedService?.name || 'Veterinary Consultation',
        servicePrice: consultNum,
        consultationFee: consultNum,
        medicineCharges: totalMedsCharge,
        discount: discountNum,
        totalAmount: grandTotal,
        paymentStatus,
        paymentMethod,
        administeredItems: administeredItems.filter((i) => i.name.trim()),
        doctorId: doctorUid,
        doctorName: doctorFullName,
        appointmentDate: appointmentDate.trim(),
        appointmentTime: selectedTimeSlot.trim(),
        concernCategory: concernCategory.trim(),
        symptoms: symptoms.trim(),
        notes: notes.trim(),
        shopId: targetShopId,
        businessId: targetBizId,
      };

      let authToken: string | undefined = undefined;
      if (user) {
        try {
          authToken = await user.getIdToken();
        } catch {
          // ignore
        }
      }

      const { data, error } = await safeFetchJson<{
        success: boolean;
        error?: string;
        message?: string;
        appointment?: any;
        conflict?: boolean;
      }>('/api/clinic/appointments/walkin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify(bookingPayload),
      });

      if (error || !data?.success) {
        setFormError(error || data?.error || 'Failed to book appointment. Please try again.');
        return;
      }

      setSuccessMessage(data.message || 'Walk-in appointment booked and confirmed successfully!');

      if (onSuccess && data.appointment) {
        onSuccess(data.appointment);
      }

      setTimeout(() => {
        handleClose();
      }, 1400);
    } catch (err: any) {
      console.error('Walk-in booking error:', err);
      setFormError(err.message || 'An unexpected error occurred while booking the appointment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setPhone('');
    setOwnerName('');
    setOwnerAddress('');
    setLookupResult(null);
    setSelectedPetId('new');
    setPetName('');
    setPetSpecies('Dog');
    setPetBreed('');
    setPetGender('Male');
    setPetDob('');
    setPetAge('');
    setPetCoatColour('');
    setPetPhotoUrl('');
    setPetPhotoStoragePath('');
    setRegNumber('');
    setIsEditingRegNumber(false);
    setAdministeredItems([]);
    setConsultationFee('500');
    setDiscount('0');
    setPaymentStatus('Paid');
    setPaymentMethod('Cash');
    setFormError(null);
    setSuccessMessage(null);
    onClose();
  };

  const selectedExistingPet = lookupResult?.pets?.find((p) => p.id === selectedPetId);

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Book Appointment for Walk-in Patient"
      subtitle="Register or select walk-in patient, customize consultation fee, administer medicines, and manage billing."
      maxWidth="5xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6 text-xs text-[#25242A]">
        {/* Error State */}
        {formError && (
          <div className="flex items-start gap-2.5 p-3.5 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
            <div className="flex-1 font-medium">{formError}</div>
          </div>
        )}

        {/* Success State */}
        {successMessage && (
          <div className="flex items-center gap-2.5 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <div className="flex-1 font-bold">{successMessage}</div>
          </div>
        )}

        {/* ============================================================== */}
        {/* 1. PATIENT / OWNER DETAILS */}
        {/* ============================================================== */}
        <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl p-4 md:p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2.5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#0284C7]/10 flex items-center justify-center text-[#0284C7] font-bold">
                1
              </div>
              <h4 className="text-sm font-bold text-[#0F172A] uppercase tracking-wide">
                Patient / Pet Parent Details
              </h4>
            </div>

            {lookupResult && (
              <span
                className={`text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 ${
                  lookupResult.userExists
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-amber-100 text-amber-800 border border-amber-300'
                }`}
              >
                <Sparkles className="w-3 h-3" />
                {lookupResult.userExists
                  ? 'App User Verified (Auto-links to account)'
                  : 'New Offline Walk-In (Claimable via OTP later)'}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Mobile Number */}
            <div>
              <label className="font-bold block mb-1 text-[#334155]">
                Mobile Number <span className="text-red-500">*</span>
              </label>
              <div className="flex rounded-xl overflow-hidden border border-[#CBD5E1] focus-within:border-[#0284C7] focus-within:ring-1 focus-within:ring-[#0284C7] bg-white transition-all">
                <span className="inline-flex items-center px-3.5 bg-slate-100 border-r border-[#CBD5E1] text-[#475569] font-bold text-xs select-none shrink-0">
                  +91
                </span>
                <input
                  type="tel"
                  maxLength={10}
                  placeholder="9876543210"
                  value={phone.replace(/^\+91/, '')}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-3 py-2 text-xs font-mono font-semibold text-[#0F172A] focus:outline-none bg-transparent"
                  required
                />
                {isLookingUp && (
                  <div className="flex items-center pr-3 shrink-0">
                    <Loader2 className="w-4 h-4 animate-spin text-[#0284C7]" />
                  </div>
                )}
              </div>
              <p className="text-[10px] text-[#64748B] mt-1">
                Type 10 digits to search existing pet patient profiles
              </p>
            </div>

            {/* Owner Full Name */}
            <div>
              <label className="font-bold block mb-1 text-[#334155]">
                Owner Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Rahul Sharma"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                className="w-full bg-white border border-[#CBD5E1] focus:border-[#0284C7] focus:ring-1 focus:ring-[#0284C7] rounded-xl px-3 py-2 text-xs font-medium focus:outline-none"
                required
              />
            </div>

            {/* City / Address */}
            <div>
              <label className="font-bold block mb-1 text-[#334155]">City / Address</label>
              <input
                type="text"
                placeholder="e.g. Civil Lines, Kanpur"
                value={ownerAddress}
                onChange={(e) => setOwnerAddress(e.target.value)}
                className="w-full bg-white border border-[#CBD5E1] focus:border-[#0284C7] focus:ring-1 focus:ring-[#0284C7] rounded-xl px-3 py-2 text-xs font-medium focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* 2. PATIENT PET PROFILE */}
        {/* ============================================================== */}
        <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl p-4 md:p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2.5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#0284C7]/10 flex items-center justify-center text-[#0284C7] font-bold">
                2
              </div>
              <h4 className="text-sm font-bold text-[#0F172A] uppercase tracking-wide">
                Patient Pet Profile
              </h4>
            </div>

            {lookupResult?.pets && lookupResult.pets.length > 0 && (
              <span className="text-[11px] font-semibold text-[#0284C7] bg-[#E0F2FE] px-2.5 py-0.5 rounded-full">
                {lookupResult.pets.length} Registered Pet(s) Found
              </span>
            )}
          </div>

          {/* Existing Pet Pill Selector (if owner already has registered pets) */}
          {lookupResult?.pets && lookupResult.pets.length > 0 && (
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider block">
                Select Patient Pet or Register New:
              </label>
              <div className="flex flex-wrap gap-2">
                {lookupResult.pets.map((p) => {
                  const isSelected = selectedPetId === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelectedPetId(p.id)}
                      className={`px-3 py-2 rounded-xl text-left border transition-all flex items-center gap-2.5 ${
                        isSelected
                          ? 'bg-[#0284C7] text-white border-[#0284C7] shadow-sm'
                          : 'bg-white text-[#334155] border-[#CBD5E1] hover:border-[#0284C7]'
                      }`}
                    >
                      <Dog className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-[#0284C7]'}`} />
                      <div>
                        <div className="font-bold leading-tight">{p.name}</div>
                        <div
                          className={`text-[10px] ${isSelected ? 'text-white/80' : 'text-[#64748B]'}`}
                        >
                          {p.registrationNumber || 'No Reg No'} • {p.species} ({p.breed})
                        </div>
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 ml-1" />}
                    </button>
                  );
                })}

                <button
                  type="button"
                  onClick={() => setSelectedPetId('new')}
                  className={`px-3 py-2 rounded-xl text-left border transition-all flex items-center gap-2 ${
                    selectedPetId === 'new'
                      ? 'bg-[#0284C7] text-white border-[#0284C7] shadow-sm'
                      : 'bg-white text-[#334155] border-[#CBD5E1] hover:border-[#0284C7]'
                  }`}
                >
                  <Plus className="w-4 h-4" />
                  <span className="font-bold">+ Register New Pet</span>
                </button>
              </div>
            </div>
          )}

          {/* Existing Pet Selected Overview */}
          {selectedPetId !== 'new' && selectedExistingPet && (
            <div className="p-3 bg-white border border-[#CBD5E1] rounded-xl flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#E0F2FE] flex items-center justify-center font-bold text-[#0284C7]">
                  <Dog className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-extrabold text-[#0F172A] text-sm">
                    {selectedExistingPet.name}{' '}
                    <span className="font-mono text-xs text-[#0284C7] font-semibold">
                      ({selectedExistingPet.registrationNumber || 'Pending Reg No'})
                    </span>
                  </p>
                  <p className="text-[11px] text-[#64748B]">
                    {selectedExistingPet.species} • {selectedExistingPet.breed} •{' '}
                    {selectedExistingPet.gender} • {selectedExistingPet.age || 'Age: N/A'}
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-lg">
                Existing Patient Active
              </span>
            </div>
          )}

          {/* New Pet Registration Form Fields */}
          {selectedPetId === 'new' && (
            <div className="space-y-4 pt-1">
              {/* Pet Registration Number & Prefix (Editable) */}
              <div className="p-3.5 bg-gradient-to-r from-sky-50 to-indigo-50/40 border border-sky-200/80 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-[#0369A1]">
                    <Hash className="w-4 h-4 text-[#0284C7]" />
                    <span>Pet Registration Code & Prefix</span>
                    <span className="text-[10px] bg-[#0284C7]/10 text-[#0284C7] px-2 py-0.5 rounded-full font-bold">
                      Editable & Sequential
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsEditingRegNumber(!isEditingRegNumber)}
                    className="text-[11px] font-semibold text-[#0284C7] hover:underline flex items-center gap-1"
                  >
                    <Edit3 className="w-3 h-3" />
                    {isEditingRegNumber ? 'Lock Prefix' : 'Customize Prefix / Code'}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
                  <div>
                    <label className="text-[10px] font-bold text-[#475569] uppercase block mb-0.5">
                      Prefix
                    </label>
                    <input
                      type="text"
                      value={regPrefix}
                      onChange={(e) => {
                        const newPref = e.target.value;
                        setRegPrefix(newPref);
                        const match = regNumber.match(/(\d+)$/);
                        const num = match ? match[1] : '01';
                        setRegNumber(`${newPref}${num}`);
                      }}
                      disabled={!isEditingRegNumber}
                      placeholder="e.g. HPPC/P/"
                      className="w-full bg-white border border-[#CBD5E1] rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-[#0F172A] focus:outline-none focus:border-[#0284C7] disabled:bg-slate-100 disabled:text-slate-600"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-[10px] font-bold text-[#475569] uppercase block mb-0.5">
                      Assigned Registration Number
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={regNumber}
                        onChange={(e) => setRegNumber(e.target.value)}
                        placeholder="e.g. HPPC/P/02"
                        className="w-full bg-white border border-[#CBD5E1] rounded-lg px-2.5 py-1.5 text-xs font-mono font-extrabold text-[#0284C7] focus:outline-none focus:border-[#0284C7]"
                      />
                      <div className="shrink-0 px-2.5 py-1 bg-white border border-sky-300 rounded-lg text-[11px] font-bold text-[#0369A1] shadow-xs">
                        Official ID
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Pet Basics (Name, Species, Breed, Gender) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="font-bold block mb-1 text-[#334155]">
                    Pet Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Bruno"
                    value={petName}
                    onChange={(e) => setPetName(e.target.value)}
                    className="w-full bg-white border border-[#CBD5E1] focus:border-[#0284C7] rounded-xl px-3 py-2 text-xs font-medium focus:outline-none"
                    required={selectedPetId === 'new'}
                  />
                </div>

                <div>
                  <label className="font-bold block mb-1 text-[#334155]">
                    Species <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={petSpecies}
                    onChange={(e) => setPetSpecies(e.target.value)}
                    className="w-full bg-white border border-[#CBD5E1] focus:border-[#0284C7] rounded-xl px-3 py-2 text-xs font-medium focus:outline-none"
                  >
                    <option value="Dog">Canine / Dog</option>
                    <option value="Cat">Feline / Cat</option>
                    <option value="Bird">Avian / Bird</option>
                    <option value="Rabbit">Lagomorph / Rabbit</option>
                    <option value="Other">Other Pet Patient</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold block mb-1 text-[#334155]">
                    Breed <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Golden Retriever"
                    value={petBreed}
                    onChange={(e) => setPetBreed(e.target.value)}
                    className="w-full bg-white border border-[#CBD5E1] focus:border-[#0284C7] rounded-xl px-3 py-2 text-xs font-medium focus:outline-none"
                    required={selectedPetId === 'new'}
                  />
                </div>

                <div>
                  <label className="font-bold block mb-1 text-[#334155]">
                    Gender <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={petGender}
                    onChange={(e) => setPetGender(e.target.value)}
                    className="w-full bg-white border border-[#CBD5E1] focus:border-[#0284C7] rounded-xl px-3 py-2 text-xs font-medium focus:outline-none"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Neutered Male">Neutered Male</option>
                    <option value="Spayed Female">Spayed Female</option>
                    <option value="Unknown">Unknown</option>
                  </select>
                </div>
              </div>

              {/* Pet Details (DOB, Age, Coat Colour, Photo) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="font-bold block mb-1 text-[#334155]">
                    Date of Birth / Estimated
                  </label>
                  <input
                    type="date"
                    value={petDob}
                    onChange={(e) => setPetDob(e.target.value)}
                    className="w-full bg-white border border-[#CBD5E1] focus:border-[#0284C7] rounded-xl px-3 py-2 text-xs font-medium focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold block mb-1 text-[#334155]">Approx. Age</label>
                  <input
                    type="text"
                    placeholder="e.g. 2 years, 6 months"
                    value={petAge}
                    onChange={(e) => setPetAge(e.target.value)}
                    className="w-full bg-white border border-[#CBD5E1] focus:border-[#0284C7] rounded-xl px-3 py-2 text-xs font-medium focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold block mb-1 text-[#334155]">Coat Colour</label>
                  <input
                    type="text"
                    placeholder="e.g. Golden / Brown"
                    value={petCoatColour}
                    onChange={(e) => setPetCoatColour(e.target.value)}
                    className="w-full bg-white border border-[#CBD5E1] focus:border-[#0284C7] rounded-xl px-3 py-2 text-xs font-medium focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold block mb-1 text-[#334155]">Pet Photo (Optional)</label>
                  <div className="flex items-center gap-2">
                    <label className="flex-1 cursor-pointer bg-white border border-dashed border-[#0284C7] hover:bg-[#0284C7]/5 rounded-xl px-3 py-2 text-xs text-[#0284C7] font-semibold flex items-center justify-center gap-1.5 transition-colors">
                      <UploadCloud className="w-4 h-4" />
                      <span>{petPhotoUrl ? 'Change Photo' : 'Upload Photo'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoFileChange}
                        className="hidden"
                        disabled={uploadingPhoto}
                      />
                    </label>

                    {petPhotoUrl && (
                      <div className="w-8 h-8 rounded-lg overflow-hidden border border-[#CBD5E1] shrink-0">
                        <img
                          src={petPhotoUrl}
                          alt="Pet preview"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                  </div>
                  {uploadingPhoto && (
                    <div className="mt-1 flex items-center gap-1.5 text-[10px] text-[#0284C7] font-semibold">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Uploading photo ({uploadProgress}%)...</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ============================================================== */}
        {/* 3. CONSULTATION SERVICE, DOCTOR FEE & SCHEDULING */}
        {/* ============================================================== */}
        <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl p-4 md:p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2.5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#0284C7]/10 flex items-center justify-center text-[#0284C7] font-bold">
                3
              </div>
              <h4 className="text-sm font-bold text-[#0F172A] uppercase tracking-wide">
                Consultation Service & Doctor Fee
              </h4>
            </div>

            <span className="text-[11px] font-semibold text-[#64748B] flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-[#0284C7]" />
              Doctor: <strong className="text-[#0F172A]">{doctorFullName}</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Service Package */}
            <div>
              <label className="font-bold block mb-1 text-[#334155]">
                Select Clinic Service <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedService?.id || ''}
                onChange={(e) => {
                  const s = services.find((srv) => srv.id === e.target.value);
                  if (s) {
                    setSelectedService(s);
                    setConsultationFee(String(s.price || 500));
                  }
                }}
                className="w-full bg-white border border-[#CBD5E1] focus:border-[#0284C7] rounded-xl px-3 py-2 text-xs font-medium focus:outline-none"
              >
                {services.map((srv) => (
                  <option key={srv.id} value={srv.id}>
                    {srv.name} — ₹{srv.price}
                  </option>
                ))}
                {services.length === 0 && (
                  <option value="default">General Veterinary Consultation — ₹500</option>
                )}
              </select>
            </div>

            {/* Doctor Consultation Fee (Editable) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-bold text-[#334155] flex items-center gap-1">
                  Doctor Fee (₹) <span className="text-red-500">*</span>
                </label>
                <span className="text-[10px] text-[#0284C7] font-semibold">Editable / Custom</span>
              </div>
              <div className="flex rounded-xl overflow-hidden border border-[#CBD5E1] focus-within:border-[#0284C7] focus-within:ring-1 focus-within:ring-[#0284C7] bg-white transition-all">
                <span className="inline-flex items-center px-3 bg-slate-100 border-r border-[#CBD5E1] text-[#475569] font-bold text-xs select-none shrink-0">
                  ₹
                </span>
                <input
                  type="number"
                  min="0"
                  step="10"
                  value={consultationFee}
                  onChange={(e) => setConsultationFee(e.target.value)}
                  placeholder="500"
                  className="w-full px-3 py-2 text-xs font-bold text-[#0F172A] focus:outline-none bg-transparent"
                  required
                />
              </div>
              {/* Quick Fee Presets */}
              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                {[0, 300, 500, 800].map((fee) => (
                  <button
                    key={fee}
                    type="button"
                    onClick={() => setConsultationFee(String(fee))}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold border transition-colors ${
                      consultationFee === String(fee)
                        ? 'bg-[#0284C7] text-white border-[#0284C7]'
                        : 'bg-white text-[#64748B] border-[#CBD5E1] hover:border-[#0284C7]'
                    }`}
                  >
                    {fee === 0 ? '₹0 Free' : `₹${fee}`}
                  </button>
                ))}
              </div>
            </div>

            {/* Consultation Date */}
            <div>
              <label className="font-bold block mb-1 text-[#334155]">
                Consultation Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={appointmentDate}
                onChange={(e) => setAppointmentDate(e.target.value)}
                className="w-full bg-white border border-[#CBD5E1] focus:border-[#0284C7] rounded-xl px-3 py-2 text-xs font-medium focus:outline-none"
                required
              />
            </div>
          </div>

          {/* Time Slot Selector */}
          <div>
            <label className="font-bold block mb-1.5 text-[#334155]">
              Available Time Slot <span className="text-red-500">*</span>
            </label>
            {availableSlots.length === 0 ? (
              <p className="text-xs text-amber-700 bg-amber-50 p-2.5 rounded-xl border border-amber-200">
                Clinic is closed or all regular consultation slots on {appointmentDate} are fully booked.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto p-1 bg-white border border-[#CBD5E1] rounded-xl">
                {availableSlots.map((slot) => {
                  const isSelected = selectedTimeSlot === slot;
                  return (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setSelectedTimeSlot(slot)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-[#0284C7] text-white shadow-xs font-bold'
                          : 'bg-[#F8FAFC] text-[#475569] hover:bg-[#F1F5F9] border border-[#E2E8F0]'
                      }`}
                    >
                      <Clock className="w-3 h-3" />
                      <span>{slot}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Clinical Reason & Symptoms */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="font-bold block mb-1 text-[#334155]">Concern Category</label>
              <select
                value={concernCategory}
                onChange={(e) => setConcernCategory(e.target.value)}
                className="w-full bg-white border border-[#CBD5E1] focus:border-[#0284C7] rounded-xl px-3 py-2 text-xs font-medium focus:outline-none"
              >
                <option value="General Consultation">General Consultation</option>
                <option value="Vaccination Visit">Vaccination Visit</option>
                <option value="Deworming / Parasite Care">Deworming / Parasite Care</option>
                <option value="Skin, Coat & Allergies">Skin, Coat & Allergies</option>
                <option value="Digestive / Vomiting / Diarrhea">Digestive / Vomiting / Diarrhea</option>
                <option value="Surgery Follow-up & Stitches">Surgery Follow-up & Stitches</option>
                <option value="Emergency Care">Emergency Care</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="font-bold block mb-1 text-[#334155]">
                Symptoms / Chief Complaint
              </label>
              <input
                type="text"
                placeholder="e.g. Mild fever, loss of appetite since 2 days, lethargy"
                value={symptoms}
                onChange={(e) => setSymptoms(e.target.value)}
                className="w-full bg-white border border-[#CBD5E1] focus:border-[#0284C7] rounded-xl px-3 py-2 text-xs font-medium focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* 4. ADMINISTERED MEDICINES & INJECTIONS (OPTIONAL / IMMEDIATE) */}
        {/* ============================================================== */}
        <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl p-4 md:p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2.5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-600 font-bold">
                4
              </div>
              <div>
                <h4 className="text-sm font-bold text-[#0F172A] uppercase tracking-wide">
                  Administered Medicines & Injections (Optional)
                </h4>
                <p className="text-[11px] text-[#64748B]">
                  Dispense clinic injections, vaccines, or medications and auto-calculate charges.
                </p>
              </div>
            </div>

            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={handleAddMedicineItem}
              icon={<Plus className="w-3.5 h-3.5 text-indigo-600" />}
              className="font-bold text-indigo-700 bg-indigo-50 border-indigo-200 hover:bg-indigo-100"
            >
              + Add Medicine / Injection
            </Button>
          </div>

          {administeredItems.length === 0 ? (
            <div className="p-4 bg-white border border-dashed border-[#CBD5E1] rounded-xl text-center">
              <p className="text-xs text-[#64748B]">
                No medicines or injections added yet for this walk-in visit.
              </p>
              <button
                type="button"
                onClick={handleAddMedicineItem}
                className="mt-1.5 text-xs font-bold text-indigo-600 hover:underline"
              >
                + Click here to add an administered medicine or injection
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="text-[10px] uppercase font-bold text-[#64748B] border-b border-[#E2E8F0]">
                    <tr>
                      <th className="py-2 px-2">Medicine / Injection Name</th>
                      <th className="py-2 px-2 w-36">Type / Route</th>
                      <th className="py-2 px-2 w-28">Dosage</th>
                      <th className="py-2 px-2 w-20">Qty</th>
                      <th className="py-2 px-2 w-28">Price (₹)</th>
                      <th className="py-2 px-2 w-10 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]">
                    {administeredItems.map((item) => (
                      <tr key={item.id} className="bg-white hover:bg-slate-50 transition-colors">
                        {/* Name / Inventory selector */}
                        <td className="py-2 px-2">
                          <div className="space-y-1">
                            <input
                              type="text"
                              placeholder="e.g. Meloxicam Inj / Amoxicillin"
                              value={item.name}
                              onChange={(e) =>
                                handleUpdateMedicineItem(item.id, { name: e.target.value })
                              }
                              className="w-full bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg px-2.5 py-1.5 text-xs font-medium focus:outline-none focus:border-indigo-500"
                            />
                            {inventoryList.length > 0 && (
                              <select
                                onChange={(e) =>
                                  handleSelectInventoryItem(item.id, e.target.value)
                                }
                                className="w-full text-[10px] bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-[#64748B]"
                                defaultValue=""
                              >
                                <option value="" disabled>
                                  ⚡ Pick from Clinic Inventory ({inventoryList.length} items)...
                                </option>
                                {inventoryList.map((inv) => (
                                  <option key={inv.id} value={inv.id}>
                                    {inv.name} — ₹{inv.sellingPrice ?? inv.price ?? 0} (Stock:{' '}
                                    {inv.stock ?? 'Available'})
                                  </option>
                                ))}
                              </select>
                            )}
                          </div>
                        </td>

                        {/* Type / Route */}
                        <td className="py-2 px-2">
                          <select
                            value={item.type}
                            onChange={(e) =>
                              handleUpdateMedicineItem(item.id, { type: e.target.value })
                            }
                            className="w-full bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg px-2 py-1.5 text-xs font-medium focus:outline-none focus:border-indigo-500"
                          >
                            <option value="Injection (SC)">Injection (SC)</option>
                            <option value="Injection (IM)">Injection (IM)</option>
                            <option value="Injection (IV)">Injection (IV)</option>
                            <option value="Tablet / Capsule">Tablet / Oral</option>
                            <option value="Syrup / Liquid">Syrup / Liquid</option>
                            <option value="Ointment / Drops">Topical / Drops</option>
                            <option value="Vaccine">Vaccine</option>
                          </select>
                        </td>

                        {/* Dosage */}
                        <td className="py-2 px-2">
                          <input
                            type="text"
                            placeholder="e.g. 2.5 ml"
                            value={item.dosage}
                            onChange={(e) =>
                              handleUpdateMedicineItem(item.id, { dosage: e.target.value })
                            }
                            className="w-full bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg px-2 py-1.5 text-xs font-medium focus:outline-none focus:border-indigo-500"
                          />
                        </td>

                        {/* Quantity */}
                        <td className="py-2 px-2">
                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={item.quantity}
                            onChange={(e) =>
                              handleUpdateMedicineItem(item.id, { quantity: e.target.value })
                            }
                            className="w-full bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg px-2 py-1.5 text-xs font-medium focus:outline-none focus:border-indigo-500"
                          />
                        </td>

                        {/* Charge (₹) */}
                        <td className="py-2 px-2">
                          <div className="flex rounded-lg overflow-hidden border border-[#CBD5E1] focus-within:border-indigo-500 bg-white">
                            <span className="inline-flex items-center px-2 bg-slate-100 border-r border-[#CBD5E1] text-[11px] font-bold text-[#64748B] select-none shrink-0">
                              ₹
                            </span>
                            <input
                              type="number"
                              min="0"
                              step="5"
                              value={item.charge}
                              onChange={(e) =>
                                handleUpdateMedicineItem(item.id, { charge: e.target.value })
                              }
                              className="w-full px-2 py-1.5 text-xs font-bold text-[#0F172A] focus:outline-none bg-transparent"
                            />
                          </div>
                        </td>

                        {/* Delete */}
                        <td className="py-2 px-2 text-right">
                          <button
                            type="button"
                            onClick={() => handleRemoveMedicineItem(item.id)}
                            className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                            title="Remove item"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end">
                <p className="text-xs font-bold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-lg border border-indigo-200">
                  Medicines & Injections Subtotal: ₹{totalMedsCharge}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ============================================================== */}
        {/* 5. BILLING SUMMARY */}
        {/* ============================================================== */}
        <div className="bg-[#F8FAFC] border border-[#CBD5E1] rounded-2xl p-4 md:p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2.5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 font-bold">
                5
              </div>
              <h4 className="text-sm font-bold text-[#0F172A] uppercase tracking-wide flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-emerald-600" />
                Billing Summary
              </h4>
            </div>

            <span className="text-xs font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-3 py-1 rounded-full flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5" />
              Counter Payment (Cash)
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 items-center">
            {/* Breakdown item: Consult Fee */}
            <div className="bg-white p-3 rounded-xl border border-[#E2E8F0]">
              <span className="text-[10px] text-[#64748B] uppercase font-bold block mb-0.5">
                Doctor Consultation
              </span>
              <span className="text-base font-extrabold text-[#0F172A]">₹{consultNum}</span>
            </div>

            {/* Breakdown item: Medicine Charges */}
            <div className="bg-white p-3 rounded-xl border border-[#E2E8F0]">
              <span className="text-[10px] text-[#64748B] uppercase font-bold block mb-0.5">
                Medicines & Injections
              </span>
              <span className="text-base font-extrabold text-[#0F172A]">₹{totalMedsCharge}</span>
            </div>

            {/* Breakdown item: Discount */}
            <div className="bg-white p-3 rounded-xl border border-[#E2E8F0]">
              <label className="text-[10px] text-[#64748B] uppercase font-bold block mb-1">
                Discount (₹)
              </label>
              <div className="flex rounded-lg overflow-hidden border border-[#CBD5E1] focus-within:border-[#0284C7] focus-within:ring-1 focus-within:ring-[#0284C7] bg-white transition-all">
                <span className="inline-flex items-center px-2 text-xs font-bold text-[#64748B] bg-slate-100 border-r border-[#CBD5E1] select-none shrink-0">
                  ₹
                </span>
                <input
                  type="number"
                  min="0"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  placeholder="0"
                  className="w-full bg-transparent px-2.5 py-1 text-xs font-bold text-[#0F172A] focus:outline-none"
                />
              </div>
            </div>

            {/* Net Total Amount */}
            <div className="bg-emerald-50 border border-emerald-300 p-3 rounded-xl text-center">
              <span className="text-[10px] text-emerald-800 uppercase font-black block">
                Net Payable Amount
              </span>
              <span className="text-2xl font-black text-emerald-700">₹{grandTotal}</span>
            </div>
          </div>
        </div>

        {/* Additional Clinical Notes */}
        <div>
          <label className="font-bold block mb-1 text-[#334155]">
            Internal Clinical Notes / Advice (Optional)
          </label>
          <textarea
            rows={2}
            placeholder="Add internal remarks, specific medical diet, follow-up instructions..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full bg-[#F8FAFC] border border-[#CBD5E1] focus:border-[#0284C7] rounded-xl p-2.5 text-xs text-[#25242A] focus:outline-none"
          />
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-[#E2E8F0]">
          <div className="text-xs text-[#64748B]">
            Net Payable Amount:{' '}
            <strong className="text-emerald-700 text-sm font-black">₹{grandTotal}</strong>{' '}
            <span className="text-[11px] text-[#64748B]">(Cash Payment)</span>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              type="button"
              variant="secondary"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || (availableSlots.length > 0 && !selectedTimeSlot)}
              className="bg-[#0284C7] hover:bg-[#0369A1] text-white font-bold px-6 shadow-sm"
              icon={
                isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )
              }
            >
              {isSubmitting
                ? 'Confirming Booking...'
                : `Confirm & Book Walk-in — ₹${grandTotal}`}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
