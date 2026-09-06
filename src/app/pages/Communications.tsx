import { useState } from 'react';
import { useData } from '../data/DataContext';
import { formatDate } from '../lib/utils';
import { Send, Phone, MessageSquare, Mail, History, FileText, CheckCircle2, Clock, XCircle, Search } from 'lucide-react';
import { toast } from 'sonner';

export function Communications() {
  const { comms, guests, addComm } = useData();
  const [activeTab, setActiveTab] = useState<'Compose' | 'Templates' | 'History'>('History');
  
  // Compose State
  const [channel, setChannel] = useState<'WhatsApp' | 'SMS' | 'Email'>('WhatsApp');
  const [recipientFilter, setRecipientFilter] = useState<'Single' | 'All Arriving Tomorrow' | 'Balance Due'>('Single');
  const [selectedGuestId, setSelectedGuestId] = useState<string>('');
  const [selectedTemplate, setSelectedTemplate] = useState('Booking Confirmation');
  const [customMessage, setCustomMessage] = useState('');

  const templates = {
    'Booking Confirmation': 'Dear {{guest_name}}, your booking is confirmed for {{check_in}}. Room: {{room}}. Thank you for choosing Sharda Palace, Deoghar. 🙏',
    'Check-in Reminder': 'Dear {{guest_name}}, we look forward to welcoming you to Sharda Palace tomorrow! Check-in starts at 12:00 PM.',
    'Thank You / Post-Stay': 'Dear {{guest_name}}, thank you for staying at Sharda Palace. We hope you had a divine darshan of Baba Baidyanath. Please visit again! 🙏',
    'Payment Reminder': 'Dear {{guest_name}}, this is a gentle reminder that an amount of {{balance}} is pending towards your stay. Kindly clear it soon.',
    'Festival Greeting': 'Wishing you and your family a very Happy Festival from the team at Sharda Palace, Deoghar.'
  };

  const handleSend = () => {
    if (recipientFilter === 'Single' && !selectedGuestId) {
      toast.error('Please select a recipient');
      return;
    }
    
    // Mock sending
    addComm({
      channel,
      recipientId: recipientFilter === 'Single' ? selectedGuestId : 'Bulk Segment',
      templateName: selectedTemplate,
      status: 'Sent',
    });
    
    toast.success(`Message sent via ${channel}`);
    setActiveTab('History');
  };

  const getPreviewText = () => {
    let text = templates[selectedTemplate as keyof typeof templates] || '';
    let guestName = 'Guest';
    let room = '101';
    let checkIn = '02 Sept 2026';
    let balance = '₹1,500';

    if (recipientFilter === 'Single' && selectedGuestId) {
      const g = guests.find(gx => gx.id === selectedGuestId);
      if (g) guestName = g.name.split(' ')[0];
    }

    return text
      .replace('{{guest_name}}', guestName)
      .replace('{{room}}', room)
      .replace('{{check_in}}', checkIn)
      .replace('{{balance}}', balance);
  };

  const channelIcon = {
    'Email': <Mail className="w-4 h-4" />,
    'WhatsApp': <MessageSquare className="w-4 h-4" />,
    'SMS': <Phone className="w-4 h-4" />
  };
  
  const statusIcon = {
    'Delivered': <CheckCircle2 className="w-4 h-4 text-green-500" />,
    'Sent': <Clock className="w-4 h-4 text-blue-500" />,
    'Failed': <XCircle className="w-4 h-4 text-red-500" />
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Communications</h1>
          <p className="text-sm text-gray-500">Manage guest messaging via WhatsApp, SMS, and Email.</p>
        </div>
        <button 
          onClick={() => setActiveTab('Compose')}
          className="bg-primary text-primary-foreground px-4 py-2 rounded-md font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-colors"
        >
          <Send className="w-4 h-4" /> New Message
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-card border border-border rounded-lg shrink-0 overflow-x-auto w-max">
        {(['History', 'Compose', 'Templates'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab ? 'bg-background text-primary' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            {tab === 'History' && <History className="w-4 h-4" />}
            {tab === 'Compose' && <Send className="w-4 h-4" />}
            {tab === 'Templates' && <FileText className="w-4 h-4" />}
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'History' && (
        <div className="bg-card border text-sm border-border rounded-lg overflow-hidden flex-1 flex flex-col">
          <div className="p-4 border-b border-border bg-background flex justify-between items-center">
            <h2 className="font-bold text-foreground">Message History</h2>
            <div className="relative w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" placeholder="Search logs..." className="w-full pl-9 pr-4 py-1.5 border border-border rounded focus:outline-none focus:border-primary text-sm" />
            </div>
          </div>
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left whitespace-nowrap">
              <thead className="bg-background sticky top-0">
                <tr className="border-b border-border text-xs font-semibold text-gray-600 uppercase">
                  <th className="px-4 py-3">Channel</th>
                  <th className="px-4 py-3">Guest / Segment</th>
                  <th className="px-4 py-3">Template</th>
                  <th className="px-4 py-3">Sent At</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {comms.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).map(c => {
                  const guest = guests.find(g => g.id === c.recipientId);
                  return (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 text-gray-700 font-medium h-full">
                          {channelIcon[c.channel]} {c.channel}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-semibold text-gray-900">
                        {guest ? guest.name : c.recipientId}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {c.templateName}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-sm">
                        {formatDate(c.timestamp)} {new Date(c.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 text-sm font-medium">
                          {statusIcon[c.status]} {c.status}
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {comms.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">No communication history found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'Compose' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 h-0 overflow-y-auto pb-6">
          <div className="bg-card p-6 rounded-lg border border-border space-y-6">
            <h2 className="font-bold text-lg text-primary border-b border-border pb-2">Compose Message</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">1. Select Channel</label>
                <div className="flex gap-4">
                  {(['WhatsApp', 'SMS', 'Email'] as const).map(ch => (
                    <button
                      key={ch}
                      onClick={() => setChannel(ch)}
                      className={`flex-1 py-3 px-4 rounded-lg flex items-center justify-center gap-2 border font-medium transition-colors
                        ${channel === ch ? 'bg-background border-primary text-primary' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'}`}
                    >
                      {channelIcon[ch]} {ch}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">2. Recipients Target</label>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {(['Single', 'All Arriving Tomorrow', 'Balance Due'] as const).map(tgt => (
                    <button
                      key={tgt}
                      onClick={() => setRecipientFilter(tgt)}
                      className={`py-2 px-2 text-sm rounded border font-medium ${recipientFilter === tgt ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-card border-border text-gray-600'}`}
                    >
                      {tgt}
                    </button>
                  ))}
                </div>
                
                {recipientFilter === 'Single' && (
                  <select 
                    value={selectedGuestId} 
                    onChange={e => setSelectedGuestId(e.target.value)}
                    className="w-full border border-border rounded-md p-2 focus:ring-primary focus:border-primary"
                  >
                    <option value="">-- Select Guest --</option>
                    {guests.map(g => (
                      <option key={g.id} value={g.id}>{g.name} ({g.phone})</option>
                    ))}
                  </select>
                )}
                {recipientFilter !== 'Single' && (
                  <div className="bg-gray-50 p-3 rounded border border-gray-200 text-sm italic text-gray-600">
                    This message will be sent to the {recipientFilter.toLowerCase()} segment dynamically.
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">3. Template</label>
                <select 
                  value={selectedTemplate}
                  onChange={e => setSelectedTemplate(e.target.value)}
                  className="w-full border border-border rounded-md p-2 mb-2 focus:ring-primary focus:border-primary"
                >
                  {Object.keys(templates).map(k => (
                    <option key={k} value={k}>{k}</option>
                  ))}
                </select>
              </div>
              
              <button 
                onClick={handleSend}
                className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-bold flex items-center justify-center gap-2 hover:opacity-90 shadow-md transition-colors mt-6"
              >
                <Send className="w-5 h-5" /> Send Message
              </button>
            </div>
          </div>

          <div className="bg-background p-6 rounded-lg border border-border flex flex-col justify-between">
             <div>
               <h2 className="font-bold text-lg text-primary border-b border-white pb-2 mb-4">Live Preview</h2>
               <div className="bg-card p-4 rounded-lg border border-border shadow-sm text-gray-800 leading-relaxed relative">
                 {/* Tail for preview bubble based on channel */}
                 <div className="absolute top-4 -left-2 w-4 h-4 bg-card border-l border-b border-border rotate-45"></div>
                 {getPreviewText()}
               </div>
             </div>
             
             <div className="mt-8 text-sm text-gray-500 bg-card/50 p-4 rounded border border-gray-100">
               <p className="font-semibold text-gray-700 mb-1">Available Merge Tags:</p>
               <div className="flex flex-wrap gap-2 font-mono text-xs text-primary">
                 <span className="bg-red-50 px-1 py-0.5 rounded px-2">{`{{guest_name}}`}</span>
                 <span className="bg-red-50 px-1 py-0.5 rounded px-2">{`{{room}}`}</span>
                 <span className="bg-red-50 px-1 py-0.5 rounded px-2">{`{{check_in}}`}</span>
                 <span className="bg-red-50 px-1 py-0.5 rounded px-2">{`{{balance}}`}</span>
               </div>
             </div>
          </div>
        </div>
      )}

      {activeTab === 'Templates' && (
        <div className="bg-card p-6 rounded-lg border border-border flex-1 overflow-y-auto">
          <h2 className="font-bold text-lg text-primary border-b border-border pb-2 mb-6">Message Templates</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(templates).map(([name, text]) => (
              <div key={name} className="border border-border rounded-lg p-4 flex flex-col hover:border-primary transition-colors">
                <div className="font-bold text-gray-900 mb-2 truncate">{name}</div>
                <div className="text-sm text-gray-600 bg-background p-3 rounded-md flex-1 whitespace-pre-wrap font-sans">
                  {text}
                </div>
                <button className="mt-4 text-xs font-semibold text-primary self-start uppercase tracking-wider hover:underline">
                  Edit Template
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
