import { useNavigate } from "react-router-dom";
import { ArrowLeft, Shield, Cookie, Link2, Users, Ban, FileCheck, Mail, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

const PrivacyPolicy = () => {
  const navigate = useNavigate();

  const sections = [
    {
      id: "introduction",
      icon: Shield,
      title: "Introduction",
      content: (
        <p className="text-muted-foreground leading-relaxed">
          Welcome to <span className="text-foreground font-medium">astepstair.com</span>. We respect your privacy and are committed to protecting any information you share with us. This Privacy Policy explains how we collect, use, and safeguard your information when you visit our website. By using our website, you agree to the terms of this Privacy Policy.
        </p>
      ),
    },
    {
      id: "information",
      icon: FileCheck,
      title: "Information We Collect",
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground leading-relaxed">
            We collect minimal information to improve your experience on our website:
          </p>
          <div className="grid gap-3">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary/30 border border-border/50">
              <div className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
              <div>
                <span className="font-medium text-foreground">Non-Personal Information</span>
                <p className="text-sm text-muted-foreground mt-1">Browser type, device type, operating system, and general location (country/region).</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary/30 border border-border/50">
              <div className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
              <div>
                <span className="font-medium text-foreground">Usage Data</span>
                <p className="text-sm text-muted-foreground mt-1">Pages visited, time spent on pages, and navigation patterns.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary/30 border border-border/50">
              <div className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
              <div>
                <span className="font-medium text-foreground">Voluntarily Provided</span>
                <p className="text-sm text-muted-foreground mt-1">If you contact us via email, we may collect your email address and the content of your message.</p>
              </div>
            </div>
          </div>
          <div className="mt-4 p-4 rounded-lg bg-green-500/10 border border-green-500/20">
            <p className="text-sm text-green-600 dark:text-green-400 flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <strong>We do NOT collect sensitive personal data</strong> such as your real name, home address, phone number, social security number, financial information, or health-related data.
            </p>
          </div>
        </div>
      ),
    },
    {
      id: "cookies",
      icon: Cookie,
      title: "Cookies",
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground leading-relaxed">
            Our website uses cookies to enhance your browsing experience. Cookies are small text files stored on your device that help us:
          </p>
          <div className="flex flex-wrap gap-2">
            {["Remember preferences", "Understand usage", "Improve services"].map((item) => (
              <span key={item} className="px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium">
                {item}
              </span>
            ))}
          </div>
          <p className="text-sm text-muted-foreground">
            You can control cookies through your browser settings. Disabling cookies may affect some features of our website.
          </p>
        </div>
      ),
    },
    {
      id: "third-party",
      icon: ExternalLink,
      title: "Third-Party Services",
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground leading-relaxed">
            We may use third-party services that collect information for analytics and advertising purposes:
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20">
              <h4 className="font-semibold text-foreground mb-2">Google Analytics</h4>
              <p className="text-sm text-muted-foreground">Helps us understand website traffic and user behavior with anonymized data.</p>
            </div>
            <div className="p-4 rounded-xl bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/20">
              <h4 className="font-semibold text-foreground mb-2">Google AdSense</h4>
              <p className="text-sm text-muted-foreground">Displays advertisements and may use cookies to show relevant ads.</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            These third-party services have their own privacy policies. We do not have control over the data collected by these services.
          </p>
        </div>
      ),
    },
    {
      id: "external-links",
      icon: Link2,
      title: "External Links",
      content: (
        <p className="text-muted-foreground leading-relaxed">
          Our website may contain links to external websites that are not operated by us. We have no control over the content, privacy policies, or practices of these third-party sites. We encourage you to review the privacy policy of any external website you visit. We are not responsible for any information you provide to these external sites.
        </p>
      ),
    },
    {
      id: "children",
      icon: Users,
      title: "Children's Privacy",
      content: (
        <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <p className="text-muted-foreground leading-relaxed">
            Our website is <strong className="text-foreground">not intended for children under the age of 13</strong>. We do not knowingly collect personal information from children under 13. If you are a parent or guardian and believe your child has provided us with personal information, please contact us immediately.
          </p>
        </div>
      ),
    },
    {
      id: "not-do",
      icon: Ban,
      title: "What We Will NOT Do",
      content: (
        <div className="space-y-3">
          <p className="text-muted-foreground leading-relaxed mb-4">
            We are committed to protecting your privacy. Here is our promise to you:
          </p>
          <div className="grid gap-2">
            {[
              "Sell your personal information to third parties",
              "Share your email address with marketers or spammers",
              "Collect sensitive data like passwords, credit card numbers, or government IDs",
              "Send you unsolicited emails or spam",
              "Track your activity outside of our website",
              "Use deceptive practices to collect your information",
              "Store your data longer than necessary",
            ].map((item, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-3 rounded-lg bg-red-500/5 border border-red-500/10 hover:bg-red-500/10 transition-colors"
              >
                <div className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
                  <Ban className="w-3.5 h-3.5 text-red-500" />
                </div>
                <span className="text-sm text-muted-foreground">
                  We will <strong className="text-red-500">NOT</strong> {item.toLowerCase()}
                </span>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      id: "consent",
      icon: FileCheck,
      title: "User Consent",
      content: (
        <p className="text-muted-foreground leading-relaxed">
          By using our website, you consent to this Privacy Policy. If you do not agree with any part of this policy, please discontinue use of our website. We may update this Privacy Policy from time to time. Any changes will be posted on this page with an updated revision date. Your continued use of the website after any changes constitutes your acceptance of the updated policy.
        </p>
      ),
    },
    {
      id: "contact",
      icon: Mail,
      title: "Contact Information",
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground leading-relaxed">
            If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us:
          </p>
          <div className="p-6 rounded-xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20">
            <div className="flex flex-col sm:flex-row gap-4">
              <a
                href="mailto:shivam@surveytitans.com"
                className="flex items-center gap-3 px-4 py-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <Mail className="h-5 w-5" />
                <span className="font-medium">shivam@surveytitans.com</span>
              </a>
              <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-secondary/50 text-foreground">
                <Link2 className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium">astepstair.com</span>
              </div>
            </div>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Hero Header */}
      <header className="relative border-b border-border/50 bg-gradient-to-b from-primary/5 to-transparent">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="shrink-0 hover:bg-primary/10"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1
              className="text-xl font-display font-bold text-primary cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => navigate("/landing")}
            >
              TopUniversity
            </h1>
          </div>
        </div>

        {/* Hero Section */}
        <div className="container mx-auto px-4 py-12 md:py-20 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-6 animate-fade-in">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 animate-fade-in">
            Privacy Policy
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg animate-fade-in">
            Your privacy is important to us. This policy outlines how we collect, use, and protect your information.
          </p>
          <p className="text-sm text-muted-foreground mt-4 animate-fade-in">
            Last updated: {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          </p>
        </div>
      </header>

      {/* Table of Contents */}
      <nav className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="container mx-auto px-4">
          <div className="flex gap-2 overflow-x-auto py-3 scrollbar-hide">
            {sections.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="shrink-0 px-3 py-1.5 rounded-full text-sm font-medium bg-secondary/50 hover:bg-primary/10 hover:text-primary transition-colors"
              >
                {section.title}
              </a>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="space-y-12">
          {sections.map((section, index) => (
            <section
              key={section.id}
              id={section.id}
              className="scroll-mt-20 animate-fade-in"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 shrink-0">
                  <section.icon className="h-6 w-6 text-primary" />
                </div>
                <h2 className="text-2xl font-bold">{section.title}</h2>
              </div>
              <div className="pl-0 md:pl-16">
                {section.content}
              </div>
              {index < sections.length - 1 && (
                <div className="border-b border-border/30 mt-12" />
              )}
            </section>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8 mt-12 bg-gradient-to-t from-primary/5 to-transparent">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-4 mb-4">
            <a
              href="/privacy-policy"
              className="text-sm text-primary font-medium hover:underline"
            >
              Privacy Policy
            </a>
          </div>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} TopUniversity. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default PrivacyPolicy;
