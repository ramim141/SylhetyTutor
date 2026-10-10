import { CheckCircle, Star } from "lucide-react";
import { Header } from "../components/layout/Header";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { TutorCard } from "../components/tutor/TutorCard";

// Development-only gallery (DESIGN.md Section 6). Labels are English on purpose:
// this page is for the two developers and never ships to users.

const COLOR_TOKENS = [
  "navy", "navy-deep", "navy-light", "orange", "orange-hover", "orange-text",
  "orange-light", "orange-pale", "bg", "bg-subtle", "bg-card", "fg", "fg-secondary",
  "fg-muted", "border", "success", "warning", "error", "info", "star",
];

const SAMPLE_TUTOR = {
  name: "Rahim Uddin",
  initials: "RU",
  university: "SUST (CSE, 3rd Year)",
  area: "Amberkhana",
  subjects: ["Physics", "Higher Math"],
  classes: ["SSC 9–10"],
  rating: 4.8,
  reviewCount: 24,
  feeMin: 5000,
  feeMax: 7000,
  isVerified: true,
};

function Section({ title, children }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-xl font-display font-bold">{title}</h2>
      {children}
    </section>
  );
}

export default function DevUI() {
  return (
    <div className="min-h-screen bg-bg text-fg font-body">
      <Header />
      <main className="max-w-[1200px] mx-auto px-4 md:px-6 py-12 flex flex-col gap-12">
        <h1 className="text-3xl font-display font-extrabold">/dev/ui — Component gallery</h1>

        <Section title="Colors">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
            {COLOR_TOKENS.map((token) => (
              <div key={token} className="flex items-center gap-2 text-sm">
                <span
                  className="size-8 rounded-md border border-border shrink-0"
                  style={{ background: `var(--color-${token})` }}
                />
                <code className="font-mono text-xs">{token}</code>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Button — variants">
          <div className="flex flex-wrap gap-3">
            {["primary", "secondary", "outline", "ghost", "danger"].map((variant) => (
              <Button key={variant} variant={variant}>
                {variant}
              </Button>
            ))}
          </div>
        </Section>

        <Section title="Button — sizes & states">
          <div className="flex flex-wrap items-center gap-3">
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg">Large</Button>
            <Button loading>Loading</Button>
            <Button disabled>Disabled</Button>
          </div>
        </Section>

        <Section title="Badge">
          <div className="flex flex-wrap gap-2">
            <Badge variant="featured" icon={<Star className="w-3 h-3" />}>Featured</Badge>
            <Badge variant="verified" icon={<CheckCircle className="w-3 h-3" />}>Verified</Badge>
            <Badge variant="pro">Pro</Badge>
            <Badge variant="premium">Premium</Badge>
            <Badge variant="free">Free</Badge>
            <Badge variant="founding">Founding Tutor</Badge>
            <Badge variant="tag">Class 9–10</Badge>
          </div>
        </Section>

        <Section title="TutorCard">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
            <TutorCard {...SAMPLE_TUTOR} isFeatured />
            <TutorCard {...SAMPLE_TUTOR} name="Tanjina Akter" initials="TA" />
            <TutorCard {...SAMPLE_TUTOR} name="Sayeed Chowdhury" initials="SC" isVerified={false} />
          </div>
        </Section>
      </main>
    </div>
  );
}
