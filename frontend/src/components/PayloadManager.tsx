'use client';

import React, { useState, useEffect } from 'react';
import { Upload, Download, CheckCircle2, AlertTriangle, FileCode2, Sparkles, RefreshCw, Layers, Zap, Clock, Activity } from 'lucide-react';
import { api, UploadProgressPayload } from '@/lib/api';

interface PayloadManagerProps {
  token: string;
  userRole?: 'owner' | 'manager' | 'reseller' | 'user' | string;
}

export const PayloadManager: React.FC<PayloadManagerProps> = ({ token, userRole }) => {
  const isAuthorized = userRole === 'owner' || userRole === 'manager';

  const [status, setStatus] = useState<{
    binaryExists: boolean;
    binarySize: number;
    version: string;
    changelog: string;
    updatedAt: string;
    updatedBy: string;
  } | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [uploading, setUploading] = useState<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [versionInput, setVersionInput] = useState<string>('');
  const [changelogInput, setChangelogInput] = useState<string>('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [uploadProgress, setUploadProgress] = useState<UploadProgressPayload | null>(null);

  const loadStatus = async () => {
    setLoading(true);
    try {
      const data = await api.getPayloadStatus();
      setStatus(data);
      if (data.version && !versionInput) {
        const parts = data.version.split('.');
        if (parts.length === 3 && !isNaN(parseInt(parts[2], 10))) {
          const nextPatch = parseInt(parts[2], 10) + 1;
          setVersionInput(`${parts[0]}.${parts[1]}.${nextPatch}`);
        } else {
          setVersionInput(data.version);
        }
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to fetch payload status from backend' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const lower = file.name.toLowerCase();
      if (!lower.endsWith('.so') && !lower.endsWith('.zip') && !lower.includes('libil2cpp')) {
        setMessage({ type: 'error', text: 'Warning: Uploaded file should preferably be libil2cpp.so or a .zip archive containing libil2cpp.so' });
      } else {
        setMessage(null);
      }
      setSelectedFile(file);
    }
  };

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setMessage({ type: 'error', text: 'Please select a libil2cpp.so file to upload.' });
      return;
    }
    if (!versionInput.trim()) {
      setMessage({ type: 'error', text: 'Please enter a version string (e.g. 1.0.1 or v2.0).' });
      return;
    }

    setUploading(true);
    setUploadProgress({ loaded: 0, total: selectedFile.size, percentage: 0, speedBps: 0, etaSeconds: 0 });
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('version', versionInput.trim());
      formData.append('changelog', changelogInput.trim() || 'New libil2cpp.so build release.');

      const result = await api.publishPayload(token, formData, (prog) => {
        setUploadProgress(prog);
      });

      setMessage({ type: 'success', text: result.message || 'New libil2cpp.so version published successfully!' });
      setSelectedFile(null);
      setChangelogInput('');
      setUploadProgress(null);
      await loadStatus();
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || 'Failed to upload and publish binary.' });
    } finally {
      setUploading(false);
    }
  };

  if (!isAuthorized) {
    return (
      <div className="ref-card p-8 text-center">
        <AlertTriangle className="w-10 h-10 text-warning mx-auto mb-3" />
        <h3 className="font-display text-lg text-ink mb-1">Manager Access Required</h3>
        <p className="text-sm text-muted max-w-md mx-auto">
          Only Managers and Owners are authorized to upload and publish new <code className="font-mono">libil2cpp.so</code> binary payloads.
        </p>
      </div>
    );
  }

  const formatSize = (bytes: number) => {
    if (!bytes) return '0 B';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  const formatSpeed = (bps: number) => {
    if (!bps || isNaN(bps)) return '0 KB/s';
    if (bps >= 1024 * 1024) {
      return `${(bps / (1024 * 1024)).toFixed(2)} MB/s`;
    }
    if (bps >= 1024) {
      return `${(bps / 1024).toFixed(1)} KB/s`;
    }
    return `${Math.round(bps)} B/s`;
  };

  const formatEta = (seconds: number) => {
    if (!seconds || !isFinite(seconds) || seconds <= 0) return 'Calculating...';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) {
      return `${mins}m ${secs}s`;
    }
    return `${secs}s`;
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Top Header Card */}
      <div className="ref-card p-6 shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <div className="w-9 h-9 rounded-md bg-surface border border-border-soft flex items-center justify-center text-accent shadow-sm">
                <FileCode2 className="w-5 h-5 text-accent" />
              </div>
              <h2 className="font-display text-lg sm:text-xl font-normal text-ink tracking-tight">Payload &amp; libil2cpp.so Publisher</h2>
              <span className="ref-badge info text-[10px]">
                Authorized Managers
              </span>
            </div>
            <p className="text-xs text-muted font-sans">
              Publish updated <code className="font-mono text-ink">libil2cpp.so</code> binaries. Mobile app clients receive an instant update pop-up to fetch latest releases.
            </p>
          </div>

          <button
            onClick={loadStatus}
            disabled={loading}
            className="ref-btn ref-btn-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Grid: Current Status & Upload Form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Live Status */}
        <div className="ref-card p-6 flex flex-col justify-between space-y-6">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-medium text-muted uppercase tracking-wider">Live Binary Status</span>
              {status?.binaryExists ? (
                <span className="ref-badge success text-[10px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                  Active Binary
                </span>
              ) : (
                <span className="ref-badge danger text-[10px]">
                  No File
                </span>
              )}
            </div>

            <div className="space-y-3.5">
              <div className="ref-card-subtle p-3.5">
                <span className="text-[10px] font-medium text-muted uppercase tracking-wider block mb-1">Current Version</span>
                <span className="font-display text-2xl font-normal text-ink">{status?.version || '1.0.0'}</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="ref-card-subtle p-3">
                  <span className="text-[10px] font-medium text-muted uppercase block mb-1">File Size</span>
                  <span className="text-xs font-mono font-bold text-ink">{formatSize(status?.binarySize || 0)}</span>
                </div>
                <div className="ref-card-subtle p-3">
                  <span className="text-[10px] font-medium text-muted uppercase block mb-1">Published By</span>
                  <span className="text-xs font-mono font-bold text-ink">@{status?.updatedBy || 'System'}</span>
                </div>
              </div>

              <div className="ref-card-subtle p-3.5">
                <span className="text-[10px] font-medium text-muted uppercase tracking-wider block mb-1">Release Notes / Changelog</span>
                <p className="text-xs text-muted leading-relaxed italic font-sans">
                  &quot;{status?.changelog || 'No changelog notes recorded.'}&quot;
                </p>
              </div>

              <div className="text-[11px] text-muted font-sans">
                Last Updated: {status?.updatedAt ? new Date(status.updatedAt).toLocaleString() : 'N/A'}
              </div>
            </div>
          </div>

          {status?.binaryExists && (
            <a
              href={`${process.env.NEXT_PUBLIC_API_URL || 'https://api.axioshacks.com'}/api/download/libil2cpp`}
              target="_blank"
              rel="noreferrer"
              className="ref-btn w-full"
            >
              <Download className="w-4 h-4 text-accent" />
              <span>Download Active Binary (.so)</span>
            </a>
          )}
        </div>

        {/* Right Column: Upload Form */}
        <div className="lg:col-span-2 ref-card p-6">
          <h3 className="font-display text-base font-normal text-ink mb-1 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-accent" />
            <span>Publish New libil2cpp.so Release</span>
          </h3>
          <p className="text-xs text-muted mb-6 font-sans">
            Upload your updated binary file, assign a version tag, and provide changelog release notes.
          </p>

          {message && (
            <div
              className={`p-3.5 rounded-sm text-xs font-medium mb-6 flex items-center gap-3 ${
                message.type === 'success'
                  ? 'bg-success/15 border border-success/30 text-success'
                  : 'bg-danger/15 border border-danger/30 text-danger'
              }`}
            >
              {message.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
              <span>{message.text}</span>
            </div>
          )}

          <form onSubmit={handlePublish} className="space-y-4">
            {/* Version & File Input row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-muted uppercase tracking-wider mb-1.5">
                  Version Tag (Required)
                </label>
                <input
                  type="text"
                  value={versionInput}
                  onChange={(e) => setVersionInput(e.target.value)}
                  placeholder="e.g. 1.0.1 or v2.1"
                  required
                  disabled={uploading}
                  className="ref-input w-full font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted uppercase tracking-wider mb-1.5">
                  Binary File (.so or .zip archive)
                </label>
                <div className="relative">
                  <input
                    type="file"
                    accept=".so,.zip,application/zip,application/x-zip-compressed,application/octet-stream"
                    onChange={handleFileChange}
                    id="payload-file-input"
                    disabled={uploading}
                    className="hidden"
                  />
                  <label
                    htmlFor="payload-file-input"
                    className="ref-input w-full cursor-pointer justify-between text-xs"
                  >
                    <span className="truncate max-w-[200px] text-ink">
                      {selectedFile ? selectedFile.name : 'Select libil2cpp.so or .zip...'}
                    </span>
                    <Upload className="w-4 h-4 text-muted shrink-0" />
                  </label>
                </div>
              </div>
            </div>

            {/* Changelog Textarea */}
            <div>
              <label className="block text-xs font-medium text-muted uppercase tracking-wider mb-1.5">
                Release Notes / Mobile Pop-up Changelog
              </label>
              <textarea
                value={changelogInput}
                onChange={(e) => setChangelogInput(e.target.value)}
                placeholder="Describe fixes or updates (e.g. Updated offset pointers, anti-cheat detection bypass, performance stability)..."
                rows={3}
                disabled={uploading}
                className="ref-input w-full h-auto py-2.5 text-xs font-sans"
              />
            </div>

            {/* Selected File Details Box */}
            {selectedFile && !uploading && (
              <div className="p-3 bg-surface border border-border-soft rounded-sm flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-accent" />
                  <span className="font-medium text-ink">{selectedFile.name}</span>
                </div>
                <span className="font-mono font-bold text-accent">{formatSize(selectedFile.size)}</span>
              </div>
            )}

            {/* Live Upload Progress Section */}
            {uploading && uploadProgress && (
              <div className="p-4 bg-surface border border-border-soft rounded-sm space-y-3 shadow-sm">
                <div className="flex items-center justify-between text-xs font-mono font-medium">
                  <span className="text-accent flex items-center gap-2">
                    <Activity className="w-4 h-4 animate-spin text-accent" />
                    Uploading Payload: {uploadProgress.percentage}%
                  </span>
                  <span className="text-muted">
                    {formatSize(uploadProgress.loaded)} / {formatSize(uploadProgress.total)}
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="relative w-full h-2 bg-border-soft rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent rounded-full transition-all duration-150"
                    style={{ width: `${uploadProgress.percentage}%` }}
                  />
                </div>

                {/* Telemetry Stats */}
                <div className="grid grid-cols-2 gap-3 pt-1 text-xs font-mono">
                  <div className="flex items-center gap-2 bg-surface-solid p-2.5 rounded-sm border border-border-soft">
                    <Zap className="w-4 h-4 text-warning" />
                    <div>
                      <span className="text-[10px] text-muted uppercase block">Network Speed</span>
                      <span className="font-bold text-ink text-xs">{formatSpeed(uploadProgress.speedBps)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 bg-surface-solid p-2.5 rounded-sm border border-border-soft">
                    <Clock className="w-4 h-4 text-muted" />
                    <div>
                      <span className="text-[10px] text-muted uppercase block">Estimated Time</span>
                      <span className="font-bold text-ink text-xs">{formatEta(uploadProgress.etaSeconds)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={uploading || !selectedFile}
              className="ref-btn ref-btn-primary w-full py-3 text-xs font-semibold uppercase tracking-wider"
            >
              {uploading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Publishing Version {versionInput}... ({uploadProgress?.percentage || 0}%)</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>Publish &amp; Deploy Version {versionInput || ''}</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
