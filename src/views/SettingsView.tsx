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
  Image as ImageIcon,
  AlertTriangle,
  Globe,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { InjectCareLogo } from '../components/InjectCareLogo.tsx';
import { UploadLogoModal } from '../components/UploadLogoModal.tsx';
import { 
  auth, 
  signInWithGoogle, 
  signInWithGoogleRedirect,
  handleRedirectAuthResult,
  signInQuickDemoUser,
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

  const isInIframe = typeof window !== 'undefined' && window.self !== window.top;

  useEffect(() => {
    loadStatus();

    // Check if user just returned from Google Redirect sign in
    handleRedirectAuthResult()
      .then((res) => {
        if (res) {
          setCurrentUser(res.user);
          setHasGoogleDriveToken(!!res.accessToken);
          setSeedResult(`Signed in as ${res.user.displayName || res.user.email} via Google Account.`);
          loadStatus();
        }
      })
      .catch((err) => {
        console.warn('Redirect auth check notice:', err);
      });

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

  const handleGoogleDriveSignIn = async (mode: 'popup' | 'redirect' = 'popup') => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      if (mode === 'redirect') {
        await signInWithGoogleRedirect();
        return;
      }
      const { user, accessToken } = await signInWithGoogle();
      setCurrentUser(user);
      setHasGoogleDriveToken(!!accessToken);
      setSeedResult(`Signed in as ${user.displayName || user.email}. Google Drive integration active!`);
      loadStatus();
    } catch (err: any) {
      console.error('Google Sign In error:', err);
      const isPopupBlocked = err?.code === 'auth/popup-blocked' || err?.message?.toLowerCase().includes('popup-blocked');
      if (isPopupBlocked) {
        setAuthError('auth/popup-blocked');
      } else {
        setAuthError(err.message || 'Failed to sign in with Google');
      }
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

  const handleQuickDemoSignIn = async () => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      const user = await signInQuickDemoUser();
      setCurrentUser(user);
      setSeedResult(`Demo Compliance Officer authenticated (${user.email || 'Session UID: ' + user.uid.substring(0, 6)}). Full access unlocked!`);
      loadStatus();
    } catch (err: any) {
      setAuthError(err.message || 'Demo authentication failed');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleOpenInNewTab = () => {
    if (typeof window !== 'undefined') {
      window.open(window.location.href, '_blank', 'noopener,noreferrer');
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
          <div className="space-y-2">
            {authError === 'auth/popup-blocked' || authError.includes('popup-blocked') ? (
              <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-950 space-y-3 shadow-xs">
                <div className="flex items-center gap-2 font-bold text-amber-900 text-sm">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Google Sign-In Pop-up Blocked by Browser</span>
                </div>
                <p className="text-amber-900 leading-relaxed text-xs">
                  Your web browser automatically blocked the Google authentication pop-up window. This is normal browser security behavior inside preview iframes or when a pop-up blocker extension is active.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleGoogleDriveSignIn('popup')}
                    disabled={authLoading}
                    className="w-full py-2 px-3 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Retry with Direct Click</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleGoogleDriveSignIn('redirect')}
                    disabled={authLoading}
                    className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                  >
                    <Globe className="w-3.5 h-3.5" />
                    <span>Sign in via Redirect (No Pop-up)</span>
                  </button>
                </div>

                {isInIframe && (
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={handleOpenInNewTab}
                      className="w-full py-1.5 px-3 bg-white border border-amber-300 hover:bg-amber-100/70 text-amber-900 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-amber-700" />
                      <span>Open App in Full Browser Tab (Avoids Iframe Restrictions)</span>
                    </button>
                  </div>
                )}

                <div className="p-2.5 bg-white/90 border border-amber-200 rounded-lg text-[11px] text-slate-700 space-y-1">
                  <span className="font-semibold text-slate-900">How to allow pop-ups in your browser:</span>
                  <ol className="list-decimal list-inside space-y-0.5 text-slate-600">
                    <li>Look for the <strong>Pop-up blocked icon</strong> (with red cross) in your browser address bar (top right).</li>
                    <li>Click it and choose <strong>"Always allow pop-ups and redirects from this site"</strong>.</li>
                    <li>Click the <strong>Retry with Direct Click</strong> button above.</li>
                  </ol>
                </div>

                <div className="pt-1.5 border-t border-amber-200/80 flex items-center justify-between">
                  <span className="text-[11px] text-amber-800">Need instant access without pop-ups?</span>
                  <button
                    type="button"
                    onClick={handleQuickDemoSignIn}
                    disabled={authLoading}
                    className="py-1 px-2.5 bg-slate-800 hover:bg-slate-900 text-white text-[11px] font-semibold rounded flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                  >
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    <span>1-Click Internal Staff Login</span>
                  </button>
                </div>
              </div>
            ) : authError.includes('unauthorized-domain') ? (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 space-y-2">
                <div className="flex items-center gap-2 font-bold text-rose-950">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>Domain Not Authorized in Firebase</span>
                </div>
                <div className="text-xs text-rose-800 space-y-2 leading-relaxed">
                  <p>
                    Firebase blocked the sign-in because your hosting domain (<strong className="font-mono bg-rose-100 px-1 py-0.5 rounded text-rose-950">{typeof window !== 'undefined' ? window.location.hostname : 'your-domain.onrender.com'}</strong>) is not yet listed under <strong>Authorized Domains</strong> in your Firebase project.
                  </p>
                  <div className="p-3 bg-white/80 border border-rose-200 rounded-lg space-y-1.5 text-[11px] text-slate-800">
                    <div className="font-bold text-slate-900">How to fix this in 30 seconds:</div>
                    <ol className="list-decimal list-inside space-y-1 text-slate-700">
                      <li>
                        Go to the Firebase Console:
                        <a 
                          href="https://console.firebase.google.com/project/gen-lang-client-0809712068/authentication/settings" 
                          target="_blank" 
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 ml-1 text-blue-600 underline font-semibold hover:text-blue-800"
                        >
                          Firebase Auth Settings <ExternalLink className="w-3 h-3 inline" />
                        </a>
                      </li>
                      <li>Click on the <strong>Settings</strong> tab, then select <strong>Authorized domains</strong>.</li>
                      <li>
                        Click <strong>Add domain</strong> and paste: <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono font-bold text-slate-900">{typeof window !== 'undefined' ? window.location.hostname : 'your-app.onrender.com'}</code>
                      </li>
                      <li>Click <strong>Save</strong> and refresh this page.</li>
                    </ol>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-center justify-between">
                <span>{authError}</span>
                <button
                  type="button"
                  onClick={() => setAuthError(null)}
                  className="text-xs font-semibold text-rose-600 hover:text-rose-800 ml-2"
                >
                  Dismiss
                </button>
              </div>
            )}
          </div>
        )}

        {currentUser ? (
          <div className="space-y-3">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1">
              <div className="text-slate-500">Authenticated Account:</div>
              <div className="font-semibold text-slate-900">{currentUser.email || currentUser.displayName || currentUser.uid}</div>
              <div className="text-[11px] text-slate-500">
                Google Drive Scope: {hasGoogleDriveToken ? 'Active & Authorized (Drive file permissions granted)' : 'Standard Session (Local / Firestore Drive Storage)'}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {!hasGoogleDriveToken && (
                <>
                  <button
                    type="button"
                    onClick={() => handleGoogleDriveSignIn('popup')}
                    disabled={authLoading}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-xs"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>Authorize Google Drive (Pop-up)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleGoogleDriveSignIn('redirect')}
                    disabled={authLoading}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium flex items-center gap-1.5 cursor-pointer"
                  >
                    <Globe className="w-3.5 h-3.5" />
                    <span>Authorize via Redirect</span>
                  </button>
                </>
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
              <div className="space-y-1.5">
                <div className="font-semibold text-slate-900 text-xs flex items-center gap-1.5">
                  <KeyRound className="w-4 h-4 text-blue-600" />
                  <span>Sign in with Google Workspace</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Connect your Google account to authorize document uploads directly to Inject Care's Google Drive folders.
                </p>
              </div>

              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={() => handleGoogleDriveSignIn('popup')}
                  disabled={authLoading}
                  className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-colors"
                >
                  <LogIn className="w-4 h-4" />
                  <span>{authLoading ? 'Signing In...' : 'Sign In with Google (Pop-up)'}</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleGoogleDriveSignIn('redirect')}
                    disabled={authLoading}
                    className="flex-1 py-1.5 px-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-[11px] font-medium rounded-lg flex items-center justify-center gap-1 cursor-pointer transition-colors"
                  >
                    <Globe className="w-3.5 h-3.5 text-blue-600" />
                    <span>Redirect Mode</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleQuickDemoSignIn}
                    disabled={authLoading}
                    className="flex-1 py-1.5 px-2 bg-slate-900 hover:bg-black text-amber-300 text-[11px] font-medium rounded-lg flex items-center justify-center gap-1 cursor-pointer transition-colors shadow-2xs"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Quick Staff Demo</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Internal Email/Password Option */}
            <form onSubmit={handleInternalSignIn} className="p-4 border border-slate-200 rounded-xl bg-slate-50/70 space-y-3">
              <div className="flex items-center justify-between">
                <div className="font-semibold text-slate-900 text-xs">Internal Staff Sign-In</div>
                <span className="text-[10px] text-slate-400">Offline / Standalone</span>
              </div>
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
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={authLoading}
                  className="flex-1 py-2 px-3 bg-slate-800 hover:bg-slate-900 text-white text-xs font-medium rounded cursor-pointer transition-colors"
                >
                  {authLoading ? 'Authenticating...' : 'Internal Sign In'}
                </button>
                <button
                  type="button"
                  onClick={handleQuickDemoSignIn}
                  disabled={authLoading}
                  className="py-2 px-3 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 text-xs font-medium rounded cursor-pointer transition-colors"
                >
                  Demo Fill
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
