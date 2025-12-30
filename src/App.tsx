import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import Landing from "./pages/Landing";
import WebResult from "./pages/WebResult";
import SingleWebResult from "./pages/SingleWebResult";
import Prelanding from "./pages/Prelanding";
import LinkRedirect from "./pages/LinkRedirect";
import BlogPage from "./pages/BlogPage";
import BlogByNumber from "./pages/BlogByNumber";
import FastMoney from "./pages/FastMoney";
import BlackPage from "./pages/BlackPage";
import RedirectHandler from "./pages/RedirectHandler";
import AdminLayout from "./pages/admin/AdminLayout";
import LandingContent from "./pages/admin/LandingContent";
import SearchButtons from "./pages/admin/SearchButtons";
import WebResults from "./pages/admin/WebResults";
import PreLandings from "./pages/admin/PreLandings";
import Blogs from "./pages/admin/Blogs";
import Analytics from "./pages/admin/Analytics";
import BulkWebResultEditor from "./pages/admin/BulkWebResultEditor";
import FallbackUrls from "./pages/admin/FallbackUrls";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function App() {
  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* WHITE PAGES - Fully crawlable, no redirects */}
              <Route path="/" element={<Navigate to="/landing" replace />} />
              <Route path="/landing" element={<Landing />} />
              <Route path="/webresult/:page" element={<WebResult />} />
              <Route path="/wr/:page" element={<WebResult />} />
              <Route path="/blog/:slug" element={<BlogPage />} />
              <Route path="/p" element={<BlogByNumber />} />
              
              {/* BLACK PAGES - noindex, nofollow */}
              <Route path="/go" element={<BlackPage />} />
              <Route path="/q" element={<BlackPage />} />
              
              {/* REDIRECT HANDLER - Server-side country detection */}
              <Route path="/r/:wrId" element={<SingleWebResult />} />
              <Route path="/redirect" element={<RedirectHandler />} />
              
              {/* UTILITY PAGES */}
              <Route path="/prelanding/:id" element={<Prelanding />} />
              <Route path="/lid" element={<LinkRedirect />} />
              <Route path="/fastmoney" element={<FastMoney />} />
              
              {/* ADMIN ROUTES - Not indexed */}
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<LandingContent />} />
                <Route path="landing" element={<LandingContent />} />
                <Route path="searches" element={<SearchButtons />} />
                <Route path="results" element={<WebResults />} />
                <Route path="prelandings" element={<PreLandings />} />
                <Route path="blogs" element={<Blogs />} />
                <Route path="analytics" element={<Analytics />} />
                <Route path="bulk-web-result-editor" element={<BulkWebResultEditor />} />
                <Route path="fallback-urls" element={<FallbackUrls />} />
              </Route>
              
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

export default App;
