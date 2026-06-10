
import React, { useState, useRef, useEffect } from 'react';
import { Send, Mic, User, Bot, Loader2, Ticket as TicketIcon, Zap } from 'lucide-react';
import { ChatMessage, Event, IntentType, Ticket } from '../types';
import { processUserMessage } from '../services/gemini';
import { generateTicketHash, recordOnLedger } from '../utils/blockchain';
import { motion, AnimatePresence } from 'framer-motion';
import Markdown from 'react-markdown';
import * as QRCode from 'qrcode';

interface ChatInterfaceProps {
  events: Event[];
  onTicketPurchase: (ticket: Ticket) => void;
  initialPrompt?: string | null;
  onPromptHandled?: () => void;
}

const QUICK_PROMPTS = [
  "What's happening this weekend in Mumbai?",
  "Recommend a cricket match",
  "How do blockchain tickets work in India?",
  "Book a ticket for Sunburn Goa"
];

const Typewriter: React.FC<{ content: string; onComplete: () => void }> = ({ content, onComplete }) => {
  const [displayedContent, setDisplayedContent] = useState('');
  const indexRef = useRef(0);

  useEffect(() => {
    const timer = setInterval(() => {
      if (indexRef.current < content.length) {
        setDisplayedContent(content.substring(0, indexRef.current + 1));
        indexRef.current += 1;
      } else {
        clearInterval(timer);
        onComplete();
      }
    }, 12); // Typing speed in ms

    return () => clearInterval(timer);
  }, [content, onComplete]);

  return <Markdown>{displayedContent}</Markdown>;
};

const ChatInterface: React.FC<ChatInterfaceProps> = ({ events, onTicketPurchase, initialPrompt, onPromptHandled }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Namaste! I'm your OmniTick AI ChatBot. I can help you find the best events in India and secure your tickets on the blockchain. How can I help you today?",
      timestamp: new Date(),
      isTyping: false
    }
  ]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (initialPrompt) {
      handleSend(initialPrompt);
      onPromptHandled?.();
    }
  }, [initialPrompt]);

  const handleSend = async (text: string) => {
    if (!text.trim()) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsProcessing(true);

    try {
      const result = await processUserMessage(text, events);
      
      const assistantMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: result.reply,
        timestamp: new Date(),
        intent: result.intent,
        entities: result.entities,
        isTyping: true
      };

      setMessages(prev => [...prev, assistantMsg]);

      if (result.intent === IntentType.BOOK_TICKET && result.entities?.event) {
        handleAutoBooking(result.entities);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  const buildQrCodeDataUrl = async (value: string) => {
    try {
      return await QRCode.toDataURL(value, { width: 150 });
    } catch (err: any) {
      console.warn('[Chat QR] local generation failed, falling back:', err?.message || err);
      return `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(value)}`;
    }
  };

  const handleAutoBooking = (entities: any) => {
    const foundEvent = entities.eventId 
      ? events.find(e => e.id === entities.eventId)
      : events.find(e => 
          (entities.event && e.name.toLowerCase().includes(entities.event.toLowerCase())) ||
          (entities.event && entities.event.toLowerCase().includes(e.category.toLowerCase()))
        );

    if (foundEvent) {
      setTimeout(async () => {
        const ticket: Ticket = {
          id: `TKT-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
          userId: 'usr-guest',
          eventId: foundEvent.id,
          eventName: foundEvent.name,
          date: foundEvent.date,
          location: foundEvent.location,
          price: foundEvent.basePrice * (entities.quantity || 1),
          type: 'General',
          status: 'active',
          blockchainHash: generateTicketHash(foundEvent),
          qrCode: '',
          bookingDate: new Date().toISOString()
        };

        ticket.qrCode = await buildQrCodeDataUrl(ticket.blockchainHash);

        recordOnLedger({
          action: 'TICKET_ISSUANCE',
          ticketId: ticket.id,
          hash: ticket.blockchainHash,
          amount: ticket.price
        });

        onTicketPurchase(ticket);

        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'assistant',
          content: `Confirming your reservation for **${foundEvent.name}**! 🎫\n\nI've generated a unique NFT-based pass for you worth **₹${ticket.price.toLocaleString('en-IN')}**. Your transaction is finalized on the India-West ledger at \`${ticket.blockchainHash.substring(0, 10)}...\``,
          timestamp: new Date(),
          isTyping: true
        }]);
      }, 1500);
    }
  };

  const toggleVoice = () => {
    if (!('webkitSpeechRecognition' in window)) {
      alert("Speech recognition not supported in this browser.");
      return;
    }
    const SpeechRecognition = (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (event: any) => handleSend(event.results[0][0].transcript);
    isListening ? recognition.stop() : recognition.start();
  };

  const handleTypingComplete = (id: string) => {
    setMessages(prev => prev.map(msg => 
      msg.id === id ? { ...msg, isTyping: false } : msg
    ));
  };

  return (
    <div className="max-w-4xl mx-auto h-full flex flex-col">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-6 px-4 py-6 scrollbar-hide">
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div 
              key={msg.id} 
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
            >
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${
                msg.role === 'user' ? 'bg-saffron' : 'bg-slate-800 border border-slate-700'
              }`}>
                {msg.role === 'user' ? <User size={20} /> : <Bot size={20} className="text-saffron" />}
              </div>
              
              <div className={`max-w-[85%] rounded-[1.5rem] p-5 ${
                msg.role === 'user' 
                  ? 'bg-saffron text-white rounded-tr-none shadow-xl shadow-orange-900/10' 
                  : 'bg-slate-800/60 backdrop-blur-md border border-slate-700/50 text-slate-100 rounded-tl-none'
              }`}>
                <div className="text-[15px] leading-relaxed markdown-body">
                  {msg.role === 'assistant' && msg.isTyping ? (
                    <Typewriter 
                      content={msg.content} 
                      onComplete={() => handleTypingComplete(msg.id)} 
                    />
                  ) : (
                    <Markdown>{msg.content}</Markdown>
                  )}
                </div>
                <div className={`mt-3 pt-2 border-t border-white/10 text-[10px] opacity-60 flex items-center gap-2 ${
                  msg.role === 'user' ? 'justify-end' : 'justify-start'
                }`}>
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  {msg.role === 'assistant' && msg.intent && (
                    <span className="px-1.5 py-0.5 rounded bg-saffron/20 text-saffron font-mono font-bold tracking-tight">
                      {msg.intent}
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {isProcessing && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex gap-4"
          >
            <div className="w-10 h-10 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center">
              <Loader2 className="w-5 h-5 text-saffron animate-spin" />
            </div>
            <div className="bg-slate-800/30 border border-slate-800 rounded-[1.5rem] rounded-tl-none p-5 flex items-center">
              <span className="text-sm text-slate-500 font-medium italic">Consulting India ML nodes...</span>
            </div>
          </motion.div>
        )}
        <div ref={scrollRef} />
      </div>

      {/* Input Section */}
      <div className="p-6 bg-[#0a0a0a]/40 backdrop-blur-xl border-t border-slate-800/50">
        {/* Quick Prompts */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2 no-scrollbar">
          {QUICK_PROMPTS.map(p => (
            <motion.button 
              key={p}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleSend(p)}
              className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-slate-400 hover:text-white hover:border-saffron/50 hover:bg-slate-800 transition-all whitespace-nowrap flex items-center gap-2"
            >
              <Zap size={12} className="text-saffron" /> {p}
            </motion.button>
          ))}
        </div>

        <div className="relative flex items-center gap-3">
          <div className="flex-1 relative flex items-center bg-slate-900/80 border border-slate-800 rounded-2xl focus-within:border-saffron/50 focus-within:ring-4 focus-within:ring-saffron/5 transition-all">
            <button 
              onClick={toggleVoice}
              className={`ml-2 p-3 rounded-xl transition-all ${
                isListening ? 'bg-red-500/20 text-red-400 animate-pulse' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <Mic size={22} />
            </button>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend(input)}
              placeholder="Book IPL tickets, find music festivals..."
              className="flex-1 bg-transparent border-none focus:ring-0 text-slate-100 placeholder:text-slate-600 py-4 px-3 text-sm font-medium"
            />
          </div>
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleSend(input)}
            disabled={!input.trim() || isProcessing}
            className="p-4 bg-saffron hover:bg-orange-500 text-white rounded-2xl transition-all active:scale-95 disabled:opacity-30 disabled:grayscale shadow-lg shadow-orange-600/20"
          >
            <Send size={22} />
          </motion.button>
        </div>

        <div className="mt-4 flex items-center justify-center gap-6">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500" />
            ChatBot Online
          </div>
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-sm shadow-blue-500" />
            Node: Bengaluru-Central
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
