'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { UserRound } from 'lucide-react';
import { api, ApiError, fileUrl } from '@/lib/api';

export default function AvatarPicker({
  avatarUrl,
  onUploaded,
  size = 96,
}: {
  avatarUrl?: string | null;
  onUploaded: (url: string) => void;
  size?: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const { url } = await api.upload(file);
      onUploaded(url);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'อัปโหลดรูปไม่สำเร็จ');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="flex flex-col items-center">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        style={{ height: size, width: size }}
        className="group relative shrink-0 overflow-hidden rounded-full border-4 border-white shadow-md ring-1 ring-slate-200"
      >
        {avatarUrl ? (
          <Image src={fileUrl(avatarUrl)} alt="" fill className="object-cover" unoptimized />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-slate-100 text-slate-400">
            <UserRound className="h-2/5 w-2/5" />
          </div>
        )}
        <div className="absolute inset-0 flex items-center justify-center bg-black/45 text-[10px] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
          {uploading ? 'กำลังอัปโหลด...' : 'เปลี่ยนรูป'}
        </div>
        <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => handleFile(e.target.files)} />
      </button>
      {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
    </div>
  );
}
