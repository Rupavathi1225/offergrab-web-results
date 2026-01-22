import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";
import ThemedHomepage from "./pages/ThemedHomepage";
import UniversalBlogPage from "./pages/UniversalBlogPage";
import Landing from "./pages/Landing";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import AboutUs from "./pages/AboutUs";
import WebResult from "./pages/WebResult";
import SingleWebResult from "./pages/SingleWebResult";
import ThankYou from "./pages/ThankYou";
import Prelanding from "./pages/Prelanding";
import LinkRedirect from "./pages/LinkRedirect";
import BlogPage from "./pages/BlogPage";
import BlogByNumber from "./pages/BlogByNumber";
import FastMoney from "./pages/FastMoney";
import Landing2 from "./pages/Landing2";
import LegacyWebResultRedirect from "./pages/LegacyWebResultRedirect";
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
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Homepage - theme dependent */}
              <Route path="/" element={<ThemedHomepage />} />
              <Route path="/landing" element={<Landing />} />
              
              {/* Blog routes - all three URL patterns work */}
              <Route path="/blog/:slug" element={<BlogPage />} />
              <Route path="/bl/:slug" element={<UniversalBlogPage />} />
              
              {/* Legacy shared links (keep working) */}
              <Route path="/webresult/:page/:wbr" element={<LegacyWebResultRedirect />} />
              <Route path="/wr/:page/:wbr" element={<WebResult />} />
              {/* Single web result page (used by copied links) */}
              <Route path="/r/:wrId" element={<SingleWebResult />} />
              <Route path="/prelanding/:id" element={<Prelanding />} />
              <Route path="/lid" element={<LinkRedirect />} />
              <Route path="/p" element={<BlogByNumber />} />
              <Route path="/fastmoney" element={<FastMoney />} />
              <Route path="/q" element={<Landing2 />} />
              <Route path="/privacy-policy" element={<PrivacyPolicy />} />
              <Route path="/about-us" element={<AboutUs />} />
              <Route path="/ty" element={<ThankYou />} />
              
              {/* Admin Routes */}
              <Route path="/adm" element={<AdminLayout />}>
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
              
              {/* White theme blog URL - catches /:slug last */}
              <Route path="/:slug" element={<UniversalBlogPage />} />
              
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
