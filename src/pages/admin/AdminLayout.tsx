import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExternalLink, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

const tabs = [
  { label: 'Landing Content', path: '/admin/landing' },
  { label: 'Search Buttons', path: '/admin/searches' },
  { label: 'Web Results', path: '/admin/results' },
  { label: 'Pre-Landings', path: '/admin/prelandings' },
  { label: 'Analytics', path: '/admin/analytics' },
];

const AdminLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const getCurrentTab = () => {
    const currentTab = tabs.find(tab => location.pathname === tab.path);
    return currentTab?.path || '/admin/landing';
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-display font-bold text-foreground">Admin Panel</h1>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open('/landing', '_blank')}
                className="gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                View Site
              </Button>
              <Button variant="ghost" size="sm" className="gap-2">
                <LogOut className="w-4 h-4" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs Navigation */}
      <div className="container mx-auto px-4 py-6">
        <Tabs value={getCurrentTab()} className="w-full">
          <TabsList className="w-full justify-start bg-muted/50 p-1 h-auto flex-wrap">
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.path}
                value={tab.path}
                onClick={() => navigate(tab.path)}
                className="px-6 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* Page Content */}
        <div className="mt-6">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;
