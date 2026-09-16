import React, { useState, useEffect } from 'react';
import { api } from '../api/client.ts';
import { 
  Database, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  ShieldCheck, 
  HardDrive,
  KeyRound,
  FolderTree,
  UserCheck,
  LogIn,
  LogOut,
  ExternalLink,
  Upload,
  Image as ImageIcon
} from 'lucide-react';
import { InjectCareLogo } from '../components/InjectCareLogo.tsx';
import { UploadLogoModal } from '../components/UploadLogoModal.tsx';
import { 
  auth, 
  signInWithGoogle, 
  logoutUser, 
  signInInternalUser, 
  getCachedAccessToken,
  setCachedAccessToken 
} from '../lib/firebase.ts';
import { onAuthStateChanged, User } from 'firebase/auth';

export const SettingsView: React.FC = () => {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState<string | null>(null);

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [hasGoogleDriveToken, setHasGoogleDriveToken] = useState(!!getCachedAccessToken());
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [showLogoModal, setShowLogoModal] = useState(false);

  // Quick internal login form
  const [email, setEmail] = useState('compliance@injectcare.com');
  const [password, setPassword] = useState('injectcare2025');

  useEffect(() => {
    loadStatus();

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setHasGoogleDriveToken(!!getCachedAccessToken());
    });

    return () => unsubscribe();
  }, []);

  const loadStatus = async () => {
    setLoading(true);
    try {
      const s = await api.getStatus();
      setStatus(s);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSeedData = async () => {
    if (!confirm('This will reload pharmaceutical Advance Authorisation test datasets (Amoxicillin, Ceftriaxone, Meropenem) into Firebase Firestore. Continue?')) {
      return;
    }
    setSeeding(true);
    setSeedResult(null);
    try {
      const res = await api.seedData();
      setSeedResult(res.message || 'Data seeded successfully into Firestore!');
      loadStatus();
    } catch (err: any) {
      setSeedResult(`Failed to seed: ${err.message}`);
    } finally {
      setSeeding(false);
    }
  };

  const handleGoogleDriveSignIn = async () => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      const { user, accessToken } = await signInWithGoogle();
      setCurrentUser(user);
      setHasGoogleDriveToken(true);
      setSeedResult(`Signed in as ${user.displayName || user.email}. Google Drive integration active!`);
      loadStatus();
    } catch (err: any) {
      console.error('Google Sign In error:', err);
      setAuthError(err.message || 'Failed to sign in with Google');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleInternalSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);
    try {
      const user = await signInInternalUser(email, password);
      setCurrentUser(user);
      setSeedResult(`Internal user ${user.email || 'Compliance Officer'} authenticated with Firebase.`);
    } catch (err: any) {
      setAuthError(err.message || 'Internal login failed');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    await logoutUser();
    setCurrentUser(null);
    setHasGoogleDriveToken(false);
    setSeedResult('Signed out successfully.');
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="pb-2 border-b border-slate-200">
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">System Settings & Brand Configuration</h2>
        <p className="text-xs text-slate-500">
          Inject Care Parenterals brand identity, Firebase Firestore database, and Google Workspace integrations.
        </p>
      </div>

      {/* Official Corporate Logo Management Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Official Corporate Brand Logo</h3>
              <p className="text-xs text-slate-500">Inject Care Parenterals Pvt. Ltd. (Vapi, Gujarat)</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowLogoModal(true)}
            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Exact Logo File</span>
          </button>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-6 p-4 bg-slate-50 rounded-xl border border-slate-200/80">
          <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs w-full sm:w-auto flex items-center justify-center min-w-[220px]">
            <InjectCareLogo variant="inline" className="max-h-16 w-auto max-w-full" allowUpload={false} />
          </div>
          <div className="space-y-1.5 text-xs text-slate-600 flex-1">
            <p className="font-semibold text-slate-800">Use your exact high-resolution brand image</p>
            <p className="text-slate-500 leading-relaxed">
              If you have the exact PNG, SVG, or high-res JPG file from your design team or letterhead, click <span className="font-semibold text-blue-700">"Upload Exact Logo File"</span>. The system will render your authentic asset with 100% original aspect ratio, exact colors, and crisp vector resolution without any distortion.
            </p>
          </div>
        </div>
      </div>

      <UploadLogoModal
        isOpen={showLogoModal}
        onClose={() => setShowLogoModal(false)}
      />

      {/* Backend Status Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Active Database Engine</h3>
              <p className="text-xs text-slate-500 font-mono">Firebase Firestore (Google Cloud Native)</p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Firestore Active</span>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
            <span className="text-slate-500">Database Engine & ID:</span>
            <div className="font-semibold text-slate-800 font-mono break-all">
              {status?.firestore_database_id || 'ai-studio-injectcaretcms-d6121e57-3f26-417a-9630-6f9855aedc51'}
            </div>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
            <span className="text-slate-500">Google Cloud Project:</span>
            <div className="font-semibold text-slate-800 font-mono">
              {status?.firestore_project_id || 'gen-lang-client-0809712068'}
            </div>
          </div>
        </div>

        {/* Record Counts in Firestore */}
        {status?.record_counts && (
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 pt-2 text-center text-xs">
            <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
              <div className="text-slate-400 text-[10px]">Licences</div>
              <div className="font-bold text-slate-800 text-base">{status.record_counts.licences}</div>
            </div>
            <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
              <div className="text-slate-400 text-[10px]">Products</div>
              <div className="font-bold text-slate-800 text-base">{status.record_counts.products}</div>
            </div>
            <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
              <div className="text-slate-400 text-[10px]">Imports</div>
              <div className="font-bold text-slate-800 text-base">{status.record_counts.imports}</div>
            </div>
            <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
              <div className="text-slate-400 text-[10px]">Obligations</div>
              <div className="font-bold text-slate-800 text-base">{status.record_counts.obligations}</div>
            </div>
            <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
              <div className="text-slate-400 text-[10px]">Exports</div>
              <div className="font-bold text-slate-800 text-base">{status.record_counts.exports}</div>
            </div>
            <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
              <div className="text-slate-400 text-[10px]">Documents</div>
              <div className="font-bold text-slate-800 text-base">{status.record_counts.documents}</div>
            </div>
          </div>
        )}

        <div className="pt-2 flex items-center gap-3">
          <button
            type="button"
            onClick={loadStatus}
            className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-lg flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Verify Firestore Connection</span>
          </button>

          <button
            type="button"
            onClick={handleSeedData}
            disabled={seeding}
            className="px-3 py-1.5 bg-teal-50 border border-teal-200 hover:bg-teal-100 text-teal-800 text-xs font-medium rounded-lg flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${seeding ? 'animate-spin' : ''}`} />
            <span>{seeding ? 'Syncing...' : 'Reseed Firestore Sample Data'}</span>
          </button>
        </div>

        {seedResult && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800">
            {seedResult}
          </div>
        )}
      </div>

      {/* Google Drive Document Storage Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Google Drive Document Storage</h3>
              <p className="text-xs text-slate-500 font-mono">Google Workspace / Drive API</p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 flex items-center gap-1">
            <FolderTree className="w-3.5 h-3.5" />
            <span>Drive Integration Ready</span>
          </span>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          All Advance Authorisation compliance files (Licences, Bills of Entry, Shipping Bills, Commercial Invoices, eBRCs, CA Certificates) are stored in Google Drive in the structured directory hierarchy:
        </p>

        {/* Directory structure visualization */}
        <div className="p-4 bg-slate-900 text-slate-200 rounded-xl font-mono text-xs space-y-1.5 overflow-x-auto">
          <div className="text-emerald-400 font-bold">Inject Care Trade Compliance/</div>
          <div className="pl-4 text-sky-300">└── Licences/</div>
          <div className="pl-8 text-amber-300">└── [Licence Number] (e.g. AA_0310894521_2025)/</div>
          <div className="pl-12 text-slate-300">├── Licence/ (DGFT issued original licence copy)</div>
          <div className="pl-12 text-slate-300">├── Imports/</div>
          <div className="pl-16 text-slate-400">└── [Import Invoice Number]/ (Bill of Entry, Supplier Invoice, COA)</div>
          <div className="pl-12 text-slate-300">└── Exports/</div>
          <div className="pl-16 text-slate-400">└── [Export Invoice Number]/ (Shipping Bill, Export Inv, BRC, CA Cert)</div>
        </div>

        <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-lg text-xs text-blue-900 flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-semibold">Metadata in Firestore & Binaries in Google Drive:</div>
            <div className="text-slate-600 text-[11px] leading-normal">
              For every file stored, its Google Drive File ID, Web View Link, MIME type, file size, transaction reference, and audit timestamps are securely recorded in the Firestore <code>documents</code> collection.
            </div>
          </div>
        </div>
      </div>

      {/* Firebase Authentication & Google Drive Access */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Firebase Authentication & Drive Authorization</h3>
              <p className="text-xs text-slate-500">Internal trade compliance user login</p>
            </div>
          </div>
          {currentUser ? (
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Signed In: {currentUser.displayName || currentUser.email || 'Internal User'}</span>
            </span>
          ) : (
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Not Authenticated</span>
            </span>
          )}
        </div>

        {authError && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{authError}</span>
          </div>
        )}

        {currentUser ? (
          <div className="space-y-3">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1">
              <div className="text-slate-500">Authenticated Account:</div>
              <div className="font-semibold text-slate-900">{currentUser.email || currentUser.displayName || currentUser.uid}</div>
              <div className="text-[11px] text-slate-500">
                Google Drive Scope: {hasGoogleDriveToken ? 'Active & Authorized (Drive file permissions granted)' : 'Standard Session'}
              </div>
            </div>

            <div className="flex items-center gap-3">
              {!hasGoogleDriveToken && (
                <button
                  type="button"
                  onClick={handleGoogleDriveSignIn}
                  disabled={authLoading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-xs"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Authorize Google Drive</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleSignOut}
                className="px-3 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-medium flex items-center gap-1.5 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            {/* Google Drive Auth Option */}
            <div className="p-4 border border-blue-200 rounded-xl bg-blue-50/50 space-y-3 flex flex-col justify-between">
              <div className="space-y-1">
                <div className="font-semibold text-slate-900 text-xs flex items-center gap-1.5">
                  <KeyRound className="w-4 h-4 text-blue-600" />
                  <span>Sign in with Google Workspace</span>
                </div>
                <p className="text-[11px] text-slate-600">
                  Connect your Google account to authorize document uploads directly to Inject Care's Google Drive folders.
                </p>
              </div>

              <button
                type="button"
                onClick={handleGoogleDriveSignIn}
                disabled={authLoading}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-colors"
              >
                <LogIn className="w-4 h-4" />
                <span>{authLoading ? 'Signing In...' : 'Sign In with Google Drive'}</span>
              </button>
            </div>

            {/* Internal Email/Password Option */}
            <form onSubmit={handleInternalSignIn} className="p-4 border border-slate-200 rounded-xl bg-slate-50/70 space-y-3">
              <div className="font-semibold text-slate-900 text-xs">Internal Staff Sign-In</div>
              <div className="space-y-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Officer Email"
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded focus:ring-1 focus:ring-teal-700"
                />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded focus:ring-1 focus:ring-teal-700"
                />
              </div>
              <button
                type="submit"
                disabled={authLoading}
                className="w-full py-2 px-3 bg-slate-800 hover:bg-slate-900 text-white text-xs font-medium rounded cursor-pointer transition-colors"
              >
                {authLoading ? 'Authenticating...' : 'Internal Sign In'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
