
import React, { useState, useEffect } from 'react';
import { getLedger } from '../utils/blockchain';
// Import missing Database icon from lucide-react
import { Hash, Clock, ArrowRight, ShieldCheck, Box, Database } from 'lucide-react';

const Ledger: React.FC = () => {
  const [entries, setEntries] = useState<any[]>([]);

  useEffect(() => {
    setEntries(getLedger());
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Blockchain Transparency Ledger</h2>
          <p className="text-slate-400 mt-1">Real-time immutable transaction history.</p>
        </div>
        <div className="flex items-center gap-2 text-saffron font-mono text-sm px-4 py-2 rounded-xl bg-saffron/10 border border-saffron/20">
          <Box size={16} /> Block #1,402,128
        </div>
      </div>

      <div className="glass-panel rounded-3xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/50">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Transaction ID</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Action</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Hash Address</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-500 italic">
                    No transactions recorded on this node yet.
                  </td>
                </tr>
              ) : (
                entries.map((tx, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-saffron/10 flex items-center justify-center">
                          <Hash size={14} className="text-saffron" />
                        </div>
                        <span className="text-sm font-mono text-slate-300">#{tx.block}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 rounded bg-slate-800 text-xs font-medium text-slate-300">
                        {tx.action}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 group cursor-pointer">
                        <span className="text-xs font-mono text-saffron/70 truncate w-48 hover:text-saffron">
                          {tx.hash}
                        </span>
                        <ArrowRight size={12} className="text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5 text-xs text-slate-500">
                        <Clock size={12} />
                        {new Date(tx.timestamp).toLocaleTimeString()}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800 flex items-start gap-4">
          <div className="p-3 rounded-xl bg-india-green/10 text-india-green">
            <ShieldCheck size={20} />
          </div>
          <div>
            <h4 className="text-sm font-bold mb-1">Proof of Authenticity</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Every ticket is minted as a unique cryptographic token. Duplicate bookings are computationally impossible on the ledger.
            </p>
          </div>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800 flex items-start gap-4">
          <div className="p-3 rounded-xl bg-india-blue/10 text-india-blue">
            <Database size={20} />
          </div>
          <div>
            <h4 className="text-sm font-bold mb-1">Smart Contract Enforcement</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Resale price caps and royalty distribution for organizers are enforced at the protocol level.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Ledger;
