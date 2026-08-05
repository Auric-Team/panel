"use client";

import React from 'react';
import { X, Image as ImageIcon, Download, Key, ExternalLink } from 'lucide-react';
import { KeyItem } from '@/types/key';

interface PaymentScreenshotModalProps {
  isOpen: boolean;
  keyItem: KeyItem | null;
  onClose: () => void;
}

export const PaymentScreenshotModal: React.FC<PaymentScreenshotModalProps> = ({
  isOpen,
  keyItem,
  onClose,
}) => {
  if (!isOpen || !keyItem || !keyItem.paymentScreenshot) return null;

  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://103.207.181.125:20067';
  const imageUrl = keyItem.paymentScreenshot.startsWith('/uploads')
    ? `${baseUrl}${keyItem.paymentScreenshot}`
    : keyItem.paymentScreenshot;

  const downloadImage = () => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `payment-screenshot-${keyItem.key}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl glass-card rounded-3xl p-6 border border-cyan-500/40 shadow-2xl glow-cyan max-h-[90vh] flex flex-col overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 z-10 text-slate-400 hover:text-white p-1.5 rounded-xl bg-slate-900/90 border border-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center space-x-3 mb-4">
          <div className="p-3 bg-cyan-500/10 border border-cyan-500/40 rounded-2xl text-cyan-400">
            <ImageIcon className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Payment Receipt Screenshot</h3>
            <p className="text-xs text-slate-400 font-mono flex items-center space-x-2">
              <span>License Key:</span>
              <span className="text-purple-300 font-bold">{keyItem.key}</span>
            </p>
          </div>
        </div>

        {/* Key Metadata Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-900/90 border border-slate-800 rounded-2xl p-3 mb-4 text-xs font-mono">
          <div>
            <span className="text-slate-400 block text-[10px] uppercase">Duration</span>
            <span className="text-white font-bold">{keyItem.duration}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase">Cost Tokens</span>
            <span className="text-amber-400 font-bold">{keyItem.costTokens || 0} Tokens</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase">Created By</span>
            <span className="text-purple-300 font-bold">{keyItem.createdByUsername || 'System'}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase">Date</span>
            <span className="text-slate-300">{new Date(keyItem.createdAt).toLocaleDateString()}</span>
          </div>
        </div>

        {/* Image Preview Container */}
        <div className="relative flex-1 overflow-auto rounded-2xl border border-slate-800 bg-slate-950 flex items-center justify-center p-2 min-h-[250px] max-h-[50vh]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt={`Payment screenshot for key ${keyItem.key}`}
            className="max-w-full max-h-full object-contain rounded-xl shadow-lg"
          />
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-800">
          <span className="text-xs text-slate-400 font-mono">
            {keyItem.note ? `Note: ${keyItem.note}` : 'Verified Payment Upload'}
          </span>
          <div className="flex space-x-3">
            <button
              onClick={downloadImage}
              className="flex items-center space-x-2 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition shadow-glow-cyan"
            >
              <Download className="w-4 h-4" />
              <span>Download Image</span>
            </button>
            <button
              onClick={onClose}
              className="bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-bold px-4 py-2.5 rounded-xl border border-slate-700 transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
