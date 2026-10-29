'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Printer, Download, ArrowLeft, Loader2 } from 'lucide-react';
import { safeFetchJson } from '@/lib/safeFetch';

interface PrescriptionDetails {
  appointmentId: string;
  petName: string;
  petRegistrationNumber?: string;
  breed?: string;
  species?: string;
  age?: string;
  gender?: string;
  consultationDate?: string;
  ownerName?: string;
  ownerPhone?: string;
  ownerAddress?: string;
  doctorName?: string;
  doctorQualifications?: string;
  doctorRegdNo?: string;
  temperature?: string;
  weight?: string;
  history?: string;
  clinicalSigns?: string;
  prognosis?: string;
  diagnosis?: string;
  administeredItems?: Array<{ name?: string; dosage?: string; route?: string }>;
  prescribedItems?: Array<{ name?: string; dosage?: string; instructions?: string }>;
  advice?: string;
  nextVisitDate?: string;
  clinicAddress?: string;
  emergencyContacts?: string;
  clinicTimings?: string;
  disclaimer?: string;
}

export default function AppointmentPrescriptionPrintPage() {
  const params = useParams();
  const router = useRouter();
  const appointmentId = params?.id as string;

  const [prescription, setPrescription] = useState<PrescriptionDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!appointmentId) return;

    const fetchPrescription = async () => {
      try {
        setLoading(true);
        const { ok, data, error: fetchErr } = await safeFetchJson<any>(`/api/clinic/appointments/${appointmentId}/prescription?format=json`);
        if (!ok || !data?.success) {
          throw new Error(fetchErr || data?.error || 'Failed to load prescription.');
        }
        setPrescription(data.prescription);
      } catch (err: any) {
        setError(err.message || 'Error loading prescription.');
      } finally {
        setLoading(false);
      }
    };

    fetchPrescription();
  }, [appointmentId]);

  // Auto-trigger print once data and images have loaded
  useEffect(() => {
    if (prescription && !loading) {
      const timer = setTimeout(() => {
        window.print();
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [prescription, loading]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-3">
        <Loader2 className="w-8 h-8 text-[#0284C7] animate-spin" />
        <p className="text-sm font-semibold text-slate-600">Generating Prescription Slip...</p>
      </div>
    );
  }

  if (error || !prescription) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4 p-4">
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl max-w-md text-center text-sm font-medium">
          {error || 'Prescription not found.'}
        </div>
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg text-xs font-bold hover:bg-slate-700"
        >
          <ArrowLeft className="w-4 h-4" /> Go Back
        </button>
      </div>
    );
  }

  const {
    petName = 'Patient',
    breed = 'CB',
    age = '04 Years',
    gender = 'Female',
    consultationDate = '16-10-2026 10:30 PM (V-1)',
    ownerName = 'Pet Parent',
    ownerAddress = 'Kanpur',
    ownerPhone = '',
    doctorName = 'Dr. Ashwani Kumar Singh',
    doctorQualifications = '(B.V.Sc & A.H) (RAJUVAS, Bikaner)',
    doctorRegdNo = 'UPVC 6394',
    temperature = '101.2 F',
    weight = '09.100 Kgs',
    history = '',
    clinicalSigns = '',
    prognosis = 'Guarded',
    nextVisitDate = '',
    administeredItems = [],
    prescribedItems = [],
    advice = 'Blood Profile: Basic + BP + RBS',
    clinicAddress = '620/112, W Block, Keshav Nagar (Near Shri Guest House), Kanpur, Uttar Pradesh – 208014',
    emergencyContacts = '7568308808, 9460674066',
    clinicTimings = '10:30AM to 01:00PM, 05:00PM to 09:00PM',
  } = prescription;

  return (
    <div className="min-h-screen bg-slate-100 py-6 px-4 print:p-0 print:bg-white text-slate-900">
      {/* Top Floating Control Bar (Hidden when printing) */}
      <div className="max-w-[210mm] mx-auto mb-4 flex items-center justify-between bg-white border border-slate-200 shadow-sm rounded-xl px-4 py-3 print:hidden">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Appointments
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#0284C7] hover:bg-[#0369a1] text-white text-xs font-bold rounded-lg shadow-sm transition-colors"
          >
            <Printer className="w-4 h-4" /> Print Prescription
          </button>
          <a
            href={`/api/clinic/appointments/${appointmentId}/prescription?format=pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors"
          >
            <Download className="w-4 h-4" /> Download Official PDF
          </a>
        </div>
      </div>

      {/* A4 Prescription Container matching Prescription Format.docx layout */}
      <div
        id="printable-prescription"
        className="w-full max-w-[210mm] min-h-[297mm] mx-auto bg-white p-8 sm:p-12 shadow-md print:shadow-none print:p-0 print:m-0 flex flex-col justify-between relative font-serif"
        style={{ boxSizing: 'border-box' }}
      >
        {/* Top ISO Certification Header */}
        <div>
          <div className="text-right text-xs sm:text-sm font-bold underline font-sans mb-3 text-slate-800">
            An ISO 9001:2015 Certified Clinic
          </div>

          {/* Header Band: Stylized Title (Left) and Doctor Details (Right) */}
          <div className="flex items-start justify-between pb-3">
            <div>
              <h1
                className="text-3xl sm:text-4xl font-extrabold tracking-tight"
                style={{
                  color: '#336699',
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                  textShadow: '2px 2px 3px rgba(0, 0, 0, 0.15)',
                }}
              >
                Healthy Paws Pet Clinic
              </h1>
            </div>

            <div className="text-right italic font-serif text-xs sm:text-sm leading-tight text-slate-800 space-y-0.5">
              <p className="font-bold text-sm sm:text-base not-italic font-sans">{doctorName}</p>
              <p>{doctorQualifications}</p>
              <p>Regd No. {doctorRegdNo}</p>
              <p className="text-[11px] text-slate-600">(LMIVA, LMAPPA-UP, LMVAI)</p>
              <p className="text-[11px] text-slate-600">(LMPLRC-NVC, MCACT-AWBI)</p>
            </div>
          </div>

          {/* Patient Details Bar with Top and Bottom Lines */}
          <div className="border-t border-black my-1.5" />
          <div
            className="text-xs sm:text-[13px] leading-relaxed italic underline space-y-1 py-1"
            style={{ fontFamily: '"Monotype Corsiva", "Brush Script MT", Georgia, cursive, serif' }}
          >
            <div className="flex flex-wrap items-center justify-between">
              <span>
                Pet Name: <strong>{petName}</strong> ({breed}), Age: {age}, Gender: {gender}, Date:{' '}
                {consultationDate}
              </span>
            </div>
            <div>
              Pet Owner: <strong>{ownerName}</strong>, {ownerAddress} Mobile: {ownerPhone}
            </div>
          </div>
          <div className="border-t border-black my-1.5" />
        </div>

        {/* Prescription Main Body with Central Dividing Line and Watermark */}
        <div className="relative flex-1 my-4 min-h-[460px] flex">
          {/* Background Watermark */}
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0"
            style={{ opacity: 0.14 }}
          >
            <img
              src="/prescription/watermark_logo.jpg"
              alt="Healthy Paws Watermark"
              className="max-w-[85%] max-h-[85%] object-contain"
            />
          </div>

          {/* Left Column: Vitals, History, Clinical Signs, Prognosis, Next Visit */}
          <div className="w-[38%] border-r border-black pr-4 relative z-10 flex flex-col justify-between py-1 text-xs sm:text-sm">
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
                    {temperature.includes('F') || temperature.includes('C') ? temperature : `${temperature} F`}
                  </span>
                </p>
              </div>

              {clinicalSigns && (
                <div>
                  <p className="text-slate-800 leading-snug">{clinicalSigns}</p>
                </div>
              )}
            </div>

            <div className="space-y-3 pt-6">
              <div>
                <p className="font-bold text-slate-900">
                  Weight:{' '}
                  <span className="font-normal font-sans">
                    {weight.toLowerCase().includes('kg') ? weight : `${weight} Kgs`}
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

          {/* Right Column: Rx, Injections, Medications, Advice */}
          <div className="w-[62%] pl-6 relative z-10 flex flex-col justify-between py-1">
            <div className="space-y-4">
              {/* Large Rx symbol */}
              <div className="text-4xl font-extrabold font-serif text-black leading-none mb-4">
                Rx
              </div>

              {/* Injections Administered */}
              {administeredItems.length > 0 && (
                <div className="space-y-1.5 text-xs sm:text-sm font-sans">
                  {administeredItems.map((item, idx) => (
                    <p key={idx} className="font-semibold text-slate-900">
                      Inj. {item.name || 'Medicine'} {item.dosage || ''} {item.route || 'IM'}
                    </p>
                  ))}
                </div>
              )}

              {/* Prescribed Take-Home Medicines */}
              {prescribedItems.length > 0 && (
                <div className="space-y-2 pt-2 text-xs sm:text-sm font-sans">
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
                <div className="space-y-1.5 text-xs sm:text-sm font-sans">
                  <p className="font-semibold text-slate-900">Inj. Oframax 225 mg IM</p>
                  <p className="font-semibold text-slate-900">Inj. Lytadine 0.7 ml IM</p>
                  <p className="font-semibold text-slate-900">Inj. Krontic - 4 0.4 ml IM</p>
                </div>
              )}
            </div>

            {/* Advice Section */}
            <div className="pt-6 font-serif">
              <p className="font-bold text-xs sm:text-sm text-slate-900 mb-1">Advice:</p>
              <div className="text-xs sm:text-sm text-slate-800 pl-3 leading-relaxed whitespace-pre-wrap">
                {advice.startsWith('1)') ? advice : `1) ${advice}`}
              </div>
            </div>
          </div>
        </div>

        {/* Footer: Address, Emergency Contacts, Disclaimer, ISO Seal & QR Code */}
        <div className="mt-auto pt-2 border-t border-black text-[10px] sm:text-[11px] leading-snug">
          <div className="flex items-end justify-between gap-4">
            {/* Left/Middle: Clinic Contact & Legal Disclaimer */}
            <div className="space-y-1 max-w-[78%] italic font-serif text-slate-800">
              <p className="not-italic font-medium">
                <strong>Address:</strong> {clinicAddress}
              </p>
              <p className="not-italic">
                <span className="font-bold" style={{ color: '#FF0000' }}>
                  Emergency Contact No. {emergencyContacts}
                </span>{' '}
                • <strong>Timing:</strong> {clinicTimings}
              </p>
              <p className="font-bold not-italic pt-0.5">Disclaimer:</p>
              <ol className="list-decimal pl-4 space-y-0.5 text-[9.5px] leading-tight text-slate-700">
                <li>
                  This prescription is issued based on clinical judgment and available investigations.
                  Treatment outcome may vary depending on the patient’s condition and response to therapy.
                  Follow-up evaluation is advised as recommended. Any typing discrepancies must be
                  reported within three days for correction.
                </li>
                <li>The patient’s and owner’s identities have not been independently verified.</li>
              </ol>
            </div>

            {/* Right: Golden ISO Seal Badge & QR Code */}
            <div className="flex items-center gap-2 shrink-0">
              <img
                src="/prescription/iso_certified_badge.png"
                alt="ISO 9001:2015 Certified"
                className="w-14 h-14 sm:w-16 sm:h-16 object-contain"
              />
              <img
                src="/prescription/clinic_qr_code.jpg"
                alt="Healthy Paws QR Code"
                className="w-12 h-12 sm:w-14 sm:h-14 object-contain"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
