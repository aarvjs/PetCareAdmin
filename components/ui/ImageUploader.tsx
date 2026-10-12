'use client';

import React, { useState, useEffect } from 'react';
import { UploadCloud, X, Star, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import {
  uploadFileToFirebaseStorage,
  deleteFileFromFirebaseStorage,
  validateImageFile,
  getProductImageStoragePath,
} from '@/lib/storage';

export interface ImageAsset {
  url: string;
  path?: string;
  public_id?: string; // Kept for backwards compatibility with legacy Cloudinary records
  name?: string;
}

interface ImageUploaderProps {
  businessId?: string;
  productId?: string;
  initialImages?: (string | ImageAsset)[];
  primaryIndex?: number;
  onChange?: (images: ImageAsset[], primaryIndex: number) => void;
}

interface UploadingFileState {
  id: string;
  name: string;
  progress: number;
  error?: string;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  businessId = 'default',
  productId = 'new_product',
  initialImages = [],
  primaryIndex = 0,
  onChange,
}) => {
  const normalizeImages = (list: (string | ImageAsset)[]): ImageAsset[] => {
    return list.map((item) => (typeof item === 'string' ? { url: item, path: '', public_id: '' } : item));
  };

  const [images, setImages] = useState<ImageAsset[]>(normalizeImages(initialImages));
  const [selectedIndex, setSelectedIndex] = useState<number>(primaryIndex);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFileState[]>([]);
  const [generalError, setGeneralError] = useState<string>('');

  // Sync with initialImages when they change externally
  useEffect(() => {
    setImages(normalizeImages(initialImages));
  }, [initialImages]);

  useEffect(() => {
    setSelectedIndex(primaryIndex);
  }, [primaryIndex]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setGeneralError('');
    const fileList = Array.from(files);
    const updatedImages = [...images];

    for (const file of fileList) {
      // Validate before proceeding
      const validation = validateImageFile(file, 10);
      if (!validation.valid) {
        setGeneralError(validation.error || 'Invalid file.');
        continue;
      }

      const fileId = `${file.name}_${Date.now()}_${Math.random().toString(36).slice(-4)}`;
      setUploadingFiles((prev) => [...prev, { id: fileId, name: file.name, progress: 5 }]);

      try {
        const storagePath = getProductImageStoragePath(businessId, productId, file.name);

        const uploadResult = await uploadFileToFirebaseStorage(file, storagePath, (progress) => {
          setUploadingFiles((prev) =>
            prev.map((f) => (f.id === fileId ? { ...f, progress: progress.progressPercent } : f))
          );
        });

        // Set completed state briefly
        setUploadingFiles((prev) =>
          prev.map((f) => (f.id === fileId ? { ...f, progress: 100 } : f))
        );

        const newAsset: ImageAsset = {
          url: uploadResult.downloadUrl,
          path: uploadResult.storagePath,
          name: file.name,
        };

        updatedImages.push(newAsset);

        // Remove from progress after 600ms
        setTimeout(() => {
          setUploadingFiles((prev) => prev.filter((f) => f.id !== fileId));
        }, 600);
      } catch (error: any) {
        console.error('Firebase Storage upload error:', error);
        setUploadingFiles((prev) =>
          prev.map((f) => (f.id === fileId ? { ...f, error: error.message || 'Upload failed' } : f))
        );
      }
    }

    setImages(updatedImages);
    onChange?.(updatedImages, selectedIndex);

    // Reset input value so same file can be re-selected if desired
    e.target.value = '';
  };

  const removeImage = async (index: number) => {
    const assetToRemove = images[index];
    const updated = images.filter((_, i) => i !== index);
    const newPrimaryIndex = selectedIndex >= updated.length ? Math.max(0, updated.length - 1) : selectedIndex;

    setImages(updated);
    setSelectedIndex(newPrimaryIndex);
    onChange?.(updated, newPrimaryIndex);

    // If this asset was stored in Firebase Storage, safely delete it
    if (assetToRemove?.path) {
      await deleteFileFromFirebaseStorage(assetToRemove.path);
    }
  };

  const setPrimary = (index: number) => {
    setSelectedIndex(index);
    onChange?.(images, index);
  };

  return (
    <div className="space-y-4 font-sans">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-bold text-[#25242A] uppercase tracking-wider">
          Product Images & Gallery (Firebase Storage)
        </label>
        <span className="text-[11px] text-[#7567E8] font-bold">
          {images.length} Image{images.length !== 1 ? 's' : ''} Active
        </span>
      </div>

      {generalError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{generalError}</span>
        </div>
      )}

      {/* Drag & Drop / File Input Container */}
      <div className="border-2 border-dashed border-[#E8ECF0] hover:border-[#7567E8] bg-[#FAFCFD] rounded-2xl p-6 text-center transition-all cursor-pointer relative group shadow-xs hover:shadow-md">
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif,image/svg+xml"
          multiple
          onChange={handleFileUpload}
          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
        />
        <div className="flex flex-col items-center justify-center pointer-events-none space-y-2">
          <div className="w-12 h-12 bg-white rounded-2xl text-[#7567E8] shadow-xs flex items-center justify-center border border-[#E8ECF0] group-hover:scale-110 transition-transform">
            <UploadCloud className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-extrabold text-[#25242A]">
              <span className="text-[#7567E8] hover:underline">Click to upload product images</span> or drag and drop
            </p>
            <p className="text-[11px] text-[#777980] font-medium mt-0.5">
              PNG, JPG, WEBP, AVIF or SVG (Up to 10MB per image via Firebase Storage)
            </p>
          </div>
        </div>
      </div>

      {/* Live Upload Progress Bars */}
      {uploadingFiles.length > 0 && (
        <div className="space-y-2">
          {uploadingFiles.map((file) => (
            <div
              key={file.id}
              className="p-3 bg-white border border-[#E8ECF0] rounded-xl flex items-center justify-between text-xs shadow-xs"
            >
              <div className="flex items-center gap-2.5 truncate max-w-xs">
                {file.error ? (
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                ) : file.progress === 100 ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                ) : (
                  <Loader2 className="w-4 h-4 text-[#7567E8] animate-spin shrink-0" />
                )}
                <span className="font-semibold text-[#25242A] truncate">{file.name}</span>
              </div>
              <div className="flex items-center gap-3">
                {file.error ? (
                  <span className="text-red-500 font-bold text-[11px]">{file.error}</span>
                ) : (
                  <>
                    <div className="w-24 bg-[#E8ECF0] rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-[#7567E8] h-1.5 rounded-full transition-all duration-200"
                        style={{ width: `${file.progress}%` }}
                      />
                    </div>
                    <span className="text-[11px] font-bold text-[#777980] w-8 text-right">
                      {file.progress}%
                    </span>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Image Preview Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3 pt-2">
          {images.map((asset, index) => {
            const isPrimary = index === selectedIndex;
            return (
              <div
                key={`${asset.url}_${index}`}
                className={`relative aspect-square rounded-2xl overflow-hidden border-2 bg-white group shadow-xs transition-all ${
                  isPrimary
                    ? 'border-[#7567E8] ring-2 ring-[#7567E8]/20 shadow-md'
                    : 'border-[#E8ECF0] hover:border-slate-300'
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={asset.url}
                  alt={`Product view ${index + 1}`}
                  className="w-full h-full object-cover"
                />

                {/* Primary Badge */}
                {isPrimary && (
                  <div className="absolute top-2 left-2 bg-[#7567E8] text-white text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full shadow-xs flex items-center gap-1 z-10">
                    <Star className="w-2.5 h-2.5 fill-white" /> Primary
                  </div>
                )}

                {/* Overlay Action Buttons */}
                <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-2">
                  {!isPrimary && (
                    <button
                      type="button"
                      onClick={() => setPrimary(index)}
                      title="Set as Primary Image"
                      className="p-1.5 bg-white text-[#25242A] hover:text-[#7567E8] rounded-xl shadow-xs transition-all hover:scale-110"
                    >
                      <Star className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    title="Remove Image"
                    className="p-1.5 bg-white text-red-500 hover:text-red-700 rounded-xl shadow-xs transition-all hover:scale-110"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
