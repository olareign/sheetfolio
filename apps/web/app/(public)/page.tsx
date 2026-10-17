import { Button } from "@/components/sp/Button";
import { SheetPanel } from "@/components/SheetPanel";

// TODO(product): full product landing page (PRD §6 `/`). Day 1 only needs a way in.
export default function LandingPage() {
  return (
    <SheetPanel sheet="000" title="Your record, drawn to scale.">
      <p className="sp-lead">A portfolio page for civil engineers: projects, credentials and contact on one sheet.</p>
      <div>
        <Button href="/login" variant="primary">
          Sign in or create your page
        </Button>
      </div>
    </SheetPanel>
  );
}
