import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const PrivacyPolicy = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/50 py-4">
        <div className="container mx-auto px-4 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1
            className="text-xl font-display font-bold text-primary cursor-pointer"
            onClick={() => navigate("/landing")}
          >
            TopUniversity
          </h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-muted-foreground mb-8">
          Last updated: {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
        </p>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
          {/* Section 1: Introduction */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Introduction</h2>
            <p className="text-muted-foreground leading-relaxed">
              Welcome to astepstair.com. We respect your privacy and are committed to protecting any information you share with us. This Privacy Policy explains how we collect, use, and safeguard your information when you visit our website. By using our website, you agree to the terms of this Privacy Policy.
            </p>
          </section>

          {/* Section 2: Information We Collect */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Information We Collect</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              We collect minimal information to improve your experience on our website. This may include:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li><strong>Non-Personal Information:</strong> Browser type, device type, operating system, and general location (country/region).</li>
              <li><strong>Usage Data:</strong> Pages visited, time spent on pages, and navigation patterns.</li>
              <li><strong>Voluntarily Provided Information:</strong> If you contact us via email, we may collect your email address and the content of your message.</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              <strong>We do NOT collect sensitive personal data</strong> such as your real name, home address, phone number, social security number, financial information, or health-related data.
            </p>
          </section>

          {/* Section 3: Cookies */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">3. Cookies</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Our website uses cookies to enhance your browsing experience. Cookies are small text files stored on your device that help us:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Remember your preferences and settings</li>
              <li>Understand how you use our website</li>
              <li>Improve our services based on usage patterns</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              You can control cookies through your browser settings. Disabling cookies may affect some features of our website.
            </p>
          </section>

          {/* Section 4: Third-Party Services */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Third-Party Services</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              We may use third-party services that collect information for analytics and advertising purposes. These services include:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li><strong>Google Analytics:</strong> Helps us understand website traffic and user behavior. Google Analytics may collect anonymized data about your visits.</li>
              <li><strong>Google AdSense:</strong> Displays advertisements on our website. Google AdSense may use cookies to show relevant ads based on your browsing history across different websites.</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              These third-party services have their own privacy policies, and we encourage you to review them. We do not have control over the data collected by these services.
            </p>
          </section>

          {/* Section 5: External Links */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">5. External Links</h2>
            <p className="text-muted-foreground leading-relaxed">
              Our website may contain links to external websites that are not operated by us. We have no control over the content, privacy policies, or practices of these third-party sites. We encourage you to review the privacy policy of any external website you visit. We are not responsible for any information you provide to these external sites.
            </p>
          </section>

          {/* Section 6: Children's Privacy */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Children's Privacy</h2>
            <p className="text-muted-foreground leading-relaxed">
              Our website is not intended for children under the age of 13. We do not knowingly collect personal information from children under 13. If you are a parent or guardian and believe your child has provided us with personal information, please contact us immediately at the email address below, and we will take steps to remove such information.
            </p>
          </section>

          {/* Section 7: What We Will NOT Do */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">7. What We Will NOT Do</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              We are committed to protecting your privacy. Here's what we promise:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>We will <strong>NOT</strong> sell your personal information to third parties.</li>
              <li>We will <strong>NOT</strong> share your email address with marketers or spammers.</li>
              <li>We will <strong>NOT</strong> collect sensitive data like passwords, credit card numbers, or government IDs.</li>
              <li>We will <strong>NOT</strong> send you unsolicited emails or spam.</li>
              <li>We will <strong>NOT</strong> track your activity outside of our website.</li>
              <li>We will <strong>NOT</strong> use deceptive practices to collect your information.</li>
              <li>We will <strong>NOT</strong> store your data longer than necessary.</li>
            </ul>
          </section>

          {/* Section 8: User Consent */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">8. User Consent</h2>
            <p className="text-muted-foreground leading-relaxed">
              By using our website, you consent to this Privacy Policy. If you do not agree with any part of this policy, please discontinue use of our website. We may update this Privacy Policy from time to time. Any changes will be posted on this page with an updated revision date. Your continued use of the website after any changes constitutes your acceptance of the updated policy.
            </p>
          </section>

          {/* Section 9: Contact Information */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Contact Information</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us at:
            </p>
            <div className="mt-4 p-4 bg-secondary/30 rounded-lg">
              <p className="text-foreground">
                <strong>Email:</strong>{" "}
                <a
                  href="mailto:shivam@surveytitans.com"
                  className="text-primary hover:underline"
                >
                  shivam@surveytitans.com
                </a>
              </p>
              <p className="text-foreground mt-2">
                <strong>Website:</strong> astepstair.com
              </p>
            </div>
          </section>
        </div>
      </main>

      <footer className="border-t border-border/50 py-6 mt-auto">
        <div className="container mx-auto px-4 text-center text-muted-foreground text-sm">
          © {new Date().getFullYear()} TopUniversity. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

export default PrivacyPolicy;
