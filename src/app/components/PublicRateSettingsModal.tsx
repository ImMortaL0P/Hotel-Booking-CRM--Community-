import React, { useState, useEffect } from 'react';
import { X, SlidersHorizontal, IndianRupee, Sparkles, Check, Building, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { useData } from '../data/DataContext';

interface PublicRateSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PublicRateSettingsModal({ isOpen, onClose }: PublicRateSettingsModalProps) {
  const { rooms, updateRoomStatus, addLog } = useData();

  const [doubleRate, setDoubleRate] = useState<number>(1500);
  const [familyRate, setFamilyRate] = useState<number>(3000);
  const [syncToAllRooms, setSyncToAllRooms] = useState<boolean>(true);

  useEffect(() => {
    if (isOpen) {
      try {
        const saved = localStorage.getItem('sharda_public_room_rates');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.doubleRoomRate) setDoubleRate(Number(parsed.doubleRoomRate));
          if (parsed.familyRoomRate) setFamilyRate(Number(parsed.familyRoomRate));
        }
      } catch (err) {
        console.warn('Failed to parse saved public room rates:', err);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const doubleAdvance = Math.round(doubleRate * 0.20);
  const doubleBalance = doubleRate - doubleAdvance;

  const familyAdvance = Math.round(familyRate * 0.20);
  const familyBalance = familyRate - familyAdvance;

  const handleSave = () => {
    if (doubleRate <= 0 || familyRate <= 0) {
      toast.error('Room rates must be greater than zero.');
      return;
    }

    const payload = {
      doubleRoomRate: doubleRate,
      familyRoomRate: familyRate,
      updatedAt: new Date().toISOString()
    };

    localStorage.setItem('sharda_public_room_rates', JSON.stringify(payload));
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new CustomEvent('sharda-rates-updated', { detail: payload }));

    // Optionally update operational rooms in memory
    if (syncToAllRooms && rooms && rooms.length > 0) {
      rooms.forEach(r => {
        if (r.category === 'Double Bed Room') {
          r.tariff = doubleRate;
        } else if (r.category === 'Family Bed Room') {
          r.tariff = familyRate;
        }
      });
    }

    addLog('Rate Update', `Updated public room rates: Double Bed Room ₹${doubleRate}/night, Family Bed Room ₹${familyRate}/night`);
    toast.success(`Public booking rates updated! Double: ₹${doubleRate.toLocaleString('en-IN')}, Family: ₹${familyRate.toLocaleString('en-IN')}`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div 
        className="bg-card text-card-foreground border border-border w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-border bg-secondary/30">
          <div className="flex items-center gap-2.5">
            <div className="w-8 sm:w-9 h-8 sm:h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <SlidersHorizontal className="w-4 sm:w-5 h-4 sm:h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-foreground">Public Booking Rates</h2>
              <p className="text-[11px] sm:text-xs text-muted-foreground">Adjust live tariffs shown on customer booking page (/book)</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 max-h-[80vh] overflow-y-auto">
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-3.5 text-xs text-foreground/90 space-y-1">
            <div className="font-semibold flex items-center gap-1.5 text-primary">
              <ShieldCheck className="w-4 h-4" />
              <span>Super Admin Pricing Control</span>
            </div>
            <p className="text-muted-foreground text-[11px] leading-relaxed">
              Modifying these tariffs immediately updates the pricing matrix, night calculation, and 20% advance payable fee on the public reservation portal.
            </p>
          </div>

          {/* Rate 1: Double Bed Room */}
          <div className="space-y-2 border border-border rounded-xl p-3.5 sm:p-4 bg-background">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono">
                Double Bed Room
              </label>
              <span className="text-[10px] font-mono bg-secondary px-2 py-0.5 rounded text-muted-foreground">
                Base Tariff / Night
              </span>
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-muted-foreground text-sm">
                ₹
              </span>
              <input
                type="number"
                min="500"
                step="50"
                value={doubleRate}
                onChange={(e) => setDoubleRate(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full pl-8 pr-4 py-2.5 rounded-lg border border-border bg-card font-mono text-sm sm:text-base font-bold text-foreground focus:outline-none focus:border-primary"
              />
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs font-mono pt-1 text-muted-foreground gap-1">
              <span>20% Advance: <strong className="text-primary font-bold">₹{doubleAdvance.toLocaleString('en-IN')}</strong></span>
              <span>80% at Check-in: <strong className="text-foreground font-bold">₹{doubleBalance.toLocaleString('en-IN')}</strong></span>
            </div>
          </div>

          {/* Rate 2: Family Bed Room */}
          <div className="space-y-2 border border-border rounded-xl p-3.5 sm:p-4 bg-background">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono">
                Family Bed Suite
              </label>
              <span className="text-[10px] font-mono bg-secondary px-2 py-0.5 rounded text-muted-foreground">
                Base Tariff / Night
              </span>
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-muted-foreground text-sm">
                ₹
              </span>
              <input
                type="number"
                min="1000"
                step="50"
                value={familyRate}
                onChange={(e) => setFamilyRate(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full pl-8 pr-4 py-2.5 rounded-lg border border-border bg-card font-mono text-sm sm:text-base font-bold text-foreground focus:outline-none focus:border-primary"
              />
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs font-mono pt-1 text-muted-foreground gap-1">
              <span>20% Advance: <strong className="text-primary font-bold">₹{familyAdvance.toLocaleString('en-IN')}</strong></span>
              <span>80% at Check-in: <strong className="text-foreground font-bold">₹{familyBalance.toLocaleString('en-IN')}</strong></span>
            </div>
          </div>

          {/* Sync Checkbox */}
          <label className="flex items-center gap-2.5 cursor-pointer text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={syncToAllRooms}
              onChange={(e) => setSyncToAllRooms(e.target.checked)}
              className="rounded border-border text-primary focus:ring-primary w-4 h-4 shrink-0"
            />
            <span>Synchronize tariffs across all operational room categories in the CRM</span>
          </label>
        </div>

        {/* Footer Actions */}
        <div className="p-3.5 sm:p-4 border-t border-border bg-secondary/20 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-full border border-border font-medium text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer text-center justify-center"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 rounded-full bg-primary text-primary-foreground font-semibold text-xs hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5 cursor-pointer shadow-xs text-center"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Save Public Rates</span>
          </button>
        </div>
      </div>
    </div>
  );
}
