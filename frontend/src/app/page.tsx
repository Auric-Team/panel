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
import { useTheme } from '@/components/ui/ThemeContext';
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
  Sun,
  Moon,
  Eye,
  EyeOff,
} from 'lucide-react';

function DashboardContent() {
  const { toast } = useToast();
  const { theme, toggleTheme } = useTheme();

  const [user, setUser] = useState<UserItem | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'keys' | 'resellers' | 'payload' | 'audit'>('overview');

  // Auth State
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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

  // Update Key Receipt Handler
  const handleUpdateKeyReceipt = async (keyId: string, paymentScreenshot: string) => {
    if (!token) return;
    try {
      const res = await api.updateReceipt(token, keyId, paymentScreenshot);
      toast.success(res?.message || 'Payment receipt proof updated successfully.');
      await fetchData();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update payment receipt.');
    }
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
      <div className="min-h-screen bg-canvas text-ink flex items-center justify-center p-4 font-sans text-xs relative">
        {/* Floating Theme Toggle on Login Screen */}
        <div className="absolute top-4 right-4 z-20">
          <button
            type="button"
            onClick={toggleTheme}
            className="ref-btn-icon"
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
            aria-label="Toggle Theme"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-warning" />
            ) : (
              <Moon className="w-4 h-4 text-muted" />
            )}
          </button>
        </div>

        {pending2FA ? (
          <DialPad2FA
            username={pending2FA.username}
            role={pending2FA.role}
            onVerify={handle2FAVerify}
            onCancel={() => setPending2FA(null)}
            errorMsg={authError}
          />
        ) : (
          <div className="w-full max-w-md ref-card p-7 sm:p-9 space-y-6 relative z-10 animate-in fade-in zoom-in-95 duration-200">
            <div className="text-center space-y-2">
              <div className="ref-dialog-icon">
                <ShieldCheck className="w-6 h-6 text-accent" />
              </div>
              <h1 className="font-display text-2xl font-normal text-ink tracking-tight">
                AXIOS <span className="text-muted text-lg tracking-widest font-sans uppercase">Executive</span>
              </h1>
              <p className="text-xs text-muted font-sans tracking-wide">
                Hardware Licensing &amp; Token Management Portal
              </p>
            </div>

            {authError && (
              <div className="p-3 rounded-md bg-danger/10 border border-danger/25 text-danger text-xs text-center font-medium">
                {authError}
              </div>
            )}

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="text-[11px] font-sans font-medium text-muted block mb-1.5 uppercase tracking-wider">
                  Account Username
                </label>
                <input
                  type="text"
                  required
                  placeholder="Enter username"
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  className="ref-input w-full font-mono text-xs"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-sans font-medium text-muted uppercase tracking-wider">
                    Security Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-[11px] text-muted hover:text-ink flex items-center gap-1 transition-colors select-none"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <>
                        <EyeOff className="w-3.5 h-3.5" />
                        <span>Hide</span>
                      </>
                    ) : (
                      <>
                        <Eye className="w-3.5 h-3.5" />
                        <span>Show</span>
                      </>
                    )}
                  </button>
                </div>
                <input
                  type="text"
                  required
                  placeholder="Enter password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck="false"
                  data-lpignore="true"
                  data-1p-ignore="true"
                  data-form-type="other"
                  name="panel_auth_key"
                  style={{
                    WebkitTextSecurity: showPassword ? 'none' : 'disc',
                  } as React.CSSProperties}
                  className="ref-input w-full font-mono text-xs"
                />
              </div>

              <button
                type="submit"
                disabled={isLoggingIn}
                className="ref-btn ref-btn-primary w-full py-3 rounded-md text-xs font-semibold uppercase tracking-wider flex items-center justify-center space-x-2 disabled:opacity-50"
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
    <div className="min-h-screen bg-canvas text-ink font-sans text-xs pb-24 sm:pb-12 transition-colors">
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
        <div className="hidden sm:flex items-center ref-tab-list overflow-x-auto shadow-sm">
          <button
            onClick={() => setActiveTab('overview')}
            className={`ref-tab-btn shrink-0 ${activeTab === 'overview' ? 'active' : ''}`}
          >
            <LayoutDashboard className="w-4 h-4 text-muted" />
            <span>Overview &amp; Analytics</span>
            <span className="px-1.5 py-0.5 text-[9px] rounded-full font-mono bg-accent/15 text-accent border border-accent/25">
              LIVE
            </span>
          </button>

          <button
            onClick={() => setActiveTab('keys')}
            className={`ref-tab-btn shrink-0 ${activeTab === 'keys' ? 'active' : ''}`}
          >
            <Key className="w-4 h-4 text-muted" />
            <span>Key Management &amp; Studio</span>
            {keys.length > 0 && (
              <span className="px-1.5 py-0.5 text-[9px] rounded-full font-mono bg-surface border border-border-soft text-muted">
                {keys.length}
              </span>
            )}
          </button>

          {isManagerOrOwner && (
            <button
              onClick={() => setActiveTab('resellers')}
              className={`ref-tab-btn shrink-0 ${activeTab === 'resellers' ? 'active' : ''}`}
            >
              <Users className="w-4 h-4 text-muted" />
              <span>Reseller Network</span>
              {resellers.filter((r) => r.role === 'reseller' || r.role === 'manager').length > 0 && (
                <span className="px-1.5 py-0.5 text-[9px] rounded-full font-mono bg-surface border border-border-soft text-muted">
                  {resellers.filter((r) => r.role === 'reseller' || r.role === 'manager').length}
                </span>
              )}
            </button>
          )}

          {isManagerOrOwner && (
            <button
              onClick={() => setActiveTab('payload')}
              className={`ref-tab-btn shrink-0 ${activeTab === 'payload' ? 'active' : ''}`}
            >
              <FileCode2 className="w-4 h-4 text-muted" />
              <span>libil2cpp.so Publisher</span>
            </button>
          )}

          <button
            onClick={() => setActiveTab('audit')}
            className={`ref-tab-btn shrink-0 ${activeTab === 'audit' ? 'active' : ''}`}
          >
            <Activity className="w-4 h-4 text-muted" />
            <span>Audit Logs</span>
            <span className="px-1.5 py-0.5 text-[9px] rounded-full font-mono bg-surface border border-border-soft text-muted">
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
              onUpdateReceipt={handleUpdateKeyReceipt}
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
