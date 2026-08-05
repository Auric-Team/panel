"use client";

import React, { useState, useEffect } from 'react';
import {
  X,
  Image as ImageIcon,
  Download,
  Key,
  ExternalLink,
  ZoomIn,
  ZoomOut,
  RotateCw,
  RotateCcw,
  RefreshCw,
  Check,
  Copy,
  AlertCircle,
  FileText,
} from 'lucide-react';
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
  const [scale, setScale] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [copiedKey, setCopiedKey] = useState<boolean>(false);
  const [imageError, setImageError] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Keyboard shortcut listener for Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Reset viewport state when modal opens or keyItem changes
  useEffect(() => {
    if (isOpen) {
      setScale(1);
      setRotation(0);
      setImageError(false);
      setIsLoading(true);
      setCopiedKey(false);
    }
  }, [isOpen, keyItem]);

  if (!isOpen || !keyItem || !keyItem.paymentScreenshot) return null;

  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://103.207.181.125:20067';
  const imageUrl = keyItem.paymentScreenshot.startsWith('/uploads')
    ? `${baseUrl}${keyItem.paymentScreenshot}`
    : keyItem.paymentScreenshot;

  const downloadImage = () => {
    try {
      const link = document.createElement('a');
      link.href = imageUrl;
      link.target = '_blank';
      link.download = `payment-receipt-${keyItem.key}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      window.open(imageUrl, '_blank');
    }
  };

  const copyKeyToClipboard = () => {
    navigator.clipboard.writeText(keyItem.key);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleZoomIn = () => setScale((prev) => Math.min(prev + 0.25, 3.0));
  const handleZoomOut = () => setScale((prev) => Math.max(prev - 0.25, 0.5));
  const handleRotateClockwise = () => setRotation((prev) => (prev + 90) % 360);
  const handleResetControls = () => {
    setScale(1);
    setRotation(0);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/90 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl glass-card rounded-3xl p-5 sm:p-7 border border-cyan-500/40 shadow-2xl glow-cyan max-h-[92vh] flex flex-col overflow-hidden">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 z-20 text-slate-400 hover:text-white p-2 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header & Key Info Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-4 border-b border-slate-800">
          <div className="flex items-center space-x-3.5">
            <div className="p-3 bg-cyan-500/10 border border-cyan-500/40 rounded-2xl text-cyan-400">
              <ImageIcon className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h3 className="text-xl font-black text-white tracking-wide">
                Payment Receipt Lightbox
              </h3>
              <div className="flex items-center space-x-2 text-xs text-slate-400 font-mono mt-0.5">
                <span>License Key:</span>
                <span className="text-purple-300 font-bold flex items-center space-x-1">
                  <span>{keyItem.key}</span>
                  <button
                    type="button"
                    onClick={copyKeyToClipboard}
                    className="text-slate-500 hover:text-white transition p-0.5"
                    title="Copy Key"
                  >
                    {copiedKey ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </span>
              </div>
            </div>
          </div>

          {/* Download & External Open Quick Buttons */}
          <div className="flex items-center space-x-2 self-start sm:self-auto">
            <a
              href={imageUrl}
              target="_blank"
              rel="noreferrer"
              className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition text-xs flex items-center space-x-1"
              title="Open full image in new tab"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
            <button
              type="button"
              onClick={downloadImage}
              className="flex items-center space-x-2 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 text-xs font-black px-4 py-2.5 rounded-xl shadow-glow-cyan transition"
            >
              <Download className="w-4 h-4" />
              <span>Download Receipt</span>
            </button>
          </div>
        </div>

        {/* Metadata Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-900/90 border border-slate-800 rounded-2xl p-3 mb-4 text-xs font-mono">
          <div>
            <span className="text-slate-500 block text-[10px] uppercase font-bold">Duration</span>
            <span className="text-white font-bold">{keyItem.duration}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px] uppercase font-bold">Tokens Spent</span>
            <span className="text-amber-400 font-bold">{keyItem.costTokens || 0} Tokens</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px] uppercase font-bold">Created By</span>
            <span className="text-purple-300 font-bold">{keyItem.createdByUsername || 'System'}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px] uppercase font-bold">Created Date</span>
            <span className="text-slate-300">{new Date(keyItem.createdAt).toLocaleDateString()}</span>
          </div>
        </div>

        {/* Interactive Lightbox Viewport & Controls Overlay */}
        <div className="relative flex-1 rounded-2xl border border-slate-800 bg-slate-950 flex items-center justify-center p-4 min-h-[300px] max-h-[55vh] overflow-hidden select-none">
          {/* Zoom & Rotation Controls Toolbar */}
          <div className="absolute top-4 right-4 z-20 flex items-center space-x-1.5 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 p-1.5 rounded-2xl shadow-xl">
            {/* Zoom Out */}
            <button
              type="button"
              onClick={handleZoomOut}
              disabled={scale <= 0.5}
              className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>

            {/* Scale indicator */}
            <span className="px-2 text-xs font-mono font-bold text-cyan-300 min-w-[45px] text-center">
              {Math.round(scale * 100)}%
            </span>

            {/* Zoom In */}
            <button
              type="button"
              onClick={handleZoomIn}
              disabled={scale >= 3.0}
              className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>

            <div className="w-px h-5 bg-slate-700 mx-1" />

            {/* Rotate Clockwise */}
            <button
              type="button"
              onClick={handleRotateClockwise}
              className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition"
              title="Rotate Clockwise (90°)"
            >
              <RotateCw className="w-4 h-4" />
            </button>

            {/* Reset Controls */}
            <button
              type="button"
              onClick={handleResetControls}
              className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition"
              title="Reset Zoom & Rotation"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {/* Loading Indicator */}
          {isLoading && !imageError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center space-y-3 bg-slate-950/80 z-10">
              <div className="w-8 h-8 border-3 border-cyan-400 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-mono text-cyan-300">Loading receipt image...</span>
            </div>
          )}

          {/* Fallback View when Image Fails to Load */}
          {imageError ? (
            <div className="flex flex-col items-center justify-center text-center p-6 space-y-3 animate-in fade-in">
              <div className="p-4 bg-rose-950/60 border border-rose-500/40 rounded-2xl text-rose-400 shadow-glow-rose">
                <AlertCircle className="w-8 h-8" />
              </div>
              <h4 className="text-base font-bold text-white font-mono">
                Unable to Display Screenshot
              </h4>
              <p className="text-xs text-slate-400 max-w-md font-mono">
                The image file could not be loaded directly. It might be stored on a remote server or restricted.
              </p>
              <a
                href={imageUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-xl text-xs font-mono text-cyan-300 flex items-center space-x-2 transition"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Open Image Link Directly</span>
              </a>
            </div>
          ) : (
            /* Image display container */
            <div className="w-full h-full flex items-center justify-center overflow-auto p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl}
                alt={`Payment receipt screenshot for key ${keyItem.key}`}
                onLoad={() => setIsLoading(false)}
                onError={() => {
                  setIsLoading(false);
                  setImageError(true);
                }}
                style={{
                  transform: `scale(${scale}) rotate(${rotation}deg)`,
                  transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
                className="max-w-full max-h-full object-contain rounded-xl shadow-2xl origin-center"
              />
            </div>
          )}
        </div>

        {/* Footer Note & Info */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-800 text-xs font-mono text-slate-400">
          <div className="flex items-center space-x-2">
            <FileText className="w-4 h-4 text-purple-400" />
            <span>{keyItem.note ? `Note: ${keyItem.note}` : 'Verified Payment Upload'}</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-bold px-5 py-2.5 rounded-xl border border-slate-700 transition"
          >
            Close Lightbox
          </button>
        </div>
      </div>
    </div>
  );
};
