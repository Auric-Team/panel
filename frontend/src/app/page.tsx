"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Header } from '@/components/Header';
import { StatsOverview } from '@/components/StatsOverview';
import { KeyManagement } from '@/components/KeyManagement';
import { ResellerManagement } from '@/components/ResellerManagement';
import { SalesChart } from '@/components/SalesChart';
import { DialPad2FA } from '@/components/DialPad2FA';
import { AuditLogsTable, AuditLogItem } from '@/components/AuditLogsTable';
import { PayloadManager } from '@/components/PayloadManager';
import { MobileNav } from '@/components/layout/MobileNav';
import { ToastProvider, useToast } from '@/components/ui/ToastContext';
import { api, fetchAllKeys, fetchAllUsers, fetchLogsApi } from '@/lib/api';
import { UserItem, KeyItem, DashboardStats, SalesDataPoint } from '@/types/key';
import {
  LayoutDashboard,
  Key,
  Users,
  Activity,
  Lock,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  FileCode2,
} from 'lucide-react';

function DashboardContent() {
  const { toast } = useToast();

  const [user, setUser] = useState<UserItem | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'keys' | 'resellers' | 'payload' | 'audit'>('overview');

  // Auth State
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [pending2FA, setPending2FA] = useState<{ userId: string; role: string; username: string } | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Data State
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [salesGraph, setSalesGraph] = useState<SalesDataPoint[]>([]);
  const [keys, setKeys] = useState<KeyItem[]>([]);
  const [resellers, setResellers] = useState<UserItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [generatedKeys, setGeneratedKeys] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  // Load Saved Auth Token
  useEffect(() => {
    const savedToken = localStorage.getItem('axios_token');
    const savedUser = localStorage.getItem('axios_user');
    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem('axios_token');
        localStorage.removeItem('axios_user');
      }
    }
  }, []);

  // Fetch Dashboard Data
  const fetchData = useCallback(async () => {
    if (!token) return;
    setIsRefreshing(true);
    try {
      const isManagerOrOwner = user?.role === 'owner' || user?.role === 'manager';

      const [analyticsData, keysRes, usersRes, logsRes] = await Promise.all([
        api.getAnalytics(token).catch(() => null),
        fetchAllKeys(token),
        isManagerOrOwner ? fetchAllUsers(token) : Promise.resolve({ users: [], isLive: true }),
        isManagerOrOwner ? fetchLogsApi(token) : Promise.resolve({ logs: [], isLive: true }),
      ]);

      if (keysRes.isAuthError) {
        localStorage.removeItem('axios_token');
        localStorage.removeItem('axios_user');
        setToken(null);
        setUser(null);
        toast.error('Session expired. Please log in again.');
        return;
      }

      if (analyticsData) {
        setStats({
          totalKeys: analyticsData.totalKeys || 0,
          activeKeys: analyticsData.activeKeys || 0,
          expiredKeys: analyticsData.expiredKeys || 0,
          boundDevices: analyticsData.boundDevices || 0,
          totalResellers: analyticsData.totalResellers || 0,
          totalTokensSpent: analyticsData.totalTokensSpent || 0,
        });

        if (analyticsData.dailySales) {
          setSalesGraph(
            analyticsData.dailySales.map((d: any) => ({
              date: d.date,
              salesCount: d.count || 0,
              revenueTokens: d.tokens || 0,
            }))
          );
        }
      }

      if (Array.isArray(keysRes.keys)) {
        setKeys(keysRes.keys);
      }

      if (Array.isArray(usersRes.users)) {
        setResellers(usersRes.users);
      }

      if (Array.isArray(logsRes.logs)) {
        setAuditLogs(logsRes.logs);
      }

      setIsConnected(true);
    } catch (err: any) {
      console.error('Data Fetch Error:', err);
      setIsConnected(false);
    } finally {
      setIsRefreshing(false);
    }
  }, [token, user, toast]);

  useEffect(() => {
    if (token) {
      fetchData();
    }
  }, [token, fetchData]);

  // Clear Logs Handler
  const handleClearLogs = async () => {
    if (!token) return;
    await api.clearLogs(token);
    await fetchData();
  };

  // Login Handler
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setIsLoggingIn(true);
    try {
      const res = await api.login(loginUsername, loginPassword);
      if (res.require2FA) {
        setPending2FA({
          userId: res.userId,
          role: res.role,
          username: res.username,
        });
        toast.info('Enter your 6-digit security PIN to complete sign in.');
      } else if (res.token) {
        setToken(res.token);
        setUser(res.user);
        localStorage.setItem('axios_token', res.token);
        localStorage.setItem('axios_user', JSON.stringify(res.user));
        toast.success(`Welcome back, ${res.user.username}!`);
      }
    } catch (err: any) {
      setAuthError(err.message || 'Authentication failed. Check credentials.');
      toast.error(err.message || 'Authentication failed');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // 2FA Verification Handler
  const handle2FAVerify = async (pin: string) => {
    if (!pending2FA) return;
    setAuthError(null);
    try {
      const res = await api.verify2FA(pending2FA.userId, pin);
      if (res.token) {
        setToken(res.token);
        setUser(res.user);
        localStorage.setItem('axios_token', res.token);
        localStorage.setItem('axios_user', JSON.stringify(res.user));
        setPending2FA(null);
        toast.success(`Authenticated as ${res.user.username}`);
      }
    } catch (err: any) {
      const msg = err.message || 'Invalid 2FA Security PIN.';
      setAuthError(msg);
      toast.error(msg);
      throw err;
    }
  };

  // Logout Handler
  const handleLogout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('axios_token');
    localStorage.removeItem('axios_user');
    toast.info('Signed out of executive panel.');
  };

  // Generate Keys Handler
  const handleGenerateKeys = async (
    duration: string,
    count: number,
    note: string,
    paymentScreenshot: string | null,
    isMasterKey: boolean,
    prefix?: string,
    format?: 'hyphenated' | 'raw16' | 'uuid'
  ) => {
    if (!token) return;
    setIsGenerating(true);
    try {
      let durationDays = 0;
      if (duration === 'Lifetime' || duration.includes('Lifetime')) {
        durationDays = 0;
      } else {
        const match = duration.match(/\d+/);
        durationDays = match ? parseInt(match[0], 10) : 7;
      }

      const res = await api.generateKeys(token, {
        duration,
        durationDays,
        customDays: durationDays,
        count,
        note,
        paymentScreenshot,
        isMaster: isMasterKey,
        isMasterKey: isMasterKey,
        prefix,
        format,
      });

      if (res.success && Array.isArray(res.keys)) {
        setGeneratedKeys(res.keys.map((k: any) => k.key));
        toast.success(`Issued ${res.keys.length} license key(s) successfully!`);
        await fetchData();
      }
    } catch (err: any) {
      toast.error(err.message || 'Key generation failed.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Reset HWID Handler
  const handleResetHwid = async (keyId: string) => {
    if (!token) return;
    await api.resetHwid(token, keyId);
    await fetchData();
  };

  // Delete Key Handler
  const handleDeleteKey = async (keyId: string) => {
    if (!token) return;
    await api.deleteKey(token, keyId);
    await fetchData();
  };

  // Delete Expired Keys Handler
  const handleDeleteExpiredKeys = async () => {
    if (!token) return;
    await api.deleteExpiredKeys(token);
    await fetchData();
  };

  // Extend Key Handler
  const handleExtendKey = async (keyId: string, days: number, note?: string) => {
    if (!token) return;
    await api.extendKey(token, keyId, days, note);
    await fetchData();
  };

  // Update Note Handler
  const handleUpdateKeyNote = async (keyId: string, note: string) => {
    if (!token) return;
    await api.updateKeyNote(token, keyId, note);
    await fetchData();
  };

  // Bulk Actions Handlers
  const handleBulkResetHwid = async (ids: string[]) => {
    if (!token) return;
    await api.bulkResetHwid(token, ids);
    await fetchData();
  };

  const handleBulkDeleteKeys = async (ids: string[]) => {
    if (!token) return;
    await api.bulkDeleteKeys(token, ids);
    await fetchData();
  };

  const handleBulkExtendKeys = async (ids: string[], days: number) => {
    if (!token) return;
    await api.bulkExtendKeys(token, ids, days);
    await fetchData();
  };

  // Create Reseller Handler
  const handleCreateReseller = async (resellerData: any) => {
    if (!token) return;
    await api.createUser(token, resellerData);
    await fetchData();
  };

  // Toggle Block User Handler
  const handleToggleBlockUser = async (userId: string, isBlocked: boolean) => {
    if (!token) return;
    await api.toggleBlockUser(token, userId, isBlocked);
    toast.success(isBlocked ? 'Partner account suspended.' : 'Partner account activated.');
    await fetchData();
  };

  // Update Tokens Handler
  const handleUpdateTokens = async (userId: string, amount: number, action: 'add' | 'deduct', note?: string) => {
    if (!token) return;
    await api.updateTokens(token, userId, amount, action);
    await fetchData();
  };

  // Delete User Handler
  const handleDeleteUser = async (userId: string) => {
    if (!token) return;
    await api.deleteUser(token, userId);
    await fetchData();
  };

  // Render Login & 2FA Interface
  if (!token) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 font-sans text-xs relative overflow-hidden">
        {/* Subtle Ambient Background */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-600/10 rounded-full blur-[160px] pointer-events-none" />

        {pending2FA ? (
          <DialPad2FA
            username={pending2FA.username}
            role={pending2FA.role}
            onVerify={handle2FAVerify}
            onCancel={() => setPending2FA(null)}
            errorMsg={authError}
          />
        ) : (
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-7 sm:p-9 shadow-2xl space-y-6 backdrop-blur-2xl relative z-10 animate-in fade-in zoom-in-95 duration-200">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center text-cyan-400 shadow-inner">
                <ShieldCheck className="w-7 h-7 text-cyan-400" />
              </div>
              <h1 className="text-2xl font-black text-white tracking-tight font-mono">
                AXIOS <span className="text-cyan-400">EXECUTIVE</span>
              </h1>
              <p className="text-xs text-slate-400 font-mono">Hardware Licensing & Token Management</p>
            </div>

            {authError && (
              <div className="p-3.5 rounded-2xl bg-rose-950/70 border border-rose-800/80 text-rose-300 text-xs text-center font-semibold font-mono">
                {authError}
              </div>
            )}

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="text-[11px] font-mono font-semibold text-slate-400 block mb-1.5 uppercase">
                  Account Username
                </label>
                <input
                  type="text"
                  required
                  placeholder="Enter username"
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-white font-mono outline-none focus:border-cyan-500/80 transition"
                />
              </div>

              <div>
                <label className="text-[11px] font-mono font-semibold text-slate-400 block mb-1.5 uppercase">
                  Security Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="Enter password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-white font-mono outline-none focus:border-cyan-500/80 transition"
                />
              </div>

              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3.5 rounded-2xl transition shadow-lg shadow-cyan-600/20 text-xs flex items-center justify-center space-x-2 disabled:opacity-50 font-mono uppercase tracking-wider"
              >
                {isLoggingIn ? (
                  <span>Authenticating...</span>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>Sign In to Executive Portal</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    );
  }

  // Main Dashboard View
  const isManagerOrOwner = user?.role === 'owner' || user?.role === 'manager';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans text-xs pb-24 sm:pb-12 selection:bg-cyan-500 selection:text-slate-950">
      {/* Top Header */}
      <Header
        user={user}
        isConnected={isConnected}
        isRefreshing={isRefreshing}
        onRefresh={fetchData}
        onLogout={handleLogout}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-8 mt-5 space-y-6">
        {/* Desktop Navigation Tabs Bar */}
        <div className="hidden sm:flex items-center space-x-1.5 bg-slate-900 border border-slate-800 p-1.5 rounded-3xl shadow-xl overflow-x-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-2xl font-bold transition-all text-xs whitespace-nowrap ${
              activeTab === 'overview'
                ? 'bg-slate-800 text-cyan-400 shadow-sm border border-slate-700'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Overview & Analytics</span>
            <span className="px-1.5 py-0.5 text-[9px] rounded-full font-mono bg-cyan-950 text-cyan-300 border border-cyan-800">
              LIVE
            </span>
          </button>

          <button
            onClick={() => setActiveTab('keys')}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-2xl font-bold transition-all text-xs whitespace-nowrap ${
              activeTab === 'keys'
                ? 'bg-slate-800 text-cyan-400 shadow-sm border border-slate-700'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Key className="w-4 h-4" />
            <span>Key Management & Generator</span>
            {keys.length > 0 && (
              <span className="px-1.5 py-0.5 text-[9px] rounded-full font-mono bg-slate-950 text-slate-300 border border-slate-800">
                {keys.length}
              </span>
            )}
          </button>

          {isManagerOrOwner && (
            <button
              onClick={() => setActiveTab('resellers')}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-2xl font-bold transition-all text-xs whitespace-nowrap ${
                activeTab === 'resellers'
                  ? 'bg-slate-800 text-cyan-400 shadow-sm border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Reseller Network</span>
              {resellers.filter((r) => r.role === 'reseller' || r.role === 'manager').length > 0 && (
                <span className="px-1.5 py-0.5 text-[9px] rounded-full font-mono bg-slate-950 text-slate-300 border border-slate-800">
                  {resellers.filter((r) => r.role === 'reseller' || r.role === 'manager').length}
                </span>
              )}
            </button>
          )}

          {isManagerOrOwner && (
            <button
              onClick={() => setActiveTab('payload')}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-2xl font-bold transition-all text-xs whitespace-nowrap ${
                activeTab === 'payload'
                  ? 'bg-slate-800 text-cyan-400 shadow-sm border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileCode2 className="w-4 h-4" />
              <span>libil2cpp.so Publisher</span>
            </button>
          )}

          <button
            onClick={() => setActiveTab('audit')}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-2xl font-bold transition-all text-xs whitespace-nowrap ${
              activeTab === 'audit'
                ? 'bg-slate-800 text-cyan-400 shadow-sm border border-slate-700'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Audit Logs</span>
            <span className="px-1.5 py-0.5 text-[9px] rounded-full font-mono bg-slate-950 text-slate-300 border border-slate-800">
              {auditLogs.length}
            </span>
          </button>
        </div>

        {/* Tab 1: Overview & Analytics */}
        {activeTab === 'overview' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            <StatsOverview stats={stats} userRole={user?.role} />

            <SalesChart
              data={salesGraph}
              totalRevenue={stats?.totalTokensSpent || 0}
              totalKeysSold={stats?.totalKeys || 0}
              title="Global License Issuance & Token Velocity"
              subtitle="Real-time 14-day token consumption telemetry"
            />
          </div>
        )}

        {/* Tab 2: Key Management & Studio */}
        {activeTab === 'keys' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            <KeyManagement
              user={user}
              keys={keys}
              onGenerate={handleGenerateKeys}
              isGenerating={isGenerating}
              generatedKeys={generatedKeys}
              onResetHwid={handleResetHwid}
              onDeleteKey={handleDeleteKey}
              onDeleteExpiredKeys={handleDeleteExpiredKeys}
              onExtendKey={handleExtendKey}
              onUpdateKeyNote={handleUpdateKeyNote}
              onBulkResetHwid={handleBulkResetHwid}
              onBulkDeleteKeys={handleBulkDeleteKeys}
              onBulkExtendKeys={handleBulkExtendKeys}
            />
          </div>
        )}

        {/* Tab 3: Resellers */}
        {activeTab === 'resellers' && isManagerOrOwner && (
          <div className="space-y-6 animate-in fade-in duration-150">
            <ResellerManagement
              currentUser={user}
              resellers={resellers}
              keys={keys}
              token={token}
              onCreateReseller={handleCreateReseller}
              onToggleBlockUser={handleToggleBlockUser}
              onDeleteUser={handleDeleteUser}
              onUpdateTokens={handleUpdateTokens}
            />
          </div>
        )}

        {/* Tab 4: Payload Publisher */}
        {activeTab === 'payload' && token && isManagerOrOwner && (
          <div className="space-y-6 animate-in fade-in duration-150">
            <PayloadManager token={token} userRole={user.role} />
          </div>
        )}

        {/* Tab 5: Audit Logs */}
        {activeTab === 'audit' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            <AuditLogsTable
              logs={auditLogs}
              currentUser={user}
              onClearLogs={handleClearLogs}
              onRefreshLogs={fetchData}
            />
          </div>
        )}
      </main>

      {/* Persistent Mobile Bottom Navigation Bar */}
      <MobileNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        user={user}
        keysCount={keys.length}
        resellersCount={resellers.filter((r) => r.role === 'reseller' || r.role === 'manager').length}
        auditCount={auditLogs.length}
      />
    </div>
  );
}

export default function Home() {
  return (
    <ToastProvider>
      <DashboardContent />
    </ToastProvider>
  );
}
