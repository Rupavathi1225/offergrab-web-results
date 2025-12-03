import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  MousePointer, 
  Users, 
  Eye, 
  Globe, 
  Smartphone, 
  Monitor,
  MapPin,
  Search,
  Link,
  Trash2
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { countries, getCountryName } from "@/lib/countries";

interface Session {
  id: string;
  session_id: string;
  ip_address: string | null;
  country: string;
  country_code: string;
  source: string;
  device: string;
  page_views: number;
  first_seen: string;
  last_active: string;
}

interface Click {
  id: string;
  session_id: string;
  click_type: string;
  item_id: string | null;
  item_name: string | null;
  page: string | null;
  lid: number | null;
  original_link: string | null;
  time_spent: number;
  clicked_at: string;
}

interface Stats {
  totalClicks: number;
  totalSessions: number;
  totalPageViews: number;
  uniqueCountries: number;
  mobileUsers: number;
  desktopUsers: number;
  relatedSearchClicks: number;
  resultClicks: number;
}

const Analytics = () => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [clicks, setClicks] = useState<Click[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalClicks: 0,
    totalSessions: 0,
    totalPageViews: 0,
    uniqueCountries: 0,
    mobileUsers: 0,
    desktopUsers: 0,
    relatedSearchClicks: 0,
    resultClicks: 0,
  });
  const [loading, setLoading] = useState(true);
  const [filterCountry, setFilterCountry] = useState('all');
  const [filterSource, setFilterSource] = useState('all');
  const [breakdownSession, setBreakdownSession] = useState<string | null>(null);
  const [breakdownType, setBreakdownType] = useState<'related_search' | 'web_result' | null>(null);
  const [breakdownClicks, setBreakdownClicks] = useState<Click[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [sessionsRes, clicksRes] = await Promise.all([
        supabase.from('sessions').select('*').order('last_active', { ascending: false }),
        supabase.from('clicks').select('*').order('clicked_at', { ascending: false }),
      ]);

      const sessionsData = sessionsRes.data || [];
      const clicksData = clicksRes.data || [];

      setSessions(sessionsData);
      setClicks(clicksData);

      const uniqueCountries = new Set(sessionsData.map(s => s.country));

      setStats({
        totalClicks: clicksData.length,
        totalSessions: sessionsData.length,
        totalPageViews: sessionsData.reduce((sum, s) => sum + s.page_views, 0),
        uniqueCountries: uniqueCountries.size,
        mobileUsers: sessionsData.filter(s => s.device === 'mobile').length,
        desktopUsers: sessionsData.filter(s => s.device === 'desktop').length,
        relatedSearchClicks: clicksData.filter(c => c.click_type === 'related_search').length,
        resultClicks: clicksData.filter(c => c.click_type === 'web_result').length,
      });
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const clearLogs = async () => {
    if (!confirm('Are you sure you want to clear all analytics data?')) return;

    try {
      await Promise.all([
        supabase.from('clicks').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
        supabase.from('sessions').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
      ]);

      setSessions([]);
      setClicks([]);
      setStats({
        totalClicks: 0,
        totalSessions: 0,
        totalPageViews: 0,
        uniqueCountries: 0,
        mobileUsers: 0,
        desktopUsers: 0,
        relatedSearchClicks: 0,
        resultClicks: 0,
      });

      toast({ title: "Cleared!", description: "All analytics data has been cleared." });
    } catch (error) {
      console.error('Error clearing:', error);
      toast({ title: "Error", description: "Failed to clear data.", variant: "destructive" });
    }
  };

  const openBreakdown = (sessionId: string, type: 'related_search' | 'web_result') => {
    const sessionClicks = clicks.filter(
      c => c.session_id === sessionId && c.click_type === type
    );
    setBreakdownClicks(sessionClicks);
    setBreakdownSession(sessionId);
    setBreakdownType(type);
  };

  const getSessionClicks = (sessionId: string, type: string) => {
    return clicks.filter(c => c.session_id === sessionId && c.click_type === type);
  };

  const getUniqueClicks = (sessionId: string, type: string) => {
    const sessionClicks = getSessionClicks(sessionId, type);
    const uniqueItems = new Set(sessionClicks.map(c => c.item_id || c.item_name));
    return uniqueItems.size;
  };

  const filteredSessions = sessions.filter(session => {
    if (filterCountry !== 'all' && session.country_code !== filterCountry) return false;
    if (filterSource !== 'all' && session.source !== filterSource) return false;
    return true;
  });

  const uniqueSources = [...new Set(sessions.map(s => s.source))];

  const statCards = [
    { icon: Users, label: 'Sessions', value: stats.totalSessions },
    { icon: Eye, label: 'Page Views', value: stats.totalPageViews },
    { icon: Globe, label: 'Unique Countries', value: stats.uniqueCountries },
    { icon: MousePointer, label: 'Total Clicks', value: stats.totalClicks },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-primary">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground mb-2">Analytics</h1>
          <p className="text-muted-foreground">Track visitor sessions and click activity</p>
        </div>
        <Button variant="outline" onClick={clearLogs}>
          <Trash2 className="w-4 h-4 mr-2" /> Clear Logs
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
          <div key={index} className="stat-card">
            <stat.icon className="w-5 h-5 text-primary mb-2" />
            <p className="text-3xl font-display font-bold text-primary mb-1">{stat.value}</p>
            <p className="text-muted-foreground text-sm">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="glass-card p-4">
        <h3 className="font-semibold text-foreground mb-4">Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-muted-foreground mb-1">Country</label>
            <Select value={filterCountry} onValueChange={setFilterCountry}>
              <SelectTrigger className="admin-input">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Countries</SelectItem>
                {countries.filter(c => c.code !== 'worldwide').map(country => (
                  <SelectItem key={country.code} value={country.code}>{country.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-sm text-muted-foreground mb-1">Source</label>
            <Select value={filterSource} onValueChange={setFilterSource}>
              <SelectTrigger className="admin-input">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                {uniqueSources.map(source => (
                  <SelectItem key={source} value={source}>{source}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Session Analytics */}
      <div className="glass-card p-6">
        <h3 className="font-semibold text-foreground mb-4">Session Analytics</h3>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Session ID</th>
                <th>IP Address</th>
                <th>Country</th>
                <th>Source</th>
                <th>Device</th>
                <th>Page Views</th>
                <th>Clicks</th>
                <th>Related Searches</th>
                <th>Result Clicks</th>
                <th>Last Active</th>
              </tr>
            </thead>
            <tbody>
              {filteredSessions.map((session) => {
                const rsClicks = getSessionClicks(session.session_id, 'related_search');
                const wrClicks = getSessionClicks(session.session_id, 'web_result');
                const totalClicks = rsClicks.length + wrClicks.length;
                
                return (
                  <tr key={session.id}>
                    <td className="font-mono text-xs">{session.session_id.substring(0, 12)}...</td>
                    <td className="font-mono text-xs">{session.ip_address || '-'}</td>
                    <td>
                      <span className="badge-primary">{session.country_code}</span>
                      <span className="text-xs text-muted-foreground ml-1">{session.country}</span>
                    </td>
                    <td>
                      <span className="badge-primary">{session.source}</span>
                    </td>
                    <td>
                      {session.device === 'mobile' ? (
                        <Smartphone className="w-4 h-4 text-primary inline" />
                      ) : (
                        <Monitor className="w-4 h-4 text-primary inline" />
                      )}
                      <span className="text-xs ml-1">{session.device}</span>
                    </td>
                    <td>{session.page_views}</td>
                    <td>{totalClicks}</td>
                    <td>
                      {rsClicks.length > 0 ? (
                        <div>
                          <span className="badge-warning">Total: {rsClicks.length}</span>
                          <button
                            onClick={() => openBreakdown(session.session_id, 'related_search')}
                            className="text-primary text-xs ml-2 hover:underline"
                          >
                            ▼ View breakdown
                          </button>
                          <div className="text-xs text-muted-foreground mt-1">
                            Unique: {getUniqueClicks(session.session_id, 'related_search')}
                          </div>
                        </div>
                      ) : '-'}
                    </td>
                    <td>
                      {wrClicks.length > 0 ? (
                        <div>
                          <span className="badge-success">Total: {wrClicks.length}</span>
                          <button
                            onClick={() => openBreakdown(session.session_id, 'web_result')}
                            className="text-primary text-xs ml-2 hover:underline"
                          >
                            ▼ View breakdown
                          </button>
                          <div className="text-xs text-muted-foreground mt-1">
                            Unique: {getUniqueClicks(session.session_id, 'web_result')}
                          </div>
                        </div>
                      ) : '-'}
                    </td>
                    <td className="text-xs text-muted-foreground">
                      {new Date(session.last_active).toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filteredSessions.length === 0 && (
            <p className="text-center text-muted-foreground py-8">No sessions found.</p>
          )}
        </div>
      </div>

      {/* Breakdown Dialog */}
      <Dialog open={!!breakdownSession} onOpenChange={() => setBreakdownSession(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {breakdownType === 'related_search' ? 'Related Searches' : 'Result Clicks'} Breakdown
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              Session: {breakdownSession?.substring(0, 12)}... | 
              Total: {breakdownClicks.length} | 
              Unique: {new Set(breakdownClicks.map(c => c.item_id || c.item_name)).size}
            </p>
          </DialogHeader>
          
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Item Clicked</th>
                  <th>Page</th>
                  <th>Item ID</th>
                </tr>
              </thead>
              <tbody>
                {breakdownClicks.map((click) => (
                  <tr key={click.id}>
                    <td className="text-xs">{new Date(click.clicked_at).toLocaleTimeString()}</td>
                    <td>
                      <span className="font-medium">{click.item_name || '-'}</span>
                      {click.click_type === 'related_search' && (
                        <span className="badge-primary text-[10px] ml-2">Category</span>
                      )}
                    </td>
                    <td className="text-xs text-muted-foreground">{click.page || '-'}</td>
                    <td className="font-mono text-xs">{click.item_id?.substring(0, 10)}...</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Analytics;
