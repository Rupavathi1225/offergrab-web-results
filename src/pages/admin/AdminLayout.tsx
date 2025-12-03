import { useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, 
  FileText, 
  MousePointer, 
  Globe, 
  BarChart3, 
  FileImage,
  Menu,
  X,
  ExternalLink,
  LogOut
} from "lucide-react";

const sidebarItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/admin' },
  { icon: FileText, label: 'Landing Content', path: '/admin/landing' },
  { icon: MousePointer, label: 'Search Buttons', path: '/admin/searches' },
  { icon: Globe, label: 'Web Results', path: '/admin/results' },
  { icon: FileImage, label: 'Pre-Landings', path: '/admin/prelandings' },
  { icon: BarChart3, label: 'Analytics', path: '/admin/analytics' },
];

const AdminLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside 
        className={`fixed inset-y-0 left-0 z-50 bg-sidebar border-r border-sidebar-border transition-all duration-300 ${
          sidebarOpen ? 'w-64' : 'w-0 md:w-20'
        } overflow-hidden`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-sidebar-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                <span className="text-primary font-bold text-xl">O</span>
              </div>
              {sidebarOpen && (
                <div>
                  <h1 className="font-display font-bold text-sidebar-foreground">OfferGrab</h1>
                  <p className="text-xs text-muted-foreground">Admin Panel</p>
                </div>
              )}
            </div>
          </div>

          {/* Nav Items */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {sidebarItems.map((item) => {
              const isActive = location.pathname === item.path || 
                (item.path !== '/admin' && location.pathname.startsWith(item.path));
              
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`sidebar-item w-full ${isActive ? 'active' : ''}`}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  {sidebarOpen && <span>{item.label}</span>}
                </button>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-sidebar-border space-y-2">
            <button
              onClick={() => window.open('/landing', '_blank')}
              className="sidebar-item w-full"
            >
              <ExternalLink className="w-5 h-5 flex-shrink-0" />
              {sidebarOpen && <span>View Site</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-0 md:ml-20'}`}>
        {/* Top Bar */}
        <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border h-16 flex items-center px-6">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-secondary rounded-lg transition-colors mr-4"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <h2 className="font-display font-semibold text-lg">
            {sidebarItems.find(item => 
              location.pathname === item.path || 
              (item.path !== '/admin' && location.pathname.startsWith(item.path))
            )?.label || 'Admin'}
          </h2>
        </header>

        {/* Page Content */}
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
