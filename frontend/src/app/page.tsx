"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Header } from '@/components/Header';
import { StatsOverview } from '@/components/StatsOverview';
import { KeyGenerator } from '@/components/KeyGenerator';
import { KeysTable } from '@/components/KeysTable';
import { KeyManagement } from '@/components/KeyManagement';
import { ResellersTable } from '@/components/ResellersTable';
import { ResellerManagement } from '@/components/ResellerManagement';
import { SalesChart } from '@/components/SalesChart';
import { TokenBalanceModal } from '@/components/TokenBalanceModal';
import { ResellerDashboardModal } from '@/components/ResellerDashboardModal';
import { PaymentScreenshotModal } from '@/components/PaymentScreenshotModal';
import { DialPad2FA } from '@/components/DialPad2FA';
import { AuditLogsTable, AuditLogItem } from '@/components/AuditLogsTable';
import { api } from '@/lib/api';
import { UserItem, KeyItem, DashboardStats, SalesDataPoint } from '@/types/key';
import { LayoutDashboard, Key, Users, Activity, Lock, RefreshCw, Sparkles, ShieldCheck } from 'lucide-react';

export default function Home() {
  const [user, setUser] = useState<UserItem | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'keys' | 'resellers' | 'audit'>('overview');

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

  // Modals
  const [tokenModalUser, setTokenModalUser] = useState<UserItem | null>(null);
  const [resellerDashboardUser, setResellerDashboardUser] = useState<UserItem | null>(null);
  const [selectedProofKey, setSelectedProofKey] = useState<KeyItem | null>(null);

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
      const [analyticsData, keysData, usersData, logsData] = await Promise.all([
        api.getAnalytics(token),
        api.getKeys(token),
        api.getUsers(token).catch(() => []),
        api.getLogs(token).catch(() => []),
      ]);

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

      if (Array.isArray(keysData)) {
        setKeys(keysData);
      }

      if (Array.isArray(usersData)) {
        setResellers(usersData);
      }

      if (Array.isArray(logsData)) {
        setAuditLogs(logsData);
      }

      setIsConnected(true);
    } catch (err: any) {
      console.error('Data Fetch Error:', err);
      setIsConnected(false);
    } finally {
      setIsRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchData();
    }
  }, [token, fetchData]);

  // Clear Logs Handler
  const handleClearLogs = async () => {
    if (!token) return;
    try {
      await api.clearLogs(token);
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to clear audit logs.');
    }
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
      } else if (res.token) {
        setToken(res.token);
        setUser(res.user);
        localStorage.setItem('axios_token', res.token);
        localStorage.setItem('axios_user', JSON.stringify(res.user));
      }
    } catch (err: any) {
      setAuthError(err.message || 'Authentication failed. Check credentials.');
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
      }
    } catch (err: any) {
      setAuthError(err.message || 'Invalid 2FA Security PIN.');
    }
  };

  // Logout Handler
  const handleLogout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('axios_token');
    localStorage.removeItem('axios_user');
  };

  // Generate Keys Handler
  const handleGenerateKeys = async (
    duration: string,
    count: number,
    note: string,
    paymentScreenshot: string | null,
    isMasterKey: boolean
  ) => {
    if (!token) return;
    setIsGenerating(true);
    try {
      const durationDays = duration === '1 Day' ? 1 : duration === '7 Days' ? 7 : duration === '30 Days' ? 30 : 0;
      const res = await api.generateKeys(token, {
        durationDays,
        customDays: duration.includes('Days') ? parseInt(duration, 10) : undefined,
        count,
        note,
        paymentScreenshot,
        isMasterKey,
      });

      if (res.success && Array.isArray(res.keys)) {
        setGeneratedKeys(res.keys.map((k: any) => k.key));
        await fetchData();
      }
    } catch (err: any) {
      alert(err.message || 'Key generation failed.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Reset HWID Handler
  const handleResetHwid = async (keyId: string) => {
    if (!token || !confirm('Are you sure you want to reset HWID for this license key?')) return;
    try {
      await api.resetHwid(token, keyId);
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Reset HWID failed.');
    }
  };

  // Delete Key Handler
  const handleDeleteKey = async (keyId: string) => {
    if (!token || !confirm('Are you sure you want to delete / revoke this key?')) return;
    try {
      await api.deleteKey(token, keyId);
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Delete key failed.');
    }
  };

  // Create Reseller Handler
  const handleCreateReseller = async (resellerData: any) => {
    if (!token) return;
    try {
      await api.createUser(token, resellerData);
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to create reseller.');
    }
  };

  // Toggle Block User Handler
  const handleToggleBlockUser = async (userId: string, isBlocked: boolean) => {
    if (!token) return;
    try {
      await api.toggleBlockUser(token, userId, isBlocked);
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to update user block status.');
    }
  };

  // Update Tokens Handler
  const handleUpdateTokens = async (userId: string, amount: number, action: 'add' | 'deduct', note?: string) => {
    if (!token) return;
    try {
      await api.updateTokens(token, userId, amount, action);
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to update user tokens.');
    }
  };

  // Delete User Handler
  const handleDeleteUser = async (userId: string) => {
    if (!token) return;
    try {
      await api.deleteUser(token, userId);
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete user.');
    }
  };

  // Render Login & 2FA Modal
  if (!token) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 font-mono text-xs selection:bg-cyan-500 relative overflow-hidden">
        {/* Ambient Glow Effects */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-cyan-600/10 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute bottom-10 right-10 w-[400px] h-[400px] bg-purple-600/10 rounded-full blur-[140px] pointer-events-none" />

        {pending2FA ? (
          <DialPad2FA
            username={pending2FA.username}
            onVerify={handle2FAVerify}
            onCancel={() => setPending2FA(null)}
          />
        ) : (
          <div className="w-full max-w-md bg-slate-900/90 border border-slate-800/90 rounded-3xl p-8 shadow-2xl space-y-6 backdrop-blur-xl relative z-10">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-cyan-600 via-indigo-600 to-purple-600 p-[1px] shadow-lg shadow-cyan-500/20">
                <div className="w-full h-full rounded-2xl bg-slate-950 flex items-center justify-center text-cyan-400">
                  <ShieldCheck className="w-7 h-7" />
                </div>
              </div>
              <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center justify-center space-x-1">
                <span>AXIOS</span>
                <span className="text-cyan-400">EXECUTIVE</span>
              </h1>
              <p className="text-xs text-slate-400">Hardware Licensing & Token Operations Portal</p>
            </div>

            {authError && (
              <div className="p-3.5 rounded-2xl bg-rose-950/70 border border-rose-800 text-rose-300 text-xs text-center font-medium">
                {authError}
              </div>
            )}

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="text-[10px] uppercase font-semibold text-slate-400 block mb-1.5">
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
                <label className="text-[10px] uppercase font-semibold text-slate-400 block mb-1.5">
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
                className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-extrabold py-3.5 rounded-2xl transition shadow-lg shadow-cyan-600/20 text-sm flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {isLoggingIn ? (
                  <span>Authenticating...</span>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>Sign In to Executive Panel</span>
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
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-mono text-xs selection:bg-cyan-500 pb-12">
      {/* Top Fixed Header */}
      <Header
        user={user}
        isConnected={isConnected}
        isRefreshing={isRefreshing}
        onRefresh={fetchData}
        onLogout={handleLogout}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-8 mt-6 space-y-6">
        {/* Navigation Tabs Bar */}
        <div className="flex items-center space-x-2 bg-slate-900/60 border border-slate-800/80 p-2 rounded-3xl backdrop-blur-xl shadow-2xl overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center space-x-2.5 px-5 py-3 rounded-2xl font-bold transition-all duration-200 text-xs whitespace-nowrap ${
              activeTab === 'overview'
                ? 'bg-slate-800/90 text-cyan-400 border border-cyan-500/50 shadow-[0_0_20px_rgba(6,182,212,0.2)]'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>📊 Executive Overview & Analytics</span>
            <span className={`px-2 py-0.5 text-[9px] rounded-full font-mono font-extrabold ${
              activeTab === 'overview' ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/40' : 'bg-slate-950 text-slate-400 border border-slate-800'
            }`}>
              LIVE
            </span>
          </button>

          <button
            onClick={() => setActiveTab('keys')}
            className={`flex items-center space-x-2.5 px-5 py-3 rounded-2xl font-bold transition-all duration-200 text-xs whitespace-nowrap ${
              activeTab === 'keys'
                ? 'bg-slate-800/90 text-cyan-400 border border-cyan-500/50 shadow-[0_0_20px_rgba(6,182,212,0.2)]'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent'
            }`}
          >
            <Key className="w-4 h-4" />
            <span>🔑 License Key Management & Generation</span>
            {keys.length > 0 && (
              <span className={`px-2 py-0.5 text-[9px] rounded-full font-mono font-extrabold ${
                activeTab === 'keys' ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/40' : 'bg-slate-950 text-slate-400 border border-slate-800'
              }`}>
                {keys.length}
              </span>
            )}
          </button>

          {(user?.role === 'owner' || user?.role === 'manager') && (
            <button
              onClick={() => setActiveTab('resellers')}
              className={`flex items-center space-x-2.5 px-5 py-3 rounded-2xl font-bold transition-all duration-200 text-xs whitespace-nowrap ${
                activeTab === 'resellers'
                  ? 'bg-slate-800/90 text-cyan-400 border border-cyan-500/50 shadow-[0_0_20px_rgba(6,182,212,0.2)]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>👥 Reseller Network & Token Allocation</span>
              {resellers.length > 0 && (
                <span className={`px-2 py-0.5 text-[9px] rounded-full font-mono font-extrabold ${
                  activeTab === 'resellers' ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/40' : 'bg-slate-950 text-slate-400 border border-slate-800'
                }`}>
                  {resellers.length}
                </span>
              )}
            </button>
          )}

          <button
            onClick={() => setActiveTab('audit')}
            className={`flex items-center space-x-2.5 px-5 py-3 rounded-2xl font-bold transition-all duration-200 text-xs whitespace-nowrap ${
              activeTab === 'audit'
                ? 'bg-slate-800/90 text-cyan-400 border border-cyan-500/50 shadow-[0_0_20px_rgba(6,182,212,0.2)]'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>📜 System Audit Logs & Security</span>
            <span className={`px-2 py-0.5 text-[9px] rounded-full font-mono font-extrabold ${
              activeTab === 'audit' ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/40' : 'bg-slate-950 text-slate-400 border border-slate-800'
            }`}>
              {auditLogs.length}
            </span>
          </button>
        </div>

        {/* Tab 1: Overview & Analytics */}
        {activeTab === 'overview' && (
          <div className="space-y-6 animate-in fade-in duration-200">
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

        {/* Tab 2: License Key Management & Generation */}
        {activeTab === 'keys' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <KeyManagement
              user={user}
              keys={keys}
              onGenerate={handleGenerateKeys}
              isGenerating={isGenerating}
              generatedKeys={generatedKeys}
              onResetHwid={handleResetHwid}
              onDeleteKey={handleDeleteKey}
              onOpenProofModal={(k) => setSelectedProofKey(k)}
            />
          </div>
        )}

        {/* Tab 3: Reseller Network */}
        {activeTab === 'resellers' && (user?.role === 'owner' || user?.role === 'manager') && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <ResellersTable
              resellers={resellers}
              userRole={user.role}
              onCreateReseller={handleCreateReseller}
              onToggleBlock={handleToggleBlockUser}
              onOpenTokensModal={(reseller) => setTokenModalUser(reseller)}
              onOpenDashboardModal={(reseller) => setResellerDashboardUser(reseller)}
            />
          </div>
        )}

        {/* Tab 4: Audit Logs */}
        {activeTab === 'audit' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <AuditLogsTable
              logs={auditLogs}
              currentUser={user}
              onClearLogs={handleClearLogs}
              onRefreshLogs={fetchData}
            />
          </div>
        )}
      </main>

      {/* Token Balance Modal */}
      <TokenBalanceModal
        isOpen={!!tokenModalUser}
        user={tokenModalUser}
        reseller={tokenModalUser}
        onClose={() => setTokenModalUser(null)}
        onUpdateTokens={handleUpdateTokens}
      />

      {/* Reseller Deep Analytics Modal */}
      <ResellerDashboardModal
        isOpen={!!resellerDashboardUser}
        reseller={resellerDashboardUser}
        keys={keys}
        onClose={() => setResellerDashboardUser(null)}
        onOpenManageTokens={(reseller) => setTokenModalUser(reseller)}
      />

      {/* High-Res Payment Proof Modal */}
      <PaymentScreenshotModal
        isOpen={!!selectedProofKey}
        keyItem={selectedProofKey}
        onClose={() => setSelectedProofKey(null)}
      />
    </div>
  );
}
