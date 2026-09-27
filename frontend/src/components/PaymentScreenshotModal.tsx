"use client";

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  FileImage,
  ExternalLink,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  Minimize2,
  Download,
  RefreshCw,
  Calendar,
  User,
  Coins,
  Key,
  Expand,
  UploadCloud,
} from 'lucide-react';
import { KeyItem } from '@/types/key';
import { getReceiptImageUrl } from '@/lib/api';

export interface PaymentScreenshotModalProps {
  isOpen: boolean;
  keyItem?: KeyItem | null;
  imageSrc?: string | null;
  imageTitle?: string;
  onClose: () => void;
  onUpdateReceipt?: (keyId: string, base64: string) => Promise<void>;
}

export const PaymentScreenshotModal: React.FC<PaymentScreenshotModalProps> = ({
  isOpen,
  keyItem,
  imageSrc,
  imageTitle,
  onClose,
  onUpdateReceipt,
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [fitMode, setFitMode] = useState<'fit' | 'actual'>('fit');
  const [isUploading, setIsUploading] = useState<boolean>(false);

  // Drag Pan state
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const rawSrc = imageSrc || keyItem?.paymentScreenshot || null;
  const activeSrc = rawSrc ? getReceiptImageUrl(rawSrc) : null;
  const activeTitle = imageTitle || (keyItem ? `Key: ${keyItem.key}` : 'Payment Proof Screenshot');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Reset zoom, rotation & position when modal opens or source changes
  useEffect(() => {
    if (isOpen) {
      setZoomLevel(1);
      setRotation(0);
      setPosition({ x: 0, y: 0 });
      setIsFullscreen(false);
      setFitMode('fit');
    }
  }, [isOpen, activeSrc]);

  if (!isOpen || !activeSrc) return null;

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(4, Math.round((prev + 0.25) * 100) / 100));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(0.4, Math.round((prev - 0.25) * 100) / 100));

  const handleReset = () => {
    setZoomLevel(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
    setFitMode('fit');
  };

  const handleRotate = () => setRotation((prev) => (prev + 90) % 360);

  const toggleFitMode = () => {
    if (fitMode === 'fit') {
      setFitMode('actual');
      setZoomLevel(1.5);
    } else {
      setFitMode('fit');
      setZoomLevel(1);
      setPosition({ x: 0, y: 0 });
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      handleZoomIn();
    } else {
      handleZoomOut();
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleDownload = async () => {
    if (!activeSrc) return;
    try {
      const response = await fetch(activeSrc);
      if (!response.ok) throw new Error('Download failed');
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = keyItem ? `receipt-${keyItem.key}.jpg` : `axios_payment_proof_${Date.now()}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(activeSrc, '_blank');
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (JPG, PNG, WebP).');
      return;
    }
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      if (base64 && onUpdateReceipt && keyItem) {
        setIsUploading(true);
        try {
          await onUpdateReceipt(keyItem.id, base64);
        } finally {
          setIsUploading(false);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-ink/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className={`ref-card relative w-full transition-all duration-300 flex flex-col overflow-hidden shadow-2xl ${
          isFullscreen ? 'max-w-[98vw] h-[96vh]' : 'max-w-4xl h-[90vh]'
        }`}
      >
        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border-soft bg-surface shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-md bg-surface text-accent flex items-center justify-center border border-border-soft shrink-0">
              <FileImage className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-display text-base font-normal text-ink leading-tight">
                Payment Receipt Lightbox
              </h3>
              <p className="text-[11px] text-muted truncate max-w-md font-mono mt-0.5">
                {activeTitle}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1.5">
            {/* Re-Upload / Replace Receipt Button */}
            {onUpdateReceipt && keyItem && (
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="ref-btn ref-btn-sm ref-btn-primary flex items-center space-x-1.5 disabled:opacity-50 cursor-pointer"
                title="Upload or Replace Receipt Screenshot"
              >
                <UploadCloud className={`w-3.5 h-3.5 ${isUploading ? 'animate-bounce' : ''}`} />
                <span>{isUploading ? 'Uploading...' : 'Replace Receipt'}</span>
              </button>
            )}

            {/* Download Button */}
            <button
              onClick={handleDownload}
              className="ref-btn-icon"
              title="Download Image"
            >
              <Download className="w-4 h-4" />
            </button>

            {/* Toggle Fullscreen Modal */}
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="ref-btn-icon"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen View'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Close Modal (X) */}
            <button
              onClick={onClose}
              className="ref-btn-icon text-muted hover:text-danger hover:border-danger/30"
              title="Close Lightbox"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Metadata Details Strip (if keyItem exists) */}
        {keyItem && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-5 py-2.5 bg-surface border-b border-border-soft text-xs shrink-0">
            <div className="flex items-center space-x-2">
              <Key className="w-3.5 h-3.5 text-muted shrink-0" />
              <div className="truncate">
                <span className="text-[9px] text-muted uppercase tracking-wider block">License Key</span>
                <span className="text-ink font-mono font-medium truncate block">{keyItem.key}</span>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <User className="w-3.5 h-3.5 text-muted shrink-0" />
              <div className="truncate">
                <span className="text-[9px] text-muted uppercase tracking-wider block">Issued By</span>
                <span className="text-ink font-medium block">
                  {keyItem.createdByUsername || 'System'}
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Coins className="w-3.5 h-3.5 text-warning shrink-0" />
              <div>
                <span className="text-[9px] text-muted uppercase tracking-wider block">Cost Tokens</span>
                <span className="text-ink font-semibold font-mono block">
                  {keyItem.costTokens || 0} Tokens
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Calendar className="w-3.5 h-3.5 text-muted shrink-0" />
              <div>
                <span className="text-[9px] text-muted uppercase tracking-wider block">Timestamp</span>
                <span className="text-muted font-mono block">
                  {keyItem.createdAt ? new Date(keyItem.createdAt).toLocaleString() : 'N/A'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Interactive Image Viewer Canvas Container */}
        <div
          ref={containerRef}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className="relative flex-1 bg-surface-solid border-b border-border-soft overflow-hidden flex items-center justify-center p-4 select-none cursor-grab active:cursor-grabbing"
        >
          <div className="w-full h-full flex items-center justify-center">
            <img
              src={activeSrc}
              alt="Payment Receipt Proof"
              draggable={false}
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                if (!target.dataset.triedFallback && rawSrc) {
                  target.dataset.triedFallback = 'true';
                  target.src = `https://api.axioshacks.com${rawSrc.startsWith('/') ? rawSrc : `/${rawSrc}`}`;
                }
              }}
              style={{
                transform: `translate(${position.x}px, ${position.y}px) scale(${zoomLevel}) rotate(${rotation}deg)`,
                transition: isDragging ? 'none' : 'transform 0.15s ease-out',
                maxHeight: fitMode === 'fit' ? '100%' : 'none',
                maxWidth: fitMode === 'fit' ? '100%' : 'none',
              }}
              className="object-contain rounded-md shadow-lg pointer-events-auto border border-border-soft"
            />
          </div>

          {/* Floating Controls Toolbar */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center space-x-1.5 px-3 py-1.5 rounded-lg ref-card border border-border-soft shadow-lg text-ink z-20 text-xs font-mono">
            {/* Fit / Actual Size Toggle */}
            <button
              onClick={toggleFitMode}
              className={`ref-btn ref-btn-sm py-1 px-2.5 font-sans font-medium text-xs flex items-center space-x-1 ${
                fitMode === 'fit' ? 'ref-btn-primary' : 'ref-btn-ghost'
              }`}
              title="Toggle Auto Fit to Screen"
            >
              <Expand className="w-3 h-3" />
              <span>{fitMode === 'fit' ? 'Fit Screen' : '100%'}</span>
            </button>

            <div className="w-px h-4 bg-border-soft mx-1" />

            {/* Zoom Out Button (-) */}
            <button
              onClick={handleZoomOut}
              className="ref-btn-icon w-7 h-7"
              title="Zoom Out (-)"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>

            <span className="text-ink font-mono font-medium px-1.5 min-w-[48px] text-center">
              {Math.round(zoomLevel * 100)}%
            </span>

            {/* Zoom In Button (+) */}
            <button
              onClick={handleZoomIn}
              className="ref-btn-icon w-7 h-7"
              title="Zoom In (+)"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>

            <div className="w-px h-4 bg-border-soft mx-1" />

            {/* 90-degree Rotation Button */}
            <button
              onClick={handleRotate}
              className="ref-btn-icon w-7 h-7"
              title="Rotate 90°"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>

            {/* Reset View Button */}
            <button
              onClick={handleReset}
              className="ref-btn-icon w-7 h-7"
              title="Reset Zoom & Position"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-5 py-3 bg-surface shrink-0">
          <a
            href={activeSrc}
            target="_blank"
            rel="noreferrer"
            className="text-accent hover:underline text-xs font-medium flex items-center space-x-1.5"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Open Original Direct</span>
          </a>

          <button
            onClick={onClose}
            className="ref-btn ref-btn-ghost ref-btn-sm"
          >
            Close Viewer
          </button>
        </div>
      </div>
    </div>
  );
};
