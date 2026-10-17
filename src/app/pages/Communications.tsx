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
    <div className="space-y-6 h-full flex flex-col font-sans">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Communications</h1>
          <p className="text-sm text-muted-foreground mt-1">Automated & manual guest messaging across WhatsApp, SMS, and Email</p>
        </div>
        <button 
          onClick={() => setActiveTab('Compose')}
          className="pill-vermilion cursor-pointer"
        >
          <Send className="w-3.5 h-3.5" /> New Message
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 p-1 bg-secondary border border-border rounded-full shrink-0 overflow-x-auto w-max">
        {(['History', 'Compose', 'Templates'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-mono font-medium transition-all ${
              activeTab === tab ? 'bg-foreground text-background shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab === 'History' && <History className="w-3.5 h-3.5" />}
            {tab === 'Compose' && <Send className="w-3.5 h-3.5" />}
            {tab === 'Templates' && <FileText className="w-3.5 h-3.5" />}
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'History' && (
        <div className="bg-card border text-xs border-border rounded-xl overflow-hidden flex-1 flex flex-col shadow-sm">
          <div className="p-4 border-b border-border bg-card flex justify-between items-center">
            <h2 className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Message History</h2>
            <div className="relative w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input type="text" placeholder="Search logs..." className="w-full pl-9 pr-4 py-1.5 border border-border rounded-full bg-background focus:outline-none focus:border-primary text-xs font-mono" />
            </div>
          </div>
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left whitespace-nowrap">
              <thead className="bg-secondary/60 sticky top-0">
                <tr className="border-b border-border text-[11px] font-mono text-muted-foreground uppercase tracking-wider">
                  <th className="px-4 py-3">Channel</th>
                  <th className="px-4 py-3">Guest / Segment</th>
                  <th className="px-4 py-3">Template</th>
                  <th className="px-4 py-3">Sent At</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50 font-mono">
                {comms.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).map(c => {
                  const guest = guests.find(g => g.id === c.recipientId);
                  return (
                    <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 text-foreground font-medium">
                          {channelIcon[c.channel]} {c.channel}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-sans font-medium text-foreground">
                        {guest ? guest.name : c.recipientId}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {c.templateName}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {formatDate(c.timestamp)} {new Date(c.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </td>
                      <td className="px-4 py-3">
                        <span className="chip py-0.5 px-2">
                          {statusIcon[c.status]} {c.status}
                        </span>
                      </td>
                    </tr>
                  )
                })}
                {comms.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground font-mono">No communication history found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'Compose' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 h-0 overflow-y-auto pb-6">
          <div className="bg-card p-6 rounded-xl border border-border space-y-6 shadow-sm">
            <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground border-b border-border pb-2">Compose Message</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-2">1. Select Channel</label>
                <div className="flex gap-2">
                  {(['WhatsApp', 'SMS', 'Email'] as const).map(ch => (
                    <button
                      key={ch}
                      onClick={() => setChannel(ch)}
                      className={`flex-1 py-2.5 px-3 rounded-lg flex items-center justify-center gap-2 border text-xs font-medium transition-all
                        ${channel === ch ? 'bg-foreground text-background border-foreground shadow-sm' : 'bg-background border-border text-muted-foreground hover:text-foreground'}`}
                    >
                      {channelIcon[ch]} {ch}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-2">2. Recipients Target</label>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {(['Single', 'All Arriving Tomorrow', 'Balance Due'] as const).map(tgt => (
                    <button
                      key={tgt}
                      onClick={() => setRecipientFilter(tgt)}
                      className={`py-2 px-2 text-xs rounded-lg border font-mono transition-all ${recipientFilter === tgt ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border text-muted-foreground hover:text-foreground'}`}
                    >
                      {tgt}
                    </button>
                  ))}
                </div>
                
                {recipientFilter === 'Single' && (
                  <select 
                    value={selectedGuestId} 
                    onChange={e => setSelectedGuestId(e.target.value)}
                    className="w-full border border-border rounded-lg p-2.5 bg-background text-foreground text-sm focus:ring-1 focus:ring-primary focus:outline-none"
                  >
                    <option value="">-- Select Guest --</option>
                    {guests.map(g => (
                      <option key={g.id} value={g.id}>{g.name} ({g.phone})</option>
                    ))}
                  </select>
                )}
                {recipientFilter !== 'Single' && (
                  <div className="bg-muted/50 p-3 rounded-lg border border-border text-xs italic font-mono text-muted-foreground">
                    This message will be sent to the {recipientFilter.toLowerCase()} segment dynamically.
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-2">3. Template</label>
                <select 
                  value={selectedTemplate}
                  onChange={e => setSelectedTemplate(e.target.value)}
                  className="w-full border border-border rounded-lg p-2.5 mb-2 bg-background text-foreground text-sm focus:ring-1 focus:ring-primary focus:outline-none"
                >
                  {Object.keys(templates).map(k => (
                    <option key={k} value={k}>{k}</option>
                  ))}
                </select>
              </div>
              
              <button 
                onClick={handleSend}
                className="pill-vermilion w-full justify-center h-11 text-sm cursor-pointer mt-4"
              >
                <Send className="w-4 h-4 mr-1" /> Send Message
              </button>
            </div>
          </div>

          <div className="bg-card p-6 rounded-xl border border-border flex flex-col justify-between shadow-sm">
             <div>
               <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground border-b border-border pb-2 mb-4">Live Preview</h2>
               <div className="bg-background p-4 rounded-xl border border-border shadow-sm text-foreground text-sm leading-relaxed relative font-sans">
                 {getPreviewText()}
               </div>
             </div>
             
             <div className="mt-8 text-xs text-muted-foreground bg-secondary/50 p-4 rounded-lg border border-border">
               <p className="font-mono uppercase text-[10px] tracking-wider text-foreground mb-2">Available Merge Tags</p>
               <div className="flex flex-wrap gap-2 font-mono text-xs">
                 <span className="chip">{`{{guest_name}}`}</span>
                 <span className="chip">{`{{room}}`}</span>
                 <span className="chip">{`{{check_in}}`}</span>
                 <span className="chip">{`{{balance}}`}</span>
               </div>
             </div>
          </div>
        </div>
      )}

      {activeTab === 'Templates' && (
        <div className="bg-card p-6 rounded-xl border border-border flex-1 overflow-y-auto shadow-sm">
          <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground border-b border-border pb-2 mb-6">Message Templates</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(templates).map(([name, text]) => (
              <div key={name} className="border border-border rounded-xl p-4 flex flex-col hover:border-foreground/30 bg-background transition-all">
                <div className="font-semibold text-foreground text-sm mb-2">{name}</div>
                <div className="text-xs text-muted-foreground bg-card p-3 rounded-lg flex-1 whitespace-pre-wrap font-sans leading-relaxed border border-border/50">
                  {text}
                </div>
                <button className="mt-4 text-xs font-mono font-medium text-primary self-start uppercase tracking-wider hover:underline cursor-pointer">
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
