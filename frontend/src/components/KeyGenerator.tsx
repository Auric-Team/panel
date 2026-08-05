"use client";

import React, { useState } from 'react';
import { Sparkles, Copy, Check, Tag, Clock, Hash, KeyRound } from 'lucide-react';

interface KeyGeneratorProps {
  onGenerate: (duration: string, count: number, note: string) => Promise<string[]>;
}

export const KeyGenerator: React.FC<KeyGeneratorProps> = ({ onGenerate }) => {
  const [duration, setDuration] = useState<string>("7 Days");
  const [count, setCount] = useState<number>(1);
  const [note, setNote] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [lastGeneratedKeys, setLastGeneratedKeys] = useState<string[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [copiedAll, setCopiedAll] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    try {
      const generated = await onGenerate(duration, count, note);
      setLastGeneratedKeys(generated);
    } catch (err) {
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const copyAllKeys = () => {
    if (lastGeneratedKeys.length === 0) return;
    navigator.clipboard.writeText(lastGeneratedKeys.join('\n'));
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const durations = ["1 Day", "3 Days", "7 Days", "30 Days", "90 Days", "Lifetime"];

  return (
    <div className="glass-panel rounded-2xl p-6 border border-purple-800/40 bg-gradient-to-b from-axios-card to-axios-dark shadow-xl mb-8">
      <div className="flex items-center space-x-3 mb-6">
        <div className="p-2.5 bg-purple-600/30 border border-purple-500/40 rounded-lg text-purple-300">
          <Sparkles className="w-5 h-5 animate-pulse" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white tracking-wide">Generate New Keys</h2>
          <p className="text-xs text-purple-300/70">Create hardware-lockable access keys for Axios Mod Menu</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Duration Selector */}
          <div>
            <label className="block text-xs font-semibold text-purple-200/80 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
              <Clock className="w-3.5 h-3.5 text-purple-400" />
              <span>Key Duration</span>
            </label>
            <select
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="w-full bg-axios-dark border border-purple-900/60 rounded-xl px-4 py-2.5 text-sm text-purple-100 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all font-mono"
            >
              {durations.map((d) => (
                <option key={d} value={d} className="bg-axios-dark text-purple-100">
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* Key Count */}
          <div>
            <label className="block text-xs font-semibold text-purple-200/80 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
              <Hash className="w-3.5 h-3.5 text-purple-400" />
              <span>Quantity (Count)</span>
            </label>
            <input
              type="number"
              min="1"
              max="50"
              value={count}
              onChange={(e) => setCount(Math.max(1, Math.min(50, parseInt(e.target.value) || 1)))}
              className="w-full bg-axios-dark border border-purple-900/60 rounded-xl px-4 py-2.5 text-sm text-purple-100 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all font-mono"
            />
          </div>

          {/* Note / User Tag */}
          <div>
            <label className="block text-xs font-semibold text-purple-200/80 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
              <Tag className="w-3.5 h-3.5 text-purple-400" />
              <span>Note / User Tag</span>
            </label>
            <input
              type="text"
              placeholder="e.g. VIP Customer @User123"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full bg-axios-dark border border-purple-900/60 rounded-xl px-4 py-2.5 text-sm text-purple-100 placeholder-purple-900/80 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
            />
          </div>
        </div>

        {/* Generate Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isGenerating}
            className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-purple-600 via-purple-500 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-glow-purple transition-all duration-200 flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            <KeyRound className={`w-5 h-5 ${isGenerating ? 'animate-spin' : ''}`} />
            <span>{isGenerating ? "Generating Keys..." : "Generate Key"}</span>
          </button>
        </div>
      </form>

      {/* Generated keys display box */}
      {lastGeneratedKeys.length > 0 && (
        <div className="mt-6 pt-6 border-t border-purple-900/40">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase text-emerald-400 flex items-center space-x-1.5">
              <Check className="w-4 h-4" />
              <span>Successfully Generated ({lastGeneratedKeys.length})</span>
            </span>
            <button
              onClick={copyAllKeys}
              className="text-xs text-purple-300 hover:text-white flex items-center space-x-1 bg-purple-900/50 hover:bg-purple-800 px-3 py-1 rounded-lg border border-purple-700/40 transition-all"
            >
              {copiedAll ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedAll ? "Copied All!" : "Copy All Keys"}</span>
            </button>
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {lastGeneratedKeys.map((key, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between bg-axios-dark/90 border border-purple-900/60 rounded-xl px-4 py-2.5 text-xs font-mono text-purple-200 hover:border-purple-500/50 transition-all"
              >
                <span className="font-semibold text-purple-100 select-all">{key}</span>
                <button
                  onClick={() => copyToClipboard(key, idx)}
                  className="p-1.5 rounded-lg bg-purple-900/40 hover:bg-purple-700/60 text-purple-300 hover:text-white transition-all ml-2"
                  title="Copy Key"
                >
                  {copiedIndex === idx ? (
                    <Check className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
