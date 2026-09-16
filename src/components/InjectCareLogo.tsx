import React, { useState, useEffect } from 'react';
import { UploadLogoModal } from './UploadLogoModal.tsx';
import { Upload } from 'lucide-react';
import { api } from '../api/client.ts';

interface InjectCareLogoProps {
  variant?: 'sidebar' | 'header' | 'card' | 'inline';
  className?: string;
  imgClassName?: string;
  allowUpload?: boolean;
}

export const InjectCareLogo: React.FC<InjectCareLogoProps> = ({
  variant = 'sidebar',
  className = '',
  imgClassName = '',
  allowUpload = true
}) => {
  const [logoUrl, setLogoUrl] = useState<string>('/injectcare-logo.svg');
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Sync logo from localStorage or server
  useEffect(() => {
    const updateLogo = () => {
      const stored = localStorage.getItem('injectcare_custom_logo');
      if (stored) {
        setLogoUrl(stored);
        return;
      }
      // Check server
      api.getLogo()
        .then(res => {
          if (res?.hasCustomLogo && res.url) {
            setLogoUrl(res.url);
          } else {
            setLogoUrl('/injectcare-logo.svg');
          }
        })
        .catch(() => {
          setLogoUrl('/injectcare-logo.svg');
        });
    };

    updateLogo();

    // Listen for custom logo change events across the app
    window.addEventListener('injectcare-logo-changed', updateLogo);
    return () => window.removeEventListener('injectcare-logo-changed', updateLogo);
  }, []);

  if (variant === 'sidebar') {
    return (
      <>
        <div className={`relative group flex flex-col items-center ${className}`}>
          {/* Logo Card with pure white background & natural aspect ratio preservation */}
          <div className="w-full bg-white rounded-xl p-2.5 shadow-sm border border-slate-700/60 flex items-center justify-center relative overflow-hidden transition-all group-hover:border-blue-500/50">
            <img
              src={logoUrl}
              alt="Inject Care Parenterals Pvt. Ltd."
              className={`w-full max-h-20 h-auto object-contain select-none transition-transform duration-200 ${imgClassName}`}
              loading="eager"
              draggable={false}
              onError={() => setLogoUrl('/injectcare-logo.svg')}
            />

            {/* Quick Upload Hover Overlay */}
            {allowUpload && (
              <button
                type="button"
                onClick={() => setShowUploadModal(true)}
                title="Upload your exact official logo image file"
                className="absolute inset-0 bg-slate-950/70 backdrop-blur-2xs opacity-0 group-hover:opacity-100 flex items-center justify-center space-x-1.5 text-xs text-white font-medium transition-opacity cursor-pointer z-10"
              >
                <Upload className="w-3.5 h-3.5 text-blue-400" />
                <span>Upload Exact Logo</span>
              </button>
            )}
          </div>
        </div>

        {/* Upload Logo Modal */}
        <UploadLogoModal
          isOpen={showUploadModal}
          onClose={() => setShowUploadModal(false)}
          onLogoUpdated={(newUrl) => setLogoUrl(newUrl)}
        />
      </>
    );
  }

  if (variant === 'header') {
    return (
      <>
        <div className={`flex items-center gap-3 select-none ${className}`}>
          <div 
            onClick={allowUpload ? () => setShowUploadModal(true) : undefined}
            title={allowUpload ? "Click to upload official logo" : undefined}
            className={`h-10 bg-white rounded-lg px-2.5 py-1 border border-slate-200 shadow-xs flex items-center justify-center ${allowUpload ? 'cursor-pointer hover:border-blue-400 hover:shadow-sm transition-all' : ''}`}
          >
            <img
              src={logoUrl}
              alt="Inject Care Logo"
              className="h-full w-auto max-w-[180px] object-contain"
              loading="eager"
              draggable={false}
              onError={() => setLogoUrl('/injectcare-logo.svg')}
            />
          </div>
        </div>

        {allowUpload && (
          <UploadLogoModal
            isOpen={showUploadModal}
            onClose={() => setShowUploadModal(false)}
            onLogoUpdated={(newUrl) => setLogoUrl(newUrl)}
          />
        )}
      </>
    );
  }

  if (variant === 'inline') {
    return (
      <img
        src={logoUrl}
        alt="Inject Care Parenterals Pvt. Ltd."
        className={`object-contain ${className}`}
        loading="eager"
        draggable={false}
        onError={() => setLogoUrl('/injectcare-logo.svg')}
      />
    );
  }

  // Default 'card' variant
  return (
    <>
      <div className={`relative group bg-white rounded-xl p-4 shadow-sm border border-slate-200 flex flex-col items-center justify-center ${className}`}>
        <img
          src={logoUrl}
          alt="Inject Care Parenterals Pvt. Ltd."
          className={`w-full max-w-[280px] max-h-24 h-auto object-contain select-none ${imgClassName}`}
          loading="eager"
          draggable={false}
          onError={() => setLogoUrl('/injectcare-logo.svg')}
        />
        {allowUpload && (
          <button
            type="button"
            onClick={() => setShowUploadModal(true)}
            className="mt-2 text-[11px] text-blue-600 hover:text-blue-700 font-semibold flex items-center space-x-1"
          >
            <Upload className="w-3 h-3" />
            <span>Upload Exact Logo File</span>
          </button>
        )}
      </div>

      <UploadLogoModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onLogoUpdated={(newUrl) => setLogoUrl(newUrl)}
      />
    </>
  );
};
