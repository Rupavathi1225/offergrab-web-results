import { ExternalLink } from "lucide-react";

interface Sitelink {
  id: string;
  title: string;
  url: string;
  position: number;
  is_active: boolean;
}

interface SponsoredAdCardProps {
  title: string;
  description: string | null;
  maskedUrl: string;
  logoUrl: string | null;
  sitelinks: Sitelink[];
  onMainClick: () => void;
  onSitelinkClick: (sitelink: Sitelink) => void;
}

const SponsoredAdCard = ({
  title,
  description,
  maskedUrl,
  logoUrl,
  sitelinks,
  onMainClick,
  onSitelinkClick,
}: SponsoredAdCardProps) => {
  const activeSitelinks = sitelinks.filter((s) => s.is_active).slice(0, 4);

  return (
    <div className="animate-fade-in">
      {/* Sponsored label - always visible */}
      <div className="text-sm text-muted-foreground mb-1">
        <span className="text-xs bg-muted/50 px-1.5 py-0.5 rounded">Sponsored</span>
      </div>

      {/* Main ad content */}
      <div className="flex items-start gap-3">
        {/* Logo/Image (optional) */}
        {logoUrl && (
          <img
            src={logoUrl}
            alt="Ad"
            className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        )}

        <div className="flex-1 min-w-0">
          {/* Title */}
          <h3
            className="text-primary hover:underline cursor-pointer font-serif text-lg mb-1 tracking-wide underline"
            onClick={onMainClick}
          >
            {title}
          </h3>

          {/* Masked URL */}
          <p
            className="text-muted-foreground text-xs mb-2 cursor-pointer hover:underline hover:text-primary truncate"
            onClick={onMainClick}
          >
            {maskedUrl}
          </p>

          {/* Description */}
          {description && (
            <p className="text-muted-foreground/80 text-sm italic mb-3 line-clamp-2">
              {description}
            </p>
          )}

          {/* Main CTA Button - subtle/transparent styling */}
          <button
            onClick={onMainClick}
            className="bg-primary/90 hover:bg-primary text-primary-foreground px-6 py-2.5 rounded font-medium text-sm flex items-center gap-2 transition-colors backdrop-blur-sm"
          >
            <span>➤</span> Visit Website
          </button>

          {/* Sitelinks - up to 4 independent clickable URLs */}
          {activeSitelinks.length > 0 && (
            <div className="mt-4 pt-3 border-t border-border/30">
              <div className="flex flex-wrap gap-2">
                {activeSitelinks.map((sitelink) => (
                  <button
                    key={sitelink.id}
                    onClick={() => onSitelinkClick(sitelink)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary hover:text-primary-foreground bg-transparent hover:bg-primary/20 border border-primary/30 hover:border-primary/50 rounded-md transition-all duration-200"
                  >
                    {sitelink.title}
                    <ExternalLink className="w-3 h-3 opacity-60" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SponsoredAdCard;
