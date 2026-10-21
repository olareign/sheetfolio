import { Button } from "@/components/sp/Button";
import { AuthPanel } from "@/components/AuthPanel";

// TODO(product): full product landing page (PRD §6 `/`). Day 1 only needs a way in.
export default function LandingPage() {
  return (
    <AuthPanel title="Your work, on one page.">
      <p className="sp-lead">A portfolio page for professionals: projects, credentials and contact in one place.</p>
      <div>
        <Button href="/login" variant="primary">
          Sign in or create your page
        </Button>
      </div>
    </AuthPanel>
  );
}
