import React, { useState } from 'react';
import { Ticket } from '../types';
import { ShieldCheck, Calendar, MapPin, Search, QrCode, ClipboardCheck, AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react';
import TicketCard from './TicketCard';

interface TicketWalletProps {
  tickets: Ticket[];
  onRefreshTickets?: () => void;
}

const TicketWallet: React.FC<TicketWalletProps> = ({ tickets, onRefreshTickets }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [inputHash, setInputHash] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<{
    success: boolean;
    message: string;
    ticket?: any;
    error?: string;
  } | null>(null);

  // Filter local tickets based on user keyword: only show active passes
  const filteredTickets = tickets.filter(t => 
    t.status === 'active' &&
    (t.eventName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.blockchainHash.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleSimulateCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputHash.trim()) return;

    setIsScanning(true);
    setScanResult(null);

    try {
      const response = await fetch('/api/tickets/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hash: inputHash.trim() })
      });

      const result = await response.json();

      if (result.valid) {
        setScanResult({
          success: true,
          message: result.message,
          ticket: result.ticket
        });
        if (onRefreshTickets) onRefreshTickets();
      } else {
        setScanResult({
          success: false,
          message: result.error || 'Invalid cryptographic signature.',
          error: result.error
        });
      }
    } catch (err: any) {
      setScanResult({
        success: false,
        message: 'Could not communicate with ticket nodes.',
        error: err.message
      });
    } finally {
      setIsScanning(false);
    }
  };

  const handleCopyHashToInput = (hash: string) => {
    setInputHash(hash);
    // Smooth scroll to scanner input
    const scanElem = document.getElementById('gate-scanner-section');
    if (scanElem) {
      scanElem.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="space-y-10 max-w-7xl mx-auto pb-20">
      
      {/* Wallet header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-white">Universal Pass Wallet</h2>
          <p className="text-sm text-slate-400 mt-1">SHA-256 cryptographically authenticated gateway passes.</p>
        </div>
        <div className="flex items-center gap-3">
          {onRefreshTickets && (
            <button
              onClick={onRefreshTickets}
              className="p-3 bg-slate-900 border border-slate-800 hover:bg-slate-850 text-slate-300 hover:text-white rounded-xl active:scale-95 transition-all text-xs font-bold uppercase tracking-wide flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw size={14} /> Sync Wallet
            </button>
          )}
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-saffron transition-colors" />
            <input 
              type="text" 
              placeholder="Search tickets by title or hash..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 pr-4 py-3 bg-slate-950/40 border border-slate-800 rounded-xl focus:border-saffron/50 outline-none w-full sm:w-72 text-xs font-semibold text-slate-100 placeholder-slate-500"
            />
          </div>
        </div>
      </div>

      {/* Full Width Wallet Book listings */}
      <div className="space-y-6">
        <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest pl-1">My Stored Admissions</h3>
        {tickets.length === 0 ? (
          <div className="glass-panel rounded-3xl p-12 flex flex-col items-center justify-center text-center border-dashed border-slate-850">
            <div className="w-16 h-16 bg-slate-800/40 rounded-full flex items-center justify-center mb-4">
              <Calendar className="w-8 h-8 text-saffron" />
            </div>
            <h3 className="text-md font-bold text-white">No active passes inside this wallet</h3>
            <p className="text-xs text-slate-400 max-w-xs mt-2">
              Use our AI Assistant or discover sports/concert categories in the Explore section to book passes.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTickets.map(ticket => (
              <div key={ticket.id} className="relative group">
                <TicketCard ticket={ticket} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TicketWallet;
