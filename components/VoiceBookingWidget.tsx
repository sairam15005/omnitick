import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mic, 
  MicOff, 
  X, 
  Volume2, 
  VolumeX, 
  Sparkles, 
  Loader2, 
  Check, 
  Trash2, 
  Ticket as TicketIcon, 
  MapPin, 
  Calendar, 
  Clock, 
  Info,
  ChevronRight,
  UserCheck
} from 'lucide-react';
import { getVoiceIntent } from '../services/gemini';
import { Event, Ticket } from '../types';

interface VoiceBookingWidgetProps {
  events: Event[];
  onBookingSuccess: (ticket: Ticket) => void;
  token: string | null;
}

const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

const VoiceBookingWidget: React.FC<VoiceBookingWidgetProps> = ({ events, onBookingSuccess, token }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [statusText, setStatusText] = useState<'idle' | 'listening' | 'identifying' | 'confirming' | 'booking' | 'success' | 'error'>('idle');
  const [errorText, setErrorText] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Intent parsing states
  const [pendingBooking, setPendingBooking] = useState<{
    event: Event;
    quantity: number;
    ticketType: 'General' | 'VIP' | 'Backstage';
    totalPrice: number;
  } | null>(null);

  const [lastMatchedEvent, setLastMatchedEvent] = useState<Event | null>(null);
  const recognitionRef = useRef<any>(null);

  // Initialize SpeechRecognition safely
  useEffect(() => {
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'en-IN'; // Elegant local Indian locale

      rec.onstart = () => {
        setIsListening(true);
        setStatusText('listening');
        setTranscription('');
        setErrorText('');
      };

      rec.onend = () => {
        setIsListening(false);
      };

      rec.onresult = async (e: any) => {
        const text = e.results[0][0].transcript;
        if (!text) return;
        setTranscription(text);
        await handleParsedSpeech(text);
      };

      rec.onerror = (e: any) => {
        console.error("Speechrecognition error code:", e.error);
        setIsListening(false);
        if (e.error === 'not-allowed') {
          setErrorText("Microphone permission was denied. Enable permission in address bar, Ji.");
        } else {
          setErrorText("We could not grab your audio clearly. Click microphone to try again.");
        }
        setStatusText('error');
        speakMessage("Sorry Bhai, I encountered a communication error. Could you try re-speaking?");
      };

      recognitionRef.current = rec;
    }
  }, [events]);

  // Handle Synthesis vocal feedback helper (Text to Speech)
  const speakMessage = (message: string) => {
    if (!soundEnabled || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(message);
      utterance.lang = 'en-IN'; // Beautiful local Indian English accent
      utterance.rate = 0.95; // Gentle and humble speed of talk

      // Find an Indian voice if possible
      const voices = window.speechSynthesis.getVoices();
      const matchVoice = voices.find(v => 
        v.lang.includes('IN') || 
        v.name.toLowerCase().includes('india') ||
        v.name.toLowerCase().includes('sangeeta') ||
        v.name.toLowerCase().includes('google')
      );
      if (matchVoice) {
        utterance.voice = matchVoice;
      }
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn("SpeechSynthesis playback failed:", err);
    }
  };

  const startListening = () => {
    if (!recognitionRef.current) {
      setErrorText("Web Speech Recognition API is not supported in this browser, Sairam.");
      setStatusText('error');
      return;
    }
    try {
      recognitionRef.current.start();
    } catch (e) {
      recognitionRef.current.stop();
      setTimeout(() => {
        recognitionRef.current.start();
      }, 400);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };

  // Main intelligent speech processing state machine handler
  const handleParsedSpeech = async (speechText: string) => {
    setStatusText('identifying');
    try {
      const res = await getVoiceIntent(speechText);
      
      if (!res) {
        throw new Error("Could not connect to Voice Parsing Nodes.");
      }

      // Check current states to verify if user is confirming or cancelling a pending reservation
      if (pendingBooking && (res.intent === 'confirm' || res.intent === 'book')) {
        // Double check if user said "yes" or "ok" or is confirming
        await executeTicketPurchase();
        return;
      }

      if (pendingBooking && res.intent === 'cancel') {
        setPendingBooking(null);
        setStatusText('idle');
        speakMessage(res.ttsMessage || "Understood Sairam Bhai. The ticket order has been discarded.");
        return;
      }

      // Standard booking flow
      if (res.intent === 'book' && res.matchedEventId) {
        const foundEvent = events.find(e => e.id === res.matchedEventId);
        if (foundEvent) {
          const qty = res.quantity || 1;
          const ticketType = (res.ticketType as any) || 'General';
          const calculatedPrice = foundEvent.basePrice * qty;

          setPendingBooking({
            event: foundEvent,
            quantity: qty,
            ticketType,
            totalPrice: calculatedPrice
          });
          setStatusText('confirming');
          speakMessage(res.ttsMessage || `Awesome Bhai! I found ${foundEvent.name}. Booking ${qty} tickets will cost ₹${calculatedPrice.toLocaleString()}. Say yes to confirm.`);
          return;
        }
      }

      // General query response
      setStatusText('idle');
      speakMessage(res.ttsMessage || "I'm listing active events on your node. Sairam, how can I assist you today?");
      
    } catch (error: any) {
      console.error("Vocal response processing error:", error);
      setErrorText("Error matching voice commands. Please speak explicitly, Bhai.");
      setStatusText('error');
      speakMessage("I was unable to index your voice instructions securely, ji. Let me know if you want to try again.");
    }
  };

  // Perform physical ticket creation write on database
  const executeTicketPurchase = async () => {
    if (!pendingBooking) return;
    setStatusText('booking');

    try {
      const response = await fetch('/api/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          eventId: pendingBooking.event.id,
          quantity: pendingBooking.quantity,
          type: pendingBooking.ticketType
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Ticketing request failed.");
      }

      setLastMatchedEvent(pendingBooking.event);
      onBookingSuccess(data.ticket);
      setStatusText('success');
      
      const successVoice = `Jai Ho Sairam! Your ${pendingBooking.quantity} passes for ${pendingBooking.event.name} are secured in your Bharat wallet! Blockchain block transactions posted.`;
      speakMessage(successVoice);
      
      setPendingBooking(null);
    } catch (err: any) {
      console.error(err);
      setErrorText(err.message || "Ledger transaction error. Check seating availability.");
      setStatusText('error');
      speakMessage("Failed to place ticket purchase, Bhai. Seating capacity might be full.");
    }
  };

  const handleManualConfirm = () => {
    executeTicketPurchase();
  };

  const handleManualCancel = () => {
    setPendingBooking(null);
    setStatusText('idle');
    speakMessage("Booking order dismissed, Ji.");
  };

  return (
    <>
      {/* Absolute Bottom-Right Floating Mic Accent Trigger Button */}
      <motion.button
        id="voice-mic-trigger-btn"
        whileHover={{ scale: 1.1, rotate: 2 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => {
          setIsOpen(true);
          // start listening immediately on open
          setTimeout(startListening, 300);
        }}
        className="fixed bottom-6 right-6 z-40 p-4 rounded-full bg-gradient-to-r from-saffron to-amber-500 text-[#0a0a0a] shadow-xl shadow-orange-500/20 hover:shadow-orange-500/30 font-black flex items-center gap-2 border border-white/20"
      >
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600"></span>
        </span>
        <Mic className="w-6 h-6 animate-pulse" />
        <span className="text-xs font-black uppercase tracking-widest leading-none pr-1 hidden sm:inline-block">AI Voice Ticket</span>
      </motion.button>

      {/* Slide-In Immersive Voice Drawer Controller */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 bg-[#000]/60 backdrop-blur-md z-50 flex items-end justify-center sm:items-center">
            
            {/* Modal Box Backdrop Close */}
            <div className="absolute inset-0" onClick={() => { setIsOpen(false); stopListening(); }} />

            <motion.div
              id="voice-drawer-panel"
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="relative w-full max-w-xl bg-[#0b0f1a] border border-slate-800 rounded-t-[2.5rem] sm:rounded-[3rem] shadow-2xl p-6 sm:p-8 overflow-hidden z-10"
            >
              {/* Seamless Aesthetic Borders */}
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-saffron via-amber-400 to-[#138808]" />

              {/* Floating control buttons */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-saffron/10 rounded-xl text-saffron">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-white uppercase tracking-wider">Voice Control Unit</h3>
                    <p className="text-[10px] text-slate-500 font-mono uppercase">Bharat AI Node v3.5</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSoundEnabled(!soundEnabled)}
                    className={`p-2 rounded-xl border text-slate-400 hover:text-white transition-all ${
                      soundEnabled ? 'bg-saffron/10 border-saffron/20 text-saffron' : 'bg-slate-900 border-slate-800'
                    }`}
                    title={soundEnabled ? "Mute voice synthesizer" : "Unmute voice synthesizer"}
                  >
                    {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
                  </button>

                  <button
                    onClick={() => { setIsOpen(false); stopListening(); }}
                    className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-all"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Pulsing Voice Listening Visualizer */}
              <div className="flex flex-col items-center justify-center py-6 border-b border-slate-800/40">
                <div className="relative mb-4">
                  
                  {/* Glowing Wave Ring Effects while recording */}
                  {isListening && (
                    <>
                      <motion.div 
                        animate={{ scale: [1, 1.6, 1], opacity: [0.3, 0, 0.3] }}
                        transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                        className="absolute inset-0 bg-saffron/25 rounded-full blur-sm"
                      />
                      <motion.div 
                        animate={{ scale: [1, 2.2, 1], opacity: [0.15, 0, 0.15] }}
                        transition={{ repeat: Infinity, duration: 2.4, ease: "easeInOut", delay: 0.4 }}
                        className="absolute inset-0 bg-amber-400/10 rounded-full blur-md"
                      />
                    </>
                  )}

                  <button
                    onClick={isListening ? stopListening : startListening}
                    className={`relative p-8 rounded-full border shadow-lg transition-transform active:scale-95 ${
                      isListening 
                        ? 'bg-saffron border-saffron text-slate-950 animate-pulse' 
                        : 'bg-slate-900 border-slate-800 text-saffron hover:border-saffron/40'
                    }`}
                  >
                    {isListening ? <Mic className="w-10 h-10 stroke-[2.5]" /> : <MicOff className="w-10 h-10 text-slate-500" />}
                  </button>
                </div>

                <div className="text-center">
                  <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${
                    statusText === 'listening' ? 'bg-red-500/10 text-red-400 animate-pulse' :
                    statusText === 'identifying' ? 'bg-amber-400/10 text-amber-400 animate-pulse' :
                    statusText === 'confirming' ? 'bg-[#FF9933]/15 text-[#FF9933]' :
                    statusText === 'booking' ? 'bg-indigo-500/10 text-indigo-400 animate-ping' :
                    statusText === 'success' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-900 text-slate-500'
                  }`}>
                    {statusText === 'idle' && 'CLICK MIC TO SPEAK'}
                    {statusText === 'listening' && '● RECORDING LIVE AUDIO'}
                    {statusText === 'identifying' && 'PARSING AI VOCAL MODEL'}
                    {statusText === 'confirming' && 'CONFIRMATION REQUIRED'}
                    {statusText === 'booking' && 'POSTING BLOCK TRANSACTION...'}
                    {statusText === 'success' && 'LEDEGR TRANSACTION SUCCESSFUL'}
                    {statusText === 'error' && 'TRANSACTION HALTED'}
                  </span>
                  
                  {isListening ? (
                    <p className="text-xs text-slate-400 mt-2 font-medium">"Listening, speak now..."</p>
                  ) : (
                    <p className="text-xs text-slate-500 mt-2 font-medium">Click icon above to engage speaker nodes.</p>
                  )}
                </div>
              </div>

              {/* Dynamic Information Display Box */}
              <div className="py-5 space-y-4">
                
                {/* 1. Realtime Transcription output */}
                {transcription && (
                  <div className="bg-[#0a0a0a]/50 border border-slate-800 rounded-2xl p-4">
                    <span className="text-[8px] font-black uppercase tracking-widest text-slate-500 font-mono block mb-1">Raw Audio Input:</span>
                    <p className="text-xs font-semibold text-slate-300 italic leading-relaxed">
                      "{transcription}"
                    </p>
                  </div>
                )}

                {/* 2. Error Prompt Block */}
                {errorText && (
                  <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-2xl">
                    <p className="text-xs font-semibold text-red-400">{errorText}</p>
                  </div>
                )}

                {/* 3. Success Feedback Block */}
                {statusText === 'success' && lastMatchedEvent && (
                  <div className="bg-emerald-500/5 border border-emerald-500/15 rounded-3xl p-5 text-center space-y-3">
                    <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto border border-emerald-500/30 animate-bounce">
                      <UserCheck className="text-emerald-500 w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-sm font-black text-white">Jai Ho Sairam! Ticket Secured</h4>
                      <p className="text-xs text-slate-400 leading-relaxed">Your digital blockchain voucher has been updated in 'My Tickets'.</p>
                    </div>
                    <button
                      onClick={() => setIsOpen(false)}
                      className="text-xs font-black text-[#0a0a0a] bg-emerald-400 px-4 py-2 rounded-xl uppercase tracking-wider"
                    >
                      Dismiss Portal
                    </button>
                  </div>
                )}

                {/* 4. PENDING PRE-CONFIRMATION CARD (Requirement 2/3/4) */}
                {pendingBooking && (
                  <motion.div 
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="p-5 bg-gradient-to-br from-[#12182c] to-[#0c0f1d] border border-saffron/20 rounded-3xl space-y-4 shadow-xl relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 p-3 bg-saffron/10 text-saffron border-l border-b border-saffron/10 rounded-bl-3xl text-[9px] font-black uppercase font-mono tracking-widest">
                      PENDING ORDER
                    </div>

                    <div className="space-y-2">
                      <span className="inline-block text-[8px] font-black tracking-widest text-[#FF9933] uppercase px-2 py-0.5 rounded bg-orange-500/10">
                        {pendingBooking.event.category}
                      </span>
                      <h4 className="text-md font-extrabold text-white leading-tight truncate">
                        {pendingBooking.event.name}
                      </h4>

                      <div className="grid grid-cols-2 gap-2 pt-2 text-[11px] text-slate-400 border-t border-slate-800/60 mt-3">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <MapPin size={11} className="text-slate-500 shrink-0" />
                          <span className="truncate">{pendingBooking.event.location}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Calendar size={11} className="text-slate-500 shrink-0" />
                          <span>{pendingBooking.event.date}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-dashed border-slate-850">
                        <div>
                          <span className="text-[9px] text-slate-500 uppercase font-black font-mono">FEE PLAN</span>
                          <p className="text-xs font-bold text-slate-200">₹{pendingBooking.event.basePrice} x {pendingBooking.quantity}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-[9px] text-slate-500 uppercase font-black font-mono">TOTAL ESTIMATED</span>
                          <p className="text-sm font-black text-saffron">₹{pendingBooking.totalPrice.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>

                    {/* Speech response context info */}
                    <div className="p-3 bg-saffron/5 border border-saffron/15 rounded-xl">
                      <p className="text-[10px] text-saffron font-bold leading-relaxed flex items-center gap-1.5">
                        <Info size={12} />
                        Say "Yes, confirm" or click Confirm to execute booking.
                      </p>
                    </div>

                    {/* Manual Override Action row */}
                    <div className="grid grid-cols-2 gap-3 mt-4">
                      <button
                        onClick={handleManualCancel}
                        className="h-10 border border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white rounded-xl text-xs font-black uppercase tracking-wider transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleManualConfirm}
                        className="h-10 bg-saffron text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md shadow-orange-500/10"
                      >
                        <Check size={14} className="stroke-[2.5]" />
                        Confirm Booking
                      </button>
                    </div>
                  </motion.div>
                )}

              </div>

              {/* Speech guide suggestions */}
              {!pendingBooking && statusText !== 'success' && (
                <div className="bg-slate-950/40 rounded-2xl p-4 border border-slate-800/40">
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest font-mono block mb-2">💡 Try Spoken Commands:</span>
                  <ul className="text-2xs space-y-1.5 text-slate-400 font-medium">
                    <li className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer" onClick={() => { setTranscription('Book 2 tickets for Saffron Classical Goa'); handleParsedSpeech('Book 2 tickets for Saffron Classical Goa'); }}>
                      <ChevronRight size={10} className="text-saffron shrink-0" />
                      <span>"Book 2 tickets for IPL Mumbai match" (or your desired event keyword)</span>
                    </li>
                    <li className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer" onClick={() => { setTranscription('What events are matching Goa?'); handleParsedSpeech('What events are matching Goa?'); }}>
                      <ChevronRight size={10} className="text-saffron shrink-0" />
                      <span>"Show me Goa beach festival entries"</span>
                    </li>
                  </ul>
                </div>
              )}

            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default VoiceBookingWidget;
