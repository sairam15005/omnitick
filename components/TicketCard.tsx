import React, { useState } from 'react';
import { Ticket } from '../types';
import { ShieldCheck, Calendar, MapPin, Copy, Check, QrCode } from 'lucide-react';

const TicketCard: React.FC<{ ticket: Ticket }> = ({ ticket }) => {
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);

  const copyHash = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card flip when copying hash
    navigator.clipboard.writeText(ticket.blockchainHash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div 
      onClick={() => setShowQR(!showQR)}
      className="group relative cursor-pointer min-h-[320px] transition-all duration-300 select-none"
    >
      {/* Decorative Background */}
      <div className="absolute inset-0 bg-saffron/10 blur-xl group-hover:bg-saffron/20 transition-all rounded-3xl -z-10" />
      
      <div className="glass-panel overflow-hidden rounded-3xl border-slate-800 hover:border-saffron/30 transition-all flex flex-col h-full min-h-[320px] bg-slate-900/40 backdrop-blur-xl">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-saffron via-white to-india-green" />
        
        {!showQR ? (
          /* FRONT SIDE: Ticket Details */
          <div className="flex flex-col h-full justify-between flex-1">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${
                  ticket.status === 'active' 
                    ? 'bg-india-green/10 text-india-green border-india-green/20' 
                    : 'bg-red-500/10 text-red-400 border-red-500/20'
                }`}>
                  {ticket.status}
                </span>
                <div className="text-saffron font-bold text-sm">₹{ticket.price.toLocaleString('en-IN')}</div>
              </div>

              <h3 className="text-lg font-bold line-clamp-2">{ticket.eventName}</h3>
              
              <div className="mt-4 space-y-2">
                <div className="flex items-center gap-2 text-slate-400 text-sm">
                  <Calendar size={14} className="text-saffron" />
                  <span>{new Date(ticket.date).toLocaleDateString('en-IN', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-400 text-sm">
                  <MapPin size={14} className="text-india-green" />
                  <span className="truncate">{ticket.location}</span>
                </div>
              </div>
            </div>

            {/* Divider (Notches) */}
            <div className="relative h-px bg-slate-800 border-t border-dashed border-slate-700 mx-4">
              <div className="absolute -left-6 -top-2.5 w-5 h-5 bg-slate-950 rounded-full border border-slate-800" />
              <div className="absolute -right-6 -top-2.5 w-5 h-5 bg-slate-950 rounded-full border border-slate-800" />
            </div>

            {/* Bottom Section */}
            <div className="p-6 bg-slate-900/30 space-y-4">
              <div className="space-y-2">
                <p className="text-[9px] uppercase text-slate-500 font-black tracking-widest">Blockchain Hash</p>
                <button 
                  onClick={copyHash}
                  className="flex items-center gap-1.5 group/hash w-full text-left cursor-pointer"
                >
                  <span className="text-[10px] font-mono text-slate-400 truncate flex-1">
                    {ticket.blockchainHash}
                  </span>
                  {copied ? <Check size={12} className="text-india-green" /> : <Copy size={12} className="text-slate-600 group-hover/hash:text-white" />}
                </button>
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase tracking-wider pt-2 border-t border-slate-800/40">
                <span className="flex items-center gap-1.5 text-saffron">
                  <ShieldCheck size={14} /> Secured pass
                </span>
                <span className="flex items-center gap-1 text-slate-500 group-hover:text-white transition-colors">
                  <QrCode size={12} /> Tap to view QR
                </span>
              </div>
            </div>
          </div>
        ) : (
          /* BACK SIDE: QR Code Display */
          <div className="flex flex-col h-full justify-between flex-1 p-6 items-center text-center">
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-white leading-tight truncate max-w-[240px]">{ticket.eventName}</h4>
              <p className="text-[9px] text-slate-500 font-mono tracking-wider">{ticket.id}</p>
            </div>

            <div className="bg-white p-3 rounded-2xl my-3 shadow-2xl transition-transform">
              <img 
                src={ticket.qrCode
                  .replace('size=150x150', 'size=250x250')
                  .replace('size=250x250', 'size=250x250')
                  .replace('chs=250x250', 'chs=250x250')
                } 
                alt="QR Code Pass" 
                className="w-40 h-40" 
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-center gap-1.5 text-india-green text-[11px] font-black uppercase tracking-wider">
                <ShieldCheck size={14} /> Cryptographic Token Verified
              </div>
              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest leading-none">
                Tap card to view details
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TicketCard;
