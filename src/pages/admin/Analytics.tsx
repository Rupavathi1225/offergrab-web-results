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
  landing2Views: number;
  landing2Clicks: number;
  fallbackRedirects: number;
}

interface LastDayStats {
  newSessions: number;
  newPageViews: number;
  relatedSearchClicks: number;
  webResultClicks: number;
  thankyouViews: number;
  landing2Views: number;
  fallbackRedirects: number;
}

interface LastDayDetailClick {
  id: string;
  session_id: string;
  item_name: string | null;
  page: string | null;
  original_link: string | null;
  clicked_at: string;
}

interface EnhancedThankYouDetail {
  click: LastDayDetailClick;
  session: Session | null;
  duplicateCount: number;
  isFirstForSession: boolean;
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
    landing2Views: 0,
    landing2Clicks: 0,
    fallbackRedirects: 0,
  });
  const [lastDayStats, setLastDayStats] = useState<LastDayStats>({
    newSessions: 0,
    newPageViews: 0,
    relatedSearchClicks: 0,
    webResultClicks: 0,
    thankyouViews: 0,
    landing2Views: 0,
    fallbackRedirects: 0,
  });
  const [lastDayDetailOpen, setLastDayDetailOpen] = useState<'sessions' | 'page_views' | 'related_search' | 'web_result' | 'thankyou_view' | 'landing2_view' | 'fallback_redirect' | null>(null);
  const [lastDayDetailClicks, setLastDayDetailClicks] = useState<LastDayDetailClick[]>([]);
  const [lastDaySessions, setLastDaySessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCountry, setFilterCountry] = useState('all');
  const [filterSource, setFilterSource] = useState('all');
  const [breakdownSession, setBreakdownSession] = useState<string | null>(null);
  const [breakdownType, setBreakdownType] = useState<'related_search' | 'web_result' | 'landing2_view' | 'landing2_click' | 'fallback_redirect' | null>(null);
  const [breakdownClicks, setBreakdownClicks] = useState<Click[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch ALL sessions using pagination to avoid 1000 row limit
      let allSessions: Session[] = [];
      let allClicks: Click[] = [];
      
      // Fetch sessions with pagination
      let from = 0;
      const pageSize = 1000;
      let hasMoreSessions = true;
      
      while (hasMoreSessions) {
        const { data: sessionsBatch, error } = await supabase
          .from('sessions')
          .select('*')
          .order('last_active', { ascending: false })
          .range(from, from + pageSize - 1);
        
        if (error) throw error;
        
        if (sessionsBatch && sessionsBatch.length > 0) {
          allSessions = [...allSessions, ...sessionsBatch];
          from += pageSize;
          hasMoreSessions = sessionsBatch.length === pageSize;
        } else {
          hasMoreSessions = false;
        }
      }
      
      // Fetch clicks with pagination
      from = 0;
      let hasMoreClicks = true;
      
      while (hasMoreClicks) {
        const { data: clicksBatch, error } = await supabase
          .from('clicks')
          .select('*')
          .order('clicked_at', { ascending: false })
          .range(from, from + pageSize - 1);
        
        if (error) throw error;
        
        if (clicksBatch && clicksBatch.length > 0) {
          allClicks = [...allClicks, ...clicksBatch];
          from += pageSize;
          hasMoreClicks = clicksBatch.length === pageSize;
        } else {
          hasMoreClicks = false;
        }
      }

      const sessionsData = allSessions;
      const clicksData = allClicks;

      setSessions(sessionsData);
      setClicks(clicksData);

      const uniqueCountries = new Set(sessionsData.map(s => s.country));

      // "Last 1 day" == last 24 hours (rolling window)
      const cutoffMs = Date.now() - 24 * 60 * 60 * 1000;
      const isWithinLastDay = (iso: string) => {
        const t = new Date(iso).getTime();
        return Number.isFinite(t) && t >= cutoffMs;
      };

      const newSessions = sessionsData.filter(s => isWithinLastDay(s.first_seen));
      const activeSessionsLastDay = sessionsData.filter(s => isWithinLastDay(s.last_active));
      const clicksLastDay = clicksData.filter(c => isWithinLastDay(c.clicked_at));

      setLastDayStats({
        newSessions: newSessions.length,
        // Best available approximation with current schema: sum page_views for sessions active in the last 24h
        newPageViews: activeSessionsLastDay.reduce((sum, s) => sum + (s.page_views || 0), 0),
        relatedSearchClicks: clicksLastDay.filter(c => c.click_type === 'related_search').length,
        webResultClicks: clicksLastDay.filter(c => c.click_type === 'web_result').length,
        thankyouViews: clicksLastDay.filter(c => c.click_type === 'thankyou_view').length,
        landing2Views: clicksLastDay.filter(c => c.click_type === 'landing2_view').length,
        fallbackRedirects: clicksLastDay.filter(c => c.click_type === 'fallback_redirect').length,
      });

      setStats({
        totalClicks: clicksData.length,
        totalSessions: sessionsData.length,
        totalPageViews: sessionsData.reduce((sum, s) => sum + s.page_views, 0),
        uniqueCountries: uniqueCountries.size,
        mobileUsers: sessionsData.filter(s => s.device === 'mobile').length,
        desktopUsers: sessionsData.filter(s => s.device === 'desktop').length,
        relatedSearchClicks: clicksData.filter(c => c.click_type === 'related_search').length,
        resultClicks: clicksData.filter(c => c.click_type === 'web_result').length,
        landing2Views: clicksData.filter(c => c.click_type === 'landing2_view').length,
        landing2Clicks: clicksData.filter(c => c.click_type === 'landing2_click').length,
        fallbackRedirects: clicksData.filter(c => c.click_type === 'fallback_redirect').length,
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
        landing2Views: 0,
        landing2Clicks: 0,
        fallbackRedirects: 0,
      });

      toast({ title: "Cleared!", description: "All analytics data has been cleared." });
    } catch (error) {
      console.error('Error clearing:', error);
      toast({ title: "Error", description: "Failed to clear data.", variant: "destructive" });
    }
  };

  const openBreakdown = (sessionId: string, type: 'related_search' | 'web_result' | 'landing2_view' | 'landing2_click' | 'fallback_redirect') => {
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

  const openLastDayDetail = (type: 'sessions' | 'page_views' | 'related_search' | 'web_result' | 'thankyou_view' | 'landing2_view' | 'fallback_redirect') => {
    const cutoffMs = Date.now() - 24 * 60 * 60 * 1000;
    
    if (type === 'sessions' || type === 'page_views') {
      // For sessions/page_views, filter sessions
      const filtered = sessions.filter(s => {
        const t = new Date(type === 'sessions' ? s.first_seen : s.last_active).getTime();
        return Number.isFinite(t) && t >= cutoffMs;
      });
      setLastDaySessions(filtered);
      setLastDayDetailClicks([]);
    } else {
      // For click types, filter clicks
      const filtered = clicks.filter(c => {
        const t = new Date(c.clicked_at).getTime();
        return Number.isFinite(t) && t >= cutoffMs && c.click_type === type;
      });
      setLastDayDetailClicks(filtered);
      setLastDaySessions([]);
    }
    setLastDayDetailOpen(type);
  };

  const getDetailTitle = (type: string) => {
    switch (type) {
      case 'sessions': return 'New Sessions';
      case 'page_views': return 'Active Sessions (Page Views)';
      case 'related_search': return 'Related Searches Clicks';
      case 'web_result': return 'Web Results Clicks';
      case 'thankyou_view': return 'Thank You Page Views';
      case 'landing2_view': return '/q (Landing2) Views';
      case 'fallback_redirect': return 'Fallback Redirects';
      default: return 'Details';
    }
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
    { icon: Eye, label: '/landing2 Views', value: stats.landing2Views },
    { icon: Search, label: '/landing2 Clicks', value: stats.landing2Clicks },
    { icon: Link, label: 'Fallback Redirects', value: stats.fallbackRedirects },
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

      {/* Last 24 Hours */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-foreground">Last 24 Hours</h3>
          <span className="text-xs text-muted-foreground">Rolling window</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          {/* New Sessions - Clickable */}
          <div 
            className="stat-card cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all"
            onClick={() => openLastDayDetail('sessions')}
          >
            <div className="flex items-center justify-between w-full">
              <Users className="w-5 h-5 text-primary mb-2" />
              <span className="text-xs text-muted-foreground hover:text-primary">more →</span>
            </div>
            <p className="text-3xl font-display font-bold text-primary mb-1">{lastDayStats.newSessions}</p>
            <p className="text-muted-foreground text-sm">New sessions</p>
          </div>
          {/* Page Views - Clickable */}
          <div 
            className="stat-card cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all"
            onClick={() => openLastDayDetail('page_views')}
          >
            <div className="flex items-center justify-between w-full">
              <Eye className="w-5 h-5 text-primary mb-2" />
              <span className="text-xs text-muted-foreground hover:text-primary">more →</span>
            </div>
            <p className="text-3xl font-display font-bold text-primary mb-1">{lastDayStats.newPageViews}</p>
            <p className="text-muted-foreground text-sm">New page views</p>
          </div>
          {/* Related Searches - Clickable */}
          <div 
            className="stat-card cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all"
            onClick={() => openLastDayDetail('related_search')}
          >
            <div className="flex items-center justify-between w-full">
              <Search className="w-5 h-5 text-primary mb-2" />
              <span className="text-xs text-muted-foreground hover:text-primary">more →</span>
            </div>
            <p className="text-3xl font-display font-bold text-primary mb-1">{lastDayStats.relatedSearchClicks}</p>
            <p className="text-muted-foreground text-sm">Related searches</p>
          </div>
          {/* Web Results - Clickable */}
          <div 
            className="stat-card cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all"
            onClick={() => openLastDayDetail('web_result')}
          >
            <div className="flex items-center justify-between w-full">
              <Link className="w-5 h-5 text-primary mb-2" />
              <span className="text-xs text-muted-foreground hover:text-primary">more →</span>
            </div>
            <p className="text-3xl font-display font-bold text-primary mb-1">{lastDayStats.webResultClicks}</p>
            <p className="text-muted-foreground text-sm">Web results clicks</p>
          </div>
          {/* Thank You Views - Clickable */}
          <div 
            className="stat-card cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all"
            onClick={() => openLastDayDetail('thankyou_view')}
          >
            <div className="flex items-center justify-between w-full">
              <MousePointer className="w-5 h-5 text-emerald-500 mb-2" />
              <span className="text-xs text-muted-foreground hover:text-primary">more →</span>
            </div>
            <p className="text-3xl font-display font-bold text-emerald-500 mb-1">{lastDayStats.thankyouViews}</p>
            <p className="text-muted-foreground text-sm">Thank You views</p>
          </div>
          {/* Landing2 Views - Clickable */}
          <div 
            className="stat-card cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all"
            onClick={() => openLastDayDetail('landing2_view')}
          >
            <div className="flex items-center justify-between w-full">
              <Eye className="w-5 h-5 text-amber-500 mb-2" />
              <span className="text-xs text-muted-foreground hover:text-primary">more →</span>
            </div>
            <p className="text-3xl font-display font-bold text-amber-500 mb-1">{lastDayStats.landing2Views}</p>
            <p className="text-muted-foreground text-sm">/q Views</p>
          </div>
          {/* Fallback Redirects - Clickable */}
          <div 
            className="stat-card cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all"
            onClick={() => openLastDayDetail('fallback_redirect')}
          >
            <div className="flex items-center justify-between w-full">
              <Link className="w-5 h-5 text-rose-500 mb-2" />
              <span className="text-xs text-muted-foreground hover:text-primary">more →</span>
            </div>
            <p className="text-3xl font-display font-bold text-rose-500 mb-1">{lastDayStats.fallbackRedirects}</p>
            <p className="text-muted-foreground text-sm">Fallback redirects</p>
          </div>
        </div>
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
                <th>/landing2 Views</th>
                <th>/landing2 Clicks</th>
                <th>Fallback Redirects</th>
                <th>Last Active</th>
              </tr>
            </thead>
            <tbody>
              {filteredSessions.map((session) => {
                const rsClicks = getSessionClicks(session.session_id, 'related_search');
                const wrClicks = getSessionClicks(session.session_id, 'web_result');
                const l2Views = getSessionClicks(session.session_id, 'landing2_view');
                const l2Clicks = getSessionClicks(session.session_id, 'landing2_click');
                const fbRedirects = getSessionClicks(session.session_id, 'fallback_redirect');
                const totalClicks = rsClicks.length + wrClicks.length + l2Clicks.length;
                
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
                    <td>
                      {l2Views.length > 0 ? (
                        <div>
                          <span className="badge-primary">Total: {l2Views.length}</span>
                          <button
                            onClick={() => openBreakdown(session.session_id, 'landing2_view')}
                            className="text-primary text-xs ml-2 hover:underline"
                          >
                            ▼ View
                          </button>
                        </div>
                      ) : '-'}
                    </td>
                    <td>
                      {l2Clicks.length > 0 ? (
                        <div>
                          <span className="badge-warning">Total: {l2Clicks.length}</span>
                          <button
                            onClick={() => openBreakdown(session.session_id, 'landing2_click')}
                            className="text-primary text-xs ml-2 hover:underline"
                          >
                            ▼ View
                          </button>
                        </div>
                      ) : '-'}
                    </td>
                    <td>
                      {fbRedirects.length > 0 ? (
                        <div>
                          <span className="badge-success">Total: {fbRedirects.length}</span>
                          <button
                            onClick={() => openBreakdown(session.session_id, 'fallback_redirect')}
                            className="text-primary text-xs ml-2 hover:underline"
                          >
                            ▼ View
                          </button>
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
              {breakdownType === 'related_search' ? 'Related Searches' : 
               breakdownType === 'web_result' ? 'Result Clicks' :
               breakdownType === 'landing2_view' ? '/landing2 Views' :
               breakdownType === 'landing2_click' ? '/landing2 Clicks' :
               breakdownType === 'fallback_redirect' ? 'Fallback Redirects' : 'Clicks'} Breakdown
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

      {/* Last 24 Hours Detail Dialog */}
      <Dialog open={!!lastDayDetailOpen} onOpenChange={() => setLastDayDetailOpen(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {getDetailTitle(lastDayDetailOpen || '')} - Last 24 Hours
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              Total: {(lastDayDetailOpen === 'sessions' || lastDayDetailOpen === 'page_views') 
                ? lastDaySessions.length 
                : lastDayDetailClicks.length} {(lastDayDetailOpen === 'sessions' || lastDayDetailOpen === 'page_views') ? 'sessions' : 'events'} in the last 24 hours
            </p>
          </DialogHeader>
          
          <div className="overflow-x-auto">
            {/* Sessions/Page Views Table */}
            {(lastDayDetailOpen === 'sessions' || lastDayDetailOpen === 'page_views') ? (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Session ID</th>
                    <th>Country</th>
                    <th>Source</th>
                    <th>Device</th>
                    <th>Page Views</th>
                  </tr>
                </thead>
                <tbody>
                  {lastDaySessions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center text-muted-foreground py-8">
                        No sessions in the last 24 hours
                      </td>
                    </tr>
                  ) : (
                    lastDaySessions.map((session) => (
                      <tr key={session.id}>
                        <td className="text-xs">{new Date(lastDayDetailOpen === 'sessions' ? session.first_seen : session.last_active).toLocaleString()}</td>
                        <td className="font-mono text-xs">{session.session_id.substring(0, 16)}...</td>
                        <td>
                          <span className="badge-primary">{session.country_code}</span>
                        </td>
                        <td>
                          <span className="badge-primary">{session.source}</span>
                        </td>
                        <td className="text-xs">{session.device}</td>
                        <td className="text-xs font-medium">{session.page_views}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            ) : lastDayDetailOpen === 'thankyou_view' ? (
              /* Enhanced Thank You Views Table */
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Session ID</th>
                    <th>Country</th>
                    <th>Source</th>
                    <th>Device</th>
                    <th>IP Address</th>
                    <th>Page Path</th>
                    <th>Destination</th>
                    <th>Session Clicks</th>
                    <th>Duplicate?</th>
                  </tr>
                </thead>
                <tbody>
                  {lastDayDetailClicks.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="text-center text-muted-foreground py-8">
                        No Thank You views in the last 24 hours
                      </td>
                    </tr>
                  ) : (
                    (() => {
                      // Group by session_id to detect duplicates
                      const sessionClickCounts: Record<string, number> = {};
                      const sessionFirstClick: Record<string, string> = {};
                      
                      lastDayDetailClicks.forEach((click) => {
                        sessionClickCounts[click.session_id] = (sessionClickCounts[click.session_id] || 0) + 1;
                        if (!sessionFirstClick[click.session_id] || new Date(click.clicked_at) < new Date(sessionFirstClick[click.session_id])) {
                          sessionFirstClick[click.session_id] = click.clicked_at;
                        }
                      });
                      
                      return lastDayDetailClicks.map((click) => {
                        const sessionData = sessions.find(s => s.session_id === click.session_id);
                        const clickCount = sessionClickCounts[click.session_id];
                        const isFirstClick = sessionFirstClick[click.session_id] === click.clicked_at;
                        const isDuplicate = clickCount > 1 && !isFirstClick;
                        
                        return (
                          <tr key={click.id} className={isDuplicate ? 'opacity-60' : ''}>
                            <td className="text-xs whitespace-nowrap">{new Date(click.clicked_at).toLocaleString()}</td>
                            <td className="font-mono text-xs">{click.session_id.substring(0, 16)}...</td>
                            <td>
                              {sessionData ? (
                                <span className="badge-primary">{sessionData.country_code || 'XX'}</span>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                              <span className="text-xs text-muted-foreground ml-1">
                                {sessionData?.country || ''}
                              </span>
                            </td>
                            <td>
                              {sessionData ? (
                                <span className="badge-primary">{sessionData.source || 'direct'}</span>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </td>
                            <td className="text-xs">
                              {sessionData?.device || '-'}
                            </td>
                            <td className="font-mono text-xs">
                              {sessionData?.ip_address ? (
                                // Mask last octet for privacy
                                sessionData.ip_address.replace(/\.\d+$/, '.***')
                              ) : '-'}
                            </td>
                            <td className="text-xs text-muted-foreground">{click.page || '/ty'}</td>
                            <td className="text-xs">
                              {click.original_link ? (
                                <a 
                                  href={click.original_link} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-primary hover:underline truncate max-w-[150px] inline-block"
                                >
                                  {click.original_link.substring(0, 30)}...
                                </a>
                              ) : '-'}
                            </td>
                            <td className="text-xs">
                              <span className={clickCount > 1 ? 'text-amber-500 font-medium' : 'text-muted-foreground'}>
                                {clickCount}x
                              </span>
                            </td>
                            <td className="text-xs">
                              {isDuplicate ? (
                                <span className="badge bg-amber-500/20 text-amber-500 text-[10px] px-2 py-0.5 rounded">Duplicate</span>
                              ) : isFirstClick && clickCount > 1 ? (
                                <span className="badge bg-emerald-500/20 text-emerald-500 text-[10px] px-2 py-0.5 rounded">First</span>
                              ) : (
                                <span className="text-emerald-500">Unique</span>
                              )}
                            </td>
                          </tr>
                        );
                      });
                    })()
                  )}
                </tbody>
              </table>
            ) : (
              /* Clicks Table */
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Session ID</th>
                    {(lastDayDetailOpen === 'related_search' || lastDayDetailOpen === 'web_result') && <th>Item Name</th>}
                    <th>Page</th>
                    {lastDayDetailOpen === 'fallback_redirect' && <th>Redirect URL</th>}
                  </tr>
                </thead>
                <tbody>
                  {lastDayDetailClicks.length === 0 ? (
                    <tr>
                      <td colSpan={lastDayDetailOpen === 'fallback_redirect' ? 4 : (lastDayDetailOpen === 'related_search' || lastDayDetailOpen === 'web_result') ? 4 : 3} className="text-center text-muted-foreground py-8">
                        No events in the last 24 hours
                      </td>
                    </tr>
                  ) : (
                    lastDayDetailClicks.map((click) => (
                      <tr key={click.id}>
                        <td className="text-xs">{new Date(click.clicked_at).toLocaleString()}</td>
                        <td className="font-mono text-xs">{click.session_id.substring(0, 16)}...</td>
                        {(lastDayDetailOpen === 'related_search' || lastDayDetailOpen === 'web_result') && (
                          <td className="text-xs font-medium">{click.item_name || '-'}</td>
                        )}
                        <td className="text-xs text-muted-foreground">{click.page || '-'}</td>
                        {lastDayDetailOpen === 'fallback_redirect' && (
                          <td className="text-xs">
                            {click.original_link ? (
                              <a 
                                href={click.original_link} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-primary hover:underline truncate max-w-[200px] inline-block"
                              >
                                {click.original_link.substring(0, 40)}...
                              </a>
                            ) : '-'}
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Analytics;
