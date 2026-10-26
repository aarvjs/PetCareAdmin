'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import {
  Stethoscope,
  Syringe,
  Pill,
  Calendar,
  Clock,
  Printer,
  Download,
  Share2,
  CheckCircle,
  AlertCircle,
  Loader2,
  Plus,
  Trash2,
  FileText,
  IndianRupee,
  ShieldCheck,
  Building2,
  User,
  Dog,
} from 'lucide-react';
import { useAuth } from '@/lib/authContext';
import { safeFetchJson } from '@/lib/safeFetch';
import { ClinicMedicineItem } from './ClinicInventoryManager';

export interface AdministeredMedItem {
  medicineId: string;
  name: string;
  dosage: string;
  route: string;
  quantity: string;
  unit: string;
  charge: string;
  batchNumber?: string;
}

export interface PrescribedMedItem {
  name: string;
  dosage: string;
  instructions: string;
  quantity: string;
}

interface AppointmentTreatmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: any;
  onSuccess?: () => void;
}

export const AppointmentTreatmentModal: React.FC<AppointmentTreatmentModalProps> = ({
  isOpen,
  onClose,
  appointment,
  onSuccess,
}) => {
  const { profile, user } = useAuth();
  const [activeTab, setActiveTab] = useState<'record' | 'prescription'>('record');

  // Inventory medicines for administered dropdown
  const [inventoryList, setInventoryList] = useState<ClinicMedicineItem[]>([]);
  const [isLoadingInventory, setIsLoadingInventory] = useState(false);

  // Vitals & Clinical Examination
  const [history, setHistory] = useState('');
  const [temperature, setTemperature] = useState('');
  const [weight, setWeight] = useState('');
  const [clinicalSigns, setClinicalSigns] = useState('');
  const [prognosis, setPrognosis] = useState('Guarded');
  const [diagnosis, setDiagnosis] = useState('');

  // Medications
  const [administeredItems, setAdministeredItems] = useState<AdministeredMedItem[]>([]);
  const [prescribedItems, setPrescribedItems] = useState<PrescribedMedItem[]>([]);

  // Charges
  const [consultationFee, setConsultationFee] = useState('300');
  const [discount, setDiscount] = useState('0');

  // Advice & Next Visit
  const [advice, setAdvice] = useState('');
  const [nextVisitDate, setNextVisitDate] = useState('');

  // Doctor Details
  const doctorName =
    appointment?.doctorName || profile?.fullName || 'Dr. Ashwani Kumar Singh';
  const doctorQualifications = 'B.V.Sc & A.H (RAJUVAS, Bikaner)';
  const doctorRegdNo = 'UPVC 6394';

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [savedTreatment, setSavedTreatment] = useState<any>(null);

  // Load Inventory & existing treatment data on open
  useEffect(() => {
    if (!isOpen || !appointment) return;

    setErrorMessage('');
    setSuccessMessage('');

    // Pre-fill from appointment
    setHistory(appointment.symptoms || appointment.notes || '');
    setTemperature(appointment.temperature || '101.2');
    setWeight(appointment.weight || '09.100');
    setClinicalSigns(appointment.clinicalSigns || (appointment.symptoms ? 'Emesis' : ''));
    setPrognosis(appointment.prognosis || 'Guarded');
    setDiagnosis(appointment.diagnosis || '');
    setAdvice(appointment.advice || 'Blood Profile: Basic + BP + RBS. Keep warm, bland soft diet.');
    setNextVisitDate(appointment.nextVisitDate || '');

    // Defaults for medicines if empty
    setAdministeredItems([
      {
        medicineId: '',
        name: 'Inj. Oframax',
        dosage: '225 mg',
        route: 'IM',
        quantity: '1',
        unit: 'vial',
        charge: '150',
      },
    ]);

    setPrescribedItems([
      {
        name: 'Tab. Safeheart 5mg',
        dosage: '1 tab',
        instructions: 'Once daily after meals for 7 days',
        quantity: '7 tabs',
      },
    ]);

    // If already has treatment, load existing
    if (appointment.treatmentId) {
      safeFetchJson<any>(`/api/clinic/appointments/${appointment.id}/prescription?format=json`)
        .then(({ data }) => {
          if (data?.prescription) {
            const p = data.prescription;
            setSavedTreatment(p);
            setDiagnosis(p.diagnosis || '');
            setTemperature(p.temperature ? p.temperature.replace(' F', '') : '101.2');
            setWeight(p.weight ? p.weight.replace(' Kgs', '') : '09.100');
            setHistory(p.history || '');
            setClinicalSigns(p.clinicalSigns || '');
            setPrognosis(p.prognosis || 'Guarded');
            setAdvice(p.advice || '');
            setNextVisitDate(p.nextVisitDate || '');
            setConsultationFee(String(p.consultationFee ?? 300));
            setDiscount(String(p.discount ?? 0));
            if (p.administeredItems?.length > 0) {
              setAdministeredItems(p.administeredItems);
            }
            if (p.prescribedItems?.length > 0) {
              setPrescribedItems(p.prescribedItems);
            }
            setActiveTab('prescription');
          }
        })
        .catch(() => {});
    }

    // Load clinic inventory
    setIsLoadingInventory(true);
    fetch('/api/clinic/inventory', {
      headers: {
        'Content-Type': 'application/json',
        'x-user-uid': profile?.uid || user?.uid || '',
      },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.items)) {
          setInventoryList(data.items);
        }
      })
      .catch((err) => console.warn('Failed to load inventory:', err))
      .finally(() => setIsLoadingInventory(false));
  }, [isOpen, appointment, profile, user]);

  // Financial calculation
  const totalMedsCharge = administeredItems.reduce(
    (sum, item) => sum + (parseFloat(item.charge) || 0),
    0
  );
  const consultNum = parseFloat(consultationFee) || 0;
  const discountNum = parseFloat(discount) || 0;
  const grandTotal = Math.max(0, consultNum + totalMedsCharge - discountNum);

  // Add/remove medication rows
  const addAdministeredRow = () => {
    setAdministeredItems([
      ...administeredItems,
      {
        medicineId: '',
        name: '',
        dosage: '',
        route: 'IM',
        quantity: '1',
        unit: 'unit',
        charge: '0',
      },
    ]);
  };

  const removeAdministeredRow = (idx: number) => {
    setAdministeredItems(administeredItems.filter((_, i) => i !== idx));
  };

  const handleAdministeredChange = (idx: number, field: keyof AdministeredMedItem, val: string) => {
    const updated = [...administeredItems];
    updated[idx] = { ...updated[idx], [field]: val };

    if (field === 'medicineId') {
      const found = inventoryList.find((m) => m.id === val);
      if (found) {
        updated[idx].name = found.name;
        updated[idx].unit = found.unit || 'unit';
        updated[idx].batchNumber = found.batchNumber;
        updated[idx].dosage = `1 ${found.unit || 'unit'}`;
      }
    }
    setAdministeredItems(updated);
  };

  const addPrescribedRow = () => {
    setPrescribedItems([
      ...prescribedItems,
      { name: '', dosage: '', instructions: '', quantity: '1' },
    ]);
  };

  const removePrescribedRow = (idx: number) => {
    setPrescribedItems(prescribedItems.filter((_, i) => i !== idx));
  };

  const handlePrescribedChange = (idx: number, field: keyof PrescribedMedItem, val: string) => {
    const updated = [...prescribedItems];
    updated[idx] = { ...updated[idx], [field]: val };
    setPrescribedItems(updated);
  };

  // Submit Treatment Form
  const handleSubmitTreatment = async (isDraft = false) => {
    if (!diagnosis.trim() && !isDraft) {
      setErrorMessage('Please enter a clinical diagnosis before finalizing treatment.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const idToken = user ? await user.getIdToken() : '';
      const payload = {
        petId: appointment.petId || '',
        petName: appointment.petName,
        petRegistrationNumber: appointment.petRegistrationNumber || 'HPPC/P/01',
        breed: appointment.breed || appointment.petType || 'CB',
        species: appointment.petType || appointment.species || 'Canine',
        age: appointment.age || '04 Years',
        gender: appointment.gender || 'Female',
        ownerName: appointment.customerName || appointment.ownerName || 'Pet Parent',
        ownerPhone: appointment.customerPhone || appointment.ownerPhone || '',
        ownerAddress: appointment.customerAddress || 'Kanpur',
        doctorId: appointment.doctorId || profile?.uid,
        doctorName,
        doctorRegdNo,
        doctorQualifications,
        businessId: appointment.businessId,
        shopId: appointment.shopId,
        temperature: temperature.trim() ? `${temperature.trim()} F` : '',
        weight: weight.trim() ? `${weight.trim()} Kgs` : '',
        history: history.trim(),
        clinicalSigns: clinicalSigns.trim(),
        prognosis,
        diagnosis: diagnosis.trim(),
        administeredItems,
        prescribedItems,
        consultationFee: consultNum,
        medicinesFee: totalMedsCharge,
        discount: discountNum,
        totalAmount: grandTotal,
        advice: advice.trim(),
        nextVisitDate: nextVisitDate || null,
        isDraft,
        idempotencyKey: `idem_treat_${appointment.id}_${Date.now()}`,
      };

      const { data, error } = await safeFetchJson<{
        success: boolean;
        error?: string;
        message?: string;
        treatment?: any;
      }>(`/api/clinic/appointments/${appointment.id}/treatment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (error || !data?.success) {
        setErrorMessage(error || data?.error || 'Failed to save treatment record.');
      } else {
        setSuccessMessage(data.message || 'Treatment successfully recorded!');
        setSavedTreatment(data.treatment || payload);
        if (data.petId) {
          appointment.petId = data.petId;
        }
        if (data.treatment?.petRegistrationNumber) {
          appointment.petRegistrationNumber = data.treatment.petRegistrationNumber;
        }
        if (data.treatment?.id) {
          appointment.treatmentId = data.treatment.id;
        }
        appointment.status = isDraft ? 'In-Consultation' : 'Completed';
        setActiveTab('prescription');
        if (onSuccess) {
          onSuccess();
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Trigger PDF download / view
  const handleDownloadPdf = () => {
    window.open(`/api/clinic/appointments/${appointment.id}/prescription?format=pdf`, '_blank');
  };

  // Dedicated Print (opens standalone print route without modal clipping)
  const handlePrint = () => {
    const printUrl = `/doctor/appointments/${appointment.id}/print`;
    const printWindow = window.open(printUrl, '_blank');
    if (!printWindow) {
      window.print();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Clinical Consultation - ${appointment?.petName || 'Patient'}`}
      subtitle={`Booking Ref: ${appointment?.appointmentId || appointment?.id} • Registration: ${
        appointment?.petRegistrationNumber || 'HPPC/P/01'
      }`}
      maxWidth="2xl"
    >
      <div className="space-y-4">
        {/* Navigation Tabs */}
        <div className="flex border-b border-[#E8ECF0] gap-4 text-xs font-bold">
          <button
            onClick={() => setActiveTab('record')}
            className={`pb-2.5 flex items-center gap-1.5 transition-colors ${
              activeTab === 'record'
                ? 'border-b-2 border-[#72CFF2] text-[#0284C7]'
                : 'text-[#737780] hover:text-[#25242A]'
            }`}
          >
            <Stethoscope className="w-4 h-4" />
            <span>Examine & Record Treatment</span>
          </button>
          <button
            onClick={() => setActiveTab('prescription')}
            className={`pb-2.5 flex items-center gap-1.5 transition-colors ${
              activeTab === 'prescription'
                ? 'border-b-2 border-[#72CFF2] text-[#0284C7]'
                : 'text-[#737780] hover:text-[#25242A]'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Official Prescription Report (DOCX Layout)</span>
          </button>
        </div>

        {/* Tab 1: Record Clinical Treatment */}
        {activeTab === 'record' && (
          <div className="space-y-5 text-xs text-[#25242A]">
            {/* Patient Header Card */}
            <div className="p-3.5 bg-gradient-to-r from-[#F0FDF4] to-[#F0F9FF] border border-[#CBD5E1] rounded-xl flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center border border-[#72CFF2]/40 shadow-sm">
                  <Dog className="w-5 h-5 text-[#0284C7]" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-[#25242A]">
                    {appointment.petName} ({appointment.breed || appointment.petType || 'Canine'})
                  </h4>
                  <p className="text-[11px] text-[#64748B]">
                    Age: {appointment.age || '4 Years'} • Gender: {appointment.gender || 'Female'} •
                    Owner: <strong>{appointment.customerName || appointment.ownerName}</strong> (
                    {appointment.customerPhone || appointment.ownerPhone})
                  </p>
                </div>
              </div>
              <span className="font-mono text-xs font-black text-[#0284C7] bg-white px-3 py-1.5 rounded-lg border border-[#72CFF2]/40 shadow-sm">
                REG: {appointment.petRegistrationNumber || 'HPPC/P/01'}
              </span>
            </div>

            {/* Error & Success Alerts */}
            {errorMessage && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span className="font-medium">{errorMessage}</span>
              </div>
            )}
            {successMessage && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 shrink-0" />
                <span className="font-medium">{successMessage}</span>
              </div>
            )}

            {/* Section: Clinical Examination & Vitals */}
            <div className="p-4 bg-white border border-[#E8ECF0] rounded-xl space-y-3 shadow-xs">
              <div className="flex items-center gap-1.5 text-[#0284C7] font-bold">
                <Stethoscope className="w-4 h-4" />
                <span>1. Clinical Examination, Symptoms & Vitals</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div>
                  <label className="font-semibold block mb-1 text-[11px] text-[#475569]">
                    Temperature (°F)
                  </label>
                  <input
                    type="text"
                    value={temperature}
                    onChange={(e) => setTemperature(e.target.value)}
                    placeholder="e.g. 101.2"
                    className="w-full bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg px-3 py-1.5 focus:border-[#72CFF2] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1 text-[11px] text-[#475569]">
                    Weight (Kgs)
                  </label>
                  <input
                    type="text"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    placeholder="e.g. 09.100"
                    className="w-full bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg px-3 py-1.5 focus:border-[#72CFF2] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1 text-[11px] text-[#475569]">
                    Prognosis
                  </label>
                  <select
                    value={prognosis}
                    onChange={(e) => setPrognosis(e.target.value)}
                    className="w-full bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg px-3 py-1.5 focus:border-[#72CFF2] focus:outline-none font-medium"
                  >
                    <option value="Guarded">Guarded</option>
                    <option value="Fair">Fair</option>
                    <option value="Good">Good</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold block mb-1 text-[11px] text-[#475569]">
                    Clinical Signs / Emesis
                  </label>
                  <input
                    type="text"
                    value={clinicalSigns}
                    onChange={(e) => setClinicalSigns(e.target.value)}
                    placeholder="e.g. Emesis, Loose Stool"
                    className="w-full bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg px-3 py-1.5 focus:border-[#72CFF2] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="font-semibold block mb-1 text-[11px] text-[#475569]">
                    History (H/O) & Patient Complaints
                  </label>
                  <textarea
                    rows={2}
                    value={history}
                    onChange={(e) => setHistory(e.target.value)}
                    placeholder="e.g. Loose Stool, Emesis, not eating food for 2 days"
                    className="w-full bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg p-2.5 focus:border-[#72CFF2] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1 text-[11px] text-[#475569]">
                    Doctor's Diagnosis *
                  </label>
                  <textarea
                    rows={2}
                    value={diagnosis}
                    onChange={(e) => setDiagnosis(e.target.value)}
                    placeholder="e.g. Acute Gastroenteritis / Parvoviral Enteritis"
                    className="w-full bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg p-2.5 focus:border-[#72CFF2] focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Section: Administered Medications (Stock Deduction) */}
            <div className="p-4 bg-white border border-[#E8ECF0] rounded-xl space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[#0284C7] font-bold">
                  <Syringe className="w-4 h-4" />
                  <span>2. Administered Injections & Treatments (Atomically Deducts Stock)</span>
                </div>
                <Button size="sm" variant="secondary" onClick={addAdministeredRow} icon={<Plus className="w-3.5 h-3.5" />}>
                  Add Injection
                </Button>
              </div>

              {administeredItems.length === 0 ? (
                <p className="text-[#94A3B8] italic text-[11px]">No clinic injections administered.</p>
              ) : (
                <div className="space-y-2">
                  {administeredItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="grid grid-cols-12 gap-2 items-center bg-[#F8FAFC] p-2.5 rounded-lg border border-[#E2E8F0]"
                    >
                      <div className="col-span-4">
                        <label className="text-[10px] text-[#64748B] font-bold block mb-0.5">Medicine</label>
                        <select
                          value={item.medicineId}
                          onChange={(e) => handleAdministeredChange(idx, 'medicineId', e.target.value)}
                          className="w-full bg-white border border-[#CBD5E1] rounded px-2 py-1 text-xs"
                        >
                          <option value="">-- Pick from Inventory --</option>
                          {inventoryList.map((inv) => (
                            <option key={inv.id} value={inv.id}>
                              {inv.name} (Stock: {inv.stockQuantity} {inv.unit})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="col-span-2">
                        <label className="text-[10px] text-[#64748B] font-bold block mb-0.5">Dosage</label>
                        <input
                          type="text"
                          value={item.dosage}
                          onChange={(e) => handleAdministeredChange(idx, 'dosage', e.target.value)}
                          placeholder="225 mg"
                          className="w-full bg-white border border-[#CBD5E1] rounded px-2 py-1 text-xs"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="text-[10px] text-[#64748B] font-bold block mb-0.5">Route</label>
                        <select
                          value={item.route}
                          onChange={(e) => handleAdministeredChange(idx, 'route', e.target.value)}
                          className="w-full bg-white border border-[#CBD5E1] rounded px-2 py-1 text-xs"
                        >
                          <option value="IM">IM</option>
                          <option value="SC">SC</option>
                          <option value="IV">IV</option>
                          <option value="PO">PO</option>
                          <option value="Topical">Topical</option>
                        </select>
                      </div>
                      <div className="col-span-1">
                        <label className="text-[10px] text-[#64748B] font-bold block mb-0.5">Qty</label>
                        <input
                          type="number"
                          step="0.1"
                          value={item.quantity}
                          onChange={(e) => handleAdministeredChange(idx, 'quantity', e.target.value)}
                          className="w-full bg-white border border-[#CBD5E1] rounded px-2 py-1 text-xs"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="text-[10px] text-[#64748B] font-bold block mb-0.5">Fee (₹)</label>
                        <input
                          type="number"
                          value={item.charge}
                          onChange={(e) => handleAdministeredChange(idx, 'charge', e.target.value)}
                          className="w-full bg-white border border-[#CBD5E1] rounded px-2 py-1 text-xs font-semibold"
                        />
                      </div>
                      <div className="col-span-1 text-right pt-3">
                        <button
                          type="button"
                          onClick={() => removeAdministeredRow(idx)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Section: Prescribed Take-Home Medicines */}
            <div className="p-4 bg-white border border-[#E8ECF0] rounded-xl space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[#0284C7] font-bold">
                  <Pill className="w-4 h-4" />
                  <span>3. Prescribed Take-Home Medicines (Prescription Only, No Stock Deducted)</span>
                </div>
                <Button size="sm" variant="secondary" onClick={addPrescribedRow} icon={<Plus className="w-3.5 h-3.5" />}>
                  Add Medicine
                </Button>
              </div>

              {prescribedItems.length === 0 ? (
                <p className="text-[#94A3B8] italic text-[11px]">No take-home medicines prescribed.</p>
              ) : (
                <div className="space-y-2">
                  {prescribedItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="grid grid-cols-12 gap-2 items-center bg-[#F8FAFC] p-2.5 rounded-lg border border-[#E2E8F0]"
                    >
                      <div className="col-span-4">
                        <label className="text-[10px] text-[#64748B] font-bold block mb-0.5">Medicine Name</label>
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => handlePrescribedChange(idx, 'name', e.target.value)}
                          placeholder="e.g. Tab. Safeheart 5mg"
                          className="w-full bg-white border border-[#CBD5E1] rounded px-2 py-1 text-xs font-semibold"
                        />
                      </div>
                      <div className="col-span-3">
                        <label className="text-[10px] text-[#64748B] font-bold block mb-0.5">Dosage</label>
                        <input
                          type="text"
                          value={item.dosage}
                          onChange={(e) => handlePrescribedChange(idx, 'dosage', e.target.value)}
                          placeholder="1 tab"
                          className="w-full bg-white border border-[#CBD5E1] rounded px-2 py-1 text-xs"
                        />
                      </div>
                      <div className="col-span-4">
                        <label className="text-[10px] text-[#64748B] font-bold block mb-0.5">Instructions & Frequency</label>
                        <input
                          type="text"
                          value={item.instructions}
                          onChange={(e) => handlePrescribedChange(idx, 'instructions', e.target.value)}
                          placeholder="Once daily after food x 7 days"
                          className="w-full bg-white border border-[#CBD5E1] rounded px-2 py-1 text-xs"
                        />
                      </div>
                      <div className="col-span-1 text-right pt-3">
                        <button
                          type="button"
                          onClick={() => removePrescribedRow(idx)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Section: Clinical Advice, Next Visit & Billing */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-white border border-[#E8ECF0] rounded-xl space-y-3 shadow-xs">
                <span className="font-bold text-[#0284C7] block">4. Advice & Next Due Date</span>
                <div>
                  <label className="text-[11px] font-semibold block mb-1 text-[#475569]">
                    Next Visit / Vaccine Due Date
                  </label>
                  <input
                    type="date"
                    value={nextVisitDate}
                    onChange={(e) => setNextVisitDate(e.target.value)}
                    className="w-full bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg px-3 py-1.5 focus:border-[#72CFF2] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold block mb-1 text-[#475569]">
                    Clinical Advice & Laboratory Tests
                  </label>
                  <textarea
                    rows={3}
                    value={advice}
                    onChange={(e) => setAdvice(e.target.value)}
                    placeholder="e.g. Blood Profile: Basic + BP + RBS. Keep warm, oral rehydration solution..."
                    className="w-full bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg p-2.5 focus:border-[#72CFF2] focus:outline-none"
                  />
                </div>
              </div>

              <div className="p-4 bg-white border border-[#E8ECF0] rounded-xl space-y-3 shadow-xs">
                <span className="font-bold text-[#0284C7] block">5. Itemized Charges & Total</span>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[#64748B]">Consultation Fee:</span>
                    <input
                      type="number"
                      value={consultationFee}
                      onChange={(e) => setConsultationFee(e.target.value)}
                      className="w-24 bg-[#F8FAFC] border border-[#CBD5E1] rounded px-2 py-1 text-right text-xs font-semibold"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#64748B]">Administered Medicines:</span>
                    <span className="font-bold text-[#25242A]">₹{totalMedsCharge.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#64748B]">Special Discount:</span>
                    <input
                      type="number"
                      value={discount}
                      onChange={(e) => setDiscount(e.target.value)}
                      className="w-24 bg-[#F8FAFC] border border-[#CBD5E1] rounded px-2 py-1 text-right text-xs font-semibold"
                    />
                  </div>
                  <div className="pt-2 border-t border-[#E2E8F0] flex items-center justify-between text-sm">
                    <span className="font-extrabold text-[#25242A]">Grand Total:</span>
                    <span className="font-black text-emerald-600">₹{grandTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E8ECF0]">
              <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button
                variant="secondary"
                onClick={() => handleSubmitTreatment(true)}
                disabled={isSubmitting}
              >
                Save Draft
              </Button>
              <Button
                className="bg-[#72CFF2] text-[#25242A] hover:bg-[#5bbfe2] font-bold"
                onClick={() => handleSubmitTreatment(false)}
                disabled={isSubmitting}
                icon={isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              >
                {isSubmitting ? 'Recording Treatment...' : 'Finalize Treatment & Deduct Stock'}
              </Button>
            </div>
          </div>
        )}

        {/* Tab 2: Prescription Report View (Matches Prescription Format.docx) */}
        {/* Tab 2: Prescription Report View (Matches Prescription Format.docx) */}
        {activeTab === 'prescription' && (
          <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex items-center justify-between p-3 bg-[#F8FAFC] border border-[#E8ECF0] rounded-xl print:hidden">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#0284C7] flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Official Veterinary Prescription
                </span>
                <span className="text-[11px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                  Matches Clinical Format
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handlePrint}
                  icon={<Printer className="w-3.5 h-3.5" />}
                >
                  Print Slip
                </Button>
                <Button
                  size="sm"
                  className="bg-emerald-600 text-white hover:bg-emerald-700 font-bold"
                  onClick={handleDownloadPdf}
                  icon={<Download className="w-3.5 h-3.5" />}
                >
                  Download PDF
                </Button>
              </div>
            </div>

            {/* Printable Prescription Document matching Prescription Format.docx layout */}
            <div
              id="printable-prescription"
              className="bg-white border-2 border-[#CBD5E1] p-8 rounded-xl shadow-lg font-serif text-slate-900 max-w-3xl mx-auto space-y-4 relative"
              style={{ minHeight: '840px' }}
            >
              {/* Top ISO Certification Header */}
              <div className="text-right text-xs font-bold underline font-sans mb-1 text-slate-800">
                An ISO 9001:2015 Certified Clinic
              </div>

              {/* Header: Stylized Clinic Name (Left) and Doctor Details (Right) */}
              <div className="flex items-start justify-between pb-1">
                <div>
                  <h1
                    className="text-3xl font-extrabold tracking-tight"
                    style={{
                      color: '#336699',
                      fontFamily: 'system-ui, -apple-system, sans-serif',
                      textShadow: '2px 2px 3px rgba(0, 0, 0, 0.15)',
                    }}
                  >
                    Healthy Paws Pet Clinic
                  </h1>
                </div>

                <div className="text-right italic font-serif text-xs leading-tight text-slate-800 space-y-0.5">
                  <p className="font-bold text-sm not-italic font-sans">{doctorName}</p>
                  <p>{doctorQualifications}</p>
                  <p>Regd No. {doctorRegdNo}</p>
                  <p className="text-[10px] text-slate-600">(LMIVA, LMAPPA-UP, LMVAI)</p>
                  <p className="text-[10px] text-slate-600">(LMPLRC-NVC, MCACT-AWBI)</p>
                </div>
              </div>

              {/* Patient Bar (Monotype Corsiva / cursive style with top and bottom lines) */}
              <div className="border-t border-black my-1" />
              <div
                className="text-[13px] leading-relaxed italic underline space-y-1 py-0.5"
                style={{ fontFamily: '"Monotype Corsiva", "Brush Script MT", Georgia, cursive, serif' }}
              >
                <div className="flex flex-wrap items-center justify-between">
                  <span>
                    Pet Name: <strong>{appointment.petName}</strong> (
                    {appointment.breed || appointment.petType || 'CB'}), Age:{' '}
                    {appointment.age || '04 Years'}, Gender: {appointment.gender || 'Female'}, Date:{' '}
                    {appointment.appointmentDate || new Date().toLocaleDateString('en-GB')}{' '}
                    {appointment.appointmentTime || ''} (V-1)
                  </span>
                </div>
                <div>
                  Pet Owner: <strong>{appointment.customerName || appointment.ownerName || 'Pet Parent'}</strong>,{' '}
                  {appointment.customerAddress || 'Kanpur'} Mobile:{' '}
                  {appointment.customerPhone || appointment.ownerPhone || ''}
                </div>
              </div>
              <div className="border-t border-black my-1" />

              {/* Main Clinical Body: Two Columns with Watermark */}
              <div className="relative min-h-[420px] flex py-2">
                {/* Background Watermark */}
                <div
                  className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0"
                  style={{ opacity: 0.13 }}
                >
                  <img
                    src="/prescription/watermark_logo.jpg"
                    alt="Healthy Paws Watermark"
                    className="max-w-[80%] max-h-[80%] object-contain"
                  />
                </div>

                {/* Left Column: Vitals, History, Clinical Signs, Prognosis, Next Visit */}
                <div className="w-[38%] border-r border-black pr-4 relative z-10 flex flex-col justify-between text-xs">
                  <div className="space-y-4">
                    <div>
                      <p className="font-bold text-slate-900">H/O</p>
                      <p className="text-slate-700 text-xs mt-0.5 leading-snug">
                        {history || 'Normal activity, routine diet'}
                      </p>
                    </div>

                    <div>
                      <p className="font-bold text-slate-900">
                        Temp.{' '}
                        <span className="font-normal font-sans">
                          {temperature
                            ? temperature.includes('F') || temperature.includes('C')
                              ? temperature
                              : `${temperature} F`
                            : '101.2 F'}
                        </span>
                      </p>
                    </div>

                    {(clinicalSigns || diagnosis) && (
                      <div>
                        <p className="text-slate-800 leading-snug">{clinicalSigns || diagnosis}</p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3 pt-6">
                    <div>
                      <p className="font-bold text-slate-900">
                        Weight:{' '}
                        <span className="font-normal font-sans">
                          {weight
                            ? weight.toLowerCase().includes('kg')
                              ? weight
                              : `${weight} Kgs`
                            : '09.100 Kgs'}
                        </span>
                      </p>
                    </div>

                    <div>
                      <p className="font-bold" style={{ color: '#FF0000' }}>
                        Prognosis {prognosis || 'Guarded'}
                      </p>
                    </div>

                    <div>
                      <p className="font-bold text-slate-900">
                        Next Visit:{' '}
                        <span className="font-normal font-sans">{nextVisitDate || 'As advised'}</span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Right Column: Rx, Injections, Prescribed Medications, Advice */}
                <div className="w-[62%] pl-6 relative z-10 flex flex-col justify-between">
                  <div className="space-y-3">
                    {/* Large Rx symbol */}
                    <div className="text-3xl font-extrabold font-serif text-black leading-none mb-3">
                      Rx
                    </div>

                    {/* Administered Injections */}
                    {administeredItems.length > 0 && (
                      <div className="space-y-1 text-xs font-sans">
                        {administeredItems.map((item, idx) => (
                          <p key={idx} className="font-semibold text-slate-900">
                            Inj. {item.name || 'Medicine'} {item.dosage || ''} {item.route || 'IM'}
                          </p>
                        ))}
                      </div>
                    )}

                    {/* Prescribed Take-Home Medicines */}
                    {prescribedItems.length > 0 && (
                      <div className="space-y-1.5 pt-2 text-xs font-sans">
                        {prescribedItems.map((item, idx) => (
                          <div key={idx} className="text-slate-900">
                            <p className="font-semibold">
                              {item.name} {item.dosage ? `(${item.dosage})` : ''}
                            </p>
                            {item.instructions && (
                              <p className="text-[11px] text-slate-600 pl-3 italic">
                                - {item.instructions}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {administeredItems.length === 0 && prescribedItems.length === 0 && (
                      <div className="space-y-1 text-xs font-sans">
                        <p className="font-semibold text-slate-900">Inj. Oframax 225 mg IM</p>
                        <p className="font-semibold text-slate-900">Inj. Lytadine 0.7 ml IM</p>
                        <p className="font-semibold text-slate-900">Inj. Krontic - 4 0.4 ml IM</p>
                      </div>
                    )}
                  </div>

                  {/* Advice Section */}
                  <div className="pt-4 font-serif">
                    <p className="font-bold text-xs text-slate-900 mb-0.5">Advice:</p>
                    <div className="text-xs text-slate-800 pl-3 leading-relaxed whitespace-pre-wrap">
                      {advice
                        ? advice.startsWith('1)')
                          ? advice
                          : `1) ${advice}`
                        : '1) Blood Profile: Basic + BP + RBS'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer: Address, Emergency Contacts, Disclaimer, ISO Badge & QR Code */}
              <div className="pt-2 border-t border-black text-[10px] leading-snug">
                <div className="flex items-end justify-between gap-4">
                  {/* Left/Middle: Address, Emergency Contact, Disclaimer */}
                  <div className="space-y-0.5 max-w-[78%] italic font-serif text-slate-800">
                    <p className="not-italic font-medium">
                      <strong>Address:</strong> 620/112, W Block, Keshav Nagar (Near Shri Guest House),
                      Kanpur, Uttar Pradesh – 208014
                    </p>
                    <p className="not-italic">
                      <span className="font-bold" style={{ color: '#FF0000' }}>
                        Emergency Contact No. 7568308808, 9460674066
                      </span>{' '}
                      • <strong>Timing:</strong> 10:30AM to 01:00PM, 05:00PM to 09:00PM
                    </p>
                    <p className="font-bold not-italic pt-0.5">Disclaimer:</p>
                    <ol className="list-decimal pl-4 space-y-0.5 text-[9px] leading-tight text-slate-700">
                      <li>
                        This prescription is issued based on clinical judgment and available
                        investigations. Treatment outcome may vary depending on the patient’s condition
                        and response to therapy. Follow-up evaluation is advised as recommended. Any
                        typing discrepancies must be reported within three days for correction.
                      </li>
                      <li>The patient’s and owner’s identities have not been independently verified.</li>
                    </ol>
                  </div>

                  {/* Right: Golden ISO Seal Badge & QR Code */}
                  <div className="flex items-center gap-2 shrink-0">
                    <img
                      src="/prescription/iso_certified_badge.png"
                      alt="ISO 9001:2015 Certified"
                      className="w-14 h-14 object-contain"
                    />
                    <img
                      src="/prescription/clinic_qr_code.jpg"
                      alt="Healthy Paws QR Code"
                      className="w-12 h-12 object-contain"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
