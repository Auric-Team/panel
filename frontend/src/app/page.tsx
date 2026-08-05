"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShieldCheck, Users, Key, BarChart3, Lock, LogOut, Search, Plus, Trash2, 
  RefreshCw, AlertTriangle, UserPlus, ShieldAlert, CheckCircle, Cpu, Zap, 
  Activity, ArrowUpRight, DollarSign, Filter, Layers, Copy, Check, Clock, UserCheck,
  Coins, Image as ImageIcon, ExternalLink, RotateCcw, AlertCircle, Sparkles, Upload
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
import { TokenBalanceModal } from '@/components/TokenBalanceModal';
import { PaymentScreenshotModal } from '@/components/PaymentScreenshotModal';
import { ResellerDashboardModal } from '@/components/ResellerDashboardModal';
import { DialPad2FA } from '@/components/DialPad2FA';

const API_BASE = '/api';

export default function App() {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserItem | null>(null);

  // Backend Connection
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [backendUrl, setBackendUrl] = useState<string>('http://103.207.181.125:20067');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Auth State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // 2FA Modal State
  const [show2FA, setShow2FA] = useState(false);
  const [pending2FAUser, setPending2FAUser] = useState<any>(null);
  const [pinError, setPinError] = useState('');

  // Main Dashboard State
  const [activeTab, setActiveTab] = useState<'keys' | 'users' | 'analytics'>('keys');
  const [keys, setKeys] = useState<KeyItem[]>([]);
  const [usersList, setUsersList] = useState<UserItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);

  // Key Gen State
  const [durationOption, setDurationOption] = useState<string>('7 Days');
  const [customDays, setCustomDays] = useState<string>('4');
  const [genCount, setGenCount] = useState<number>(1);
  const [genNote, setGenNote] = useState<string>('');
  const [isMasterKey, setIsMasterKey] = useState<boolean>(false);
  const [paymentScreenshot, setPaymentScreenshot] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [genSuccessKeys, setGenSuccessKeys] = useState<string[]>([]);

  // User Creation State
  const [newUserUsername, setNewUserUsername] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<'reseller' | 'manager'>('reseller');
  const [newUserPin, setNewUserPin] = useState('');
  const [newUserTokens, setNewUserTokens] = useState(100);

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
      setBackendUrl(conn.url || 'localhost:20067');

      const keysRes = await fetchAllKeys(token || undefined);
      const usersRes = await fetchAllUsers(token || undefined);

      if (keysRes.isAuthError || usersRes.isAuthError) {
        handleLogout();
        return;
      }

      setKeys(keysRes.keys);
      setUsersList(usersRes.users);

      // Keep active user tokens in sync if reseller
      if (user && user.role === 'reseller') {
        const matchingUser = usersRes.users.find((u) => u.username === user.username);
        if (matchingUser) {
          setUser(matchingUser);
          localStorage.setItem('axios_user', JSON.stringify(matchingUser));
        }
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (token) {
      loadData();
    }
  }, [token]);

  // Token Cost Calculation Logic
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
  const neededMoreTokens = totalEstimatedCost - currentResellerTokens;

  // Clipboard Helper
  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKeyId(id);
    setTimeout(() => setCopiedKeyId(null), 2000);
  };

  // Image Upload Reader
  const handleScreenshotUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
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

  // Key Generation
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

      setGenSuccessKeys(res.generatedStrings);
      loadData();
      setGenNote('');
      setPaymentScreenshot(null);
    } catch (err) {
      console.error(err);
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
    if (!confirm('Are you sure you want to delete/revoke this key?')) return;
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
      console.error(err);
    }
  };

  const handleUpdateUserTokens = async (userId: string, newTokenBalance: number) => {
    await updateUserTokensApi(userId, newTokenBalance, token || undefined);
    loadData();
  };

  // Filtering Keys
  const filteredKeys = useMemo(() => {
    return keys.filter(k => {
      const matchesSearch = 
        k.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (k.createdByUsername && k.createdByUsername.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (k.note && k.note.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (k.hwid && k.hwid.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus = statusFilter === 'all' || k.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [keys, searchQuery, statusFilter]);

  // Total Analytics
  const totalRevenueTokens = useMemo(() => {
    return keys.reduce((sum, k) => sum + (k.costTokens || 0), 0);
  }, [keys]);

  if (!token || !user) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl pointer-events-none animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-600/20 rounded-full blur-3xl pointer-events-none animate-pulse"></div>

        <div className="relative w-full max-w-md glass-card rounded-3xl p-8 shadow-2xl border border-purple-500/30 glow-purple">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-purple-500/10 border border-purple-500/40 flex items-center justify-center text-purple-400 shadow-glow-purple">
            <ShieldCheck className="w-10 h-10 animate-pulse" />
          </div>
          <h2 className="text-3xl font-extrabold text-center text-white tracking-tight">AXIOS EXECUTIVE</h2>
          <p className="text-xs text-center text-purple-300/80 mt-1 mb-8 uppercase font-mono tracking-widest">
            Hardware Authentication & Reseller Portal
          </p>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5 uppercase tracking-wider">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl px-4 py-3 text-white text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition"
                placeholder="Enter account username..."
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5 uppercase tracking-wider">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl px-4 py-3 text-white text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition"
                placeholder="Enter password..."
                required
              />
            </div>

            {loginError && <p className="text-red-400 text-xs font-semibold text-center animate-pulse">{loginError}</p>}

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-glow-purple active:scale-98"
            >
              Sign In to Dashboard
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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-16">
      {/* Top Header Bar */}
      <header className="border-b border-purple-900/40 bg-slate-950/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/40 flex items-center justify-center text-purple-400 shadow-glow-purple">
              <Zap className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-wider text-white flex items-center gap-2">
                <span className="text-gradient-purple">AXIOS PANEL</span> 
                <span className="px-2 py-0.5 text-[10px] bg-purple-950 text-purple-300 border border-purple-500/40 rounded-md uppercase font-mono tracking-widest">
                  {user.role}
                </span>
              </h1>
              <p className="text-[11px] text-slate-400 font-mono hidden sm:block">
                Security Engine & Token Economy v2.0
              </p>
            </div>
          </div>

          {/* User Info & Connection Status Badge */}
          <div className="flex items-center space-x-3">
            {/* Backend Connection Status Badge */}
            <div className="hidden lg:flex items-center space-x-2 bg-slate-900/90 border border-slate-800 px-3 py-1.5 rounded-xl font-mono text-xs">
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'}`} />
              <span className="text-slate-400">Backend:</span>
              <span className="text-cyan-300 font-bold">{backendUrl}</span>
            </div>

            {/* Token Balance Badge */}
            <div className="flex items-center space-x-2 bg-slate-900/90 border border-amber-500/40 px-3.5 py-1.5 rounded-xl glow-amber">
              <Coins className="w-4 h-4 text-amber-400 animate-bounce" />
              <div className="text-xs font-mono">
                <span className="text-slate-400 mr-1 hidden sm:inline">Balance:</span>
                <span className="text-amber-300 font-extrabold">
                  {isUnlimited ? '∞ Infinite' : `${user.tokens ?? 0} Tokens`}
                </span>
              </div>
            </div>

            {/* User Profile Info */}
            <div className="hidden sm:flex items-center space-x-2 bg-slate-900/90 border border-slate-800 px-3 py-1.5 rounded-xl text-xs font-mono">
              <UserCheck className="w-4 h-4 text-emerald-400" />
              <span className="text-slate-300 font-bold">{user.username}</span>
            </div>

            <button
              onClick={onRefresh => loadData()}
              disabled={isRefreshing}
              className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-xl text-slate-300 transition"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-purple-400' : ''}`} />
            </button>

            <button
              onClick={handleLogout}
              className="flex items-center space-x-1.5 text-xs bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-800/40 px-3 py-2 rounded-xl transition font-mono"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-8">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-3 mb-8 border-b border-slate-800/80 pb-4">
          <button
            onClick={() => setActiveTab('keys')}
            className={`flex items-center space-x-2 px-6 py-3 rounded-2xl font-bold text-sm transition-all ${
              activeTab === 'keys'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-glow-purple'
                : 'glass-card text-slate-400 hover:text-white'
            }`}
          >
            <Key className="w-4 h-4" />
            <span>Key Management</span>
          </button>

          {(user.role === 'owner' || user.role === 'manager') && (
            <button
              onClick={() => setActiveTab('users')}
              className={`flex items-center space-x-2 px-6 py-3 rounded-2xl font-bold text-sm transition-all ${
                activeTab === 'users'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-glow-purple'
                  : 'glass-card text-slate-400 hover:text-white'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Reseller Network</span>
            </button>
          )}

          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center space-x-2 px-6 py-3 rounded-2xl font-bold text-sm transition-all ${
              activeTab === 'analytics'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-glow-purple'
                : 'glass-card text-slate-400 hover:text-white'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Executive Analytics</span>
          </button>
        </div>

        {/* TAB 1: KEYS MANAGEMENT */}
        {activeTab === 'keys' && (
          <div className="space-y-8">
            {/* Key Creation Form Card */}
            <div className="glass-card rounded-3xl p-6 border border-purple-500/30 glow-purple">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                  <Plus className="w-5 h-5 text-purple-400" />
                  <span>Issue New License Keys</span>
                </h3>
                <span className="text-xs font-mono text-slate-400">
                  Tokens per key: <strong className="text-amber-400">{calculatedCostPerKey} Tokens</strong>
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
                {/* Duration Selector */}
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5 uppercase tracking-wider">
                    License Duration
                  </label>
                  <select
                    value={durationOption}
                    onChange={(e) => setDurationOption(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm text-white font-mono outline-none focus:border-purple-500"
                  >
                    <option value="1 Day">1 Day (10 Tokens)</option>
                    <option value="7 Days">7 Days (70 Tokens)</option>
                    <option value="30 Days">30 Days (250 Tokens)</option>
                    <option value="Lifetime">Lifetime Pass (300 Tokens)</option>
                    <option value="Custom">Custom Days (10 Tokens/day)</option>
                  </select>

                  {durationOption === 'Custom' && (
                    <div className="mt-2">
                      <label className="text-[11px] font-semibold text-purple-300 block mb-1">
                        Enter Custom Days Count:
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="3650"
                        value={customDays}
                        onChange={(e) => setCustomDays(e.target.value)}
                        placeholder="e.g. 4 days..."
                        className="w-full bg-slate-900 border border-purple-500/60 rounded-xl px-3.5 py-2 text-sm text-purple-100 font-mono outline-none"
                      />
                    </div>
                  )}
                </div>

                {/* Key Count Multiplier */}
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5 uppercase tracking-wider">
                    Quantity (Multi-Key)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={genCount}
                    onChange={(e) => setGenCount(Math.max(1, Math.min(50, parseInt(e.target.value) || 1)))}
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm text-white font-mono outline-none focus:border-purple-500"
                  />

                  {isUnlimited && (
                    <label className="flex items-center space-x-2 text-xs text-amber-300 font-bold mt-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isMasterKey}
                        onChange={(e) => setIsMasterKey(e.target.checked)}
                        className="rounded border-amber-600 bg-slate-900 text-amber-500 w-4 h-4 cursor-pointer"
                      />
                      <span>Master Key (Unlimited Devices)</span>
                    </label>
                  )}
                </div>

                {/* Customer Note / Tag */}
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5 uppercase tracking-wider">
                    Customer Note / Tag
                  </label>
                  <input
                    type="text"
                    placeholder="Customer name or reseller reference..."
                    value={genNote}
                    onChange={(e) => setGenNote(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              {/* Payment Screenshot Uploader */}
              <div className="mb-6 p-4 bg-slate-900/60 border border-slate-800 rounded-2xl">
                <label className="text-xs font-semibold text-slate-300 block mb-2 uppercase tracking-wider flex items-center space-x-2">
                  <ImageIcon className="w-4 h-4 text-cyan-400" />
                  <span>Optional Payment Screenshot Uploader</span>
                </label>

                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <label className="flex-1 w-full flex items-center justify-center space-x-2 bg-slate-950 hover:bg-slate-900 border border-dashed border-purple-500/40 rounded-xl p-3 cursor-pointer transition text-xs text-slate-300 hover:border-purple-400">
                    <Upload className="w-4 h-4 text-purple-400" />
                    <span>Click to Drag & Drop or Browse Screenshot (PNG/JPG)</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleScreenshotUpload}
                      className="hidden"
                    />
                  </label>

                  {paymentScreenshot && (
                    <div className="relative flex items-center space-x-3 bg-slate-950 border border-cyan-500/50 rounded-xl p-2 pr-4">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={paymentScreenshot}
                        alt="Preview"
                        className="w-10 h-10 object-cover rounded-lg border border-cyan-500/40"
                      />
                      <span className="text-xs text-cyan-300 font-mono font-bold">Screenshot Attached</span>
                      <button
                        type="button"
                        onClick={() => setPaymentScreenshot(null)}
                        className="text-slate-400 hover:text-rose-400 p-1"
                        title="Remove Screenshot"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Real-time Token Cost Estimator Preview Box */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <span className="text-xs font-mono text-slate-400 uppercase tracking-wider block">
                    Token Cost Estimator Preview
                  </span>
                  <div className="text-sm text-slate-200 mt-1 flex flex-wrap items-center gap-2 font-mono">
                    <span>{genCount} Keys</span>
                    <span>×</span>
                    <span>{calculatedCostPerKey} Tokens</span>
                    <span>=</span>
                    <span className="text-xl font-extrabold text-amber-400">{totalEstimatedCost} Tokens Total</span>
                  </div>
                </div>

                {!isUnlimited && (
                  <div className="text-right font-mono text-xs">
                    <span className="text-slate-400 block">Your Token Balance</span>
                    <span className="text-base font-bold text-amber-300">{currentResellerTokens} Tokens</span>
                  </div>
                )}
              </div>

              {/* Insufficient Token Warning Banner */}
              {isInsufficientTokens && (
                <div className="mb-6 bg-rose-950/80 border border-rose-500/60 rounded-2xl p-4 text-rose-200 flex items-center space-x-3 glow-red animate-pulse">
                  <AlertTriangle className="w-6 h-6 text-rose-400 flex-shrink-0" />
                  <div className="text-xs font-mono">
                    <strong className="text-rose-300 block text-sm">Insufficient Tokens!</strong>
                    You have <span className="font-bold text-white">{currentResellerTokens} tokens</span> but need <span className="font-bold text-white">{totalEstimatedCost} tokens</span>. You need <span className="underline font-extrabold text-amber-300">{neededMoreTokens} more tokens</span> to generate these keys.
                  </div>
                </div>
              )}

              {/* Action Button */}
              <button
                onClick={handleGenerateKeys}
                disabled={isGenerating || isInsufficientTokens}
                className={`w-full py-3.5 rounded-2xl font-bold transition shadow-glow-purple flex items-center justify-center space-x-2 text-sm ${
                  isInsufficientTokens
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                    : isMasterKey
                    ? 'bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-slate-950 shadow-glow-amber'
                    : 'bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white'
                }`}
              >
                {isGenerating ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
                <span>
                  {isGenerating
                    ? 'Processing Key Generation...'
                    : isInsufficientTokens
                    ? 'Submit Disabled - Insufficient Tokens'
                    : isMasterKey
                    ? 'Issue Master Key (Unlimited Devices)'
                    : `Issue ${genCount} Key(s) for ${totalEstimatedCost} Tokens`}
                </span>
              </button>

              {/* Generated Result Display */}
              {genSuccessKeys.length > 0 && (
                <div className="mt-6 pt-6 border-t border-purple-900/40">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold uppercase text-emerald-400 flex items-center space-x-1.5">
                      <CheckCircle className="w-4 h-4" />
                      <span>Successfully Issued {genSuccessKeys.length} Key(s)</span>
                    </span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(genSuccessKeys.join('\n'));
                        alert('All keys copied to clipboard!');
                      }}
                      className="text-xs text-purple-300 hover:text-white flex items-center space-x-1 bg-purple-900/50 hover:bg-purple-800 px-3 py-1.5 rounded-xl border border-purple-700/40 transition"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy All Issued Keys</span>
                    </button>
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {genSuccessKeys.map((k, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between bg-slate-950 border border-purple-500/40 rounded-xl px-4 py-2 text-xs font-mono text-purple-200"
                      >
                        <span>{k}</span>
                        <button
                          onClick={() => copyToClipboard(k, `gen-${i}`)}
                          className="p-1 rounded bg-purple-950 hover:bg-purple-800 text-purple-300 hover:text-white transition"
                        >
                          {copiedKeyId === `gen-${i}` ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Keys Table & Filtering */}
            <div className="glass-card rounded-3xl p-6 border border-slate-800">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                  <div className="relative w-full sm:w-80">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      placeholder="Search key, reseller, HWID, note..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white outline-none focus:border-purple-500"
                    />
                  </div>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full sm:w-40 bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-purple-500"
                  >
                    <option value="all">All Statuses</option>
                    <option value="active">Active Only</option>
                    <option value="expired">Expired Only</option>
                    <option value="revoked">Revoked Only</option>
                  </select>
                </div>
                <span className="text-xs text-slate-400 font-mono">Showing {filteredKeys.length} of {keys.length} keys</span>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-800">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 uppercase text-[11px] tracking-wider font-mono">
                    <tr>
                      <th className="p-4">License Key String</th>
                      <th className="p-4">Duration & Expiry</th>
                      <th className="p-4">Cost Tokens</th>
                      <th className="p-4">Payment Receipt</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">HWID</th>
                      <th className="p-4">Created By</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
                    {filteredKeys.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-slate-500 font-sans">
                          No license keys match your criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredKeys.map((k) => (
                        <tr key={k.id} className="hover:bg-slate-800/40 transition">
                          {/* Key string */}
                          <td className="p-4 font-bold text-purple-300 flex items-center space-x-2">
                            <span>{k.key}</span>
                            {(k.isMasterKey === 1 || k.isMasterKey === true) && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase tracking-widest">
                                MASTER
                              </span>
                            )}
                            <button
                              onClick={() => copyToClipboard(k.key, k.id)}
                              className="text-slate-500 hover:text-purple-300 transition"
                            >
                              {copiedKeyId === k.id ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </td>

                          {/* Duration & Expiry */}
                          <td className="p-4">
                            <span className="text-slate-200 font-bold block">{k.duration || 'Custom'}</span>
                            {!k.expiresAt || k.expiresAt === 'never' ? (
                              <span className="text-[11px] text-emerald-400 font-semibold flex items-center space-x-1 mt-0.5">
                                <Clock className="w-3 h-3 text-emerald-400" />
                                <span>Never Expires</span>
                              </span>
                            ) : (
                              <span className="text-[11px] text-cyan-300/80 block mt-0.5 font-mono">
                                Exp: {new Date(k.expiresAt).toLocaleString()}
                              </span>
                            )}
                          </td>

                          {/* Cost Tokens */}
                          <td className="p-4 font-bold text-amber-400">{k.costTokens || 0} Tokens</td>

                          {/* Payment Screenshot Badge */}
                          <td className="p-4">
                            {k.paymentScreenshot ? (
                              <button
                                onClick={() => setScreenshotModalKey(k)}
                                className="flex items-center space-x-1 px-2.5 py-1 rounded-lg badge-cyan hover:scale-105 transition font-sans text-xs"
                              >
                                <ImageIcon className="w-3.5 h-3.5" />
                                <span>Receipt Attached</span>
                              </button>
                            ) : (
                              <span className="text-slate-600 font-sans italic text-[11px]">None</span>
                            )}
                          </td>

                          {/* Status Badge */}
                          <td className="p-4">
                            <span className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                              k.status === 'active' 
                                ? 'badge-emerald' 
                                : k.status === 'expired' 
                                ? 'badge-amber' 
                                : 'badge-rose'
                            }`}>
                              {k.status}
                            </span>
                          </td>

                          {/* HWID */}
                          <td className="p-4 text-slate-400">
                            {(k.isMasterKey === 1 || k.isMasterKey === true) ? (
                              <span className="text-amber-400 font-bold bg-amber-950/40 border border-amber-700/50 px-2 py-0.5 rounded">
                                ⚡ Unlimited
                              </span>
                            ) : (
                              k.hwid || <span className="text-slate-600 italic">Unbound</span>
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
                              >
                                Reset HWID
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteKey(k.id)}
                              className="px-3 py-1.5 text-xs bg-rose-950/50 hover:bg-rose-900/80 text-rose-400 border border-rose-800/50 rounded-xl transition"
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

        {/* TAB 2: RESELLER NETWORK */}
        {activeTab === 'users' && (user.role === 'owner' || user.role === 'manager') && (
          <div className="space-y-8">
            {/* Create Staff / Reseller Form */}
            <div className="glass-card rounded-3xl p-6 border border-purple-500/30 glow-purple">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center space-x-2">
                <UserPlus className="w-5 h-5 text-purple-400" />
                <span>Create New Staff / Reseller Account</span>
              </h3>
              <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Username</label>
                  <input
                    type="text"
                    required
                    value={newUserUsername}
                    onChange={(e) => setNewUserUsername(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Password</label>
                  <input
                    type="password"
                    required
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Role</label>
                  <select
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white outline-none"
                  >
                    <option value="reseller">Reseller</option>
                    {user.role === 'owner' && <option value="manager">Manager</option>}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Initial Tokens</label>
                  <input
                    type="number"
                    min="0"
                    value={newUserTokens}
                    onChange={(e) => setNewUserTokens(parseInt(e.target.value, 10) || 0)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white outline-none font-mono"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold py-2 rounded-xl transition shadow-glow-purple"
                  >
                    Add Reseller
                  </button>
                </div>
              </form>
            </div>

            {/* Reseller Management Table */}
            <div className="glass-card rounded-3xl p-6 border border-slate-800">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center justify-between">
                <span>Reseller Network Accounts</span>
                <span className="text-xs font-mono text-slate-400">Click any row to open Deep Dive Dashboard</span>
              </h3>
              <div className="overflow-x-auto rounded-2xl border border-slate-800">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 uppercase text-[11px] tracking-wider font-mono">
                    <tr>
                      <th className="p-4">Username</th>
                      <th className="p-4">Role</th>
                      <th className="p-4">Creator</th>
                      <th className="p-4">Token Balance</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50 font-mono text-xs">
                    {usersList.map((u) => (
                      <tr
                        key={u.id}
                        onClick={() => setDashboardReseller(u)}
                        className="hover:bg-purple-950/20 transition cursor-pointer group"
                      >
                        <td className="p-4 font-bold text-white group-hover:text-purple-300 transition">
                          {u.username}
                        </td>
                        <td className="p-4 font-bold uppercase text-purple-400">{u.role}</td>
                        <td className="p-4 text-slate-400">{u.createdBy || 'OwnerAdmin'}</td>
                        <td className="p-4 font-bold text-amber-400">{u.tokens ?? 0} Tokens</td>
                        <td className="p-4">
                          <span
                            className={`px-3 py-1 rounded-full text-[11px] font-bold ${
                              u.isBlocked === 1 ? 'badge-rose' : 'badge-emerald'
                            }`}
                          >
                            {u.isBlocked === 1 ? 'BLOCKED' : 'ACTIVE'}
                          </span>
                        </td>
                        <td
                          className="p-4 text-right space-x-2"
                          onClick={(e) => e.stopPropagation()} // Prevent row click when clicking action button
                        >
                          <button
                            onClick={() => setTokenModalUser(u)}
                            className="px-3 py-1.5 text-xs bg-amber-950/60 hover:bg-amber-900/80 text-amber-300 border border-amber-700/60 rounded-xl font-bold transition flex-inline items-center space-x-1"
                          >
                            <Coins className="w-3.5 h-3.5 inline mr-1" />
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

        {/* TAB 3: EXECUTIVE ANALYTICS */}
        {activeTab === 'analytics' && (
          <div className="space-y-8">
            {/* Top Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="glass-card rounded-3xl p-6 border border-purple-500/40 glow-purple">
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider font-mono">Total Issued Keys</span>
                <p className="text-4xl font-extrabold text-white mt-3 font-mono">{keys.length}</p>
              </div>

              <div className="glass-card rounded-3xl p-6 border border-emerald-500/40 glow-emerald">
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider font-mono">Active Licenses</span>
                <p className="text-4xl font-extrabold text-emerald-400 mt-3 font-mono">
                  {keys.filter((k) => k.status === 'active').length}
                </p>
              </div>

              <div className="glass-card rounded-3xl p-6 border border-amber-500/40 glow-amber">
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider font-mono">Total Resellers</span>
                <p className="text-4xl font-extrabold text-amber-400 mt-3 font-mono">
                  {usersList.filter((u) => u.role === 'reseller').length}
                </p>
              </div>

              <div className="glass-card rounded-3xl p-6 border border-cyan-500/40 glow-cyan">
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider font-mono">Total Revenue Tokens</span>
                <p className="text-4xl font-extrabold text-cyan-300 mt-3 font-mono">
                  {totalRevenueTokens.toLocaleString()}
                </p>
              </div>
            </div>

            {/* Sales Chart Component */}
            <SalesChart totalRevenue={totalRevenueTokens} totalKeysSold={keys.length} />
          </div>
        )}
      </main>

      {/* Modals */}
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
