import React, { useState, useRef } from 'react';
import { Upload, X, Check, Image as ImageIcon, Trash2, AlertCircle } from 'lucide-react';
import { api } from '../api/client.ts';

interface UploadLogoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogoUpdated?: (url: string) => void;
}

export const UploadLogoModal: React.FC<UploadLogoModalProps> = ({
  isOpen,
  onClose,
  onLogoUpdated
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (file: File) => {
    setError(null);
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (PNG, SVG, JPG, WEBP).');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('File size exceeds 10MB limit.');
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleSaveLogo = async () => {
    if (!selectedFile && !previewUrl) return;
    setUploading(true);
    setError(null);

    try {
      // 1. Save locally in localStorage for instant zero-lag rendering
      if (previewUrl) {
        localStorage.setItem('injectcare_custom_logo', previewUrl);
      }

      // 2. Upload to server to persist across machines/sessions
      if (selectedFile) {
        const res = await api.uploadLogo(selectedFile);
        if (res.success && res.url) {
          if (onLogoUpdated) onLogoUpdated(res.url);
        }
      }

      // 3. Dispatch global event to notify all components
      window.dispatchEvent(new Event('injectcare-logo-changed'));

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1000);
    } catch (err: any) {
      console.error('Failed to upload logo:', err);
      // Even if server upload fails, local storage holds the image
      window.dispatchEvent(new Event('injectcare-logo-changed'));
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1000);
    } finally {
      setUploading(false);
    }
  };

  const handleResetDefault = async () => {
    try {
      localStorage.removeItem('injectcare_custom_logo');
      await api.resetLogo();
      window.dispatchEvent(new Event('injectcare-logo-changed'));
      if (onLogoUpdated) onLogoUpdated('/injectcare-logo.svg');
      onClose();
    } catch (err) {
      console.error(err);
      localStorage.removeItem('injectcare_custom_logo');
      window.dispatchEvent(new Event('injectcare-logo-changed'));
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
              <ImageIcon className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800">Upload Exact Brand Logo</h2>
              <p className="text-xs text-slate-500">Inject Care Parenterals Pvt. Ltd. Corporate Identity</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <p className="text-xs text-slate-600 leading-relaxed">
            Upload your official high-resolution logo image (<span className="font-semibold text-slate-700">PNG, SVG, JPG, or WEBP</span>). The system will display your original image directly with perfect aspect ratio, original fonts, and exact brand colors.
          </p>

          {/* Upload Drop Zone */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
              dragActive 
                ? 'border-blue-500 bg-blue-50/60' 
                : 'border-slate-200 hover:border-blue-400 bg-slate-50/50 hover:bg-white'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/svg+xml,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileChange(e.target.files[0]);
                }
              }}
            />

            <div className="flex flex-col items-center justify-center space-y-2">
              <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                <Upload className="w-5 h-5" />
              </div>
              <div className="text-xs font-semibold text-slate-700">
                Click to browse or drag & drop official logo file
              </div>
              <p className="text-[11px] text-slate-400">
                Recommended: Transparent PNG or SVG with 3:1 or 4:1 horizontal ratio
              </p>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="flex items-center space-x-2 text-xs text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-200">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Live Preview */}
          {previewUrl && (
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                <span>Selected Image Preview:</span>
                <span className="text-[11px] text-slate-400 font-normal">{selectedFile?.name}</span>
              </div>
              
              {/* Preview Containers on light and dark background */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="bg-white border border-slate-200 rounded-lg p-3 flex flex-col items-center justify-center">
                  <span className="text-[10px] text-slate-400 mb-1">On White Background</span>
                  <img
                    src={previewUrl}
                    alt="Logo Preview Light"
                    className="max-h-16 max-w-full object-contain"
                  />
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 flex flex-col items-center justify-center">
                  <span className="text-[10px] text-slate-400 mb-1">On Sidebar (Dark)</span>
                  <div className="bg-white rounded-md p-1.5 w-full flex items-center justify-center">
                    <img
                      src={previewUrl}
                      alt="Logo Preview Dark"
                      className="max-h-12 max-w-full object-contain"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <button
            type="button"
            onClick={handleResetDefault}
            className="flex items-center space-x-1.5 text-xs text-slate-500 hover:text-red-600 font-medium px-2 py-1.5 rounded-md hover:bg-red-50 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Reset to Default</span>
          </button>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!previewUrl || uploading}
              onClick={handleSaveLogo}
              className="flex items-center space-x-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-xs transition-colors"
            >
              {success ? (
                <>
                  <Check className="w-3.5 h-3.5 text-white" />
                  <span>Saved!</span>
                </>
              ) : uploading ? (
                <span>Saving...</span>
              ) : (
                <span>Use This Logo</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
