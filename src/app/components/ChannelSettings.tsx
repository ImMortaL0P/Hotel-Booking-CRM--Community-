import React, { useState, useEffect } from 'react';
import { Settings, Save, RefreshCw, Zap, ExternalLink } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { useData } from '../data/DataContext';

export function ChannelSettings() {
  const { user } = useData();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  
  const [config, setConfig] = useState({
    provider: 'STAAH',
    apiKey: '',
    apiEndpoint: '',
    propertyId: '',
    webhookSecret: '',
    isActive: false,
    roomTypeMappings: [],
    ratePlanMappings: []
  });

  useEffect(() => {
    loadConfig();
  }, []);

  const getHeaders = () => {
    return {
      'Content-Type': 'application/json',
      'x-user-id': user?.id || 'system',
      'x-user-name': user?.name || 'System Auto'
    };
  };

  const loadConfig = async () => {
    try {
      const data = await apiFetch('/api/channel/config');
      if (data) {
        setConfig({
          provider: data.provider || 'STAAH',
          apiKey: data.apiKey || '',
          apiEndpoint: data.apiEndpoint || '',
          propertyId: data.propertyId || '',
          webhookSecret: data.webhookSecret || '',
          isActive: data.isActive || false,
          roomTypeMappings: data.roomTypeMappings || [],
          ratePlanMappings: data.ratePlanMappings || []
        });
      }
    } catch (err) {
      toast.error('Failed to load channel configurations');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiFetch('/api/channel/config', {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(config)
      });
      toast.success('Channel manager settings saved successfully');
    } catch (err) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const res = await apiFetch('/api/channel/test', {
        method: 'POST',
        headers: getHeaders()
      });
      if (res.success) {
        toast.success(res.message);
      } else {
        toast.error(res.message || 'Connection test failed');
      }
    } catch (err) {
      toast.error('Test connection failed');
    } finally {
      setTesting(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await apiFetch('/api/channel/full-sync', {
        method: 'POST',
        headers: getHeaders()
      });
      if (res.success) {
        toast.success(res.message);
      } else {
        toast.error(res.message);
      }
    } catch (err) {
      toast.error('Failed to trigger full sync');
    } finally {
      setSyncing(false);
    }
  };

  if (loading) return <div className="p-8">Loading settings...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Channel Manager Integrations</h1>
        <p className="text-muted-foreground">Configure connection with Booking.com, Agoda, MakeMyTrip via a Channel Manager.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <form onSubmit={handleSave} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>API Configuration</CardTitle>
              <CardDescription>Setup your channel manager API credentials</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Provider</label>
                <select
                  value={config.provider}
                  onChange={e => setConfig({...config, provider: e.target.value})}
                  className="w-full px-3 py-2 border border-border rounded-md text-sm"
                >
                  <option value="STAAH">STAAH MAX (Recommended)</option>
                  <option value="eZee">eZee Centrix</option>
                  <option value="Beds24">Beds24</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">API Endpoint URL</label>
                <input
                  type="url"
                  value={config.apiEndpoint}
                  onChange={e => setConfig({...config, apiEndpoint: e.target.value})}
                  placeholder="https://api.channelmanager.com/v1"
                  className="w-full px-3 py-2 border border-border rounded-md text-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Property ID</label>
                <input
                  type="text"
                  value={config.propertyId}
                  onChange={e => setConfig({...config, propertyId: e.target.value})}
                  className="w-full px-3 py-2 border border-border rounded-md text-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">API Key</label>
                <input
                  type="password"
                  value={config.apiKey}
                  onChange={e => setConfig({...config, apiKey: e.target.value})}
                  className="w-full px-3 py-2 border border-border rounded-md text-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Webhook Secret</label>
                <input
                  type="text"
                  value={config.webhookSecret}
                  onChange={e => setConfig({...config, webhookSecret: e.target.value})}
                  className="w-full px-3 py-2 border border-border rounded-md text-sm"
                  placeholder="Signature secret for inbound verification"
                />
              </div>
              
              <div className="flex items-center gap-2 pt-4">
                <input 
                  type="checkbox"
                  id="isActive"
                  checked={config.isActive}
                  onChange={e => setConfig({...config, isActive: e.target.checked})}
                />
                <label htmlFor="isActive" className="text-sm font-medium">Integration Active</label>
              </div>

              <div className="flex gap-2 pt-4 justify-end border-t border-border mt-6">
                <button
                  type="button"
                  onClick={handleTest}
                  disabled={testing}
                  className="px-4 py-2 bg-secondary text-foreground text-sm rounded-md font-medium flex items-center justify-center min-w-[120px]"
                >
                  {testing ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Zap className="w-4 h-4 mr-2" />}
                  Test Ping
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-primary text-primary-foreground text-sm rounded-md font-medium flex items-center justify-center min-w-[120px]"
                >
                  {saving ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  Save Config
                </button>
              </div>
            </CardContent>
          </Card>
        </form>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Sync Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-muted/30 border border-border rounded-lg text-sm">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-muted-foreground">Inbound (Webhooks):</span>
                  <span className={config.isActive ? "text-green-600 font-medium" : "text-amber-600 font-medium"}>
                    {config.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-muted-foreground">Outbound (Updates):</span>
                  <span className={config.isActive ? "text-green-600 font-medium" : "text-amber-600 font-medium"}>
                    {config.isActive ? "Active (Delta mode)" : "Inactive"}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-border">
                  <span className="text-muted-foreground">Webhook Endpoint:</span>
                  <a href="#" className="text-blue-500 hover:underline flex items-center gap-1">
                    /api/channel/reservation <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleSync}
                  disabled={syncing || !config.isActive}
                  className={`w-full py-2.5 flex items-center justify-center text-sm font-medium rounded-md ${
                    !config.isActive ? 'bg-muted text-muted-foreground cursor-not-allowed' : 'bg-green-100 text-green-700 hover:bg-green-200'
                  }`}
                >
                  {syncing ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                  Trigger Full 365-Day Sync
                </button>
                <p className="text-xs text-muted-foreground text-center mt-2">
                  Only use full sync if there's a serious discrepancy. Normal operations sync automatically via deltas.
                </p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
             <CardHeader>
                <CardTitle>Room Mappings</CardTitle>
                <CardDescription>Link Sharda Palace rooms to Channel rooms</CardDescription>
             </CardHeader>
             <CardContent>
                <div className="text-sm p-4 bg-blue-50 text-blue-800 rounded-lg border border-blue-100">
                    Configuration mappings should only be done via the support agent after signing a contract with the channel manager provider. Changing these while active will cause inventory sync failures.
                </div>
             </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
