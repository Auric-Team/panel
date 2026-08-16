"use client";

import React, { useState } from 'react';
import { KeyItem, UserItem } from '@/types/key';
import { KeyGenerator } from '@/components/KeyGenerator';
import { KeysTable } from '@/components/KeysTable';
import { KeyExtendModal } from '@/components/KeyExtendModal';
import { ShareKeyModal } from '@/components/ShareKeyModal';
import { PaymentScreenshotModal } from '@/components/PaymentScreenshotModal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/ToastContext';

interface KeyManagementProps {
  user: UserItem | null;
  keys: KeyItem[];
  onGenerate: (
    duration: string,
    count: number,
    note: string,
    paymentScreenshot: string | null,
    isMasterKey: boolean,
    prefix?: string,
    format?: 'hyphenated' | 'raw16' | 'uuid'
  ) => Promise<void>;
  isGenerating: boolean;
  generatedKeys: string[];
  onResetHwid: (id: string) => Promise<void> | void;
  onDeleteKey: (id: string) => Promise<void> | void;
  onDeleteExpiredKeys?: () => Promise<void> | void;
  onExtendKey?: (id: string, additionalDays: number, note?: string) => Promise<void>;
  onUpdateKeyNote?: (id: string, note: string) => Promise<void>;
  onUpdateReceipt?: (keyId: string, paymentScreenshot: string) => Promise<void>;
  onBulkResetHwid?: (ids: string[]) => Promise<void>;
  onBulkDeleteKeys?: (ids: string[]) => Promise<void>;
  onBulkExtendKeys?: (ids: string[], days: number) => Promise<void>;
  onOpenProofModal?: (key: KeyItem) => void;
}

export const KeyManagement: React.FC<KeyManagementProps> = ({
  user,
  keys,
  onGenerate,
  isGenerating,
  generatedKeys,
  onResetHwid,
  onDeleteKey,
  onDeleteExpiredKeys,
  onExtendKey,
  onUpdateKeyNote,
  onUpdateReceipt,
  onBulkResetHwid,
  onBulkDeleteKeys,
  onBulkExtendKeys,
}) => {
  const { toast } = useToast();

  // Modals state
  const [selectedProofKey, setSelectedProofKey] = useState<KeyItem | null>(null);
  const [selectedExtendKey, setSelectedExtendKey] = useState<KeyItem | null>(null);
  const [selectedShareKey, setSelectedShareKey] = useState<KeyItem | null>(null);

  // Confirm Dialog State
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    variant: 'danger' | 'warning' | 'info';
    confirmText: string;
    onConfirm: () => Promise<void>;
  }>({
    isOpen: false,
    title: '',
    description: '',
    variant: 'danger',
    confirmText: 'Confirm',
    onConfirm: async () => {},
  });

  const [isProcessingAction, setIsProcessingAction] = useState(false);

  // Single HWID Reset Confirm
  const handlePromptResetHwid = (keyId: string) => {
    const target = keys.find((k) => k.id === keyId);
    setConfirmDialog({
      isOpen: true,
      title: 'Reset Hardware ID (HWID)',
      description: `Are you sure you want to unbind the device HWID for license key:\n${target?.key || keyId}\n\nThis will allow the customer to activate on a new device.`,
      variant: 'warning',
      confirmText: 'Reset HWID',
      onConfirm: async () => {
        setIsProcessingAction(true);
        try {
          await onResetHwid(keyId);
          toast.success('Hardware ID (HWID) reset successfully.');
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        } catch (err: any) {
          toast.error(err?.message || 'Failed to reset HWID');
        } finally {
          setIsProcessingAction(false);
        }
      },
    });
  };

  // Single Key Delete Confirm
  const handlePromptDeleteKey = (keyId: string) => {
    const target = keys.find((k) => k.id === keyId);
    setConfirmDialog({
      isOpen: true,
      title: 'Delete License Key',
      description: `Are you sure you want to permanently revoke and delete license key:\n${target?.key || keyId}\n\nThis action cannot be undone.`,
      variant: 'danger',
      confirmText: 'Delete Key',
      onConfirm: async () => {
        setIsProcessingAction(true);
        try {
          await onDeleteKey(keyId);
          toast.success('License key revoked and deleted.');
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        } catch (err: any) {
          toast.error(err?.message || 'Failed to delete key');
        } finally {
          setIsProcessingAction(false);
        }
      },
    });
  };

  // Purge All Expired Keys Confirm
  const handlePromptDeleteExpiredKeys = () => {
    const now = new Date();
    const expiredCount = keys.filter(
      (k) => k.status === 'expired' || (k.expiresAt && k.expiresAt !== 'never' && new Date(k.expiresAt) <= now)
    ).length;

    if (expiredCount === 0) {
      toast.info('No expired keys found to clean up.');
      return;
    }

    setConfirmDialog({
      isOpen: true,
      title: `Purge ${expiredCount} Expired Keys`,
      description: `Are you sure you want to permanently delete all ${expiredCount} expired license keys at once?\n\nActive keys will NOT be affected.`,
      variant: 'danger',
      confirmText: `Purge ${expiredCount} Keys`,
      onConfirm: async () => {
        if (!onDeleteExpiredKeys) return;
        setIsProcessingAction(true);
        try {
          await onDeleteExpiredKeys();
          toast.success(`Purged ${expiredCount} expired keys.`);
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        } catch (err: any) {
          toast.error(err?.message || 'Failed to delete expired keys');
        } finally {
          setIsProcessingAction(false);
        }
      },
    });
  };

  // Bulk HWID Reset Confirm
  const handleBulkResetHwidPrompt = async (ids: string[]) => {
    setConfirmDialog({
      isOpen: true,
      title: `Reset HWID for ${ids.length} Keys`,
      description: `Are you sure you want to reset HWID bindings for ${ids.length} selected license keys?`,
      variant: 'warning',
      confirmText: 'Reset HWID',
      onConfirm: async () => {
        if (!onBulkResetHwid) return;
        setIsProcessingAction(true);
        try {
          await onBulkResetHwid(ids);
          toast.success(`Successfully reset HWID for ${ids.length} keys.`);
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        } catch (err: any) {
          toast.error(err?.message || 'Bulk HWID reset failed');
        } finally {
          setIsProcessingAction(false);
        }
      },
    });
  };

  // Bulk Delete Confirm
  const handleBulkDeletePrompt = async (ids: string[]) => {
    setConfirmDialog({
      isOpen: true,
      title: `Delete ${ids.length} Keys`,
      description: `Are you sure you want to permanently delete ${ids.length} selected license keys? This action cannot be undone.`,
      variant: 'danger',
      confirmText: `Delete ${ids.length} Keys`,
      onConfirm: async () => {
        if (!onBulkDeleteKeys) return;
        setIsProcessingAction(true);
        try {
          await onBulkDeleteKeys(ids);
          toast.success(`Successfully deleted ${ids.length} keys.`);
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        } catch (err: any) {
          toast.error(err?.message || 'Bulk delete failed');
        } finally {
          setIsProcessingAction(false);
        }
      },
    });
  };

  // Bulk Extend
  const handleBulkExtend = async (ids: string[], days: number) => {
    if (!onBulkExtendKeys) return;
    try {
      await onBulkExtendKeys(ids, days);
      toast.success(`Extended ${ids.length} keys by +${days} days.`);
    } catch (err: any) {
      toast.error(err?.message || 'Bulk extension failed');
    }
  };

  return (
    <div className="space-y-6">
      {/* Studio Key Generator */}
      <KeyGenerator
        user={user}
        onGenerate={onGenerate}
        isGenerating={isGenerating}
        generatedKeys={generatedKeys}
      />

      {/* Key Table & Registry */}
      <KeysTable
        keys={keys}
        onResetHwid={handlePromptResetHwid}
        onDeleteKey={handlePromptDeleteKey}
        onDeleteExpiredKeys={handlePromptDeleteExpiredKeys}
        onOpenProofModal={(k) => setSelectedProofKey(k)}
        onOpenExtendModal={(k) => setSelectedExtendKey(k)}
        onOpenShareModal={(k) => setSelectedShareKey(k)}
        onBulkResetHwid={handleBulkResetHwidPrompt}
        onBulkDeleteKeys={handleBulkDeletePrompt}
        onBulkExtendKeys={handleBulkExtend}
        onUpdateReceipt={onUpdateReceipt}
      />

      {/* Proof Image Lightbox Modal */}
      <PaymentScreenshotModal
        isOpen={!!selectedProofKey}
        keyItem={selectedProofKey}
        onClose={() => setSelectedProofKey(null)}
        onUpdateReceipt={async (keyId, base64) => {
          if (onUpdateReceipt) {
            await onUpdateReceipt(keyId, base64);
            setSelectedProofKey((prev) => (prev ? { ...prev, paymentScreenshot: base64 } : null));
          }
        }}
      />

      {/* Key Extension & Note Editor Modal */}
      {selectedExtendKey && onExtendKey && (
        <KeyExtendModal
          isOpen={!!selectedExtendKey}
          keyItem={selectedExtendKey}
          currentUser={user}
          onClose={() => setSelectedExtendKey(null)}
          onExtend={async (keyId, days, note) => {
            await onExtendKey(keyId, days, note);
            toast.success(`License extended by +${days} days.`);
          }}
          onUpdateNote={onUpdateKeyNote}
        />
      )}

      {/* Share Key Formatted Modal */}
      <ShareKeyModal
        isOpen={!!selectedShareKey}
        keyItem={selectedShareKey}
        onClose={() => setSelectedShareKey(null)}
        onCopyNotice={(msg) => toast.success(msg)}
      />

      {/* Custom Global Action Confirmation Modal */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        description={confirmDialog.description}
        variant={confirmDialog.variant}
        confirmText={confirmDialog.confirmText}
        isLoading={isProcessingAction}
        onConfirm={confirmDialog.onConfirm}
        onClose={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};
