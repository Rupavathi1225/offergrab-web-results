import { ArrowLeft, Users, Target, Heart, BookOpen } from "lucide-react";
import { useNavigate } from "react-router-dom";

const AboutUs = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 py-4">
        <div className="container mx-auto px-4 flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-secondary/50 rounded-lg transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </button>
          <h1 className="text-xl font-display font-bold text-primary">TopUniversity</h1>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-b from-primary/5 to-background py-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6 font-display">
            About Us
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Empowering learners worldwide with accessible educational resources and opportunities.
          </p>
        </div>
      </section>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <article className="max-w-4xl mx-auto space-y-12">
          
          {/* Introduction */}
          <section className="prose prose-lg max-w-none">
            <p className="text-foreground/90 leading-relaxed text-lg">
              Welcome to TopUniversity, your trusted companion in the pursuit of knowledge and academic excellence. 
              We are an independent educational information platform dedicated to helping students, professionals, 
              and lifelong learners discover valuable educational resources, programs, and opportunities from around 
              the world. Our platform serves as a bridge connecting ambitious individuals with the educational 
              pathways that can transform their futures.
            </p>
            <p className="text-foreground/90 leading-relaxed">
              Founded with the belief that quality education should be accessible to everyone, we curate and 
              present information about universities, courses, scholarships, and learning opportunities in a 
              way that is easy to navigate and understand. Whether you are a high school student exploring 
              college options, a working professional seeking to upskill, or someone looking to change careers 
              entirely, TopUniversity is here to guide your educational journey.
            </p>
          </section>

          {/* Our Mission */}
          <section className="bg-card/50 border border-border/30 rounded-2xl p-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-primary/10 rounded-xl">
                <Target className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">Our Mission</h2>
            </div>
            <div className="space-y-4 text-foreground/90">
              <p className="leading-relaxed">
                Our mission is to democratize access to educational information and empower individuals to make 
                informed decisions about their academic and professional futures. We believe that the right 
                information, delivered at the right time, can open doors that might otherwise remain closed.
              </p>
              <p className="leading-relaxed">
                We strive to provide accurate, up-to-date, and comprehensive information about educational 
                institutions, programs, and opportunities worldwide. Our goal is not to make decisions for you, 
                but to equip you with the knowledge you need to make the best decisions for yourself and your 
                unique circumstances.
              </p>
            </div>
          </section>

          {/* What We Do */}
          <section>
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-primary/10 rounded-xl">
                <BookOpen className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">What We Do</h2>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-card/30 border border-border/20 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-foreground mb-3">Educational Content</h3>
                <p className="text-foreground/80 leading-relaxed">
                  We create and curate informative articles, guides, and resources about various educational 
                  topics, helping you understand your options and make informed choices about your learning path.
                </p>
              </div>
              <div className="bg-card/30 border border-border/20 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-foreground mb-3">Resource Discovery</h3>
                <p className="text-foreground/80 leading-relaxed">
                  Our platform helps you discover educational programs, institutions, and opportunities that 
                  match your interests, goals, and circumstances through our carefully organized content.
                </p>
              </div>
              <div className="bg-card/30 border border-border/20 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-foreground mb-3">Trending Topics</h3>
                <p className="text-foreground/80 leading-relaxed">
                  We keep you informed about the latest trends in education, including emerging fields of study, 
                  new learning technologies, and evolving career landscapes to help you stay ahead.
                </p>
              </div>
              <div className="bg-card/30 border border-border/20 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-foreground mb-3">Accessible Information</h3>
                <p className="text-foreground/80 leading-relaxed">
                  We present complex educational information in clear, easy-to-understand language, ensuring 
                  that everyone, regardless of their background, can benefit from our resources.
                </p>
              </div>
            </div>
          </section>

          {/* Our Values */}
          <section className="bg-card/50 border border-border/30 rounded-2xl p-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-primary/10 rounded-xl">
                <Heart className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">Our Values</h2>
            </div>
            <div className="space-y-4 text-foreground/90">
              <p className="leading-relaxed">
                <strong className="text-foreground">Integrity:</strong> We are committed to providing accurate and 
                honest information. We do not endorse or promote any specific institution over another, and we 
                clearly distinguish between editorial content and any sponsored or promotional material.
              </p>
              <p className="leading-relaxed">
                <strong className="text-foreground">Accessibility:</strong> We believe that educational information 
                should be available to everyone, regardless of their location, background, or financial situation. 
                Our platform is designed to be user-friendly and accessible to all.
              </p>
              <p className="leading-relaxed">
                <strong className="text-foreground">Respect for Privacy:</strong> We take your privacy seriously and 
                are committed to protecting your personal information. We collect only what is necessary and never 
                sell your data to third parties.
              </p>
            </div>
          </section>

          {/* Our Team */}
          <section>
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-primary/10 rounded-xl">
                <Users className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">Our Commitment</h2>
            </div>
            <div className="space-y-4 text-foreground/90">
              <p className="leading-relaxed">
                At TopUniversity, we are committed to continuously improving our platform and the quality of 
                information we provide. We regularly update our content to reflect the latest developments in 
                the educational landscape and actively seek feedback from our users to enhance their experience.
              </p>
              <p className="leading-relaxed">
                We understand that choosing an educational path is one of the most important decisions you will 
                make in your life. That is why we approach our work with the seriousness and care it deserves. 
                Every piece of content we publish is created with your best interests in mind.
              </p>
              <p className="leading-relaxed">
                Thank you for choosing TopUniversity as your educational information resource. We are honored 
                to be part of your learning journey and look forward to helping you achieve your academic and 
                professional goals.
              </p>
            </div>
          </section>

        </article>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 py-6 mt-auto">
        <div className="container mx-auto px-4 text-center text-muted-foreground text-sm">
          <div className="flex items-center justify-center gap-4 mb-2">
            <a href="/about-us" className="hover:text-primary transition-colors">About Us</a>
            <span className="text-border">•</span>
            <a href="/privacy-policy" className="hover:text-primary transition-colors">Privacy Policy</a>
          </div>
          © {new Date().getFullYear()} TopUniversity. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

export default AboutUs;
