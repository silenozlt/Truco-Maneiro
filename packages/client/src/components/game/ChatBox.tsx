'use client';

import { useState, useRef } from 'react';
import type { ChatMessage } from '../../hooks/useColyseus';

const QUICK_EMOJIS = ['😂', '😎', '🤔', '😤', '👏', '🔥', '💪', '😭'];

interface ChatBoxProps {
  onSend: (message: string) => void;
}

export default function ChatBox({ onSend }: ChatBoxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSend = () => {
    const msg = text.trim();
    if (!msg) return;
    onSend(msg);
    setText('');
    setIsOpen(false);
  };

  const handleQuickEmoji = (emoji: string) => {
    onSend(emoji);
    setIsOpen(false);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 z-30 w-10 h-10 bg-green-700 hover:bg-green-600 border-2 border-green-500/50 rounded-full flex items-center justify-center text-lg shadow-lg transition-colors cursor-pointer"
      >
        💬
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-30 bg-green-900/95 border border-green-600/50 rounded-xl shadow-2xl p-2 animate-fade-in">
      {/* Quick emojis */}
      <div className="flex gap-2 mb-2 flex-wrap justify-center">
        {QUICK_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            onClick={() => handleQuickEmoji(emoji)}
            className="text-2xl hover:scale-125 transition-transform cursor-pointer active:scale-90"
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* Text input */}
      <div className="flex gap-1.5">
        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Mensagem..."
          maxLength={100}
          autoFocus
          className="flex-1 px-2 py-1.5 rounded-lg bg-green-800/50 border border-green-600/30 text-white text-xs placeholder-green-400/40 focus:outline-none focus:border-amber-400 w-40"
        />
        <button
          onClick={handleSend}
          className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
        >
          OK
        </button>
        <button
          onClick={() => setIsOpen(false)}
          className="px-2 py-1.5 text-green-400/60 hover:text-white text-xs cursor-pointer"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

/** Speech bubble that appears below a player's cards */
export function PlayerBubble({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="animate-fade-in text-center mt-1">
      <span className="inline-block px-2 py-0.5 bg-black/50 rounded-full text-xs sm:text-sm text-white max-w-[120px] truncate">
        {message}
      </span>
    </div>
  );
}
