"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShieldCheck, Users, Key, BarChart3, Lock, LogOut, Search, Plus, Trash2, 
  RefreshCw, AlertTriangle, UserPlus, ShieldAlert, CheckCircle, Cpu, Zap, 
  Activity, ArrowUpRight, DollarSign, Filter, Layers, Copy, Check, Clock, UserCheck
} from 'lucide-react';
import { DialPad2FA } from '@/components/DialPad2FA';

const API_BASE = '/api';

export default function App() {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

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
  const [keys, setKeys] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);

  // Key Gen State
  const [genCount, setGenCount] = useState(1);
  const [genDays, setGenDays] = useState(7);
  const [genNote, setGenNote] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // User Creation State
  const [newUserUsername, setNewUserUsername] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState('reseller');
  const [newUserPin, setNewUserPin] = useState('');
  const [newUserCredits, setNewUserCredits] = useState(100);

  useEffect(() => {
    const savedToken = localStorage.getItem('axios_token');
    const savedUser = localStorage.getItem('axios_user');
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
  }, []);

  useEffect(() => {
    if (token) {
      fetchKeys();
      fetchUsers();
      fetchAnalytics();
    }
  }, [token]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKeyId(id);
    setTimeout(() => setCopiedKeyId(null), 2000);
  };

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
      if (!res.ok) throw new Error(data.error || 'Login failed');

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
      setLoginError(err.message);
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

  const fetchKeys = async () => {
    try {
      const res = await fetch(`${API_BASE}/keys`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (Array.isArray(data)) setKeys(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${API_BASE}/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (Array.isArray(data)) setUsersList(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const res = await fetch(`${API_BASE}/analytics`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setAnalytics(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleGenerateKeys = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch(`${API_BASE}/keys/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ durationDays: genDays, count: genCount, note: genNote })
      });
      const data = await res.json();
      if (res.status === 401 || res.status === 403) {
        alert(data.error || 'Account blocked or session expired.');
        handleLogout();
        return;
      }
      if (res.ok) {
        fetchKeys();
        fetchAnalytics();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleResetHwid = async (id: string) => {
    await fetch(`${API_BASE}/keys/reset-hwid`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id })
    });
    fetchKeys();
  };

  const handleDeleteKey = async (id: string) => {
    await fetch(`${API_BASE}/keys/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id })
    });
    fetchKeys();
    fetchAnalytics();
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/users/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          username: newUserUsername,
          password: newUserPassword,
          role: newUserRole,
          pin2fa: newUserPin,
          credits: newUserCredits
        })
      });
      if (res.ok) {
        setNewUserUsername('');
        setNewUserPassword('');
        setNewUserPin('');
        fetchUsers();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleBlock = async (userId: string, currentStatus: number) => {
    await fetch(`${API_BASE}/users/toggle-block`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ userId, isBlocked: currentStatus === 1 ? 0 : 1 })
    });
    fetchUsers();
  };

  const handleDeleteUser = async (userId: string, targetUsername: string) => {
    if (!confirm(`Are you sure you want to permanently delete user "${targetUsername}"?`)) return;
    try {
      const res = await fetch(`${API_BASE}/users/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete user');
      fetchUsers();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const filteredKeys = useMemo(() => {
    return keys.filter(k => {
      const matchesSearch = 
        k.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
        k.createdByUsername.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (k.note && k.note.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (k.hwid && k.hwid.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus = statusFilter === 'all' || k.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [keys, searchQuery, statusFilter]);

  if (!token) {
    return (
      <div className="min-h-screen bg-cyber-dark flex items-center justify-center p-4 relative overflow-hidden">
        {/* Glowing Background Orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl pointer-events-none animate-pulse-slow"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-600/20 rounded-full blur-3xl pointer-events-none animate-pulse-slow"></div>

        <div className="relative w-full max-w-md glass-card rounded-3xl p-8 shadow-glow-purple border border-purple-500/30">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-purple-500/10 border border-purple-500/40 flex items-center justify-center text-purple-400 shadow-glow-purple">
            <ShieldCheck className="w-10 h-10 animate-pulse" />
          </div>
          <h2 className="text-3xl font-extrabold text-center text-white tracking-tight">AXIOS EXECUTIVE</h2>
          <p className="text-xs text-center text-purple-300/80 mt-1 mb-8 uppercase font-mono tracking-widest">Enterprise Key & Reseller Management</p>

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
              Sign In to System
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
    <div className="min-h-screen bg-cyber-dark text-slate-100 font-sans pb-16">
      {/* Top Navbar */}
      <header className="border-b border-purple-500/20 bg-slate-950/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/40 flex items-center justify-center text-purple-400 shadow-glow-purple">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-wider text-white flex items-center">
                AXIOS PANEL <span className="ml-2 text-[10px] bg-purple-950 text-purple-300 border border-purple-500/40 px-2 py-0.5 rounded-md uppercase font-mono tracking-widest">{user.role}</span>
              </h1>
              <p className="text-[11px] text-slate-400">Security Engine & Reseller Network v2.0</p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="hidden sm:flex items-center space-x-2 bg-slate-900/80 border border-slate-800 px-3 py-1.5 rounded-xl">
              <UserCheck className="w-4 h-4 text-emerald-400" />
              <span className="text-xs text-slate-300">Active: <strong className="text-purple-300 font-mono">{user.username}</strong></span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center space-x-1.5 text-xs bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-800/40 px-3.5 py-2 rounded-xl transition"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 pt-8">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-3 mb-8 border-b border-slate-800/80 pb-4">
          <button
            onClick={() => setActiveTab('keys')}
            className={`flex items-center space-x-2 px-6 py-3 rounded-2xl font-bold text-sm transition-all ${
              activeTab === 'keys' ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-glow-purple' : 'glass-card text-slate-400 hover:text-white'
            }`}
          >
            <Key className="w-4 h-4" />
            <span>Key Management</span>
          </button>

          {(user.role === 'owner' || user.role === 'manager') && (
            <button
              onClick={() => setActiveTab('users')}
              className={`flex items-center space-x-2 px-6 py-3 rounded-2xl font-bold text-sm transition-all ${
                activeTab === 'users' ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-glow-purple' : 'glass-card text-slate-400 hover:text-white'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Reseller Network</span>
            </button>
          )}

          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center space-x-2 px-6 py-3 rounded-2xl font-bold text-sm transition-all ${
              activeTab === 'analytics' ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-glow-purple' : 'glass-card text-slate-400 hover:text-white'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Executive Analytics</span>
          </button>
        </div>

        {/* TAB 1: KEYS MANAGEMENT */}
        {activeTab === 'keys' && (
          <div className="space-y-8">
            {/* Generator Box */}
            <div className="glass-card rounded-3xl p-6 border border-purple-500/30">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center space-x-2">
                <Plus className="w-5 h-5 text-purple-400" />
                <span>Generate License Keys</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Duration</label>
                  <select
                    value={genDays}
                    onChange={(e) => setGenDays(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none"
                  >
                    <option value={1}>1 Day (Trial)</option>
                    <option value={7}>7 Days Key</option>
                    <option value={30}>30 Days (Monthly)</option>
                    <option value={0}>Lifetime Pass</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Quantity</label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={genCount}
                    onChange={(e) => setGenCount(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Customer Note / Tag</label>
                  <input
                    type="text"
                    placeholder="Reseller ref or buyer name..."
                    value={genNote}
                    onChange={(e) => setGenNote(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none"
                  />
                </div>

                <div className="flex items-end">
                  <button
                    onClick={handleGenerateKeys}
                    disabled={isGenerating}
                    className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold py-2.5 rounded-xl transition shadow-glow-purple flex items-center justify-center space-x-2"
                  >
                    {isGenerating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                    <span>{isGenerating ? 'Generating...' : 'Issue Keys Now'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Keys Table & Search */}
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
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white outline-none"
                    />
                  </div>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full sm:w-40 bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2.5 text-sm text-white outline-none"
                  >
                    <option value="all">All Statuses</option>
                    <option value="active">Active Only</option>
                    <option value="expired">Expired Only</option>
                  </select>
                </div>
                <span className="text-xs text-slate-400 font-mono">Showing {filteredKeys.length} of {keys.length} licenses</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 uppercase text-[11px] tracking-wider font-mono">
                    <tr>
                      <th className="p-4 rounded-l-2xl">License Key</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Device HWID</th>
                      <th className="p-4">Created By</th>
                      <th className="p-4">Expires</th>
                      <th className="p-4">Note</th>
                      <th className="p-4 rounded-r-2xl text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {filteredKeys.map((k) => (
                      <tr key={k.id} className="hover:bg-slate-800/40 transition">
                        <td className="p-4 font-mono font-bold text-purple-300 flex items-center space-x-2">
                          <span>{k.key}</span>
                          <button
                            onClick={() => copyToClipboard(k.key, k.id)}
                            className="text-slate-500 hover:text-purple-300 transition"
                          >
                            {copiedKeyId === k.id ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </td>
                        <td className="p-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                            k.status === 'active' ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/50' : 'bg-red-950/80 text-red-400 border border-red-800/50'
                          }`}>
                            {k.status}
                          </span>
                        </td>
                        <td className="p-4 font-mono text-xs text-slate-400">{k.hwid || <span className="text-slate-600">Unbound</span>}</td>
                        <td className="p-4 font-semibold text-white">{k.createdByUsername}</td>
                        <td className="p-4 text-xs text-slate-400">{k.expiresAt === 'never' ? 'Lifetime' : new Date(k.expiresAt).toLocaleDateString()}</td>
                        <td className="p-4 text-xs text-slate-400">{k.note}</td>
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
                            className="px-3 py-1.5 text-xs bg-red-950/50 hover:bg-red-900/80 text-red-400 border border-red-800/50 rounded-xl transition"
                          >
                            Delete
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

        {/* TAB 2: RESELLER NETWORK */}
        {activeTab === 'users' && (user.role === 'owner' || user.role === 'manager') && (
          <div className="space-y-8">
            {/* Create Account Form */}
            <div className="glass-card rounded-3xl p-6 border border-purple-500/30">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center space-x-2">
                <UserPlus className="w-5 h-5 text-purple-400" />
                <span>Create New Staff / Reseller</span>
              </h3>
              <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Username</label>
                  <input
                    type="text"
                    required
                    value={newUserUsername}
                    onChange={(e) => setNewUserUsername(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2 text-sm text-white outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Password</label>
                  <input
                    type="password"
                    required
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2 text-sm text-white outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Role</label>
                  <select
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2 text-sm text-white outline-none"
                  >
                    <option value="reseller">Reseller</option>
                    {user.role === 'owner' && <option value="manager">Manager</option>}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">2FA Dial PIN</label>
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="6 digits..."
                    value={newUserPin}
                    onChange={(e) => setNewUserPin(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2 text-sm text-white outline-none"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold py-2 rounded-xl transition shadow-glow-purple"
                  >
                    Add User
                  </button>
                </div>
              </form>
            </div>

            {/* Users Table */}
            <div className="glass-card rounded-3xl p-6 border border-slate-800">
              <h3 className="text-lg font-bold text-white mb-4">Reseller Accounts & Status</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 uppercase text-[11px] tracking-wider font-mono">
                    <tr>
                      <th className="p-4 rounded-l-2xl">Username</th>
                      <th className="p-4">Role</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Credits</th>
                      <th className="p-4">Registered Date</th>
                      <th className="p-4 rounded-r-2xl text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {usersList.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-800/40 transition">
                        <td className="p-4 font-bold text-white">{u.username}</td>
                        <td className="p-4 font-mono text-xs uppercase text-purple-400 font-bold">{u.role}</td>
                        <td className="p-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                            u.isBlocked === 1 ? 'bg-red-950 text-red-400 border border-red-800' : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          }`}>
                            {u.isBlocked === 1 ? 'BLOCKED' : 'ACTIVE'}
                          </span>
                        </td>
                        <td className="p-4 font-mono">{u.credits}</td>
                        <td className="p-4 text-xs text-slate-400">{new Date(u.createdAt).toLocaleDateString()}</td>
                        <td className="p-4 text-right space-x-2">
                          <button
                            onClick={() => handleToggleBlock(u.id, u.isBlocked)}
                            className={`px-3 py-1.5 text-xs rounded-xl font-bold transition ${
                              u.isBlocked === 1 ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800' : 'bg-amber-950/60 text-amber-300 border border-amber-800'
                            }`}
                          >
                            {u.isBlocked === 1 ? 'Unblock' : 'Block'}
                          </button>
                          {u.id !== user.id && u.role !== 'owner' && (user.role === 'owner' || (user.role === 'manager' && u.role === 'reseller')) && (
                            <button
                              onClick={() => handleDeleteUser(u.id, u.username)}
                              className="px-3 py-1.5 text-xs bg-red-950/60 hover:bg-red-900/80 text-red-400 border border-red-800/60 rounded-xl font-bold transition"
                            >
                              Delete
                            </button>
                          )}
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
        {activeTab === 'analytics' && analytics && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="glass-card rounded-3xl p-6 border border-purple-500/40 glow-purple">
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Total Issued Keys</span>
              <p className="text-4xl font-extrabold text-white mt-3 font-mono">{analytics.totalKeys}</p>
            </div>
            <div className="glass-card rounded-3xl p-6 border border-emerald-500/40 glow-emerald">
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Active Valid Licenses</span>
              <p className="text-4xl font-extrabold text-emerald-400 mt-3 font-mono">{analytics.activeKeys}</p>
            </div>
            <div className="glass-card rounded-3xl p-6 border border-amber-500/40 glow-amber">
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Bound Devices (HWID)</span>
              <p className="text-4xl font-extrabold text-amber-400 mt-3 font-mono">{analytics.boundDevices}</p>
            </div>
            <div className="glass-card rounded-3xl p-6 border border-red-500/40 glow-red">
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Expired / Banned</span>
              <p className="text-4xl font-extrabold text-red-400 mt-3 font-mono">{analytics.expiredKeys}</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
