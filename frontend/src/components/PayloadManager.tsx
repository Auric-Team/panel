'use client';

import React, { useState, useEffect } from 'react';
import { Upload, Download, CheckCircle2, AlertTriangle, FileCode2, Sparkles, RefreshCw, Layers, Zap, Clock, Activity } from 'lucide-react';
import { api, UploadProgressPayload } from '@/lib/api';

interface PayloadManagerProps {
  token: string;
  userRole: 'owner' | 'manager' | 'reseller';
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
        // Suggest next patch version by default
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
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 text-center backdrop-blur-xl">
        <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto mb-3 animate-pulse" />
        <h3 className="text-lg font-bold text-white mb-1">Manager Access Required</h3>
        <p className="text-sm text-slate-400 max-w-md mx-auto">
          Only Managers and Owners are authorized to upload and publish new <code className="text-cyan-400 font-mono">libil2cpp.so</code> binary payloads.
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
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-gradient-to-r from-slate-900/90 via-cyan-950/40 to-slate-900/90 border border-cyan-500/20 rounded-2xl p-6 backdrop-blur-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full filter blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <div className="p-2 bg-cyan-500/10 rounded-xl border border-cyan-500/30 text-cyan-400">
                <FileCode2 className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold text-white tracking-wide">Payload & libil2cpp.so Publisher</h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                Managers & Owner Only
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Publish updated <code className="text-cyan-300">libil2cpp.so</code> binaries. Mobile app clients receive an instant update pop-up to fetch latest releases.
            </p>
          </div>

          <button
            onClick={loadStatus}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium border border-slate-700 transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Grid: Current Status & Upload Form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Live Status */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 backdrop-blur-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Live Binary Status</span>
              {status?.binaryExists ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Active Binary
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                  No File
                </span>
              )}
            </div>

            <div className="space-y-4 my-6">
              <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Current Version</span>
                <span className="text-2xl font-black text-cyan-400 tracking-tight">{status?.version || '1.0.0'}</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">File Size</span>
                  <span className="text-sm font-bold text-slate-200">{formatSize(status?.binarySize || 0)}</span>
                </div>
                <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Published By</span>
                  <span className="text-sm font-bold text-cyan-300">{status?.updatedBy || 'System'}</span>
                </div>
              </div>

              <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Release Notes / Changelog</span>
                <p className="text-xs text-slate-300 leading-relaxed italic">
                  &quot;{status?.changelog || 'No changelog notes recorded.'}&quot;
                </p>
              </div>

              <div className="text-[11px] text-slate-500">
                Last Updated: {status?.updatedAt ? new Date(status.updatedAt).toLocaleString() : 'N/A'}
              </div>
            </div>
          </div>

          {status?.binaryExists && (
            <a
              href={`${process.env.NEXT_PUBLIC_API_URL || 'https://api.axioshacks.com'}/api/download/libil2cpp`}
              target="_blank"
              rel="noreferrer"
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition-all text-center"
            >
              <Download className="w-4 h-4 text-cyan-400" />
              Download Active Binary (.so)
            </a>
          )}
        </div>

        {/* Right Column: Upload Form */}
        <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 backdrop-blur-xl">
          <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            Publish New libil2cpp.so Release
          </h3>
          <p className="text-xs text-slate-400 mb-6">
            Upload your updated binary file, assign a version number, and describe changelog updates.
          </p>

          {message && (
            <div
              className={`p-4 rounded-xl text-xs font-medium mb-6 flex items-center gap-3 ${
                message.type === 'success'
                  ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                  : 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
              }`}
            >
              {message.type === 'success' ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" /> : <AlertTriangle className="w-5 h-5 flex-shrink-0" />}
              <span>{message.text}</span>
            </div>
          )}

          <form onSubmit={handlePublish} className="space-y-5">
            {/* Version & File Input row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Version Tag (Required)
                </label>
                <input
                  type="text"
                  value={versionInput}
                  onChange={(e) => setVersionInput(e.target.value)}
                  placeholder="e.g. 1.0.1 or v2.1"
                  required
                  disabled={uploading}
                  className="w-full px-4 py-3 bg-slate-950/80 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-500 transition-all font-mono disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
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
                    className="w-full flex items-center justify-between px-4 py-3 bg-slate-950/80 border border-slate-800 rounded-xl text-sm text-slate-300 cursor-pointer hover:border-cyan-500/50 transition-all"
                  >
                    <span className="truncate max-w-[200px]">
                      {selectedFile ? selectedFile.name : 'Select libil2cpp.so or .zip archive...'}
                    </span>
                    <Upload className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                  </label>
                </div>
              </div>
            </div>

            {/* Changelog Textarea */}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Release Notes / Mobile Pop-up Changelog
              </label>
              <textarea
                value={changelogInput}
                onChange={(e) => setChangelogInput(e.target.value)}
                placeholder="Describe fixes or updates (e.g., Updated offset pointers, anti-cheat detection bypass, performance stability)..."
                rows={3}
                disabled={uploading}
                className="w-full px-4 py-3 bg-slate-950/80 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-500 transition-all disabled:opacity-50"
              />
            </div>

            {/* Selected File Details Box */}
            {selectedFile && !uploading && (
              <div className="p-3.5 bg-cyan-950/30 border border-cyan-500/30 rounded-xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  <Layers className="w-4 h-4 text-cyan-400" />
                  <span className="font-semibold text-slate-200">{selectedFile.name}</span>
                </div>
                <span className="font-bold text-cyan-400">{formatSize(selectedFile.size)}</span>
              </div>
            )}

            {/* Live Upload Progress Section */}
            {uploading && uploadProgress && (
              <div className="p-4 bg-slate-950/90 border border-cyan-500/40 rounded-xl space-y-3.5 shadow-xl backdrop-blur-md">
                <div className="flex items-center justify-between text-xs font-mono font-bold">
                  <span className="text-cyan-400 flex items-center gap-2">
                    <Activity className="w-4 h-4 animate-spin text-cyan-400" />
                    UPLOADING BINARY PAYLOAD: {uploadProgress.percentage}%
                  </span>
                  <span className="text-slate-300">
                    {formatSize(uploadProgress.loaded)} / {formatSize(uploadProgress.total)}
                  </span>
                </div>

                {/* Horizontal Progress Bar */}
                <div className="relative w-full h-3.5 bg-slate-800/90 rounded-full overflow-hidden p-0.5 border border-slate-700">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-600 rounded-full transition-all duration-150 shadow-[0_0_12px_rgba(6,182,212,0.8)]"
                    style={{ width: `${uploadProgress.percentage}%` }}
                  />
                </div>

                {/* Telemetry Stats: Speed & Estimated Time */}
                <div className="grid grid-cols-2 gap-3 pt-1 text-xs font-mono">
                  <div className="flex items-center gap-2 bg-slate-900/90 px-3.5 py-2.5 rounded-lg border border-slate-800">
                    <Zap className="w-4 h-4 text-amber-400 animate-pulse" />
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block font-semibold">Network Speed</span>
                      <span className="font-extrabold text-amber-300 text-sm">{formatSpeed(uploadProgress.speedBps)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 bg-slate-900/90 px-3.5 py-2.5 rounded-lg border border-slate-800">
                    <Clock className="w-4 h-4 text-cyan-400" />
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block font-semibold">Estimated Time</span>
                      <span className="font-extrabold text-cyan-300 text-sm">{formatEta(uploadProgress.etaSeconds)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={uploading || !selectedFile}
              className="w-full py-3.5 px-6 bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-lg shadow-cyan-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {uploading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Publishing Version {versionInput}... ({uploadProgress?.percentage || 0}%)
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Publish & Deploy Version {versionInput || ''}
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
