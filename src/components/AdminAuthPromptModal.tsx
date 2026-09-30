import React, { useState, useEffect, useRef } from 'react';
import { ShieldCheck, KeyRound, Eye, EyeOff, X, AlertCircle } from 'lucide-react';
import { api } from '../api/client.ts';

interface AdminAuthPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  itemIdentifier: string;
  onSuccess: (password: string) => void;
}

export const AdminAuthPromptModal: React.FC<AdminAuthPromptModalProps> = ({
  isOpen,
  onClose,
  title,
  itemIdentifier,
  onSuccess
}) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setError(null);
      setLoading(false);
      setShowPassword(false);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!password.trim()) {
      setError('Please enter the Admin Secret Password.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const verified = await api.verifyAdminPassword(password.trim());
      if (verified) {
        onSuccess(password.trim());
        onClose();
      } else {
        setError('Incorrect Admin Secret Password. Access denied.');
      }
    } catch (err: any) {
      setError(err.message || 'Incorrect Admin Secret Password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden flex flex-col animate-in zoom-in-95 duration-150">
        
        {/* Header with Security Blue/Amber Accent */}
        <div className="px-5 py-4 border-b border-sky-100 bg-sky-50/60 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-100 border border-sky-200 flex items-center justify-center text-sky-700">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Admin Authorization Required</h3>
              <p className="text-[11px] text-slate-500">Password Protected: Editing Security Gate</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Target Record Information Box */}
          <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/80 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Editing Permission</span>
              <span className="text-[11px] font-semibold text-sky-700">{title}</span>
            </div>
            <div className="font-mono text-xs font-bold text-slate-800 break-all bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 shadow-2xs">
              {itemIdentifier}
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed pt-1">
              Please enter the master Admin Secret Password to unlock and modify this compliance record.
            </p>
          </div>

          {/* Password Input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-sky-600" />
              <span>Admin Secret Password</span>
            </label>
            <div className="relative">
              <input
                ref={inputRef}
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="Enter Admin Secret Password..."
                className="w-full text-xs px-3 py-2.5 pr-10 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition-all font-mono"
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start space-x-2 animate-in fade-in duration-100">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="leading-snug">
                <span className="font-semibold">Authentication Error:</span> {error}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !password.trim()}
              className="px-4 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-xs transition-colors flex items-center space-x-1.5 cursor-pointer"
            >
              {loading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Verifying...</span>
                </>
              ) : (
                <span>Authorize & Edit</span>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
