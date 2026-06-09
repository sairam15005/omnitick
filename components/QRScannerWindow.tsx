import React, { useEffect, useState, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { 
  Camera, 
  CameraOff, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  FileLock, 
  Zap, 
  HelpCircle,
  Video,
  VideoOff,
  Sparkles,
  ChevronRight,
  Maximize2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface QRScannerWindowProps {
  onScanSuccess: (decodedText: string) => Promise<void>;
  onClose?: () => void;
}

const QRScannerWindow: React.FC<QRScannerWindowProps> = ({ onScanSuccess, onClose }) => {
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanStatus, setScanStatus] = useState<'idle' | 'starting' | 'scanning' | 'success' | 'error' | 'permission_denied'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [lastScannedCode, setLastScannedCode] = useState<string>('');
  const [hasCheckedCameras, setHasCheckedCameras] = useState<boolean>(false);

  // Sound buzzers
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  const qrReaderRef = useRef<Html5Qrcode | null>(null);
  const readerId = "omnitick-qr-scanner-element";

  // Audio signals
  const playBeep = (freq = 880, duration = 0.15) => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.type = 'sine';
      oscillator.frequency.value = freq;
      gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);

      oscillator.start();
      oscillator.stop(audioCtx.currentTime + duration);
    } catch (e) {
      console.warn("Audio Context beep blocker:", e);
    }
  };

  // Discover camera feeds on mount
  useEffect(() => {
    const discoverCameras = async () => {
      setScanStatus('starting');
      try {
        const devices = await Html5Qrcode.getCameras();
        if (devices && devices.length > 0) {
          setCameras(devices);
          // Auto select first camera or back camera if available
          const backCam = devices.find(d => d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('environment'));
          setSelectedCameraId(backCam ? backCam.id : devices[0].id);
          setScanStatus('idle');
        } else {
          setErrorMessage("No physical camera feedback devices detected on this system.");
          setScanStatus('error');
        }
      } catch (err: any) {
        console.error("Camera detection error:", err);
        setErrorMessage("Camera access blocked. Please grant permissions in your browser bar, Sairam.");
        setScanStatus('permission_denied');
      } finally {
        setHasCheckedCameras(true);
      }
    };

    discoverCameras();

    return () => {
      stopCameraScanner();
    };
  }, []);

  const startCameraScanner = async (cameraId: string) => {
    if (!cameraId) return;
    setErrorMessage('');
    
    // Stop any existing scanner
    await stopCameraScanner();

    setScanStatus('starting');

    try {
      const html5QrCode = new Html5Qrcode(readerId);
      qrReaderRef.current = html5QrCode;

      await html5QrCode.start(
        cameraId,
        {
          fps: 15,
          qrbox: (width, height) => {
            const minDim = Math.min(width, height);
            const boxSize = Math.floor(minDim * 0.65);
            return { width: boxSize, height: boxSize };
          }
        },
        async (decodedText) => {
          // Success Callback
          if (decodedText && decodedText !== lastScannedCode) {
            setLastScannedCode(decodedText);
            playBeep(1200, 0.2); // high pitched verify beep
            setScanStatus('success');
            
            // Stop scanning briefly, process, then resume
            await stopCameraScanner();
            await onScanSuccess(decodedText);
            
            // Wait 2 seconds before returning to idle/scanning state
            setTimeout(() => {
              setScanStatus('idle');
              setLastScannedCode('');
            }, 2500);
          }
        },
        (errorMessage) => {
          // Quietly log verbose frame detection errors (very common while seeking QR)
          // console.log("seeking QR frame...", errorMessage);
        }
      );

      setIsScanning(true);
      setScanStatus('scanning');
    } catch (err: any) {
      console.error("Failed to boot QR scanner node:", err);
      setErrorMessage(err.message || "Could not instantiate webcam hardware feed.");
      setScanStatus('error');
      playBeep(220, 0.4); // low failure rumble
    }
  };

  const stopCameraScanner = async () => {
    if (qrReaderRef.current) {
      try {
        if (qrReaderRef.current.isScanning) {
          await qrReaderRef.current.stop();
        }
      } catch (e) {
        console.warn("Error stopping scanner stream: ", e);
      } finally {
        qrReaderRef.current = null;
        setIsScanning(false);
      }
    }
  };

  const handleToggleScanning = () => {
    if (isScanning) {
      stopCameraScanner().then(() => setScanStatus('idle'));
    } else {
      startCameraScanner(selectedCameraId);
    }
  };

  const handleCameraChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setSelectedCameraId(id);
    if (isScanning) {
      startCameraScanner(id);
    }
  };

  return (
    <div className="bg-[#0c1020]/90 border border-slate-800 rounded-3xl p-6 relative overflow-hidden backdrop-blur-xl">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-saffron to-[#138808]" />

      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-saffron/10 rounded-xl text-saffron">
            <Camera className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h4 className="text-sm font-black text-white uppercase tracking-wider">Webcam QR Verification Node</h4>
            <p className="text-[10px] text-slate-500 font-mono">Live Gate Admission Guard</p>
          </div>
        </div>

        {/* Audio feedback setting */}
        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          className={`text-2xs font-bold px-3 py-1 rounded-lg border transition-all ${
            soundEnabled ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-slate-900 text-slate-500 border-slate-800'
          }`}
        >
          {soundEnabled ? '🔊 Audio ON' : '🔇 Muted'}
        </button>
      </div>

      {/* Main Video View Box Container */}
      <div className="relative aspect-square w-full max-w-[340px] mx-auto bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden group shadow-2xl flex flex-col items-center justify-center">
        
        {/* The div where HTML5QRCode mounts the canvas and video elements */}
        <div 
          id={readerId} 
          className="absolute inset-0 w-full h-full [&>video]:object-cover" 
        />

        {/* Dynamic Holographic Green Laser Line overlays when scanning is active */}
        {scanStatus === 'scanning' && (
          <>
            {/* Green bounding box guides */}
            <div className="absolute inset-0 border-[32px] border-slate-950/65 flex items-center justify-center pointer-events-none">
              <div className="w-48 h-48 border-2 border-dashed border-emerald-400/50 relative flex items-center justify-center">
                
                {/* Micro corner highlights */}
                <div className="absolute -top-1 -left-1 w-4 h-4 border-t-4 border-l-4 border-emerald-400" />
                <div className="absolute -top-1 -right-1 w-4 h-4 border-t-4 border-r-4 border-emerald-400" />
                <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-4 border-l-4 border-emerald-400" />
                <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-4 border-r-4 border-emerald-400" />
              </div>
            </div>

            {/* Sweep laser beam */}
            <motion.div 
              initial={{ y: "10%" }}
              animate={{ y: "90%" }}
              transition={{ repeat: Infinity, repeatType: "reverse", duration: 1.8, ease: "easeInOut" }}
              className="absolute left-6 right-6 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_#34d399] z-10 pointer-events-none"
            />
          </>
        )}

        {/* Overlay screens for state cues */}
        <AnimatePresence mode="wait">
          {scanStatus === 'starting' && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center p-6 text-center space-y-3 z-20"
            >
              <RefreshCw className="w-8 h-8 text-saffron animate-spin" />
              <p className="text-xs text-slate-300 font-bold uppercase tracking-wider">Engaging Camera Stream...</p>
            </motion.div>
          )}

          {scanStatus === 'success' && (
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="absolute inset-0 bg-emerald-950/95 flex flex-col items-center justify-center p-6 text-center space-y-3 z-30"
            >
              <div className="w-12 h-12 bg-emerald-500/25 border border-emerald-400 rounded-full flex items-center justify-center animate-bounce">
                <CheckCircle2 className="w-7 h-7 text-emerald-400" />
              </div>
              <div>
                <p className="text-xs font-black text-white uppercase tracking-wider">QR Tag Decoded!</p>
                <p className="text-[10px] text-emerald-300 font-mono mt-1 w-48 truncate mx-auto">{lastScannedCode}</p>
              </div>
            </motion.div>
          )}

          {scanStatus === 'permission_denied' && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center p-6 text-center space-y-4 z-20"
            >
              <VideoOff className="w-10 h-10 text-red-400 animate-bounce" />
              <div className="space-y-1">
                <p className="text-xs font-black text-white uppercase tracking-wider">Permission Locked</p>
                <p className="text-[10px] text-slate-400 px-4 leading-relaxed">
                  The camera hardware is locked by security policies.
                </p>
              </div>
              <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-[10px] text-slate-500 leading-normal">
                Please allow camera access inside your browser address bar permissions, Sairam.
              </div>
            </motion.div>
          )}

          {scanStatus === 'idle' && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 bg-slate-950/80 flex flex-col items-center justify-center p-6 text-center space-y-4 z-25"
            >
              <div className="p-4 bg-saffron/10 border border-saffron/20 rounded-full text-saffron">
                <Video className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-black text-white uppercase tracking-wide">Ready for scanning</p>
                <p className="text-[10px] text-slate-400">Position the ticket QR badge squarely inside the framing box.</p>
              </div>
              <button
                onClick={handleToggleScanning}
                className="py-2.5 px-6 bg-saffron hover:bg-orange-500 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition-all shadow-md cursor-pointer"
              >
                Start Feed
              </button>
            </motion.div>
          )}

          {scanStatus === 'error' && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center p-6 text-center space-y-4 z-20"
            >
              <XCircle className="w-10 h-10 text-red-500" />
              <div className="space-y-1">
                <p className="text-xs font-black text-white uppercase tracking-wider">Device Stream Error</p>
                <p className="text-[10px] text-red-400/80 leading-normal px-2 truncate w-full">{errorMessage}</p>
              </div>
              <button
                onClick={() => startCameraScanner(selectedCameraId)}
                className="py-2 px-4 bg-slate-900 border border-slate-800 text-white rounded-xl text-xs font-bold"
              >
                Retry Boot
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Camera Dropdown selector */}
      {cameras.length > 1 && (
        <div className="mt-4 space-y-1.5">
          <label className="text-[9px] font-black uppercase text-slate-500 tracking-widest block font-mono">Select Input Camera Device:</label>
          <select
            value={selectedCameraId}
            onChange={handleCameraChange}
            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-[11px] font-semibold text-slate-300 outline-none"
          >
            {cameras.map(cam => (
              <option key={cam.id} value={cam.id}>{cam.label || `Camera ${cam.id.slice(0, 5)}`}</option>
            ))}
          </select>
        </div>
      )}

      {/* Quick guide indicators */}
      <div className="mt-5 pt-4 border-t border-slate-850 space-y-2 text-2xs leading-normal text-slate-400 font-medium">
        <p className="flex items-center gap-1.5 font-bold text-saffron">
          <Sparkles size={11} className="shrink-0" /> Quick testing instructions:
        </p>
        <p className="pl-4">
          1. Go to "Ticket Wallet" in another tab, click "Load into gate scanner" or click to show the ticket and scan its QR barcode from your mobile device!
        </p>
        <p className="pl-4">
          2. Alternatively, copy-paste the blockchain hash into the "Manual Simulator" input to process instantaneous check-ins.
        </p>
      </div>

      {/* Stop button while active */}
      {isScanning && (
        <button
          onClick={handleToggleScanning}
          className="w-full py-2.5 mt-4 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer"
        >
          Stop Camera Stream
        </button>
      )}
    </div>
  );
};

export default QRScannerWindow;
