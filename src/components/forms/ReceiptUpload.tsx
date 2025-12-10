'use client';
import { useState, useRef } from 'react';
import Button from '../ui/Button';

interface ReceiptUploadProps {
  onUpload: (file: File) => void;
  onCancel: () => void;
}

export default function ReceiptUpload({ onUpload, onCancel }: ReceiptUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e:  React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFile = e.dataTransfer. files[0];
    if (droppedFile && ['image/png', 'image/jpeg', 'application/pdf'].includes(droppedFile. type)) {
      setFile(droppedFile);
    }
  };

  const handleSubmit = (e:  React.FormEvent) => {
    e.preventDefault();
    if (file) onUpload(file);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
          dragOver ? 'border-brandNavy bg-brandNavy/5' : 'border-slate-300 hover:border-slate-400'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="hidden"
        />
        <svg className="w-12 h-12 mx-auto text-slate-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
          />
        </svg>
        <p className="text-sm text-slate-600">Drag & drop or click to upload</p>
        <p className="text-xs text-slate-400 mt-1">PDF, PNG, or JPEG up to 10MB</p>
      </div>
      {file && (
        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
          <svg className="w-8 h-8 text-brandNavy" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-900 truncate">{file. name}</p>
            <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
          </div>
          <button type="button" onClick={() => setFile(null)} className="text-slate-400 hover: text-red-500">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
      <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={!file}>
          Upload Receipt
        </Button>
      </div>
    </form>
  );
}