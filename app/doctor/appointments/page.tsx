'use client';

import React, { useState, useEffect } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import {
  Search,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  Dog,
  User,
  Phone,
  Eye,
  AlertCircle,
  Loader2,
  Stethoscope,
  Filter,
  FileText,
  Printer,
  ChevronRight,
  Plus,
} from 'lucide-react';
import { useAuth } from '@/lib/authContext';
import { db } from '@/lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { AppointmentTreatmentModal } from '@/components/clinic/AppointmentTreatmentModal';
import { BookWalkInAppointmentModal } from '@/components/clinic/BookWalkInAppointmentModal';
import { safeFetchJson } from '@/lib/safeFetch';

export interface DoctorAppointment {
  id: string;
  appointmentId?: string;
  userId?: string;
  shopId?: string;
  businessId?: string;
  businessName?: string;
  customerName?: string;
  ownerName?: string;
  customerPhone?: string;
  ownerPhone?: string;
  customerAddress?: string;
  petId?: string;
  petName: string;
  petType?: string;
  petRegistrationNumber?: string;
  breed?: string;
  age?: string;
  gender?: string;
  serviceName?: string;
  service?: string;
  doctorId?: string;
  doctorName?: string;
  appointmentDate?: string;
  date?: string;
  appointmentTime?: string;
  time?: string;
  concernCategory?: string;
  symptoms?: string;
  notes?: string;
  status: 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled';
  treatmentId?: string;
  rejectionReason?: string;
  cancelReason?: string;
  isWalkIn?: boolean;
  isUnclaimed?: boolean;
  createdAt?: any;
  updatedAt?: any;
}

export default function DoctorAppointmentsPage() {
  const { profile, user } = useAuth();
  const [appointments, setAppointments] = useState<DoctorAppointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<
    'all' | 'pending' | 'confirmed' | 'today' | 'upcoming' | 'completed' | 'cancelled'
  >('all');

  // Modals
  const [selectedAppointment, setSelectedAppointment] = useState<DoctorAppointment | null>(null);
  const [treatmentModalApt, setTreatmentModalApt] = useState<DoctorAppointment | null>(null);
  const [isWalkInModalOpen, setIsWalkInModalOpen] = useState(false);

  // Rejection Dialog State
  const [rejectingApt, setRejectingApt] = useState<DoctorAppointment | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [actionError, setActionError] = useState('');

  const todayStr = new Date().toISOString().split('T')[0];

  // 1. Real-time Firestore Listener strictly scoped to doctor's clinic / assigned patient visits
  useEffect(() => {
    if (!profile) return;
    setIsLoading(true);

    const docUid = profile.uid;
    const docName = (profile.fullName || '').trim().toLowerCase();
    const docShopId = profile.shopId;
    const docBizId = profile.businessId;

    try {
      const appointmentsRef = collection(db, 'appointments');
      const unsubscribe = onSnapshot(
        appointmentsRef,
        (snapshot) => {
          let list: DoctorAppointment[] = snapshot.docs.map((d) => ({
            id: d.id,
            ...(d.data() as any),
          }));

          // Strict Clinic & Doctor Isolation
          list = list.filter((apt) => {
            const matchesId = apt.doctorId && apt.doctorId === docUid;
            const matchesName =
              docName &&
              apt.doctorName &&
              (apt.doctorName.toLowerCase().includes(docName) ||
                docName.includes(apt.doctorName.toLowerCase().replace(/^dr\.?\s*/i, '')));
            const matchesClinicShop = docShopId && apt.shopId === docShopId;
            const matchesClinicBiz = docBizId && apt.businessId === docBizId;

            // Direct assignment or clinic match
            return matchesId || matchesName || matchesClinicShop || matchesClinicBiz;
          });

          // Sort by creation or appointment date
          list.sort((a, b) => {
            const dateA = a.appointmentDate || a.date || '';
            const dateB = b.appointmentDate || b.date || '';
            if (dateA !== dateB) return dateB.localeCompare(dateA);
            const timeA = new Date(a.createdAt?.toDate?.() || a.createdAt || 0).getTime();
            const timeB = new Date(b.createdAt?.toDate?.() || b.createdAt || 0).getTime();
            return timeB - timeA;
          });

          setAppointments(list);
          setIsLoading(false);
        },
        (error) => {
          console.warn('[Doctor Appointments onSnapshot Warning]', error);
          setIsLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (err) {
      console.error('[Doctor Appointments Error]', err);
      setIsLoading(false);
    }
  }, [profile]);

  // Handle Accept & Confirm with backend slot revalidation
  const handleConfirmAppointment = async (apt: DoctorAppointment) => {
    try {
      setIsUpdating(true);
      setActionError('');
      const idToken = user ? await user.getIdToken() : '';

      const { data, error } = await safeFetchJson<{
        success: boolean;
        error?: string;
        conflict?: boolean;
      }>(`/api/clinic/appointments/${apt.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
        },
        body: JSON.stringify({ action: 'confirm' }),
      });

      if (error || !data?.success) {
        alert(error || data?.error || 'Failed to confirm appointment slot.');
      } else {
        if (selectedAppointment?.id === apt.id) {
          setSelectedAppointment((prev) => (prev ? { ...prev, status: 'Confirmed' } : null));
        }
      }
    } catch (err: any) {
      alert(err.message || 'Network error.');
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle Reject Appointment
  const handleRejectAppointment = async () => {
    if (!rejectingApt) return;
    try {
      setIsUpdating(true);
      const idToken = user ? await user.getIdToken() : '';

      const { data, error } = await safeFetchJson<{ success: boolean; error?: string }>(
        `/api/clinic/appointments/${rejectingApt.id}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
          },
          body: JSON.stringify({
            action: 'reject',
            rejectionReason: rejectionReason.trim() || 'Unavailable at requested time',
          }),
        }
      );

      if (error || !data?.success) {
        alert(error || data?.error || 'Failed to decline appointment.');
      } else {
        setRejectingApt(null);
        setRejectionReason('');
        if (selectedAppointment?.id === rejectingApt.id) {
          setSelectedAppointment(null);
        }
      }
    } catch (err: any) {
      alert(err.message || 'Network error.');
    } finally {
      setIsUpdating(false);
    }
  };

  // Tab Filtering
  const filtered = appointments.filter((a) => {
    const pet = (a.petName || '').toLowerCase();
    const owner = (a.customerName || a.ownerName || '').toLowerCase();
    const service = (a.serviceName || a.service || '').toLowerCase();
    const aptId = (a.appointmentId || a.id || '').toLowerCase();
    const query = searchTerm.toLowerCase();

    const matchesSearch =
      pet.includes(query) || owner.includes(query) || service.includes(query) || aptId.includes(query);

    if (!matchesSearch) return false;

    const aptDate = a.appointmentDate || a.date || '';

    switch (activeTab) {
      case 'pending':
        return a.status === 'Pending';
      case 'confirmed':
        return a.status === 'Confirmed';
      case 'today':
        return aptDate === todayStr && a.status !== 'Cancelled';
      case 'upcoming':
        return aptDate >= todayStr && (a.status === 'Confirmed' || a.status === 'Pending');
      case 'completed':
        return a.status === 'Completed';
      case 'cancelled':
        return a.status === 'Cancelled';
      default:
        return true;
    }
  });

  // Tab counts
  const pendingCount = appointments.filter((a) => a.status === 'Pending').length;
  const confirmedCount = appointments.filter((a) => a.status === 'Confirmed').length;
  const todayCount = appointments.filter(
    (a) => (a.appointmentDate || a.date) === todayStr && a.status !== 'Cancelled'
  ).length;
  const completedCount = appointments.filter((a) => a.status === 'Completed').length;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <PageHeader
        title="Veterinary Appointments & Consultations"
        subtitle="Review booking requests, examine patients, administer treatments, and generate official prescriptions."
        action={
          <Button
            onClick={() => setIsWalkInModalOpen(true)}
            icon={<Plus className="w-4 h-4" />}
            className="bg-[#0284C7] hover:bg-[#0369A1] text-white font-bold shadow-sm"
          >
            + Book Appointment
          </Button>
        }
      />

      {/* Filter Tabs & Search Bar */}
      <Card padding="p-4" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E8ECF0] pb-3 text-xs font-bold">
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'all', label: 'All Bookings', count: appointments.length },
              { id: 'pending', label: 'Pending Requests', count: pendingCount, highlight: pendingCount > 0 },
              { id: 'confirmed', label: 'Confirmed', count: confirmedCount },
              { id: 'today', label: "Today's Schedule", count: todayCount, highlight: todayCount > 0 },
              { id: 'upcoming', label: 'Upcoming' },
              { id: 'completed', label: 'Completed', count: completedCount },
              { id: 'cancelled', label: 'Cancelled / Declined' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                  activeTab === tab.id
                    ? 'bg-[#0284C7] text-white shadow-sm'
                    : 'bg-[#F8FAFC] text-[#64748B] hover:bg-[#F1F5F9] border border-[#E2E8F0]'
                }`}
              >
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                      activeTab === tab.id
                        ? 'bg-white/20 text-white'
                        : tab.highlight
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-[#E2E8F0] text-[#64748B]'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#737780]" />
            <input
              type="text"
              placeholder="Search pet, owner, reg no, ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#F8FAFC] border border-[#CBD5E1] focus:border-[#72CFF2] rounded-xl pl-9 pr-3 py-1.5 text-xs text-[#25242A] focus:outline-none"
            />
          </div>
        </div>
      </Card>

      {/* Appointments List / Table */}
      <Card padding="p-0" className="overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-12 text-[#737780]">
            <Loader2 className="w-8 h-8 animate-spin text-[#72CFF2] mb-2" />
            <p className="text-xs font-semibold">Loading consultation appointments...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-[#737780]">
            <Calendar className="w-10 h-10 text-[#CBD5E1] mb-2" />
            <p className="text-sm font-bold text-[#25242A]">No appointments match the criteria</p>
            <p className="text-xs mt-1">
              {activeTab === 'pending'
                ? 'No pending appointment requests right now.'
                : 'Appointments assigned to you will update here live.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8FAFC] text-[#64748B] uppercase tracking-wider text-[10px] font-bold border-b border-[#E8ECF0]">
                <tr>
                  <th className="py-3.5 px-4">Booking Ref</th>
                  <th className="py-3.5 px-4">Pet Patient & Reg No</th>
                  <th className="py-3.5 px-4">Pet Parent Contact</th>
                  <th className="py-3.5 px-4">Concern / Symptoms</th>
                  <th className="py-3.5 px-4">Date & Slot</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8ECF0]">
                {filtered.map((apt) => {
                  const ownerName = apt.customerName || apt.ownerName || 'Pet Parent';
                  const ownerPhone = apt.customerPhone || apt.ownerPhone || 'N/A';
                  const date = apt.appointmentDate || apt.date || 'TBD';
                  const time = apt.appointmentTime || apt.time || 'TBD';
                  const aptId = apt.appointmentId || `#${apt.id.slice(-6).toUpperCase()}`;
                  const isToday = date === todayStr;

                  return (
                    <tr
                      key={apt.id}
                      className={`hover:bg-[#F8FAFC] transition-colors ${
                        isToday && apt.status !== 'Cancelled' ? 'bg-amber-50/30' : ''
                      }`}
                    >
                      <td className="py-3 px-4 font-mono font-bold text-[#0284C7]">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span>{aptId}</span>
                          {isToday && (
                            <span className="text-[9px] bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded font-bold uppercase">
                              Today
                            </span>
                          )}
                          {apt.isWalkIn && (
                            <span className="text-[9px] bg-purple-100 text-purple-800 px-1.5 py-0.2 rounded font-bold uppercase">
                              Walk-in
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-[#E0F2FE] flex items-center justify-center shrink-0">
                            <Dog className="w-4 h-4 text-[#0284C7]" />
                          </div>
                          <div>
                            <p className="font-bold text-[#25242A]">{apt.petName}</p>
                            <p className="text-[11px] text-[#64748B]">
                              {apt.petRegistrationNumber || 'REG: Pending'} • {apt.breed || apt.petType || 'Pet'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-semibold text-[#25242A]">{ownerName}</p>
                        <p className="text-[#64748B] text-[11px] flex items-center gap-1">
                          <Phone className="w-3 h-3 text-[#94A3B8]" />
                          {ownerPhone}
                        </p>
                      </td>
                      <td className="py-3 px-4 max-w-xs">
                        <p className="font-bold text-[#0284C7] truncate">
                          {apt.concernCategory || apt.serviceName || 'Consultation'}
                        </p>
                        <p className="text-[11px] text-[#64748B] truncate">
                          {apt.symptoms || apt.notes || 'Routine checkup'}
                        </p>
                      </td>
                      <td className="py-3 px-4 text-[#64748B]">
                        <p className="font-bold text-[#25242A] flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-[#0284C7]" />
                          {date}
                        </p>
                        <p className="text-[11px] flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3 text-[#94A3B8]" />
                          {time}
                        </p>
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={apt.status || 'Pending'} />
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Case Notes / View */}
                          <button
                            onClick={() => setSelectedAppointment(apt)}
                            className="p-1.5 text-[#64748B] hover:text-[#0284C7] hover:bg-[#F1F5F9] rounded-lg transition-colors"
                            title="View Case Information"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Pending Actions */}
                          {apt.status === 'Pending' && (
                            <>
                              <Button
                                size="sm"
                                className="bg-emerald-600 text-white hover:bg-emerald-700 font-bold"
                                onClick={() => handleConfirmAppointment(apt)}
                                disabled={isUpdating}
                                icon={<CheckCircle className="w-3.5 h-3.5" />}
                              >
                                Accept
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                className="text-red-600 hover:bg-red-50"
                                onClick={() => setRejectingApt(apt)}
                                disabled={isUpdating}
                                icon={<XCircle className="w-3.5 h-3.5" />}
                              >
                                Reject
                              </Button>
                            </>
                          )}

                          {/* Confirmed Action: Examine & Record Treatment */}
                          {apt.status === 'Confirmed' && (
                            <Button
                              size="sm"
                              className="bg-[#0284C7] text-white hover:bg-[#0369a1] font-bold"
                              onClick={() => setTreatmentModalApt(apt)}
                              icon={<Stethoscope className="w-3.5 h-3.5" />}
                            >
                              Examine & Treat
                            </Button>
                          )}

                          {/* Completed Action: View Prescription & Print Slip */}
                          {apt.status === 'Completed' && (
                            <div className="flex items-center gap-1.5">
                              <Button
                                size="sm"
                                variant="secondary"
                                className="text-[#0284C7] border-[#0284C7]/30 hover:bg-[#E0F2FE] font-bold"
                                onClick={() => setTreatmentModalApt(apt)}
                                icon={<FileText className="w-3.5 h-3.5" />}
                              >
                                Prescription
                              </Button>
                              <a
                                href={`/doctor/appointments/${apt.id}/print`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-[#CBD5E1] rounded-lg text-xs font-bold text-[#25242A] hover:bg-[#F1F5F9] transition-colors shadow-2xs"
                                title="Print Prescription Slip"
                              >
                                <Printer className="w-3.5 h-3.5 text-[#0284C7]" />
                                <span>Print</span>
                              </a>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Appointment Treatment & Prescription Modal */}
      {treatmentModalApt && (
        <AppointmentTreatmentModal
          isOpen={!!treatmentModalApt}
          onClose={() => setTreatmentModalApt(null)}
          appointment={treatmentModalApt}
          onSuccess={() => {
            // Firestore real-time listener will automatically update the table!
          }}
        />
      )}

      {/* Case Details Modal */}
      {selectedAppointment && (
        <Modal
          isOpen={!!selectedAppointment}
          onClose={() => setSelectedAppointment(null)}
          title={`Case File: ${
            selectedAppointment.appointmentId || `#${selectedAppointment.id.slice(-6).toUpperCase()}`
          }`}
          subtitle="Patient registration, symptoms, and appointment details."
          maxWidth="lg"
        >
          <div className="space-y-4 p-1 text-xs text-[#25242A]">
            <div className="flex items-center justify-between p-3 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl">
              <div>
                <span className="text-[10px] text-[#64748B] uppercase tracking-wider font-bold">
                  Status
                </span>
                <div className="mt-1">
                  <StatusBadge status={selectedAppointment.status || 'Pending'} />
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-[#64748B] uppercase tracking-wider font-bold">
                  Clinic
                </span>
                <p className="font-bold text-xs mt-0.5">
                  {selectedAppointment.businessName || 'Healthy Paws Pet Clinic'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-white border border-[#CBD5E1] rounded-xl space-y-1">
                <span className="text-[10px] text-[#64748B] uppercase font-bold">Pet Patient</span>
                <p className="font-bold text-sm text-[#0284C7]">{selectedAppointment.petName}</p>
                <p className="text-[11px] text-[#64748B]">
                  Reg: {selectedAppointment.petRegistrationNumber || 'N/A'} •{' '}
                  {selectedAppointment.breed || selectedAppointment.petType || 'Pet'}
                </p>
              </div>
              <div className="p-3 bg-white border border-[#CBD5E1] rounded-xl space-y-1">
                <span className="text-[10px] text-[#64748B] uppercase font-bold">Pet Parent</span>
                <p className="font-bold text-sm">
                  {selectedAppointment.customerName || selectedAppointment.ownerName}
                </p>
                <p className="text-[11px] text-[#64748B]">
                  Phone: {selectedAppointment.customerPhone || selectedAppointment.ownerPhone}
                </p>
              </div>
            </div>

            <div className="p-3 bg-white border border-[#CBD5E1] rounded-xl space-y-2">
              <span className="text-[10px] text-[#64748B] uppercase font-bold block">
                Appointment Schedule
              </span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[#64748B] text-[11px]">Date:</span>
                  <p className="font-bold">{selectedAppointment.appointmentDate || 'TBD'}</p>
                </div>
                <div>
                  <span className="text-[#64748B] text-[11px]">Time Slot:</span>
                  <p className="font-bold">{selectedAppointment.appointmentTime || 'TBD'}</p>
                </div>
              </div>
              {selectedAppointment.concernCategory && (
                <div className="pt-2 border-t border-[#F1F5F9]">
                  <span className="text-[#64748B] text-[11px]">Primary Concern:</span>
                  <p className="font-semibold text-[#0284C7]">{selectedAppointment.concernCategory}</p>
                </div>
              )}
              {selectedAppointment.symptoms && (
                <div className="pt-2 border-t border-[#F1F5F9]">
                  <span className="text-[#64748B] text-[11px]">Reported Symptoms:</span>
                  <p className="text-xs text-[#334155] mt-0.5 bg-[#F8FAFC] p-2 rounded-lg">
                    {selectedAppointment.symptoms}
                  </p>
                </div>
              )}
              {selectedAppointment.rejectionReason && (
                <div className="pt-2 border-t border-[#F1F5F9] text-red-600 bg-red-50 p-2 rounded-lg">
                  <span className="font-bold">Cancellation / Rejection Reason:</span>
                  <p className="text-xs mt-0.5">{selectedAppointment.rejectionReason}</p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setSelectedAppointment(null)}>
                Close
              </Button>
              {selectedAppointment.status === 'Confirmed' && (
                <Button
                  className="bg-[#0284C7] text-white hover:bg-[#0369a1] font-bold"
                  onClick={() => {
                    const apt = selectedAppointment;
                    setSelectedAppointment(null);
                    setTreatmentModalApt(apt);
                  }}
                  icon={<Stethoscope className="w-3.5 h-3.5" />}
                >
                  Examine & Treat
                </Button>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Rejection Dialog */}
      {rejectingApt && (
        <Modal
          isOpen={!!rejectingApt}
          onClose={() => setRejectingApt(null)}
          title="Decline Appointment Request"
          subtitle={`Pet: ${rejectingApt.petName} • Booking: ${rejectingApt.appointmentId || rejectingApt.id}`}
          maxWidth="sm"
        >
          <div className="space-y-4 p-1 text-xs">
            <p className="text-[#64748B]">
              Please provide an optional reason for declining this appointment request. The pet parent will see this reason in their app.
            </p>
            <div>
              <label className="font-bold block mb-1 text-[#25242A]">Reason for Declining</label>
              <textarea
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g. Fully booked / Doctor in emergency surgery. Please pick another date or slot."
                className="w-full bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl p-2.5 text-xs focus:border-[#72CFF2] focus:outline-none"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setRejectingApt(null)} disabled={isUpdating}>
                Cancel
              </Button>
              <Button
                className="bg-red-600 text-white hover:bg-red-700 font-bold"
                onClick={handleRejectAppointment}
                disabled={isUpdating}
                icon={isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
              >
                Confirm Decline
              </Button>
            </div>
          </div>
        </Modal>
      )}
      {/* Book Appointment Modal for Walk-in Patient */}
      <BookWalkInAppointmentModal
        isOpen={isWalkInModalOpen}
        onClose={() => setIsWalkInModalOpen(false)}
      />
    </div>
  );
}
