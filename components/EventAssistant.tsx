import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, 
  Brain, 
  Send, 
  Car, 
  Users, 
  Clock, 
  UserCheck, 
  ShieldAlert, 
  MessageSquare,
  Compass,
  ArrowRight
} from 'lucide-react';
import { Event } from '../types';

interface EventAssistantProps {
  event: Event;
}

interface QAPair {
  question: string;
  answer: string;
  timestamp: string;
}

export const EventAssistant: React.FC<EventAssistantProps> = ({ event }) => {
  const [question, setQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [qaHistory, setQaHistory] = useState<QAPair[]>([]);
  const [errorText, setErrorText] = useState<string | null>(null);

  const predefinedQuestions = [
    { 
      text: "Is this family friendly?", 
      icon: UserCheck, 
      color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" 
    },
    { 
      text: "What should I carry?", 
      icon: Compass, 
      color: "text-amber-400 bg-amber-500/10 border-amber-500/20" 
    },
    { 
      text: "Is parking available?", 
      icon: Car, 
      color: "text-blue-400 bg-blue-500/10 border-blue-500/20" 
    },
    { 
      text: "What is the expected crowd?", 
      icon: Users, 
      color: "text-purple-400 bg-purple-500/10 border-purple-500/20" 
    },
    { 
      text: "Best time to arrive?", 
      icon: Clock, 
      color: "text-rose-400 bg-rose-500/10 border-rose-500/20" 
    },
  ];

  const handleAsk = async (queryText: string) => {
    if (!queryText.trim() || isLoading) return;
    
    setIsLoading(true);
    setErrorText(null);
    
    try {
      const response = await fetch('/api/ai/event-assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventId: event.id,
          question: queryText,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        const newQA: QAPair = {
          question: queryText,
          answer: data.answer,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        // Prepend new Q&A so users see latest at top or append
        setQaHistory(prev => [newQA, ...prev]);
        setQuestion('');
      } else {
        setErrorText(data.error || 'Failed to retreive hospitality advice.');
      }
    } catch (err) {
      setErrorText('Check your local internet connection; fails to fetch host notes.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="glass-panel p-6 sm:p-8 rounded-[2.5rem] border-slate-800/80 bg-slate-900/10 shadow-xl overflow-hidden relative"
    >
      {/* Background Decorative Light Glows */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-saffron/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-[#138808]/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header element */}
      <div className="flex items-start justify-between gap-4 mb-6 border-b border-slate-800/60 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-saffron/20 to-[#138808]/20 flex items-center justify-center border border-white/5">
            <Brain className="text-saffron animate-pulse" size={20} />
          </div>
          <div>
            <h4 className="text-sm font-black text-white flex items-center gap-1.5 uppercase tracking-wider">
              Ask AI About This Event
            </h4>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
              Live Verified Hospitality Assistant
            </p>
          </div>
        </div>
        <span className="px-2.5 py-1 rounded-full bg-saffron/10 border border-saffron/20 text-[9px] font-black text-saffron uppercase tracking-widest flex items-center gap-1">
          <Sparkles size={10} className="animate-spin text-gold" /> Gemini Node Active
        </span>
      </div>

      <div className="space-y-6">
        {/* Quick query list */}
        <div className="space-y-2">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
            Tap standard queries
          </p>
          <div className="flex flex-wrap gap-2">
            {predefinedQuestions.map((q, qidx) => {
              const IconComp = q.icon;
              return (
                <button
                  key={qidx}
                  type="button"
                  disabled={isLoading}
                  onClick={() => handleAsk(q.text)}
                  className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer active:scale-95 ${q.color} hover:bg-slate-800/40 hover:scale-[1.02] disabled:opacity-50 disabled:pointer-events-none`}
                >
                  <IconComp size={14} className="shrink-0" />
                  <span>{q.text}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom text-box question */}
        <form 
          onSubmit={(e) => { e.preventDefault(); handleAsk(question); }}
          className="flex gap-2.5 relative"
        >
          <input
            type="text"
            placeholder="Ask something custom (e.g. 'Is there a dress code?', 'Will there be food stalls?')..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            disabled={isLoading}
            className="flex-1 px-4 py-3.5 bg-slate-950/70 border border-slate-800 rounded-2xl text-xs font-semibold text-white focus:outline-none focus:ring-2 focus:ring-saffron/20 focus:border-saffron/50 placeholder-slate-500 transition-all"
          />
          <button
            type="submit"
            disabled={isLoading || !question.trim()}
            className="w-12 h-12 bg-saffron hover:bg-orange-500 disabled:bg-slate-800 text-white rounded-2xl flex items-center justify-center transition-all shadow-lg active:scale-95 shrink-0 cursor-pointer"
          >
            <Send size={16} />
          </button>
        </form>

        {/* Dynamic loading states */}
        <AnimatePresence>
          {isLoading && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="p-4 bg-slate-950/40 border border-slate-900 rounded-2xl flex items-center gap-4 text-xs font-medium text-slate-300"
            >
              <div className="flex gap-1.5 items-center justify-center shrink-0">
                <span className="w-2 h-2 bg-saffron rounded-full animate-bounce [animation-delay:-0.3s]" />
                <span className="w-2 h-2 bg-white rounded-full animate-bounce [animation-delay:-0.15s]" />
                <span className="w-2 h-2 bg-[#138808] rounded-full animate-bounce" />
              </div>
              <p className="italic text-[11px] text-slate-400">
                AI Node fetching real-time guidelines for {event.name}...
              </p>
            </motion.div>
          )}

          {errorText && (
            <motion.div 
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-red-950/40 border border-red-900/30 text-red-450 rounded-xl text-xs font-medium flex items-center gap-3"
            >
              <ShieldAlert size={16} className="text-red-400 shrink-0" />
              <span>{errorText}</span>
            </motion.div>
          )}

          {/* Interactive conversational logs */}
          {qaHistory.length > 0 && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-4 pt-2 border-t border-slate-900"
            >
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                Assistant Dialogue History
              </p>
              
              <div className="space-y-4 max-h-[300px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800 pr-1.5">
                {qaHistory.map((qa, index) => (
                  <motion.div 
                    key={index}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="space-y-2.5 p-4 bg-slate-950/45 rounded-2xl border border-slate-900"
                  >
                    {/* User Question row */}
                    <div className="flex items-start gap-2 justify-between">
                      <div className="flex items-center gap-2">
                        <MessageSquare size={12} className="text-slate-400 mt-0.5 shrink-0" />
                        <span className="text-xs font-bold text-slate-200">
                          {qa.question}
                        </span>
                      </div>
                      <span className="text-[9px] text-slate-500 font-semibold uppercase">{qa.timestamp}</span>
                    </div>

                    {/* AI Answer row */}
                    <div className="flex items-start gap-2.5 bg-slate-900/20 p-3 rounded-xl border border-slate-800/40">
                      <Brain size={14} className="text-saffron shrink-0 mt-0.5" />
                      <p className="text-[11px] text-slate-350 leading-relaxed font-semibold">
                        {qa.answer}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};
