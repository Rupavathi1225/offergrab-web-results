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
import ConsultationPage from "./pages/ConsultationPage";
import AstepstairHome from "./pages/AstepstairHome";
import AstepstairPost from "./pages/AstepstairPost";
import ResetPassword from "./pages/ResetPassword";
import AdminLayout from "./pages/admin/AdminLayout";
import LandingContent from "./pages/admin/LandingContent";
import SearchButtons from "./pages/admin/SearchButtons";
import WebResults from "./pages/admin/WebResults";
import PreLandings from "./pages/admin/PreLandings";
import Blogs from "./pages/admin/Blogs";
import Analytics from "./pages/admin/Analytics";
import BulkWebResultEditor from "./pages/admin/BulkWebResultEditor";
import FallbackUrls from "./pages/admin/FallbackUrls";
import ConsultationPages from "./pages/admin/ConsultationPages";
import Articles from "./pages/admin/Articles";
import AdminComments from "./pages/admin/AdminComments";
import Subscribers from "./pages/admin/Subscribers";
import SiteSettings from "./pages/admin/SiteSettings";
import { AuthProvider } from "./hooks/useAuth";
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
            <AuthProvider>
            <Routes>
              {/* New Astepstair redesign */}
              <Route path="/" element={<AstepstairHome />} />
              <Route path="/post/:slug" element={<AstepstairPost />} />
              <Route path="/reset-password" element={<ResetPassword />} />

              {/* Legacy landing kept accessible */}
              <Route path="/landing" element={<ThemedHomepage />} />

              {/* Consultation pages */}
              <Route path="/cnos/:slug" element={<ConsultationPage />} />

              {/* Blog routes */}
              <Route path="/blog/:slug" element={<BlogPage />} />
              <Route path="/bl/:slug" element={<UniversalBlogPage />} />

              {/* Legacy shared links */}
              <Route path="/webresult/:page/:wbr" element={<LegacyWebResultRedirect />} />
              <Route path="/wr/:page/:wbr" element={<WebResult />} />
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
                <Route path="articles" element={<Articles />} />
                <Route path="comments" element={<AdminComments />} />
                <Route path="subscribers" element={<Subscribers />} />
                <Route path="site-settings" element={<SiteSettings />} />
                <Route path="analytics" element={<Analytics />} />
                <Route path="bulk-web-result-editor" element={<BulkWebResultEditor />} />
                <Route path="fallback-urls" element={<FallbackUrls />} />
                <Route path="consultation-pages" element={<ConsultationPages />} />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
