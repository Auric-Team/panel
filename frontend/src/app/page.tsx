"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  ShieldCheck, Users, Key, BarChart3, Lock, LogOut, Search, Plus, Trash2, 
  RefreshCw, AlertTriangle, UserPlus, ShieldAlert, CheckCircle, Cpu, Zap, 
  Activity, ArrowUpRight, DollarSign, Filter, Layers, Copy, Check, Clock, UserCheck,
  Coins, Image as ImageIcon, ExternalLink, RotateCcw, AlertCircle, Sparkles, Upload,
  Sliders, Shield, Server, ArrowRight, Eye, ChevronDown, Award, TrendingUp, FileText, CheckSquare, X
} from 'lucide-react';

import { KeyItem, UserItem, SalesDataPoint } from '@/types/key';
import { 
  checkBackendConnection, 
  fetchAllKeys, 
  fetchAllUsers, 
  generateKeysApi, 
  resetHwidApi, 
  deleteKeyApi, 
  updateUserTokensApi 
} from '@/lib/api';

import { SalesChart } from '@/components/SalesChart';
import { StatsOverview } from '@/components/StatsOverview';
import { TokenBalanceModal } from '@/components/TokenBalanceModal';
import { PaymentScreenshotModal } from '@/components/PaymentScreenshotModal';
import { ResellerDashboardModal } from '@/components/ResellerDashboardModal';
import { DialPad2FA } from '@/components/DialPad2FA';

const API_BASE = '/api';

export default function App() {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserItem | null>(null);

  // Backend Connection State
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [backendUrl, setBackendUrl] = useState<string>('103.207.181.125:20067');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Auth State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // 2FA Modal State
  const [show2FA, setShow2FA] = useState(false);
  const [pending2FAUser, setPending2FAUser] = useState<any>(null);
  const [pinError, setPinError] = useState('');

  // Dashboard Tabs & View State
  const [activeTab, setActiveTab] = useState<'keys' | 'users' | 'analytics'>('keys');
  const [keys, setKeys] = useState<KeyItem[]>([]);
  const [usersList, setUsersList] = useState<UserItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);
  const [userSearchQuery, setUserSearchQuery] = useState('');

  // Key Generator State
  const [durationOption, setDurationOption] = useState<string>('7 Days');
  const [customDays, setCustomDays] = useState<string>('4');
  const [genCount, setGenCount] = useState<number>(1);
  const [genNote, setGenNote] = useState<string>('');
  const [isMasterKey, setIsMasterKey] = useState<boolean>(false);
  const [paymentScreenshot, setPaymentScreenshot] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [genSuccessKeys, setGenSuccessKeys] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // User Creation State
  const [newUserUsername, setNewUserUsername] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<'reseller' | 'manager'>('reseller');
  const [newUserPin, setNewUserPin] = useState('');
  const [newUserTokens, setNewUserTokens] = useState<number>(100);

  // Modals state
  const [tokenModalUser, setTokenModalUser] = useState<UserItem | null>(null);
  const [screenshotModalKey, setScreenshotModalKey] = useState<KeyItem | null>(null);
  const [dashboardReseller, setDashboardReseller] = useState<UserItem | null>(null);

  useEffect(() => {
    const savedToken = localStorage.getItem('axios_token');
    const savedUser = localStorage.getItem('axios_user');
    if (savedToken && savedUser) {
      setToken(savedToken);
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        setUser(null);
      }
    } else {
      setToken(null);
      setUser(null);
    }
  }, []);

  const loadData = async () => {
    setIsRefreshing(true);
    try {
      const conn = await checkBackendConnection();
      setIsConnected(conn.isConnected);
      if (conn.url) {
        setBackendUrl(conn.url.replace(/^https?:\/\//, ''));
      }

      const keysRes = await fetchAllKeys(token || undefined);
      const usersRes = await fetchAllUsers(token || undefined);

      if (keysRes.isAuthError || usersRes.isAuthError) {
        handleLogout();
        return;
      }

      setKeys(keysRes.keys || []);
      setUsersList(usersRes.users || []);

      // Synchronize logged-in user tokens if reseller
      if (user && user.role === 'reseller') {
        const matchingUser = usersRes.users?.find((u) => u.username === user.username);
        if (matchingUser) {
          setUser(matchingUser);
          localStorage.setItem('axios_user', JSON.stringify(matchingUser));
        }
      }
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (token) {
      loadData();
    }
  }, [token]);

  // Real-Time Token Cost Calculator Logic
  const calculatedCostPerKey = useMemo(() => {
    if (durationOption === '1 Day') return 10;
    if (durationOption === '7 Days') return 70;
    if (durationOption === '30 Days') return 250;
    if (durationOption === 'Lifetime') return 300;
    if (durationOption === 'Custom') {
      const parsed = parseInt(customDays, 10);
      const days = isNaN(parsed) || parsed < 1 ? 1 : parsed;
      return days * 10;
    }
    return 70;
  }, [durationOption, customDays]);

  const totalEstimatedCost = useMemo(() => {
    return calculatedCostPerKey * genCount;
  }, [calculatedCostPerKey, genCount]);

  const isUnlimited = user?.role === 'owner' || user?.role === 'manager';
  const currentResellerTokens = user?.tokens ?? 0;
  const isInsufficientTokens = !isUnlimited && currentResellerTokens < totalEstimatedCost;
  const neededMoreTokens = Math.max(0, totalEstimatedCost - currentResellerTokens);

  // Clipboard Helper
  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKeyId(id);
    setTimeout(() => setCopiedKeyId(null), 2000);
  };

  // Drag & Drop Image Uploader
  const processImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file (PNG or JPG).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('File size exceeds 5MB limit.');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setPaymentScreenshot(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleScreenshotUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processImageFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processImageFile(file);
  };

  // Auth Handlers
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || 'Login failed');

      if (data.require2FA) {
        setPending2FAUser(data);
        setShow2FA(true);
      } else {
        setToken(data.token);
        setUser(data.user);
        localStorage.setItem('axios_token', data.token);
        localStorage.setItem('axios_user', JSON.stringify(data.user));
      }
    } catch (err: any) {
      setLoginError(err.message || 'Authentication error');
    }
  };

  const handleVerify2FA = async (pin: string) => {
    setPinError('');
    try {
      const res = await fetch(`${API_BASE}/auth/verify-2fa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: pending2FAUser.userId, pin })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Invalid 2FA PIN');

      setShow2FA(false);
      setToken(data.token);
      setUser(data.user);
      localStorage.setItem('axios_token', data.token);
      localStorage.setItem('axios_user', JSON.stringify(data.user));
    } catch (err: any) {
      setPinError(err.message);
    }
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('axios_token');
    localStorage.removeItem('axios_user');
  };

  // Key Generation Handler
  const handleGenerateKeys = async () => {
    if (isInsufficientTokens) return;
    setIsGenerating(true);
    try {
      const targetDurationStr = durationOption === 'Custom' ? `${customDays} Days` : durationOption;
      const res = await generateKeysApi(
        targetDurationStr,
        genCount,
        genNote,
        paymentScreenshot,
        isMasterKey,
        token || undefined,
        user
      );

      setGenSuccessKeys(res.generatedStrings || []);
      loadData();
      setGenNote('');
      setPaymentScreenshot(null);
    } catch (err) {
      console.error('Error generating keys:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleResetHwid = async (id: string) => {
    if (!confirm('Are you sure you want to reset HWID for this key?')) return;
    await resetHwidApi(id, token || undefined);
    loadData();
  };

  const handleDeleteKey = async (id: string) => {
    if (!confirm('Are you sure you want to revoke/delete this license key?')) return;
    await deleteKeyApi(id, token || undefined);
    loadData();
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newUserObj: UserItem = {
        id: `u-${Date.now()}`,
        username: newUserUsername,
        role: newUserRole,
        tokens: newUserTokens,
        isBlocked: 0,
        createdAt: new Date().toISOString(),
        createdBy: user?.username || 'OwnerAdmin',
      };
      setUsersList([newUserObj, ...usersList]);
      setNewUserUsername('');
      setNewUserPassword('');
      setNewUserPin('');
      setNewUserTokens(100);
      alert(`User "${newUserUsername}" successfully created!`);
    } catch (err) {
      console.error('Error creating reseller:', err);
    }
  };

  const handleUpdateUserTokens = async (userId: string, newTokenBalance: number) => {
    await updateUserTokensApi(userId, newTokenBalance, token || undefined);
    loadData();
  };

  // License Keys Filtering (including Master Key filter)
  const filteredKeys = useMemo(() => {
    return keys.filter(k => {
      const query = searchQuery.toLowerCase();
      const matchesSearch = 
        k.key.toLowerCase().includes(query) ||
        (k.createdByUsername && k.createdByUsername.toLowerCase().includes(query)) ||
        (k.note && k.note.toLowerCase().includes(query)) ||
        (k.hwid && k.hwid.toLowerCase().includes(query));

      let matchesStatus = true;
      if (statusFilter === 'active') matchesStatus = k.status === 'active';
      else if (statusFilter === 'expired') matchesStatus = k.status === 'expired';
      else if (statusFilter === 'revoked') matchesStatus = k.status === 'revoked';
      else if (statusFilter === 'master') matchesStatus = Boolean(k.isMasterKey);

      return matchesSearch && matchesStatus;
    });
  }, [keys, searchQuery, statusFilter]);

  // Reseller User Filtering
  const filteredUsers = useMemo(() => {
    return usersList.filter(u => {
      const query = userSearchQuery.toLowerCase();
      return (
        u.username.toLowerCase().includes(query) ||
        u.role.toLowerCase().includes(query) ||
        (u.createdBy && u.createdBy.toLowerCase().includes(query))
      );
    });
  }, [usersList, userSearchQuery]);

  // Executive Metric Calculations
  const totalRevenueTokens = useMemo(() => {
    return keys.reduce((sum, k) => sum + (k.costTokens || 0), 0);
  }, [keys]);

  const activeKeysCount = useMemo(() => keys.filter(k => k.status === 'active').length, [keys]);
  const expiredKeysCount = useMemo(() => keys.filter(k => k.status === 'expired').length, [keys]);
  const boundDevicesCount = useMemo(() => keys.filter(k => k.hwid && k.hwid.trim() !== '').length, [keys]);
  const totalResellersCount = useMemo(() => usersList.filter(u => u.role === 'reseller').length, [usersList]);

  // LOGIN SCREEN FOR UNAUTHENTICATED USERS
  if (!token || !user) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden font-sans">
        {/* Animated Neon Ambient Background Orbs */}
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-purple-600/15 rounded-full blur-[140px] pointer-events-none animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-cyan-600/15 rounded-full blur-[140px] pointer-events-none animate-pulse"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-amber-500/10 rounded-full blur-[100px] pointer-events-none"></div>

        <div className="relative w-full max-w-md glass-card rounded-3xl p-8 sm:p-10 shadow-2xl border border-purple-500/30 glow-purple">
          {/* Logo Badge */}
          <div className="relative w-20 h-20 mx-auto mb-5">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-500 to-cyan-400 blur-md opacity-70 animate-pulse"></div>
            <div className="relative w-full h-full rounded-2xl bg-slate-950 border border-purple-500/50 flex items-center justify-center text-purple-300 shadow-2xl">
              <ShieldCheck className="w-10 h-10 text-cyan-400" />
            </div>
          </div>

          <h2 className="text-3xl font-extrabold text-center text-white tracking-tight">AXIOS EXECUTIVE</h2>
          <p className="text-xs text-center text-purple-300/80 mt-1 mb-8 uppercase font-mono tracking-widest flex items-center justify-center space-x-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 inline" />
            <span>ENTERPRISE SAAS CONTROL CENTER</span>
          </p>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5 uppercase tracking-wider font-mono">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl px-4 py-3 text-white text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition font-mono"
                placeholder="Enter executive account username..."
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5 uppercase tracking-wider font-mono">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl px-4 py-3 text-white text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition font-mono"
                placeholder="Enter password..."
                required
              />
            </div>

            {loginError && (
              <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-500/50 text-rose-200 text-xs font-semibold text-center flex items-center justify-center space-x-2 font-mono">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <span>{loginError}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-glow-purple active:scale-98 text-sm uppercase tracking-wider flex items-center justify-center space-x-2 font-mono"
            >
              <span>Sign In to Executive Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <DialPad2FA
            isOpen={show2FA}
            username={pending2FAUser?.username || ''}
            role={pending2FAUser?.role || ''}
            onVerify={handleVerify2FA}
            onCancel={() => setShow2FA(false)}
            errorMsg={pinError}
          />
        </div>
      </div>
    );
  }

  // MAIN DASHBOARD LAYOUT
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-16 selection:bg-purple-500 selection:text-white">
      {/* 1. TOP NAVIGATION HEADER */}
      <header className="border-b border-purple-900/40 bg-slate-950/90 backdrop-blur-2xl sticky top-0 z-40 shadow-2xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between gap-4">
          
          {/* Logo & Glowing Neon Emblem */}
          <div className="flex items-center space-x-3.5">
            <div className="relative group">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-cyan-500 via-purple-500 to-amber-500 blur-md opacity-75 group-hover:opacity-100 transition duration-300 animate-pulse"></div>
              <div className="relative w-11 h-11 rounded-2xl bg-slate-950 border border-purple-500/50 flex items-center justify-center text-cyan-400 shadow-glow-cyan">
                <Zap className="w-6 h-6 animate-pulse" />
              </div>
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-wider text-white flex items-center gap-2 font-mono">
                <span className="text-gradient-cyan">AXIOS</span>
                <span className="text-gradient-purple">EXECUTIVE</span>
                <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] bg-purple-950 text-purple-300 border border-purple-500/40 rounded-md uppercase font-mono tracking-widest">
                  v2.0 SAAS
                </span>
              </h1>
              <p className="text-[11px] text-slate-400 font-mono hidden md:block">
                Hardware Licensing & Token Economy Control Panel
              </p>
            </div>
          </div>

          {/* Right Header Navigation Badges */}
          <div className="flex items-center space-x-3">
            
            {/* Live Backend Connection Badge */}
            <div className="hidden lg:flex items-center space-x-2 bg-slate-900/90 border border-slate-800 px-3.5 py-1.5 rounded-xl font-mono text-xs shadow-inner">
              <span className="relative flex h-2.5 w-2.5">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isConnected ? 'bg-emerald-400' : 'bg-rose-400'}`}></span>
                <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isConnected ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
              </span>
              <span className="text-slate-400 hidden xl:inline">Live Sync:</span>
              <span className="text-cyan-300 font-bold tracking-wider">{backendUrl}</span>
            </div>

            {/* Token Balance Pill */}
            <div className={`flex items-center space-x-2 px-4 py-1.5 rounded-xl border transition-all duration-300 ${
              isUnlimited 
                ? 'bg-slate-900/90 border-emerald-500/50 text-emerald-300 glow-emerald' 
                : isInsufficientTokens
                ? 'bg-rose-950/80 border-rose-500/60 text-rose-300 glow-red'
                : 'bg-slate-900/90 border-amber-500/50 text-amber-300 glow-amber'
            }`}>
              <Coins className={`w-4 h-4 ${isUnlimited ? 'text-emerald-400' : 'text-amber-400 animate-bounce'}`} />
              <div className="text-xs font-mono">
                <span className="text-slate-400 mr-1.5 hidden sm:inline">Balance:</span>
                <span className="font-extrabold tracking-wide">
                  {isUnlimited ? '∞ Infinite' : `${currentResellerTokens} Tokens`}
                </span>
              </div>
            </div>

            {/* User Profile Badge */}
            <div className="flex items-center space-x-2 bg-slate-900/90 border border-purple-500/30 px-3.5 py-1.5 rounded-xl text-xs font-mono shadow-md">
              <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white text-[11px] font-bold">
                {user.username.slice(0, 1).toUpperCase()}
              </div>
              <span className="text-slate-200 font-bold hidden sm:inline">{user.username}</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest ${
                user.role === 'owner' 
                  ? 'bg-purple-950 text-purple-300 border border-purple-600/40' 
                  : user.role === 'manager' 
                  ? 'bg-indigo-950 text-indigo-300 border border-indigo-600/40' 
                  : 'bg-amber-950 text-amber-300 border border-amber-600/40'
              }`}>
                {user.role}
              </span>
            </div>

            {/* Refresh Button */}
            <button
              onClick={() => loadData()}
              disabled={isRefreshing}
              className="p-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-700/80 rounded-xl text-slate-300 transition hover:border-purple-500 active:scale-95"
              title="Refresh Dashboard Data"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-purple-400' : ''}`} />
            </button>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="flex items-center space-x-1.5 text-xs bg-rose-950/40 hover:bg-rose-900/70 text-rose-300 border border-rose-800/40 px-3.5 py-2 rounded-xl transition font-mono hover:shadow-[0_0_15px_rgba(244,63,94,0.3)] active:scale-95"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* DASHBOARD CONTENT BODY */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-8">
        
        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8 border-b border-slate-800/80 pb-4">
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setActiveTab('keys')}
              className={`flex items-center space-x-2 px-6 py-3 rounded-2xl font-bold text-sm transition-all font-mono ${
                activeTab === 'keys'
                  ? 'bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-600 text-white shadow-glow-purple border border-purple-400/40'
                  : 'glass-card text-slate-400 hover:text-white hover:border-purple-500/30'
              }`}
            >
              <Key className="w-4 h-4 text-purple-300" />
              <span>Key Generator & Licenses</span>
            </button>

            {(user.role === 'owner' || user.role === 'manager') && (
              <button
                onClick={() => setActiveTab('users')}
                className={`flex items-center space-x-2 px-6 py-3 rounded-2xl font-bold text-sm transition-all font-mono ${
                  activeTab === 'users'
                    ? 'bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-600 text-white shadow-glow-purple border border-purple-400/40'
                    : 'glass-card text-slate-400 hover:text-white hover:border-purple-500/30'
                }`}
              >
                <Users className="w-4 h-4 text-cyan-300" />
                <span>Reseller Network ({usersList.length})</span>
              </button>
            )}

            <button
              onClick={() => setActiveTab('analytics')}
              className={`flex items-center space-x-2 px-6 py-3 rounded-2xl font-bold text-sm transition-all font-mono ${
                activeTab === 'analytics'
                  ? 'bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-600 text-white shadow-glow-purple border border-purple-400/40'
                  : 'glass-card text-slate-400 hover:text-white hover:border-purple-500/30'
              }`}
            >
              <BarChart3 className="w-4 h-4 text-amber-300" />
              <span>Executive Analytics</span>
            </button>
          </div>

          {/* Active Status Info pill */}
          <div className="hidden lg:flex items-center space-x-2 text-xs font-mono text-slate-400 bg-slate-900/60 border border-slate-800 rounded-xl px-3.5 py-2">
            <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span>Total Issued: <strong className="text-white">{keys.length} Keys</strong></span>
            <span>•</span>
            <span>Active: <strong className="text-emerald-400">{activeKeysCount}</strong></span>
          </div>
        </div>

        {/* TAB 1: KEYS GENERATOR & LICENSE MANAGEMENT */}
        {activeTab === 'keys' && (
          <div className="space-y-8">
            
            {/* 2. ISSUE LICENSE PASS CARD */}
            <div className="glass-card rounded-2xl p-6 sm:p-7 border border-slate-800/80 bg-slate-950/60 shadow-xl relative overflow-hidden">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-5 border-b border-slate-800/70">
                <div>
                  <h3 className="text-xl font-bold text-white tracking-tight">Issue License Pass</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Select duration, quantity, and reference details to generate hardware license passes.
                  </p>
                </div>

                <div className="flex items-center space-x-2 bg-slate-900/80 border border-slate-800 px-3 py-1.5 rounded-xl text-xs text-slate-300 self-start sm:self-auto font-mono">
                  <Coins className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-slate-400">Rate:</span>
                  <span className="text-amber-300 font-semibold">{calculatedCostPerKey} Tokens/key</span>
                </div>
              </div>

              {/* Form Fields Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
                
                {/* Duration Selector */}
                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-2 flex items-center space-x-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>License Duration</span>
                  </label>
                  <div className="relative">
                    <select
                      value={durationOption}
                      onChange={(e) => setDurationOption(e.target.value)}
                      className="w-full appearance-none bg-slate-900/90 border border-slate-800 rounded-xl px-4 py-3 pr-10 text-sm text-white focus:outline-none focus:border-violet-500/80 focus:ring-1 focus:ring-violet-500/40 transition cursor-pointer font-mono"
                    >
                      <option value="1 Day">1 Day Pass (10 Tokens)</option>
                      <option value="7 Days">7 Days Pass (70 Tokens)</option>
                      <option value="30 Days">30 Days Pass (250 Tokens)</option>
                      <option value="Lifetime">Lifetime Pass (300 Tokens)</option>
                      <option value="Custom">Custom Days (10 Tokens/day)</option>
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>

                  {durationOption === 'Custom' && (
                    <div className="mt-2.5">
                      <input
                        type="number"
                        min="1"
                        max="3650"
                        value={customDays}
                        onChange={(e) => setCustomDays(e.target.value)}
                        placeholder="Number of days..."
                        className="w-full bg-slate-900/90 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-violet-500/80 transition font-mono"
                      />
                    </div>
                  )}
                </div>

                {/* Multi-Key Quantity */}
                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-2 flex items-center space-x-1.5">
                    <Layers className="w-3.5 h-3.5 text-slate-400" />
                    <span>Quantity</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={genCount}
                    onChange={(e) => setGenCount(Math.max(1, Math.min(50, parseInt(e.target.value) || 1)))}
                    className="w-full bg-slate-900/90 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-violet-500/80 focus:ring-1 focus:ring-violet-500/40 transition font-mono"
                  />

                  {/* Preset Chips */}
                  <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
                    {[1, 5, 10, 25, 50].map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => setGenCount(q)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium transition border ${
                          genCount === q
                            ? 'bg-violet-600 border-violet-500 text-white shadow-sm'
                            : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                        }`}
                      >
                        {q}x
                      </button>
                    ))}
                  </div>

                  {/* Master Key Option */}
                  {isUnlimited && (
                    <label className="flex items-center space-x-2 text-xs text-amber-300 font-medium mt-3 cursor-pointer bg-amber-950/20 border border-amber-800/30 p-2 rounded-xl hover:bg-amber-950/40 transition">
                      <input
                        type="checkbox"
                        checked={isMasterKey}
                        onChange={(e) => setIsMasterKey(e.target.checked)}
                        className="rounded border-amber-600/60 bg-slate-900 text-amber-500 w-4 h-4 focus:ring-amber-500"
                      />
                      <span>Master Key (Unlimited Devices)</span>
                    </label>
                  )}
                </div>

                {/* Customer Note / Tag */}
                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-2 flex items-center space-x-1.5">
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    <span>Customer Note / Tag</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. John Doe / Order #1042"
                    value={genNote}
                    onChange={(e) => setGenNote(e.target.value)}
                    className="w-full bg-slate-900/90 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/80 focus:ring-1 focus:ring-violet-500/40 transition font-mono"
                  />
                  <p className="text-[11px] text-slate-500 mt-2">
                    Optional reference tag stored with issued key.
                  </p>
                </div>
              </div>

              {/* Drag & Drop Screenshot Uploader */}
              <div className="mb-6">
                <label className="text-xs font-medium text-slate-300 block mb-2 flex items-center space-x-2">
                  <ImageIcon className="w-3.5 h-3.5 text-slate-400" />
                  <span>Payment Screenshot</span>
                </label>

                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`relative cursor-pointer rounded-xl p-4 border border-dashed transition-all ${
                    isDragging
                      ? 'border-violet-400 bg-violet-950/20'
                      : paymentScreenshot
                      ? 'border-emerald-500/40 bg-slate-900/60'
                      : 'border-slate-800 bg-slate-900/40 hover:border-slate-700 hover:bg-slate-900/70'
                  }`}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleScreenshotUpload}
                    className="hidden"
                  />

                  {!paymentScreenshot ? (
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center space-x-3">
                        <div className="p-2.5 rounded-lg bg-slate-800/80 text-slate-400 border border-slate-700/50">
                          <Upload className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-slate-200">
                            Drop payment receipt here or <span className="text-violet-400 underline">browse file</span>
                          </p>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Supports PNG, JPG up to 5MB
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="flex items-center justify-between gap-3"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center space-x-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={paymentScreenshot}
                          alt="Payment Receipt Preview"
                          className="w-11 h-11 object-cover rounded-lg border border-slate-700/80 flex-shrink-0"
                        />
                        <div>
                          <span className="text-xs font-medium text-emerald-400 block">Payment Receipt Attached</span>
                          <span className="text-[11px] text-slate-500">Included with license record</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPaymentScreenshot(null)}
                        className="p-2 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-rose-950/40 transition"
                        title="Remove image"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Real-Time Token Calculation Summary */}
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm font-mono">
                <div className="flex items-center space-x-2 text-slate-300">
                  <span className="text-xs text-slate-400 uppercase tracking-wider">Calculation:</span>
                  <span className="text-slate-400 text-xs">
                    {genCount} × {calculatedCostPerKey} =
                  </span>
                  <span className="font-bold text-amber-400 text-base">
                    {totalEstimatedCost} Tokens
                  </span>
                </div>

                {!isUnlimited && (
                  <div className="text-xs text-slate-400 flex items-center space-x-2">
                    <span>Balance:</span>
                    <span className={`font-bold ${isInsufficientTokens ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {currentResellerTokens} Tokens
                    </span>
                  </div>
                )}
              </div>

              {/* Insufficient Token Warning Banner */}
              {isInsufficientTokens && (
                <div className="mb-6 bg-rose-950/30 border border-rose-900/50 rounded-xl p-4 text-rose-200 flex items-start space-x-3 text-xs">
                  <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold block text-rose-300 text-sm">Insufficient Token Balance</span>
                    <p className="text-slate-300 mt-1">
                      You have <span className="font-bold text-white">{currentResellerTokens} tokens</span>, but this request requires <span className="font-bold text-white">{totalEstimatedCost} tokens</span>. Please request <span className="font-bold text-amber-300">{neededMoreTokens} more tokens</span> from your Manager or Owner.
                    </p>
                  </div>
                </div>
              )}

              {/* Action Button */}
              <button
                onClick={handleGenerateKeys}
                disabled={isGenerating || isInsufficientTokens}
                className={`w-full py-3.5 rounded-xl font-medium transition-all shadow-sm active:scale-[0.99] flex items-center justify-center space-x-2 text-sm ${
                  isInsufficientTokens
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/60'
                    : isMasterKey
                    ? 'bg-amber-600 hover:bg-amber-500 text-slate-950 font-semibold'
                    : 'bg-violet-600 hover:bg-violet-500 text-white'
                }`}
              >
                {isGenerating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                <span>
                  {isGenerating
                    ? 'Generating License Keys...'
                    : isInsufficientTokens
                    ? 'Insufficient Tokens'
                    : isMasterKey
                    ? `Issue ${genCount} Master Key(s)`
                    : `Issue ${genCount} License Key${genCount > 1 ? 's' : ''} (${totalEstimatedCost} Tokens)`}
                </span>
              </button>

              {/* Generated Results */}
              {genSuccessKeys.length > 0 && (
                <div className="mt-6 pt-5 border-t border-slate-800/80">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <span className="text-xs font-semibold text-emerald-400 flex items-center space-x-1.5">
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                      <span>Issued {genSuccessKeys.length} License Key{genSuccessKeys.length > 1 ? 's' : ''}</span>
                    </span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(genSuccessKeys.join('\n'));
                        alert('All generated keys copied to clipboard!');
                      }}
                      className="text-xs text-slate-300 hover:text-white flex items-center space-x-1 bg-slate-900 hover:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-800 transition font-mono"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy All</span>
                    </button>
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {genSuccessKeys.map((k, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between bg-slate-900/80 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-mono text-violet-200"
                      >
                        <span className="font-semibold text-white select-all">{k}</span>
                        <button
                          onClick={() => copyToClipboard(k, `gen-${i}`)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                        >
                          {copiedKeyId === `gen-${i}` ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 3. LICENSE KEYS MANAGEMENT TABLE SECTION */}
            <div className="glass-card rounded-3xl p-6 sm:p-8 border border-slate-800">
              
              {/* Header & Filter Controls */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
                <div>
                  <h3 className="text-xl font-bold text-white font-mono flex items-center space-x-2">
                    <Key className="w-5 h-5 text-purple-400" />
                    <span>License Keys Management</span>
                  </h3>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">Filter, verify hardware bindings, and inspect payment receipts</p>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3">
                  {/* Search Bar */}
                  <div className="relative w-full sm:w-80">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      placeholder="Search key, reseller, HWID, note..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white outline-none focus:border-purple-500 font-mono"
                    />
                  </div>

                  {/* Status Filter Pills (All, Active, Expired, Revoked, Master) */}
                  <div className="flex rounded-xl bg-slate-900 p-1 border border-slate-800 w-full sm:w-auto font-mono text-xs overflow-x-auto">
                    {[
                      { id: 'all', label: 'All' },
                      { id: 'active', label: 'Active' },
                      { id: 'expired', label: 'Expired' },
                      { id: 'revoked', label: 'Revoked' },
                      { id: 'master', label: 'Master' },
                    ].map((pill) => (
                      <button
                        key={pill.id}
                        onClick={() => setStatusFilter(pill.id)}
                        className={`px-3 py-1.5 rounded-lg font-semibold transition whitespace-nowrap ${
                          statusFilter === pill.id
                            ? 'bg-purple-600 text-white shadow-glow-purple'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {pill.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto rounded-2xl border border-slate-800/80">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider font-mono border-b border-slate-800">
                    <tr>
                      <th className="p-4">License Key</th>
                      <th className="p-4">Duration & Expiry Date/Time</th>
                      <th className="p-4">Cost Tokens</th>
                      <th className="p-4">Payment Receipt</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Bound HWID</th>
                      <th className="p-4">Created By</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
                    {filteredKeys.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-12 text-center text-slate-500 font-sans">
                          <AlertCircle className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                          <p className="text-sm font-semibold text-slate-400">No license keys match your search or filter criteria.</p>
                        </td>
                      </tr>
                    ) : (
                      filteredKeys.map((k) => (
                        <tr key={k.id} className="hover:bg-slate-800/40 transition">
                          
                          {/* License Key */}
                          <td className="p-4 font-bold text-purple-300 flex items-center space-x-2">
                            <span className="truncate max-w-[200px]">{k.key}</span>
                            {(k.isMasterKey === 1 || k.isMasterKey === true) && (
                              <span className="px-2 py-0.5 rounded text-[9px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase tracking-wider">
                                MASTER
                              </span>
                            )}
                            <button
                              onClick={() => copyToClipboard(k.key, k.id)}
                              className="text-slate-500 hover:text-purple-300 transition p-1"
                              title="Copy Key String"
                            >
                              {copiedKeyId === k.id ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </td>

                          {/* Duration & Expiry */}
                          <td className="p-4">
                            <span className="text-slate-200 font-bold block">{k.duration || 'Custom'}</span>
                            {!k.expiresAt || k.expiresAt === 'never' ? (
                              <span className="text-[10px] text-emerald-400 font-semibold flex items-center space-x-1 mt-0.5">
                                <Clock className="w-3 h-3 text-emerald-400" />
                                <span>Never Expires</span>
                              </span>
                            ) : (
                              <span className="text-[10px] text-cyan-300/80 block mt-0.5 font-mono">
                                Exp: {new Date(k.expiresAt).toLocaleString()}
                              </span>
                            )}
                          </td>

                          {/* Cost Tokens */}
                          <td className="p-4 font-bold text-amber-400">
                            <span className="px-2.5 py-1 rounded-lg bg-amber-950/40 border border-amber-500/30 text-amber-300">
                              {k.costTokens || 0} Tokens
                            </span>
                          </td>

                          {/* Payment Receipt Badge */}
                          <td className="p-4">
                            {k.paymentScreenshot ? (
                              <button
                                onClick={() => setScreenshotModalKey(k)}
                                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl badge-cyan hover:scale-105 transition font-mono text-xs"
                              >
                                <ImageIcon className="w-3.5 h-3.5 text-cyan-300" />
                                <span>Receipt Attached</span>
                              </button>
                            ) : (
                              <span className="text-slate-600 font-mono italic text-[11px]">No Receipt</span>
                            )}
                          </td>

                          {/* Status Badge */}
                          <td className="p-4">
                            <span className={`px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                              k.status === 'active' 
                                ? 'badge-emerald' 
                                : k.status === 'expired' 
                                ? 'badge-amber' 
                                : 'badge-rose'
                            }`}>
                              {k.status}
                            </span>
                          </td>

                          {/* Bound HWID */}
                          <td className="p-4 text-slate-400">
                            {(k.isMasterKey === 1 || k.isMasterKey === true) ? (
                              <span className="text-amber-400 font-bold bg-amber-950/40 border border-amber-700/50 px-2 py-0.5 rounded text-[11px]">
                                ⚡ Unlimited
                              </span>
                            ) : k.hwid ? (
                              <span className="text-cyan-300 font-mono truncate max-w-[120px] block" title={k.hwid}>
                                {k.hwid}
                              </span>
                            ) : (
                              <span className="text-slate-600 italic">Unbound</span>
                            )}
                          </td>

                          {/* Created By */}
                          <td className="p-4 text-white font-semibold">{k.createdByUsername || 'System'}</td>

                          {/* Actions */}
                          <td className="p-4 text-right space-x-2">
                            {k.hwid && (
                              <button
                                onClick={() => handleResetHwid(k.id)}
                                className="px-3 py-1.5 text-xs bg-amber-950/50 hover:bg-amber-900/80 text-amber-300 border border-amber-800/50 rounded-xl transition"
                                title="Reset Hardware ID Binding"
                              >
                                Reset HWID
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteKey(k.id)}
                              className="px-3 py-1.5 text-xs bg-rose-950/50 hover:bg-rose-900/80 text-rose-400 border border-rose-800/50 rounded-xl transition"
                              title="Revoke and Delete Key"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: RESELLER / USER MANAGEMENT SECTION */}
        {activeTab === 'users' && (user.role === 'owner' || user.role === 'manager') && (
          <div className="space-y-8">
            
            {/* Create Staff / Reseller Account Form Card */}
            <div className="glass-card rounded-3xl p-6 sm:p-8 border border-purple-500/30 glow-purple">
              <h3 className="text-xl font-bold text-white mb-5 flex items-center space-x-2 font-mono">
                <UserPlus className="w-5 h-5 text-purple-400" />
                <span>Create New Staff / Reseller Account</span>
              </h3>
              
              <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5 font-mono">Username</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter account name..."
                    value={newUserUsername}
                    onChange={(e) => setNewUserUsername(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5 font-mono">Password</label>
                  <input
                    type="password"
                    required
                    placeholder="Enter password..."
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5 font-mono">Account Role</label>
                  <select
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono outline-none focus:border-purple-500"
                  >
                    <option value="reseller">Reseller</option>
                    {user.role === 'owner' && <option value="manager">Manager</option>}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5 font-mono">Initial Tokens</label>
                  <input
                    type="number"
                    min="0"
                    value={newUserTokens}
                    onChange={(e) => setNewUserTokens(parseInt(e.target.value, 10) || 0)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono outline-none focus:border-purple-500"
                  />
                </div>

                <div className="flex items-end">
                  <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold py-2.5 rounded-xl transition shadow-glow-purple font-mono text-sm"
                  >
                    Add Reseller
                  </button>
                </div>
              </form>
            </div>

            {/* Resellers Accounts Table */}
            <div className="glass-card rounded-3xl p-6 sm:p-8 border border-slate-800">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h3 className="text-xl font-bold text-white font-mono flex items-center space-x-2">
                    <Users className="w-5 h-5 text-cyan-400" />
                    <span>Reseller Network Accounts</span>
                  </h3>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">Click any reseller row to open Deep Dive Dashboard</p>
                </div>

                {/* Reseller Search */}
                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    placeholder="Search reseller username/role..."
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2 text-xs text-white font-mono outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-800">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider font-mono border-b border-slate-800">
                    <tr>
                      <th className="p-4">Username</th>
                      <th className="p-4">Role</th>
                      <th className="p-4">Creator Info</th>
                      <th className="p-4">Tokens Balance Pill</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
                    {filteredUsers.map((u) => (
                      <tr
                        key={u.id}
                        onClick={() => setDashboardReseller(u)}
                        className="hover:bg-purple-950/20 transition cursor-pointer group"
                      >
                        <td className="p-4 font-bold text-white group-hover:text-purple-300 transition flex items-center space-x-2">
                          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-600 to-cyan-600 flex items-center justify-center text-white text-xs font-bold">
                            {u.username.slice(0, 1).toUpperCase()}
                          </div>
                          <span>{u.username}</span>
                        </td>

                        <td className="p-4 font-bold uppercase">
                          <span className={`px-2.5 py-1 rounded-md text-[10px] ${
                            u.role === 'owner'
                              ? 'bg-purple-950 text-purple-300 border border-purple-600/40'
                              : u.role === 'manager'
                              ? 'bg-indigo-950 text-indigo-300 border border-indigo-600/40'
                              : 'bg-slate-900 text-slate-300 border border-slate-700'
                          }`}>
                            {u.role}
                          </span>
                        </td>

                        <td className="p-4 text-slate-400">{u.createdBy || 'OwnerAdmin'}</td>

                        {/* Tokens balance pill */}
                        <td className="p-4">
                          <span className="px-3 py-1 rounded-xl bg-amber-950/50 text-amber-300 border border-amber-500/40 font-bold glow-amber">
                            {u.tokens ?? 0} Tokens
                          </span>
                        </td>

                        <td className="p-4">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-bold ${
                            u.isBlocked === 1 ? 'badge-rose' : 'badge-emerald'
                          }`}>
                            {u.isBlocked === 1 ? 'BLOCKED' : 'ACTIVE'}
                          </span>
                        </td>

                        <td
                          className="p-4 text-right"
                          onClick={(e) => e.stopPropagation()} // Prevent row click when clicking action button
                        >
                          <button
                            onClick={() => setTokenModalUser(u)}
                            className="px-3.5 py-1.5 text-xs bg-amber-950/60 hover:bg-amber-900/80 text-amber-300 border border-amber-600/60 rounded-xl font-bold transition flex-inline items-center space-x-1.5 shadow-md"
                          >
                            <Coins className="w-3.5 h-3.5 inline mr-1 text-amber-400" />
                            <span>Manage Tokens (+/-)</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: EXECUTIVE STATS & SALES GRAPH SECTION */}
        {activeTab === 'analytics' && (
          <div className="space-y-8">
            
            {/* KPI Executive Stat Cards Component */}
            <StatsOverview
              totalKeys={keys.length}
              activeKeys={activeKeysCount}
              totalResellers={totalResellersCount}
              totalRevenueTokens={totalRevenueTokens}
            />

            {/* Embedded SalesChart Component */}
            <SalesChart totalRevenue={totalRevenueTokens} totalKeysSold={keys.length} />
          </div>
        )}
      </main>

      {/* MODALS */}
      <TokenBalanceModal
        isOpen={!!tokenModalUser}
        reseller={tokenModalUser}
        onClose={() => setTokenModalUser(null)}
        onUpdateTokens={handleUpdateUserTokens}
      />

      <PaymentScreenshotModal
        isOpen={!!screenshotModalKey}
        keyItem={screenshotModalKey}
        onClose={() => setScreenshotModalKey(null)}
      />

      <ResellerDashboardModal
        isOpen={!!dashboardReseller}
        reseller={dashboardReseller}
        keys={keys}
        onClose={() => setDashboardReseller(null)}
        onOpenManageTokens={(r) => setTokenModalUser(r)}
      />
    </div>
  );
}
