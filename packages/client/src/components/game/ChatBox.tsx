'use client';

import { useState, useRef, useEffect } from 'react';
import type { ChatMessage } from '../../hooks/useColyseus';

const QUICK_EMOJIS = ['😂', '😎', '🤔', '😤', '👏', '🔥', '💪', '😭'];

interface ChatBoxProps {
  messages: ChatMessage[];
  onSend: (message: string) => void;
  mySessionId: string;
}

export default function ChatBox({ messages, onSend, mySessionId }: ChatBoxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [text, setText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [unread, setUnread] = useState(0);
  const prevCountRef = useRef(0);

  // Track unread when closed
  useEffect(() => {
    if (!isOpen && messages.length > prevCountRef.current) {
      setUnread(prev => prev + (messages.length - prevCountRef.current));
    }
    prevCountRef.current = messages.length;
  }, [messages.length, isOpen]);

  // Clear unread when opened
  useEffect(() => {
    if (isOpen) setUnread(0);
  }, [isOpen]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = () => {
    const msg = text.trim();
    if (!msg) return;
    onSend(msg);
    setText('');
    inputRef.current?.focus();
  };

  const handleQuickEmoji = (emoji: string) => {
    onSend(emoji);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 z-30 w-10 h-10 sm:w-12 sm:h-12 bg-green-700 hover:bg-green-600 border-2 border-green-500/50 rounded-full flex items-center justify-center text-lg sm:text-xl shadow-lg transition-colors cursor-pointer"
      >
        💬
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-30 w-72 sm:w-80 bg-green-900/95 border border-green-600/50 rounded-xl shadow-2xl flex flex-col max-h-80 sm:max-h-96">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-green-700/50">
        <span className="text-xs sm:text-sm text-amber-400 font-bold">Chat</span>
        <button
          onClick={() => setIsOpen(false)}
          className="text-green-400/60 hover:text-white text-sm cursor-pointer"
        >
          X
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5 min-h-[100px]">
        {messages.length === 0 && (
          <p className="text-green-400/40 text-xs text-center mt-4">Nenhuma mensagem ainda</p>
        )}
        {messages.map((msg, i) => {
          const isMe = msg.playerId === mySessionId;
          return (
            <div key={i} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
              <span className={`text-[10px] ${msg.team === 0 ? 'text-blue-400/60' : 'text-red-400/60'}`}>
                {isMe ? 'Voce' : msg.playerName}
              </span>
              <div className={`px-2 py-1 rounded-lg text-xs sm:text-sm max-w-[200px] break-words ${
                isMe
                  ? 'bg-blue-800/40 text-blue-100'
                  : 'bg-green-800/60 text-green-100'
              }`}>
                {msg.message}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick emojis */}
      <div className="flex gap-1 px-2 py-1.5 border-t border-green-700/30 overflow-x-auto">
        {QUICK_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            onClick={() => handleQuickEmoji(emoji)}
            className="text-base sm:text-lg hover:scale-125 transition-transform cursor-pointer shrink-0"
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="flex gap-1.5 p-2 border-t border-green-700/50">
        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Mensagem..."
          maxLength={100}
          className="flex-1 px-2 py-1.5 rounded-lg bg-green-800/50 border border-green-600/30 text-white text-xs sm:text-sm placeholder-green-400/40 focus:outline-none focus:border-amber-400"
        />
        <button
          onClick={handleSend}
          className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
        >
          Enviar
        </button>
      </div>
    </div>
  );
}
