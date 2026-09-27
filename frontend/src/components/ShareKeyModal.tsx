"use client";

import React, { useState } from 'react';
import { Share2, Copy, Check, X } from 'lucide-react';
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150 font-sans text-xs">
      <div className="w-full sm:max-w-lg ref-card p-6 shadow-xl space-y-4 relative animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border-soft">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-md bg-surface border border-border-soft flex items-center justify-center text-accent">
              <Share2 className="w-4 h-4 text-accent" />
            </div>
            <div>
              <h3 className="font-display text-base font-normal text-ink">Share License Key</h3>
              <p className="text-[11px] text-muted font-sans">Customer Delivery Formats</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="ref-btn-icon w-7 h-7 text-muted hover:text-ink"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Formatted Markdown Preview */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] text-muted">
            <span className="font-sans font-medium uppercase tracking-wider text-[10px]">Telegram / Discord / WhatsApp Format</span>
            <button
              onClick={() => copyText(telegramCard, 'tg')}
              className="ref-btn ref-btn-sm"
            >
              {copiedFormat === 'tg' ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5 text-muted" />}
              <span>{copiedFormat === 'tg' ? 'Copied' : 'Copy Card'}</span>
            </button>
          </div>

          <pre className="p-3 bg-surface border border-border-soft rounded-sm text-[11px] font-mono text-ink whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
            {telegramCard}
          </pre>
        </div>

        {/* Clean Text Format */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] text-muted">
            <span className="font-sans font-medium uppercase tracking-wider text-[10px]">Plain Text Format</span>
            <button
              onClick={() => copyText(cleanText, 'plain')}
              className="ref-btn ref-btn-sm"
            >
              {copiedFormat === 'plain' ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5 text-muted" />}
              <span>{copiedFormat === 'plain' ? 'Copied' : 'Copy Plain'}</span>
            </button>
          </div>

          <div className="p-2.5 bg-surface border border-border-soft rounded-sm text-[11px] font-mono text-ink flex items-center justify-between">
            <span className="font-bold">{keyItem.key}</span>
            <span className="text-muted font-sans">{keyItem.duration || 'Custom'}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="ref-btn w-full py-2 text-xs"
        >
          Close
        </button>
      </div>
    </div>
  );
};
