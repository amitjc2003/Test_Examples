import React, { useCallback, useState } from 'react';
import { UploadCloud, FileSpreadsheet, AlertCircle } from 'lucide-react';

interface FileUploadProps {
  onFileUpload: (file: File) => void;
  isLoading: boolean;
}

export function FileUpload({ onFileUpload, isLoading }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    setError(null);

    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.csv'))) {
      onFileUpload(file);
    } else {
      setError('Please upload a valid .xlsx or .csv file.');
    }
  }, [onFileUpload]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    if (file) {
      if (file.name.endsWith('.xlsx') || file.name.endsWith('.csv')) {
        onFileUpload(file);
      } else {
        setError('Please upload a valid .xlsx or .csv file.');
      }
    }
  }, [onFileUpload]);

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-xl p-12 text-center transition-all duration-200 ${
          isDragging
            ? 'border-blue-500 bg-blue-50'
            : 'border-slate-300 hover:border-slate-400 bg-white'
        } ${isLoading ? 'opacity-50 pointer-events-none' : ''}`}
      >
        <input
          type="file"
          accept=".xlsx, .csv"
          onChange={handleFileInput}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={isLoading}
        />
        
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="p-4 bg-blue-100 rounded-full text-blue-600">
            {isLoading ? (
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            ) : (
              <UploadCloud className="w-8 h-8" />
            )}
          </div>
          
          <div>
            <p className="text-lg font-semibold text-slate-700">
              {isLoading ? 'Processing Data...' : 'Click or drag to upload'}
            </p>
            <p className="text-sm text-slate-500 mt-1">
              Supports .xlsx and .csv files
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-lg flex items-center space-x-2 text-sm">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      <div className="mt-8 bg-slate-50 border border-slate-200 rounded-xl p-6">
        <h3 className="text-sm font-semibold text-slate-800 flex items-center mb-4">
          <FileSpreadsheet className="w-4 h-4 mr-2 text-slate-500" />
          Required Data Format
        </h3>
        <p className="text-sm text-slate-600 mb-4">
          Your file should contain transactional data with at least these two columns:
        </p>
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Transactions</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Items</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              <tr>
                <td className="px-4 py-2 text-slate-600">TXN-001</td>
                <td className="px-4 py-2 text-slate-600 font-medium">Fish, Lemon, Pasta</td>
              </tr>
              <tr>
                <td className="px-4 py-2 text-slate-600">TXN-002</td>
                <td className="px-4 py-2 text-slate-600 font-medium">Beef, Milk</td>
              </tr>
              <tr>
                <td className="px-4 py-2 text-slate-600">TXN-003</td>
                <td className="px-4 py-2 text-slate-600 font-medium">Fish, Pasta</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
