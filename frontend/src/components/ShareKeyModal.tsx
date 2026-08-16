"use client";

import React, { useState } from 'react';
import { Share2, Copy, Check, X, Send, Sparkles } from 'lucide-react';
import { KeyItem } from '@/types/key';

export interface ShareKeyModalProps {
  isOpen: boolean;
  keyItem: KeyItem | null;
  onClose: () => void;
  onCopyNotice?: (msg: string) => void;
}

export const ShareKeyModal: React.FC<ShareKeyModalProps> = ({
  isOpen,
  keyItem,
  onClose,
  onCopyNotice,
}) => {
  const [copiedFormat, setCopiedFormat] = useState<string | null>(null);

  if (!isOpen || !keyItem) return null;

  const expireString = keyItem.expiresAt ? new Date(keyItem.expiresAt).toLocaleDateString() : 'Permanent Lifetime';

  const telegramCard = `👑 **AXIOS OFFICIAL VIP LICENSE** 👑
━━━━━━━━━━━━━━━━━━━━
🔑 **Your Key:** \`${keyItem.key}\`
⏳ **Duration:** ${keyItem.duration || 'Custom'}
📅 **Expires On:** ${expireString}
📌 **Note:** ${keyItem.note || 'None'}
━━━━━━━━━━━━━━━━━━━━
📥 **Download Loader:** https://api.axioshacks.com/api/download/libil2cpp
💬 **Support & Inquiries:** @Axiosofficial
━━━━━━━━━━━━━━━━━━━━
⚡ *Paste your key into the loader and enjoy!*`;

  const cleanText = `Key: ${keyItem.key}\nDuration: ${keyItem.duration || 'Custom'}\nExpiry: ${expireString}\nNote: ${keyItem.note || 'None'}`;

  const copyText = (text: string, formatId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedFormat(formatId);
    if (onCopyNotice) {
      onCopyNotice('Formatted license card copied to clipboard!');
    }
    setTimeout(() => setCopiedFormat(null), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150 font-sans text-xs">
      <div className="w-full sm:max-w-lg bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-cyan-950/80 border border-cyan-800/60 text-cyan-400">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Share License Key</h3>
              <p className="text-[11px] text-slate-400">Customer Delivery Formats</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl bg-slate-950 border border-slate-800 hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Formatted Markdown Preview */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Telegram / Discord / WhatsApp Format</span>
            <button
              onClick={() => copyText(telegramCard, 'tg')}
              className="flex items-center space-x-1.5 px-3 py-1 bg-cyan-950/80 border border-cyan-800 text-cyan-300 rounded-lg hover:bg-cyan-900 transition font-mono text-[11px]"
            >
              {copiedFormat === 'tg' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedFormat === 'tg' ? 'Copied!' : 'Copy Formatted Card'}</span>
            </button>
          </div>

          <pre className="p-3.5 bg-slate-950 border border-slate-800 rounded-2xl text-[11px] font-mono text-slate-300 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
            {telegramCard}
          </pre>
        </div>

        {/* Clean Text Format */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Plain Text Format</span>
            <button
              onClick={() => copyText(cleanText, 'plain')}
              className="flex items-center space-x-1.5 px-3 py-1 bg-slate-950 border border-slate-800 text-slate-300 rounded-lg hover:bg-slate-800 transition font-mono text-[11px]"
            >
              {copiedFormat === 'plain' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedFormat === 'plain' ? 'Copied!' : 'Copy Plain'}</span>
            </button>
          </div>

          <div className="p-3 bg-slate-950 border border-slate-800 rounded-2xl text-[11px] font-mono text-slate-300 flex items-center justify-between">
            <span className="text-cyan-300 font-bold">{keyItem.key}</span>
            <span className="text-slate-400">{keyItem.duration || 'Custom'}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-300 font-semibold border border-slate-800 transition"
        >
          Close
        </button>
      </div>
    </div>
  );
};
