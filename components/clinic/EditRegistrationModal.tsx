'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { AlertCircle, CheckCircle2, Loader2, Edit3 } from 'lucide-react';
import { useAuth } from '@/lib/authContext';
import { safeFetchJson } from '@/lib/safeFetch';
import { PetDetailsModalPet } from './PetDetailsModal';

interface EditRegistrationModalProps {
  pet: PetDetailsModalPet | null;
  onClose: () => void;
  onSuccess?: (updatedPet: PetDetailsModalPet) => void;
}

export const EditRegistrationModal: React.FC<EditRegistrationModalProps> = ({
  pet,
  onClose,
  onSuccess,
}) => {
  const { profile, user } = useAuth();
  const [newRegNumber, setNewRegNumber] = useState('');
  const [editReason, setEditReason] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState('');
  const [updateSuccess, setUpdateSuccess] = useState('');

  useEffect(() => {
    if (pet) {
      setNewRegNumber(pet.registrationNumber || '');
      setEditReason('');
      setUpdateError('');
      setUpdateSuccess('');
    }
  }, [pet]);

  if (!pet) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newRegNumber.trim();
    if (!trimmed) {
      setUpdateError('Registration number cannot be empty.');
      return;
    }
    if (trimmed === pet.registrationNumber) {
      setUpdateError('Please enter a different registration number to update.');
      return;
    }
    if (!editReason.trim()) {
      setUpdateError('Please specify an audit reason for this correction.');
      return;
    }

    setIsUpdating(true);
    setUpdateError('');
    setUpdateSuccess('');

    try {
      const idToken = user ? await user.getIdToken() : '';
      const { data, error } = await safeFetchJson<{
        success: boolean;
        error?: string;
        message?: string;
        pet?: PetDetailsModalPet;
      }>(`/api/pets/${pet.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
        },
        body: JSON.stringify({
          registrationNumber: trimmed,
          reason: editReason.trim(),
          requesterUid: profile?.uid || user?.uid,
          updatedByUid: profile?.uid || user?.uid,
        }),
      });

      if (error || !data?.success) {
        setUpdateError(error || data?.error || 'Failed to update registration number.');
      } else {
        setUpdateSuccess(`Registration number successfully updated to ${trimmed}!`);
        if (onSuccess && data.pet) {
          onSuccess(data.pet);
        }
        setTimeout(() => {
          onClose();
        }, 1200);
      }
    } catch (e: any) {
      setUpdateError(e.message || 'An unexpected error occurred.');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Modal
      isOpen={!!pet}
      onClose={onClose}
      title="Edit Pet Registration Number"
      maxWidth="md"
    >
      <form onSubmit={handleSave} className="space-y-4 text-xs text-[#25242A]">
        <div className="p-3 bg-[#F1EEFF] border border-[#7567E8]/40 rounded-xl">
          <p className="text-xs font-bold text-[#7567E8]">Authorized Clinic Audit Workflow</p>
          <p className="text-[11px] text-[#737780] mt-0.5">
            Validates uniqueness against all pets in this business. All changes are permanently recorded in the audit log.
          </p>
        </div>

        <div>
          <label className="font-bold text-xs text-[#25242A] block mb-1">Pet Patient</label>
          <p className="text-xs text-[#737780] font-semibold">
            {pet.name} ({pet.breed} • Owner: {pet.ownerName})
          </p>
        </div>

        <div>
          <label className="font-bold text-xs text-[#25242A] block mb-1">Current Registration Number</label>
          <span className="font-mono text-xs font-black bg-[#F8FAFC] px-3 py-1.5 rounded-lg border border-[#E8ECF0] inline-block text-[#737780]">
            {pet.registrationNumber}
          </span>
        </div>

        <div>
          <label className="font-bold text-xs text-[#25242A] block mb-1">New Registration Number *</label>
          <input
            type="text"
            required
            value={newRegNumber}
            onChange={(e) => setNewRegNumber(e.target.value)}
            placeholder="e.g. HPPC/P/01-A"
            className="w-full bg-[#F8FAFC] border border-[#E8ECF0] focus:border-[#7567E8] rounded-xl px-3 py-2 text-xs font-mono font-bold text-[#25242A] focus:outline-none uppercase"
          />
        </div>

        <div>
          <label className="font-bold text-xs text-[#25242A] block mb-1">Audit Reason for Correction *</label>
          <textarea
            rows={2}
            required
            value={editReason}
            onChange={(e) => setEditReason(e.target.value)}
            placeholder="Specify clinical or clerical reason for correction (e.g. Corrected certificate typo)..."
            className="w-full bg-[#F8FAFC] border border-[#E8ECF0] focus:border-[#7567E8] rounded-xl p-3 text-xs text-[#25242A] focus:outline-none"
          />
        </div>

        {updateError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-600 font-semibold text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{updateError}</span>
          </div>
        )}

        {updateSuccess && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-700 font-semibold text-xs">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{updateSuccess}</span>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isUpdating}>
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={isUpdating}>
            {isUpdating ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> Updating...
              </>
            ) : (
              'Save Registration No'
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
