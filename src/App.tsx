import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Landing from "./pages/Landing";
import WebResult from "./pages/WebResult";
import SingleWebResult from "./pages/SingleWebResult";
import Prelanding from "./pages/Prelanding";
import LinkRedirect from "./pages/LinkRedirect";
import BlogPage from "./pages/BlogPage";
import BlogByNumber from "./pages/BlogByNumber";
import AdminLayout from "./pages/admin/AdminLayout";
import LandingContent from "./pages/admin/LandingContent";
import SearchButtons from "./pages/admin/SearchButtons";
import WebResults from "./pages/admin/WebResults";
import PreLandings from "./pages/admin/PreLandings";
import Blogs from "./pages/admin/Blogs";
import Analytics from "./pages/admin/Analytics";
import BulkWebResultEditor from "./pages/admin/BulkWebResultEditor";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/landing" replace />} />
            <Route path="/landing" element={<Landing />} />
            <Route path="/webresult/:page" element={<WebResult />} />
            {/* Masked/short alias for web results pages */}
            <Route path="/wr/:page" element={<WebResult />} />
            {/* Single web result page (used by copied links) */}
            <Route path="/r/:wrId" element={<SingleWebResult />} />
            <Route path="/prelanding/:id" element={<Prelanding />} />
            <Route path="/lid" element={<LinkRedirect />} />
            <Route path="/blog/:slug" element={<BlogPage />} />
            <Route path="/p" element={<BlogByNumber />} />
            {/* Admin Routes */}
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<LandingContent />} />
              <Route path="landing" element={<LandingContent />} />
              <Route path="searches" element={<SearchButtons />} />
              <Route path="results" element={<WebResults />} />
              <Route path="prelandings" element={<PreLandings />} />
              <Route path="blogs" element={<Blogs />} />
              <Route path="analytics" element={<Analytics />} />
              <Route path="bulk-web-result-editor" element={<BulkWebResultEditor />} />
            </Route>
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
