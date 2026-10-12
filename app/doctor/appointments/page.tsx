'use client';

import React, { useState, useEffect } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Search, Calendar, Clock, CheckCircle, Dog, User, Phone, Eye, AlertCircle, Loader2, Stethoscope, Filter } from 'lucide-react';
import { useAuth } from '@/lib/authContext';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore';

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
  petName: string;
  petType?: string;
  serviceName?: string;
  service?: string;
  doctorId?: string;
  doctorName?: string;
  appointmentDate?: string;
  date?: string;
  appointmentTime?: string;
  time?: string;
  notes?: string;
  status: 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled';
  createdAt?: any;
  updatedAt?: any;
}

export default function DoctorAppointmentsPage() {
  const { profile } = useAuth();
  const [appointments, setAppointments] = useState<DoctorAppointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedAppointment, setSelectedAppointment] = useState<DoctorAppointment | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

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

          // Filter to appointments relevant to this doctor
          list = list.filter((apt) => {
            const matchesId = apt.doctorId && apt.doctorId === docUid;
            const matchesName =
              docName &&
              apt.doctorName &&
              (apt.doctorName.toLowerCase().includes(docName) ||
                docName.includes(apt.doctorName.toLowerCase().replace(/^dr\.?\s*/i, '')));
            const matchesClinicShop = docShopId && apt.shopId === docShopId;
            const matchesClinicBiz = docBizId && apt.businessId === docBizId;

            // Direct assignment takes priority, or general appointment at the doctor's assigned clinic
            return matchesId || matchesName || matchesClinicShop || matchesClinicBiz;
          });

          // Sort by creation time desc
          list.sort((a, b) => {
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

  // 2. Status updater in Firestore
  const updateStatus = async (id: string, newStatus: DoctorAppointment['status']) => {
    try {
      setIsUpdating(true);
      await updateDoc(doc(db, 'appointments', id), {
        status: newStatus,
        updatedAt: serverTimestamp(),
      });

      if (selectedAppointment && selectedAppointment.id === id) {
        setSelectedAppointment((prev) => (prev ? { ...prev, status: newStatus } : null));
      }
    } catch (err) {
      console.error('Failed to update status:', err);
      alert('Failed to update status. Please check permissions.');
    } finally {
      setIsUpdating(false);
    }
  };

  const filtered = appointments.filter((a) => {
    const pet = (a.petName || '').toLowerCase();
    const owner = (a.customerName || a.ownerName || '').toLowerCase();
    const service = (a.serviceName || a.service || '').toLowerCase();
    const aptId = (a.appointmentId || a.id || '').toLowerCase();
    const query = searchTerm.toLowerCase();

    const matchesSearch =
      pet.includes(query) ||
      owner.includes(query) ||
      service.includes(query) ||
      aptId.includes(query);

    const matchesStatus = statusFilter === 'All' || a.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <PageHeader
        title="My Patient Appointments"
        subtitle="View and manage your assigned pet patient consultations and schedule."
      />

      <Card padding="p-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative w-full max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#737780]" />
            <input
              type="text"
              placeholder="Search pet, owner, service, or booking ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#F8FAFC] border border-[#E8ECF0] focus:border-[#72CFF2] rounded-xl pl-10 pr-4 py-2 text-xs text-[#25242A] focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <Filter className="w-4 h-4 text-[#737780]" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-[#F8FAFC] border border-[#E8ECF0] rounded-xl px-3 py-2 text-xs text-[#25242A] font-medium"
            >
              <option value="All">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Confirmed">Confirmed</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </Card>

      <Card padding="p-0" className="overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-12 text-[#737780]">
            <Loader2 className="w-8 h-8 animate-spin text-[#72CFF2] mb-2" />
            <p className="text-xs font-semibold">Loading consultation appointments...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-[#737780]">
            <Calendar className="w-10 h-10 text-[#CBD5E1] mb-2" />
            <p className="text-sm font-bold text-[#25242A]">No appointments found</p>
            <p className="text-xs mt-1">Patient consultations assigned to you will appear here in real time.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8FAFC] text-[#737780] uppercase tracking-wider text-[10px] font-bold border-b border-[#E8ECF0]">
                <tr>
                  <th className="py-3.5 px-4">Booking Ref</th>
                  <th className="py-3.5 px-4">Pet Patient</th>
                  <th className="py-3.5 px-4">Owner Name</th>
                  <th className="py-3.5 px-4">Service</th>
                  <th className="py-3.5 px-4">Date & Time</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8ECF0]">
                {filtered.map((apt) => {
                  const ownerName = apt.customerName || apt.ownerName || 'Pet Parent';
                  const ownerPhone = apt.customerPhone || apt.ownerPhone || 'N/A';
                  const service = apt.serviceName || apt.service || 'Consultation';
                  const date = apt.appointmentDate || apt.date || 'TBD';
                  const time = apt.appointmentTime || apt.time || 'TBD';
                  const aptId = apt.appointmentId || `#${apt.id.slice(-6).toUpperCase()}`;

                  return (
                    <tr key={apt.id} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-[#0284C7]">
                        {aptId}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <Dog className="w-3.5 h-3.5 text-[#0284C7]" />
                          <div>
                            <p className="font-bold text-[#25242A]">{apt.petName}</p>
                            <p className="text-[11px] text-[#737780]">{apt.petType || 'Pet'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-semibold text-[#25242A]">{ownerName}</p>
                        <p className="text-[#737780] text-[11px]">{ownerPhone}</p>
                      </td>
                      <td className="py-3 px-4 font-bold text-[#0284C7]">{service}</td>
                      <td className="py-3 px-4 text-[#737780]">
                        <p className="font-bold text-[#25242A]">{date}</p>
                        <p className="text-[11px]">{time}</p>
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={apt.status || 'Pending'} />
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedAppointment(apt)}
                            className="p-1.5 text-[#737780] hover:text-[#0284C7] hover:bg-[#F1F5F9] rounded-lg transition-colors"
                            title="View Case Notes"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {apt.status === 'Pending' && (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => updateStatus(apt.id, 'Confirmed')}
                              disabled={isUpdating}
                            >
                              Confirm
                            </Button>
                          )}
                          {apt.status !== 'Completed' && (
                            <Button
                              size="sm"
                              className="bg-[#72CFF2] text-[#25242A] hover:bg-[#5bbfe2]"
                              onClick={() => updateStatus(apt.id, 'Completed')}
                              disabled={isUpdating}
                              icon={<CheckCircle className="w-3.5 h-3.5" />}
                            >
                              Mark Completed
                            </Button>
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

      {/* Appointment Detail Modal for Doctor */}
      {selectedAppointment && (
        <Modal
          isOpen={!!selectedAppointment}
          onClose={() => setSelectedAppointment(null)}
          title={`Patient Case - ${
            selectedAppointment.appointmentId || `#${selectedAppointment.id.slice(-6).toUpperCase()}`
          }`}
          subtitle="Consultation schedule, symptoms, and clinical status."
          maxWidth="lg"
        >
          <div className="space-y-5 p-1 text-xs">
            {/* Status Banner */}
            <div className="flex items-center justify-between p-3.5 bg-[#F8FAFC] border border-[#E8ECF0] rounded-xl">
              <div>
                <span className="text-[11px] text-[#737780] uppercase tracking-wider font-bold">Status</span>
                <div className="mt-1">
                  <StatusBadge status={selectedAppointment.status || 'Pending'} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-[#737780]">Change To:</span>
                <select
                  value={selectedAppointment.status}
                  onChange={(e) => updateStatus(selectedAppointment.id, e.target.value as any)}
                  disabled={isUpdating}
                  className="bg-white border border-[#CBD5E1] rounded-lg px-2.5 py-1 text-xs font-semibold text-[#25242A] focus:outline-none focus:border-[#72CFF2]"
                >
                  <option value="Pending">Pending</option>
                  <option value="Confirmed">Confirmed</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            {/* Patient & Owner Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3.5 bg-white border border-[#E8ECF0] rounded-xl space-y-2">
                <div className="flex items-center gap-1.5 text-[#0284C7] font-bold">
                  <Dog className="w-4 h-4" />
                  <span>Pet Patient</span>
                </div>
                <div>
                  <p className="text-sm font-bold text-[#25242A]">{selectedAppointment.petName}</p>
                  <p className="text-[#737780]">{selectedAppointment.petType || 'Not specified'}</p>
                </div>
              </div>

              <div className="p-3.5 bg-white border border-[#E8ECF0] rounded-xl space-y-2">
                <div className="flex items-center gap-1.5 text-[#737780] font-bold">
                  <User className="w-4 h-4" />
                  <span>Pet Parent Contact</span>
                </div>
                <div>
                  <p className="text-sm font-bold text-[#25242A]">
                    {selectedAppointment.customerName || selectedAppointment.ownerName || 'Pet Parent'}
                  </p>
                  <p className="text-[#737780]">
                    Phone: {selectedAppointment.customerPhone || selectedAppointment.ownerPhone || 'N/A'}
                  </p>
                </div>
              </div>
            </div>

            {/* Service & Schedule */}
            <div className="p-3.5 bg-white border border-[#E8ECF0] rounded-xl space-y-3">
              <div className="flex items-center gap-1.5 text-[#0284C7] font-bold">
                <Stethoscope className="w-4 h-4" />
                <span>Consultation Specification</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-[#25242A]">
                <div>
                  <span className="text-[10px] text-[#737780] uppercase tracking-wider font-bold">Requested Service</span>
                  <p className="font-semibold text-xs mt-0.5">
                    {selectedAppointment.serviceName || selectedAppointment.service || 'Veterinary Care'}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-[#737780] uppercase tracking-wider font-bold">Assigned Specialist</span>
                  <p className="font-semibold text-xs mt-0.5">
                    {selectedAppointment.doctorName || 'Any Specialist'}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-[#737780] uppercase tracking-wider font-bold">Date</span>
                  <p className="font-semibold text-xs mt-0.5">
                    {selectedAppointment.appointmentDate || selectedAppointment.date || 'TBD'}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-[#737780] uppercase tracking-wider font-bold">Time Slot</span>
                  <p className="font-semibold text-xs mt-0.5">
                    {selectedAppointment.appointmentTime || selectedAppointment.time || 'TBD'}
                  </p>
                </div>
              </div>

              {selectedAppointment.notes && (
                <div className="pt-2 border-t border-[#F1F5F9]">
                  <span className="text-[10px] text-[#737780] uppercase tracking-wider font-bold">Owner's Reported Symptoms & Notes</span>
                  <p className="text-xs text-[#334155] mt-1 bg-[#F8FAFC] p-2.5 rounded-lg border border-[#E8ECF0]">
                    {selectedAppointment.notes}
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setSelectedAppointment(null)}>
                Close
              </Button>
              {selectedAppointment.status !== 'Completed' && (
                <Button
                  className="bg-[#72CFF2] text-[#25242A] hover:bg-[#5bbfe2]"
                  onClick={() => updateStatus(selectedAppointment.id, 'Completed')}
                  disabled={isUpdating}
                  icon={<CheckCircle className="w-3.5 h-3.5" />}
                >
                  Mark Completed
                </Button>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
