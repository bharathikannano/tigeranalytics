import { useRef, useState } from 'react';

interface Props {
  onFile: (file: File) => void;
  disabled?: boolean;
}

const ACCEPTED = '.csv,text/csv,application/vnd.ms-excel';

export default function UploadDropzone({ onFile, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [ dragging, setDragging ] = useState(false);
  const [ fileError, setFileError ] = useState('');

  function handleFile(file: File | undefined) {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setFileError('Only .csv files are accepted');
      return;
    }
    setFileError('');
    onFile(file);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[ 0 ]);
  }

  return (
    <div
      className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 transition-colors cursor-pointer
        ${dragging ? 'border-brand-500 bg-brand-50' : 'border-gray-300 bg-gray-50 hover:border-brand-400 hover:bg-brand-50/30'}
        ${disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}
      onClick={() => !disabled && inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED}
        className="sr-only"
        disabled={disabled}
        onChange={(e) => handleFile(e.target.files?.[ 0 ])}
      />
      <div className="text-4xl mb-3 select-none">📂</div>
      <p className="text-sm font-semibold text-gray-700">
        Drag &amp; drop a CSV file here, or click to browse
      </p>
      <p className="text-xs text-gray-500 mt-1">
        Required columns: <code className="bg-gray-100 px-1 rounded">Store ID, SKU, Product Name, Price, Date</code>
      </p>
      {fileError && (
        <p className="mt-3 text-xs text-red-600 font-medium">{fileError}</p>
      )}
    </div>
  );
}
