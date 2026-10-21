'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import {
  Syringe,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Clock,
  Boxes,
  Loader2,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/authContext';
import { safeFetchJson } from '@/lib/safeFetch';
import { ClinicMedicineItem } from './ClinicInventoryManager';

interface RecordTreatmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  pet: {
    id: string;
    name: string;
    registrationNumber: string;
    breed?: string;
    species?: string;
    ownerName?: string;
    businessId?: string;
    shopId?: string;
  };
  onSuccess?: (treatment: any) => void;
}

export const RecordTreatmentModal: React.FC<RecordTreatmentModalProps> = ({
  isOpen,
  onClose,
  pet,
  onSuccess,
}) => {
  const { profile, business, user } = useAuth();
  const [medicines, setMedicines] = useState<ClinicMedicineItem[]>([]);
  const [isLoadingMedicines, setIsLoadingMedicines] = useState(true);

  // Form inputs
  const [selectedMedId, setSelectedMedId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [administeredAt, setAdministeredAt] = useState('');
  const [dosage, setDosage] = useState('');
  const [nextDueDate, setNextDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [idempotencyKey, setIdempotencyKey] = useState('');

  // Execution state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const targetBizId = profile?.businessId || business?.id || pet.businessId || '';
  const targetShopId = profile?.shopId || business?.shopId || pet.shopId || '';

  // Initialize defaults and idempotency key on open
  useEffect(() => {
    if (isOpen) {
      // Set current date-time for datetime-local (YYYY-MM-DDTHH:mm)
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      setAdministeredAt(`${year}-${month}-${day}T${hours}:${minutes}`);

      // Generate unique idempotency key
      const key = `idem_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      setIdempotencyKey(key);

      setSelectedMedId('');
      setQuantity('1');
      setDosage('');
      setNextDueDate('');
      setNotes('');
      setErrorMessage('');
      setSuccessMessage('');
    }
  }, [isOpen]);

  // Load clinic inventory for authoritative stock
  useEffect(() => {
    if (!isOpen) return;

    setIsLoadingMedicines(true);

    const loadInventory = async () => {
      try {
        const idToken = user ? await user.getIdToken() : '';
        const res = await fetch('/api/clinic/inventory', {
          headers: {
            'Content-Type': 'application/json',
            'x-user-uid': profile?.uid || user?.uid || '',
            ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
          },
        });
        const data = await res.json();
        if (data.success && Array.isArray(data.items)) {
          setMedicines(data.items);
        }
      } catch (_) {}
      setIsLoadingMedicines(false);
    };

    loadInventory();

    // Safe live listener on 'inventory' with silent fallback
    try {
      const colRef = collection(db, 'inventory');
      const q = query(colRef);
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          if (!snapshot.empty) {
            let list: ClinicMedicineItem[] = snapshot.docs.map((d) => {
              const data = d.data();
              return {
                id: d.id,
                name: data.name || '',
                category: data.category || 'Medicine',
                stockQuantity: typeof data.stockQuantity === 'number' ? data.stockQuantity : parseInt(data.stockQuantity || '0', 10),
                unit: data.unit || 'unit',
                batchNumber: data.batchNumber || '',
                expiryDate: data.expiryDate || '',
                lowStockThreshold: typeof data.lowStockThreshold === 'number' ? data.lowStockThreshold : 5,
                businessId: data.businessId || '',
                shopId: data.shopId || '',
                status: data.status || 'active',
              };
            });

            if (profile?.role !== 'super_admin') {
              list = list.filter((item) => {
                const matchBiz = targetBizId && item.businessId === targetBizId;
                const matchShop = targetShopId && item.shopId && item.shopId.toUpperCase() === targetShopId.toUpperCase();
                const unassigned = !item.businessId && !item.shopId;
                return Boolean(matchBiz || matchShop || unassigned);
              });
            }

            list.sort((a, b) => a.name.localeCompare(b.name));
            setMedicines(list);
            setIsLoadingMedicines(false);
          }
        },
        () => {
          setIsLoadingMedicines(false);
        }
      );
      return () => unsubscribe();
    } catch (_) {
      setIsLoadingMedicines(false);
    }
  }, [isOpen, targetBizId, targetShopId, profile?.role, user, profile?.uid]);

  // Selected item details
  const selectedMedicine = medicines.find((m) => m.id === selectedMedId);
  const availableStock = selectedMedicine ? selectedMedicine.stockQuantity : 0;
  const unit = selectedMedicine ? selectedMedicine.unit : 'unit';
  const isVaccine = selectedMedicine?.category.toLowerCase() === 'vaccine';

  const requestedQty = parseFloat(quantity) || 0;
  const isOutOfStock = availableStock <= 0;
  const isInsufficientStock = requestedQty > availableStock;
  const remainingStock = Math.max(0, Math.round((availableStock - requestedQty) * 100) / 100);

  // Check medicine expiry
  const today = new Date().toISOString().split('T')[0];
  const isExpired = selectedMedicine?.expiryDate ? selectedMedicine.expiryDate < today : false;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMedId) {
      setErrorMessage('Please select a medicine or injection to administer.');
      return;
    }
    if (requestedQty <= 0) {
      setErrorMessage('Quantity must be greater than 0.');
      return;
    }
    if (isInsufficientStock) {
      setErrorMessage(
        `Insufficient stock. Available stock is ${availableStock} ${unit}, but ${requestedQty} was requested.`
      );
      return;
    }
    if (isExpired) {
      setErrorMessage(
        `Cannot administer this medicine. The batch (${selectedMedicine?.batchNumber || ''}) expired on ${selectedMedicine?.expiryDate}.`
      );
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const idToken = user ? await user.getIdToken() : '';
      const payload = {
        petId: pet.id,
        medicineId: selectedMedId,
        quantityUsed: requestedQty,
        administeredAt: administeredAt ? new Date(administeredAt).toISOString() : new Date().toISOString(),
        dosage: dosage.trim() || `${requestedQty} ${unit}`,
        nextDueDate: nextDueDate ? nextDueDate.trim() : null,
        notes: notes.trim(),
        idempotencyKey,
        requesterUid: profile?.uid || user?.uid,
      };

      const { data, error } = await safeFetchJson<{
        success: boolean;
        error?: string;
        message?: string;
        treatment?: any;
        previousStock?: number;
        newStock?: number;
      }>('/api/clinic/treatments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (error || !data?.success) {
        setErrorMessage(error || data?.error || 'Failed to record treatment.');
      } else {
        setSuccessMessage(data.message || 'Treatment successfully recorded and stock deducted!');
        if (onSuccess && data.treatment) {
          onSuccess(data.treatment);
        }
        setTimeout(() => {
          onClose();
        }, 1200);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Record Treatment / Add Vaccination"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs text-[#25242A]">
        {/* Pet Summary Banner */}
        <div className="flex items-center justify-between p-3 bg-gradient-to-r from-[#F1EEFF] to-[#EAF8FE] border border-[#7567E8]/30 rounded-xl">
          <div>
            <h4 className="font-extrabold text-sm text-[#25242A]">{pet.name}</h4>
            <p className="text-[11px] text-[#737780] font-medium">
              {pet.species} • {pet.breed} • Owner: <strong>{pet.ownerName || 'Valued Parent'}</strong>
            </p>
          </div>
          <span className="font-mono text-xs font-black text-[#7567E8] bg-white px-2.5 py-1 rounded-lg border border-[#7567E8]/30">
            {pet.registrationNumber}
          </span>
        </div>

        {/* Medicine / Injection Picker */}
        <div>
          <label className="font-bold text-xs text-[#25242A] block mb-1">
            Select Medicine / Injection from Inventory *
          </label>
          {isLoadingMedicines ? (
            <div className="flex items-center gap-2 p-2.5 bg-[#F8FAFC] border border-[#E8ECF0] rounded-xl text-[#737780]">
              <Loader2 className="w-4 h-4 animate-spin text-[#7567E8]" />
              <span>Loading clinic medicine inventory...</span>
            </div>
          ) : medicines.length === 0 ? (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs">
              <p className="font-bold">No medicines found in clinic inventory.</p>
              <p className="text-[11px] mt-0.5">Please add medicines to your inventory before recording treatments.</p>
            </div>
          ) : (
            <select
              value={selectedMedId}
              onChange={(e) => {
                setSelectedMedId(e.target.value);
                const found = medicines.find((m) => m.id === e.target.value);
                if (found) {
                  setDosage(`1 ${found.unit}`);
                }
              }}
              required
              className="w-full bg-[#F8FAFC] border border-[#E8ECF0] focus:border-[#7567E8] rounded-xl px-3 py-2 text-xs font-medium text-[#25242A] focus:outline-none"
            >
              <option value="">-- Choose medicine or vaccine --</option>
              {medicines.map((med) => (
                <option key={med.id} value={med.id}>
                  {med.name} ({med.category}) — Stock: {med.stockQuantity} {med.unit}
                  {med.batchNumber ? ` [Batch: ${med.batchNumber}]` : ''}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Real-time Authoritative Stock Card */}
        {selectedMedicine && (
          <div
            className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
              isOutOfStock || isExpired
                ? 'bg-red-50 border-red-200 text-red-700'
                : isInsufficientStock
                ? 'bg-amber-50 border-amber-200 text-amber-800'
                : 'bg-emerald-50 border-emerald-200 text-emerald-800'
            }`}
          >
            <div>
              <div className="font-extrabold flex items-center gap-1.5">
                <Boxes className="w-4 h-4" />
                <span>Authoritative Available Stock:</span>
                <span className="font-black text-sm">
                  {availableStock} {unit}
                </span>
              </div>
              <div className="text-[11px] mt-0.5 space-x-2">
                {selectedMedicine.batchNumber && <span>Batch: #{selectedMedicine.batchNumber}</span>}
                {selectedMedicine.expiryDate && (
                  <span className={isExpired ? 'font-bold underline' : ''}>
                    Expires: {selectedMedicine.expiryDate} {isExpired ? '(EXPIRED)' : ''}
                  </span>
                )}
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] uppercase font-bold block">After Administration</span>
              <span className="font-extrabold text-sm">
                {remainingStock} {unit}
              </span>
            </div>
          </div>
        )}

        {/* Quantity & Dosage */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="font-bold text-xs text-[#25242A] block mb-1">
              Quantity Used ({unit}) *
            </label>
            <input
              type="number"
              step="any"
              min="0.1"
              max={availableStock > 0 ? availableStock : 1}
              required
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full bg-[#F8FAFC] border border-[#E8ECF0] focus:border-[#7567E8] rounded-xl px-3 py-2 text-xs font-bold text-[#25242A] focus:outline-none"
            />
          </div>

          <div>
            <label className="font-bold text-xs text-[#25242A] block mb-1">
              Dosage & Administration Route
            </label>
            <input
              type="text"
              placeholder="e.g. 1 ml subcutaneous, 1 tablet oral"
              value={dosage}
              onChange={(e) => setDosage(e.target.value)}
              className="w-full bg-[#F8FAFC] border border-[#E8ECF0] focus:border-[#7567E8] rounded-xl px-3 py-2 text-xs text-[#25242A] focus:outline-none"
            />
          </div>
        </div>

        {/* Administration Date & Next Due Date */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="font-bold text-xs text-[#25242A] block mb-1">
              Administration Date & Time *
            </label>
            <input
              type="datetime-local"
              required
              value={administeredAt}
              onChange={(e) => setAdministeredAt(e.target.value)}
              className="w-full bg-[#F8FAFC] border border-[#E8ECF0] focus:border-[#7567E8] rounded-xl px-3 py-2 text-xs text-[#25242A] focus:outline-none"
            />
          </div>

          <div>
            <label className="font-bold text-xs text-[#25242A] block mb-1">
              {isVaccine ? 'Next Due / Booster Date *' : 'Next Due Date (Optional)'}
            </label>
            <input
              type="date"
              value={nextDueDate}
              onChange={(e) => setNextDueDate(e.target.value)}
              className="w-full bg-[#F8FAFC] border border-[#E8ECF0] focus:border-[#7567E8] rounded-xl px-3 py-2 text-xs text-[#25242A] focus:outline-none"
            />
          </div>
        </div>

        {/* Clinical Treatment Notes */}
        <div>
          <label className="font-bold text-xs text-[#25242A] block mb-1">
            Clinical Notes / Observations (Optional)
          </label>
          <textarea
            rows={2}
            placeholder="e.g. Administered right shoulder subcutaneous. No acute adverse reaction observed."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full bg-[#F8FAFC] border border-[#E8ECF0] focus:border-[#7567E8] rounded-xl p-3 text-xs text-[#25242A] focus:outline-none"
          />
        </div>

        {/* Error / Success Messages */}
        {errorMessage && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-600 font-semibold text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-700 font-semibold text-xs">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>

          <Button
            type="submit"
            size="sm"
            disabled={
              isSubmitting ||
              !selectedMedId ||
              requestedQty <= 0 ||
              isInsufficientStock ||
              isExpired
            }
            icon={
              isSubmitting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Syringe className="w-3.5 h-3.5" />
              )
            }
          >
            {isSubmitting ? 'Deducting Stock & Saving...' : 'Record & Deduct Stock'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
