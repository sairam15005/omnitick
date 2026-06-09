import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CreditCard, ShieldCheck, Calendar, MapPin, ArrowLeft, Loader2, CheckCircle2, Sparkles, AlertTriangle, Cpu, Wallet, Receipt, Check } from 'lucide-react';
import { Event, Ticket } from '../types';
import { EventAssistant } from './EventAssistant';

interface CheckoutProps {
  event: Event;
  onBack: () => void;
  onConfirm: (ticket: Ticket) => void;
}

// Dynamically load Razorpay SDK
const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    if ((window as any).Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

const Checkout: React.FC<CheckoutProps> = ({ event, onBack, onConfirm }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [generatedTicket, setGeneratedTicket] = useState<Ticket | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);

  // Sandbox simulated payment overlay state
  const [showSimulatedPayment, setShowSimulatedPayment] = useState(false);
  const [simulatedOrder, setSimulatedOrder] = useState<any>(null);

  const totalPrice = event.basePrice * quantity;

  // Real or Simulated Razorpay payment entry points
  const handlePayment = async () => {
    setIsProcessing(true);
    setErrorText(null);
    
    try {
      // 1. Ensure Razorpay script is loaded dynamically
      const sdkLoaded = await loadRazorpayScript();
      if (!sdkLoaded) {
        throw new Error('Failed to load Razorpay checkout script. Check network connection.');
      }

      const token = sessionStorage.getItem('omni_jwt');
      
      // 2. Initialize Order on express backend
      const response = await fetch('/api/payments/order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          eventId: event.id,
          quantity: quantity
        })
      });

      const orderData = await response.json();

      if (!response.ok) {
        throw new Error(orderData.error || 'Failed to create Razorpay Order.');
      }

      // 3. Handle Sandbox Mode fallback if keys are vacant
      if (orderData.isSandbox) {
        setSimulatedOrder(orderData);
        setShowSimulatedPayment(true);
        return;
      }

      // 4. Fire official Razorpay checkout integration overlay
      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "OmniTick Bharat",
        description: `Secure pass generation for ${event.name}`,
        image: "https://api.dicebear.com/7.x/bottts/svg?seed=omnitick",
        order_id: orderData.id,
        handler: async (paymentResponse: any) => {
          try {
            setIsProcessing(true);
            const verifyResponse = await fetch('/api/payments/verify', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                razorpay_order_id: paymentResponse.razorpay_order_id,
                razorpay_payment_id: paymentResponse.razorpay_payment_id,
                razorpay_signature: paymentResponse.razorpay_signature,
                eventId: event.id,
                quantity: quantity,
                type: 'General',
                isSandbox: false
              })
            });

            const verifyData = await verifyResponse.json();
            if (!verifyResponse.ok) {
              throw new Error(verifyData.error || 'Signature check failed.');
            }

            setGeneratedTicket(verifyData.ticket);
            setIsConfirmed(true);
          } catch (err: any) {
            setErrorText(err.message || 'Signature authentication check failed.');
          } finally {
            setIsProcessing(false);
          }
        },
        prefill: {
          name: "Sairam",
          email: "SAIRAM1592005@gmail.com",
          contact: "9999999999"
        },
        theme: {
          color: "#FF9933"
        },
        modal: {
          ondismiss: () => {
            setIsProcessing(false);
          }
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', (failResponse: any) => {
        setErrorText(`Razorpay Gateway Failure: ${failResponse.error.description}`);
        setIsProcessing(false);
      });
      rzp.open();

    } catch (err: any) {
      setErrorText(err.message || 'Payment pipeline initiation failed. Please try again.');
      setIsProcessing(false);
    }
  };

  // Triggered on Sandbox simulation action
  const completeSimulatedPayWithSignature = async (success: boolean) => {
    setShowSimulatedPayment(false);
    if (!success) {
      setErrorText("Payment simulation canceled or failed by test user.");
      setIsProcessing(false);
      return;
    }

    try {
      setIsProcessing(true);
      const token = sessionStorage.getItem('omni_jwt');
      
      const verifyResponse = await fetch('/api/payments/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          razorpay_order_id: simulatedOrder?.id || `order_mock_${Math.random().toString(36).substr(2, 9)}`,
          razorpay_payment_id: `pay_mock_${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
          razorpay_signature: `sig_mock_${Math.random().toString(36).substr(2, 12).toLowerCase()}`,
          eventId: event.id,
          quantity: quantity,
          type: 'General',
          isSandbox: true
        })
      });

      const verifyData = await verifyResponse.json();
      if (!verifyResponse.ok) {
        throw new Error(verifyData.error || 'Simulated verification failed.');
      }

      setGeneratedTicket(verifyData.ticket);
      setIsConfirmed(true);
    } catch (err: any) {
      setErrorText(err.message || 'Error occurred handling simulated verification.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (isConfirmed && generatedTicket) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-3xl mx-auto"
      >
        <div className="glass-panel p-8 md:p-12 rounded-[3.5rem] border-slate-800/60 text-center relative overflow-hidden">
          {/* Decorative Background Elements */}
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-saffron via-white to-india-green" />
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-saffron/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-india-green/10 rounded-full blur-3xl" />

          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", damping: 12, stiffness: 200 }}
            className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-500/30"
          >
            <CheckCircle2 className="w-10 h-10 text-emerald-500" />
          </motion.div>

          <h2 className="text-3xl font-black text-white mb-2 tracking-tight">Jai Ho! Ticket Secured.</h2>
          <p className="text-slate-400 mb-10 text-sm">Your universal pass for <span className="text-white font-bold">{event.name}</span> is now published securely on the trust ledger.</p>
          
          {/* Ticket layout */}
          <div className="relative group max-w-sm mx-auto mb-10">
            <div className="absolute inset-0 bg-saffron/15 blur-2xl group-hover:bg-saffron/25 transition-all rounded-[2.5rem] -z-10" />
            <div className="glass-panel rounded-[2.5rem] overflow-hidden border-slate-705 shadow-2xl bg-slate-950/40">
              <div className="h-36 relative">
                <img src={event.image} alt={event.name} className="w-full h-full object-cover opacity-60" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent" />
                <div className="absolute bottom-4 left-6 text-left">
                  <p className="text-[10px] font-black text-saffron uppercase tracking-[0.2em] mb-1">Pass Issued</p>
                  <h3 className="text-lg font-black text-white">{event.name}</h3>
                </div>
              </div>
              
              <div className="p-6 text-left space-y-4 bg-slate-950/60">
                <div className="flex justify-between items-end gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-slate-300">
                      <Calendar size={14} className="text-saffron" />
                      <span className="text-xs font-bold">{generatedTicket.date}</span>
                    </div>
                    <div className="flex items-center gap-3 text-slate-300">
                      <MapPin size={14} className="text-india-green" />
                      <span className="text-xs font-bold truncate max-w-[150px]">{generatedTicket.location}</span>
                    </div>
                  </div>
                  <div className="bg-white p-2 rounded-xl shrink-0">
                    <img src={generatedTicket.qrCode} alt="QR" className="w-16 h-16" />
                  </div>
                </div>
                
                <div className="pt-4 border-t border-slate-800/60 flex justify-between items-center">
                  <div>
                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Hash ID</p>
                    <p className="text-[10px] font-mono text-slate-400">{generatedTicket.blockchainHash.substring(0, 16)}...</p>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-black uppercase">
                    <ShieldCheck size={12} /> SHA-256 Safe
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-sm mx-auto">
            <button 
              onClick={() => onConfirm(generatedTicket)}
              className="px-6 py-4 bg-saffron text-white text-xs font-black uppercase tracking-widest rounded-2xl hover:bg-orange-500 transition-all shadow-xl shadow-orange-950/20 flex-1"
            >
              Go to My Wallet
            </button>
            <button 
              onClick={onBack}
              className="px-6 py-4 bg-slate-800 text-slate-300 text-xs font-black uppercase tracking-widest rounded-2xl hover:bg-slate-700 transition-all flex-1"
            >
              Book Another
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10 pb-20 relative"
    >
      {/* Background script dynamic checking status */}
      <div className="space-y-8">
        <button 
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors group"
        >
          <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-xs font-black uppercase tracking-widest">Back to Discoveries</span>
        </button>

        <div className="glass-panel rounded-[2.5rem] overflow-hidden border-slate-800/60 bg-slate-900/10">
          <div className="h-60 relative">
            <img src={event.image} alt={event.name} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] to-transparent" />
            <div className="absolute bottom-6 left-8">
              <span className="px-3 py-1 rounded-lg bg-saffron text-white text-[9px] font-black uppercase tracking-widest mb-3 inline-block">
                {event.category}
              </span>
              <h2 className="text-2xl font-black text-white leading-tight">{event.name}</h2>
            </div>
          </div>
          <div className="p-8 space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Date & Coordinates</p>
                <div className="flex items-center gap-2 text-white font-bold text-xs truncate">
                  <Calendar size={14} className="text-saffron" />
                  {event.date}
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Physical Venue</p>
                <div className="flex items-center gap-2 text-white font-bold text-xs truncate">
                  <MapPin size={14} className="text-india-green" />
                  {event.location}
                </div>
              </div>
            </div>
            <div className="p-6 bg-slate-950/20 rounded-2xl border border-slate-900">
              <p className="text-xs text-slate-400 leading-relaxed font-semibold italic">
                "Experience the magic of {event.name} with OmniTick's secure checkout. No double-booking, instantly secured to your cryptographic trust wallet."
              </p>
            </div>
          </div>
        </div>

        <EventAssistant event={event} />
      </div>

      {/* Payment Forms */}
      <div className="glass-panel p-8 sm:p-10 rounded-[3rem] border-slate-800/50 flex flex-col bg-slate-900/30">
        <h3 className="text-xl font-black text-white mb-6 flex items-center gap-3">
          <CreditCard className="text-saffron" />
          Razorpay Checkout
        </h3>

        {errorText && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 text-xs font-semibold leading-relaxed">
            ⚠️ {errorText}
          </div>
        )}

        <div className="space-y-6 flex-1">
          {/* Ticket count selection */}
          <div className="flex items-center justify-between p-4 bg-slate-950/40 rounded-2xl border border-slate-800">
            <div>
              <p className="text-xs font-bold text-white">Admissions Count</p>
              <p className="text-[9px] text-slate-500 uppercase font-black tracking-widest mt-0.5">Base prices: ₹{event.basePrice}</p>
            </div>
            <div className="flex items-center gap-4">
              <button 
                type="button"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-8 h-8 rounded-lg bg-slate-800 text-white flex items-center justify-center hover:bg-slate-700 transition-colors font-black text-sm"
              >
                -
              </button>
              <span className="text-md font-black text-white w-6 text-center">{quantity}</span>
              <button 
                type="button"
                onClick={() => setQuantity(Math.min(10, quantity + 1))}
                className="w-8 h-8 rounded-lg bg-slate-800 text-white flex items-center justify-center hover:bg-slate-700 transition-colors font-black text-sm"
              >
                +
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between ml-1 text-[9px] font-black text-slate-500 uppercase tracking-widest">
                <span>Payment Prefill Identity</span>
                <span className="text-emerald-400">Autocompleted</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 bg-slate-950/40 border border-slate-800/80 rounded-xl space-y-0.5">
                  <p className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">Email Address</p>
                  <p className="text-xs text-slate-300 font-bold max-w-[170px] truncate">SAIRAM1592005@gmail.com</p>
                </div>
                <div className="p-3 bg-slate-950/40 border border-slate-800/80 rounded-xl space-y-0.5">
                  <p className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">Contact Number</p>
                  <p className="text-xs text-slate-300 font-mono font-bold">+91 9999999999</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 p-4 bg-saffron/5 border border-saffron/10 rounded-2xl">
            <ShieldCheck className="text-saffron shrink-0" size={20} />
            <p className="text-[9px] text-slate-400 font-bold leading-relaxed">
              Secured by Razorpay. Transactions are finalized under the cryptographic trust registry, generating a verified digital pass on success.
            </p>
          </div>
        </div>

        {/* Totals */}
        <div className="mt-8 pt-6 border-t border-slate-850 space-y-3">
          <div className="flex justify-between text-xs font-semibold">
            <span className="text-slate-500">Subtotal</span>
            <span className="text-white">₹{totalPrice.toLocaleString('en-IN')}</span>
          </div>
          <div className="flex justify-between text-xs font-semibold">
            <span className="text-slate-500">Platform Convenience Fee</span>
            <span className="text-emerald-400 font-bold">₹0.00 (Promo Active)</span>
          </div>
          <div className="flex justify-between items-end pt-2">
            <span className="text-xs font-extrabold text-white uppercase tracking-widest">Aggregate Total</span>
            <span className="text-2xl font-black text-saffron">₹{totalPrice.toLocaleString('en-IN')}</span>
          </div>

          <button 
            type="button"
            onClick={handlePayment}
            disabled={isProcessing}
            className="w-full py-4 bg-saffron hover:bg-orange-500 text-white font-black uppercase tracking-widest text-xs rounded-xl transition-all shadow-xl shadow-orange-950/20 flex items-center justify-center gap-2 disabled:opacity-50 mt-4 cursor-pointer"
          >
            {isProcessing ? (
              <>
                <Loader2 className="animate-spin" size={16} />
                Connecting Razorpay...
              </>
            ) : (
              <>
                <Sparkles size={16} />
                Pay & Mint via Razorpay
              </>
            )}
          </button>
        </div>
      </div>

      {/* GORGEOUS IN-APP RAZORPAY SANDBOX SIMULATOR MODAL */}
      <AnimatePresence>
        {showSimulatedPayment && (
          <div className="fixed inset-0 bg-[#030712]/80 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-[2.5rem] shadow-2xl overflow-hidden relative"
            >
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-saffron via-white to-india-green" />
              
              {/* Simulator Header */}
              <div className="p-6 pb-4 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-saffron/10 border border-saffron/20 flex items-center justify-center">
                    <Cpu className="text-saffron w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-white flex items-center gap-1.5 uppercase tracking-wide">
                      Razorpay Sandbox Engine
                    </h4>
                    <p className="text-[9px] text-slate-500 font-extrabold uppercase tracking-widest">
                      Interactive Developer Simulator
                    </p>
                  </div>
                </div>
                <div className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[8px] font-black text-emerald-400 uppercase tracking-widest">
                  Live Test Mode
                </div>
              </div>

              {/* Simulation Information Box */}
              <div className="p-8 space-y-6">
                <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-850 space-y-4">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400 font-semibold flex items-center gap-2">
                      <Receipt size={14} className="text-slate-500" />
                      Mock Order ID
                    </span>
                    <span className="text-slate-200 font-mono font-bold break-all max-w-[200px] text-right">
                      {simulatedOrder?.id}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400 font-semibold flex items-center gap-2">
                      <Wallet size={14} className="text-slate-500" />
                      Paying To
                    </span>
                    <span className="text-slate-200 font-semibold">
                      OmniTick Bharat Inc.
                    </span>
                  </div>

                  <div className="pt-3 border-t border-slate-800/60 flex justify-between items-end">
                    <span className="text-xs text-slate-500 font-black uppercase tracking-wider">Total Amount</span>
                    <span className="text-xl font-bold text-saffron">₹{totalPrice.toLocaleString('en-IN')}</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                    Select Simulated Status Outflow
                  </p>
                  
                  {/* Action Choices */}
                  <div className="space-y-2.5">
                    <button
                      type="button"
                      onClick={() => completeSimulatedPayWithSignature(true)}
                      className="w-full p-4 bg-gradient-to-r from-emerald-500/10 to-emerald-600/5 hover:from-emerald-500/20 hover:to-emerald-600/10 border border-emerald-500/30 text-emerald-400 rounded-2xl transition-all duration-200 text-left flex items-center justify-between group cursor-pointer"
                    >
                      <div>
                        <p className="text-xs font-black uppercase tracking-wider flex items-center gap-2">
                          <Check size={14} /> Authorize Successful Payment
                        </p>
                        <p className="text-[9px] text-slate-400 mt-1">
                          Generates valid SHA-256 mint signature and ledger registration on the database.
                        </p>
                      </div>
                      <div className="w-6 h-6 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center group-hover:scale-105 transition-transform">
                        <CheckCircle2 size={12} />
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => completeSimulatedPayWithSignature(false)}
                      className="w-full p-4 bg-gradient-to-r from-red-500/10 to-red-600/5 hover:from-red-500/19 hover:to-red-600/10 border border-red-500/20 text-red-400 rounded-2xl transition-all duration-200 text-left flex items-center justify-between group cursor-pointer"
                    >
                      <div>
                        <p className="text-xs font-black uppercase tracking-wider flex items-center gap-2">
                          <AlertTriangle size={14} /> Simulate Gateway Failure
                        </p>
                        <p className="text-[9px] text-slate-400 mt-1">
                          Triggers Razorpay client's payment fail routing or verification signature mismatch.
                        </p>
                      </div>
                      <div className="w-6 h-6 rounded-lg bg-red-500/15 border border-red-500/30 flex items-center justify-center group-hover:scale-105 transition-transform">
                        <AlertTriangle size={12} />
                      </div>
                    </button>
                  </div>
                </div>
              </div>

              {/* Simulator Footer */}
              <div className="p-5 border-t border-slate-800 bg-slate-950/40 flex justify-between items-center">
                <p className="text-[9px] text-slate-500 font-semibold">
                  Sandbox active: rzp_test_mock_omnitick
                </p>
                <button
                  type="button"
                  onClick={() => completeSimulatedPayWithSignature(false)}
                  className="px-4 py-2 text-[10px] font-black uppercase tracking-wider text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  Cancel Payment
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default Checkout;

