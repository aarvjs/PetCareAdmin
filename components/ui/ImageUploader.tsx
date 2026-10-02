'use client';

import React, { useState } from 'react';
import { UploadCloud, Image as ImageIcon, X } from 'lucide-react';

interface ImageUploaderProps {
  initialImages?: string[];
  onChange?: (images: string[]) => void;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  initialImages = [],
  onChange,
}) => {
  const [images, setImages] = useState<string[]>(initialImages);

  const handleSimulatedUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    // Convert uploaded files to object URLs for frontend preview
    const newUrls: string[] = [];
    for (let i = 0; i < files.length; i++) {
      newUrls.push(URL.createObjectURL(files[i]));
    }
    const updated = [...images, ...newUrls];
    setImages(updated);
    onChange?.(updated);
  };

  const removeImage = (index: number) => {
    const updated = images.filter((_, i) => i !== index);
    setImages(updated);
    onChange?.(updated);
  };

  return (
    <div>
      <label className="block text-xs font-semibold text-[#25242A] uppercase tracking-wider mb-2">
        Product Images
      </label>

      {/* Drag & Drop Box */}
      <div className="border-2 border-dashed border-[#E8ECF0] hover:border-[#7567E8] bg-[#F8FAFC] rounded-2xl p-6 text-center transition-colors cursor-pointer relative group">
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={handleSimulatedUpload}
          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
        />
        <div className="flex flex-col items-center justify-center pointer-events-none">
          <div className="p-3 bg-white rounded-full text-[#7567E8] shadow-xs group-hover:scale-105 transition-transform mb-3 border border-[#E8ECF0]">
            <UploadCloud className="w-6 h-6" />
          </div>
          <p className="text-sm font-semibold text-[#25242A]">
            <span className="text-[#7567E8]">Click to upload</span> or drag and drop
          </p>
          <p className="text-xs text-[#737780] mt-1">PNG, JPG or WEBP up to 5MB</p>
        </div>
      </div>

      {/* Preview Thumbnails */}
      {images.length > 0 && (
        <div className="grid grid-cols-4 gap-3 mt-4">
          {images.map((img, index) => (
            <div
              key={index}
              className="relative aspect-square rounded-xl overflow-hidden border border-[#E8ECF0] bg-white group"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img} alt={`Preview ${index}`} className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => removeImage(index)}
                className="absolute top-1 right-1 p-1 bg-black/60 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
