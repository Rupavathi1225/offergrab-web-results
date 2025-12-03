import { useEffect, useState } from "react";
import { 
  MousePointer, 
  Users, 
  Eye, 
  Globe, 
  Smartphone, 
  Monitor, 
  Search,
  Link
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

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

const Dashboard = () => {
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

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [clicksRes, sessionsRes] = await Promise.all([
        supabase.from('clicks').select('click_type'),
        supabase.from('sessions').select('device, country, page_views'),
      ]);

      const clicks = clicksRes.data || [];
      const sessions = sessionsRes.data || [];

      const countries = new Set(sessions.map(s => s.country));
      
      setStats({
        totalClicks: clicks.length,
        totalSessions: sessions.length,
        totalPageViews: sessions.reduce((sum, s) => sum + s.page_views, 0),
        uniqueCountries: countries.size,
        mobileUsers: sessions.filter(s => s.device === 'mobile').length,
        desktopUsers: sessions.filter(s => s.device === 'desktop').length,
        relatedSearchClicks: clicks.filter(c => c.click_type === 'related_search').length,
        resultClicks: clicks.filter(c => c.click_type === 'web_result').length,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { icon: MousePointer, label: 'Total Clicks', value: stats.totalClicks, color: 'text-primary' },
    { icon: Users, label: 'Sessions', value: stats.totalSessions, color: 'text-primary' },
    { icon: Eye, label: 'Page Views', value: stats.totalPageViews, color: 'text-primary' },
    { icon: Smartphone, label: 'Mobile', value: stats.mobileUsers, color: 'text-primary' },
    { icon: Monitor, label: 'Desktop', value: stats.desktopUsers, color: 'text-primary' },
    { icon: Globe, label: 'Countries', value: stats.uniqueCountries, color: 'text-primary' },
    { icon: Search, label: 'Related Searches', value: stats.relatedSearchClicks, color: 'text-primary' },
    { icon: Link, label: 'Result Clicks', value: stats.resultClicks, color: 'text-primary' },
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
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground mb-2">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your website analytics</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
          <div key={index} className="stat-card">
            <div className="flex items-center gap-3 mb-3">
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
            <p className="text-3xl font-display font-bold text-primary mb-1">
              {stat.value}
            </p>
            <p className="text-muted-foreground text-sm">{stat.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
