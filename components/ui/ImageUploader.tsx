'use client';

import React, { useState } from 'react';
import { UploadCloud, X, Star, Loader2, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

export interface ImageAsset {
  url: string;
  public_id?: string;
}

interface ImageUploaderProps {
  initialImages?: (string | ImageAsset)[];
  primaryIndex?: number;
  onChange?: (images: ImageAsset[], primaryIndex: number) => void;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  initialImages = [],
  primaryIndex = 0,
  onChange,
}) => {
  const normalizeImages = (list: (string | ImageAsset)[]): ImageAsset[] => {
    return list.map((item) => (typeof item === 'string' ? { url: item, public_id: '' } : item));
  };

  const [images, setImages] = useState<ImageAsset[]>(normalizeImages(initialImages));
  const [selectedIndex, setSelectedIndex] = useState<number>(primaryIndex);
  const [uploadingFiles, setUploadingFiles] = useState<{ id: string; name: string; progress: number; error?: string }[]>([]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileList = Array.from(files);
    const updatedImages = [...images];

    for (const file of fileList) {
      const fileId = `${file.name}_${Date.now()}`;
      setUploadingFiles((prev) => [...prev, { id: fileId, name: file.name, progress: 20 }]);

      try {
        const formData = new FormData();
        formData.append('file', file);

        // Update progress simulated
        setUploadingFiles((prev) => prev.map((f) => (f.id === fileId ? { ...f, progress: 60 } : f)));

        const res = await fetch('/api/cloudinary/upload', {
          method: 'POST',
          body: formData,
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Cloudinary upload failed.');
        }

        setUploadingFiles((prev) => prev.map((f) => (f.id === fileId ? { ...f, progress: 100 } : f)));

        const newAsset: ImageAsset = {
          url: data.url,
          public_id: data.public_id,
        };

        updatedImages.push(newAsset);

        // Remove from upload progress list after a brief delay
        setTimeout(() => {
          setUploadingFiles((prev) => prev.filter((f) => f.id !== fileId));
        }, 800);
      } catch (error: any) {
        console.error('Upload error:', error);
        setUploadingFiles((prev) =>
          prev.map((f) => (f.id === fileId ? { ...f, error: error.message || 'Upload failed' } : f))
        );
      }
    }

    setImages(updatedImages);
    onChange?.(updatedImages, selectedIndex);
  };

  const removeImage = (index: number) => {
    const assetToRemove = images[index];
    const updated = images.filter((_, i) => i !== index);
    const newPrimaryIndex = selectedIndex >= updated.length ? Math.max(0, updated.length - 1) : selectedIndex;

    setImages(updated);
    setSelectedIndex(newPrimaryIndex);
    onChange?.(updated, newPrimaryIndex);

    // Unlink asset on server if public_id exists
    if (assetToRemove?.public_id) {
      fetch('/api/cloudinary/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ public_id: assetToRemove.public_id }),
      }).catch(() => {});
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
          Product Images & Gallery (Cloudinary Media)
        </label>
        <span className="text-[11px] text-[#7567E8] font-bold">
          {images.length} Image{images.length !== 1 ? 's' : ''} Uploaded
        </span>
      </div>

      {/* Drag & Drop Upload Container */}
      <div className="border-2 border-dashed border-[#E8ECF0] hover:border-[#7567E8] bg-[#FAFCFD] rounded-2xl p-6 text-center transition-all cursor-pointer relative group shadow-xs hover:shadow-md">
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
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
              PNG, JPG, WEBP or AVIF (Up to 10MB per image)
            </p>
          </div>
        </div>
      </div>

      {/* Live Upload Progress Bars */}
      {uploadingFiles.length > 0 && (
        <div className="space-y-2">
          {uploadingFiles.map((file) => (
            <div key={file.id} className="p-3 bg-white border border-[#E8ECF0] rounded-xl flex items-center justify-between text-xs shadow-xs">
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
                  <div className="w-24 bg-[#E8ECF0] h-1.5 rounded-full overflow-hidden">
                    <div className="bg-[#7567E8] h-full transition-all duration-300 rounded-full" style={{ width: `${file.progress}%` }} />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Preview Grid with Primary Badge & Controls */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 pt-2">
          {images.map((img, index) => {
            const isCover = index === selectedIndex;
            return (
              <div
                key={index}
                className={`relative aspect-square rounded-2xl overflow-hidden border-2 bg-white group transition-all shadow-xs ${
                  isCover ? 'border-[#7567E8] ring-2 ring-[#7567E8]/20' : 'border-[#E8ECF0] hover:border-slate-400'
                }`}
              >
                {/* Image Preview */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt={`Product ${index + 1}`} className="w-full h-full object-cover" />

                {/* Primary Cover Badge */}
                {isCover ? (
                  <div className="absolute top-2 left-2 px-2 py-0.5 bg-[#7567E8] text-white text-[10px] font-extrabold rounded-md shadow-xs flex items-center gap-1 z-10">
                    <Star className="w-3 h-3 fill-white" />
                    <span>Cover</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setPrimary(index)}
                    className="absolute top-2 left-2 px-2 py-0.5 bg-black/60 hover:bg-[#7567E8] text-white text-[10px] font-bold rounded-md opacity-0 group-hover:opacity-100 transition-opacity z-10"
                  >
                    Set Cover
                  </button>
                )}

                {/* Delete Button */}
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all z-10"
                  title="Remove Image"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
