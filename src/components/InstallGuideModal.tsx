import React, { useState, useEffect } from 'react';
import {
  X,
  Smartphone,
  Search,
  Download,
  Share2,
  Check,
  Copy,
  Globe,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Layers
} from 'lucide-react';

interface InstallGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function InstallGuideModal({ isOpen, onClose }: InstallGuideModalProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'pwa' | 'google' | 'shortlink'>('pwa');

  const appUrl = typeof window !== 'undefined' ? window.location.origin : ''; 

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Check if already in standalone mode
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else {
      // Manual instruction alert or toast
      alert(
        'Apne browser ke Menu (⋮ ya Share button) par click karein aur "Add to Home Screen" ya "Install App" select karein! Uske baad phone ke search bar me "Gaming Hub" likhte hi app open ho jayegi.'
      );
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(appUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl bg-[#0b0d1b] border border-cyan-500/40 rounded-2xl p-6 sm:p-8 shadow-[0_0_50px_rgba(0,240,255,0.25)] text-slate-100 overflow-hidden">
        {/* Neon accent glows */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors border border-slate-700/50"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3.5 mb-5">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/30 to-purple-600/30 border border-cyan-400/50 flex items-center justify-center shadow-[0_0_20px_rgba(0,240,255,0.3)]">
            <Search className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black font-orbitron tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-300 to-purple-400">
              Direct Search & Instant Open Setup
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 font-rajdhani">
              Bina link share kiye "Gaming Hub" search karke direct open karne ki complete guide
            </p>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-2 p-1 bg-[#101426] rounded-xl border border-slate-800 mb-6">
          <button
            onClick={() => setActiveTab('pwa')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs sm:text-sm font-orbitron font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'pwa'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-black shadow-[0_0_15px_rgba(0,240,255,0.4)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>1. Phone Search (Best)</span>
          </button>
          <button
            onClick={() => setActiveTab('google')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs sm:text-sm font-orbitron font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'google'
                ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-[0_0_15px_rgba(168,85,247,0.4)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>2. Google Search</span>
          </button>
          <button
            onClick={() => setActiveTab('shortlink')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs sm:text-sm font-orbitron font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'shortlink'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-black shadow-[0_0_15px_rgba(16,185,129,0.4)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Share2 className="w-4 h-4" />
            <span>3. Direct Name Link</span>
          </button>
        </div>

        {/* Tab 1: Phone Search via PWA */}
        {activeTab === 'pwa' && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-cyan-950/20 border border-cyan-500/30 flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
              <div className="text-xs sm:text-sm text-slate-300 space-y-1">
                <span className="font-bold text-cyan-300 font-orbitron">Bina Link Ke Sabse Aasan Tarika:</span>
                <p>
                  Aapke phone ke app drawer me <strong>"Gaming Hub"</strong> add ho jayega. Uske baad aap ya aapke dosto ko kabhi bhi link share karne ki zaroorat nahi padegi — bas phone ke search bar me <strong>"Gaming Hub"</strong> likhte hi app open ho jayegi!
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-[#12162b] border border-slate-700/60">
                <div className="flex items-center gap-2 font-bold font-orbitron text-cyan-400 mb-2">
                  <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-xs">1</span>
                  Android (Chrome / Edge)
                </div>
                <p className="text-slate-400 leading-relaxed">
                  Browser ke <strong>3 dots (⋮)</strong> par tap karein aur <strong className="text-white">"Install app"</strong> ya <strong className="text-white">"Add to Home screen"</strong> par click karein.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-[#12162b] border border-slate-700/60">
                <div className="flex items-center gap-2 font-bold font-orbitron text-purple-400 mb-2">
                  <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center text-xs">2</span>
                  iPhone / iPad (Safari)
                </div>
                <p className="text-slate-400 leading-relaxed">
                  Safari ke neeche <strong>Share icon</strong> par tap karein aur scroll karke <strong className="text-white">"Add to Home Screen"</strong> par tap karein.
                </p>
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleInstallClick}
                className="flex-1 py-3 px-5 rounded-xl bg-gradient-to-r from-cyan-400 via-teal-400 to-blue-500 text-black font-orbitron font-black text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 hover:opacity-95 shadow-[0_0_25px_rgba(0,240,255,0.4)] transition-all"
              >
                <Download className="w-4 h-4" />
                <span>{isInstalled ? 'Already Installed!' : 'Install Gaming Hub to Phone'}</span>
              </button>

              <button
                onClick={copyToClipboard}
                className="py-3 px-4 rounded-xl bg-slate-900 border border-slate-700 hover:border-slate-500 text-slate-300 font-orbitron text-xs font-semibold flex items-center justify-center gap-2 transition-all"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Copied!' : 'Copy URL'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: Google Search Indexing */}
        {activeTab === 'google' && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-500/30 text-xs sm:text-sm text-slate-300 space-y-2">
              <div className="flex items-center gap-2 font-bold text-purple-300 font-orbitron">
                <Globe className="w-4 h-4 text-purple-400" />
                Google Search Me Aane Ke Liye Kya Hua Hai?
              </div>
              <p>
                Humne aapke app me <strong>Google SEO Meta Tags</strong>, <strong>Keywords ("Gaming Hub")</strong>, <strong>Schema.org Gaming Data</strong>, <strong>sitemap.xml</strong> aur <strong>robots.txt</strong> sab add kar diye hain taaki Google bots ise crawl kar sakein!
              </p>
            </div>

            <div className="space-y-2.5 text-xs text-slate-300">
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-[#12162b] border border-slate-800">
                <div className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">1</div>
                <div>
                  <strong className="text-white block font-orbitron">Google Search Console me URL add karein (100% Free):</strong>
                  <span className="text-slate-400">
                    Google par <span className="text-cyan-300">search.google.com/search-console</span> khole aur apna app URL daal kar "Request Indexing" par click karein. Isse Google 24-48 ghante me page index kar leta hai.
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-[#12162b] border border-slate-800">
                <div className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">2</div>
                <div>
                  <strong className="text-white block font-orbitron">Generic Keyword vs Unique Brand:</strong>
                  <span className="text-slate-400">
                    Dhyan rahe, duniya me <em>"Gaming Hub"</em> naam se pehle se Samsung Gaming Hub aur Lenovo Gaming Hub ke millions of pages hain. Isliye Google search me turant 1st number par aane ke liye aap apne dosto ko <strong>"Gaming Hub Free Esports"</strong> ya apna custom brand keyword search karne ko keh sakte hain.
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Easy Name / Short Link */}
        {activeTab === 'shortlink' && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 text-xs sm:text-sm text-slate-300 space-y-2">
              <div className="flex items-center gap-2 font-bold text-emerald-300 font-orbitron">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Custom Short Name ya Custom Domain
              </div>
              <p>
                Agar aap chahte hain ki log bina lamba link dekhe direct yaad rakh sakein, to aap free me short name bana sakte hain:
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-[#12162b] border border-slate-800 space-y-3">
              <div className="text-xs text-slate-400">
                Aapka Current Live Free Link:
              </div>
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-black/60 border border-cyan-500/30 font-mono text-xs text-cyan-300 select-all overflow-x-auto">
                {appUrl}
              </div>
              <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                <span>Free Short URL bana sakte hain (jaise: <strong>bit.ly/gaminghub-play</strong>)</span>
                <button
                  onClick={copyToClipboard}
                  className="px-3 py-1.5 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 font-orbitron font-bold flex items-center gap-1.5 hover:bg-cyan-500/30"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer info */}
        <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
          <span>Zero Billing Required • 100% Free Forever</span>
          <button
            onClick={onClose}
            className="text-cyan-400 hover:text-cyan-300 font-orbitron font-bold"
          >
            Done / Close
          </button>
        </div>
      </div>
    </div>
  );
}
