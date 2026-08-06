"use client";

import React, { useState, useEffect } from 'react';
import {
  X,
  Image as ImageIcon,
  Download,
  ExternalLink,
  ZoomIn,
  ZoomOut,
  RotateCw,
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

  // Close on Escape key
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

  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.axioshacks.com';
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
    if (!keyItem.key) return;
    const handleSuccess = () => {
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    };

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(keyItem.key)
        .then(handleSuccess)
        .catch(() => fallbackCopy(keyItem.key, handleSuccess));
    } else {
      fallbackCopy(keyItem.key, handleSuccess);
    }
  };

  const fallbackCopy = (text: string, callback?: () => void) => {
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      if (successful && callback) callback();
    } catch (err) {
      console.error('Copy fallback failed:', err);
    }
  };

  const handleZoomIn = () => setScale((prev) => Math.min(prev + 0.25, 3.0));
  const handleZoomOut = () => setScale((prev) => Math.max(prev - 0.25, 0.5));
  const handleRotateClockwise = () => setRotation((prev) => (prev + 90) % 360);
  const handleResetControls = () => {
    setScale(1);
    setRotation(0);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="relative w-full max-w-4xl bg-zinc-950 border border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-2xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 z-20 text-zinc-400 hover:text-zinc-100 p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition"
          aria-label="Close modal"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header & Key Info Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-4 border-b border-zinc-800/80">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-300">
              <ImageIcon className="w-5 h-5 text-zinc-300" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-zinc-100">Payment Receipt</h3>
              <div className="flex items-center space-x-2 text-xs text-zinc-400 font-mono mt-0.5">
                <span>License Key:</span>
                <span className="text-zinc-200 font-medium flex items-center space-x-1">
                  <span>{keyItem.key}</span>
                  <button
                    type="button"
                    onClick={copyKeyToClipboard}
                    className="text-zinc-500 hover:text-zinc-200 transition p-0.5"
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

          {/* Quick Actions */}
          <div className="flex items-center space-x-2 self-start sm:self-auto font-mono text-xs">
            <a
              href={imageUrl}
              target="_blank"
              rel="noreferrer"
              className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-zinc-100 hover:border-zinc-700 transition flex items-center space-x-1"
              title="Open full image in new tab"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <button
              type="button"
              onClick={downloadImage}
              className="flex items-center space-x-1.5 bg-zinc-100 hover:bg-white text-zinc-950 font-semibold px-3.5 py-2 rounded-xl transition shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </button>
          </div>
        </div>

        {/* Metadata Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-zinc-900/60 border border-zinc-800 rounded-xl p-3 mb-3 text-xs font-mono">
          <div>
            <span className="text-zinc-500 block text-[10px] uppercase font-semibold">Duration</span>
            <span className="text-zinc-200 font-medium">{keyItem.duration}</span>
          </div>
          <div>
            <span className="text-zinc-500 block text-[10px] uppercase font-semibold">Cost</span>
            <span className="text-amber-400 font-bold">{keyItem.costTokens || 0} Tokens</span>
          </div>
          <div>
            <span className="text-zinc-500 block text-[10px] uppercase font-semibold">Created By</span>
            <span className="text-zinc-200 font-medium">{keyItem.createdByUsername || 'System'}</span>
          </div>
          <div>
            <span className="text-zinc-500 block text-[10px] uppercase font-semibold">Created Date</span>
            <span className="text-zinc-300">{new Date(keyItem.createdAt).toLocaleDateString()}</span>
          </div>
        </div>

        {/* Lightbox Viewport */}
        <div className="relative flex-1 rounded-xl border border-zinc-800 bg-zinc-950 flex items-center justify-center p-4 min-h-[300px] max-h-[55vh] overflow-hidden select-none">
          {/* Zoom & Rotation Controls Toolbar */}
          <div className="absolute top-3 right-3 z-20 flex items-center space-x-1 bg-zinc-900/90 border border-zinc-800 p-1 rounded-xl shadow-lg text-xs font-mono">
            {/* Zoom Out */}
            <button
              type="button"
              onClick={handleZoomOut}
              disabled={scale <= 0.5}
              className="p-1.5 rounded-lg text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>

            {/* Scale % */}
            <span className="px-1.5 text-zinc-400 min-w-[40px] text-center font-medium">
              {Math.round(scale * 100)}%
            </span>

            {/* Zoom In */}
            <button
              type="button"
              onClick={handleZoomIn}
              disabled={scale >= 3.0}
              className="p-1.5 rounded-lg text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>

            <div className="w-px h-4 bg-zinc-800 mx-0.5" />

            {/* Rotate */}
            <button
              type="button"
              onClick={handleRotateClockwise}
              className="p-1.5 rounded-lg text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 transition"
              title="Rotate 90°"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>

            {/* Reset */}
            <button
              type="button"
              onClick={handleResetControls}
              className="p-1.5 rounded-lg text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 transition"
              title="Reset Zoom & Rotation"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Loading Indicator */}
          {isLoading && !imageError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center space-y-2 bg-zinc-950/80 z-10 font-mono">
              <div className="w-6 h-6 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-zinc-400">Loading receipt...</span>
            </div>
          )}

          {/* Error View */}
          {imageError ? (
            <div className="flex flex-col items-center justify-center text-center p-6 space-y-2.5 font-mono">
              <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-rose-400">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-semibold text-zinc-200">
                Unable to load image
              </h4>
              <p className="text-xs text-zinc-400 max-w-xs">
                The receipt file could not be displayed directly.
              </p>
              <a
                href={imageUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-1 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-xs text-zinc-300 flex items-center space-x-1.5 transition"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open image link</span>
              </a>
            </div>
          ) : (
            /* Image display container */
            <div className="w-full h-full flex items-center justify-center overflow-auto p-2">
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
                  transition: 'transform 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
                className="max-w-full max-h-full object-contain rounded-lg shadow-xl origin-center"
              />
            </div>
          )}
        </div>

        {/* Footer Note */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-zinc-800/80 text-xs font-mono text-zinc-400">
          <div className="flex items-center space-x-1.5">
            <FileText className="w-3.5 h-3.5 text-zinc-500" />
            <span className="truncate max-w-[300px]">{keyItem.note ? `Note: ${keyItem.note}` : 'Payment Screenshot Proof'}</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold px-4 py-2 rounded-xl border border-zinc-800 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
