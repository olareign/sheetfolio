import { Button } from "@/components/sp/Button";
import { SheetPanel } from "@/components/SheetPanel";

export default function NotFound() {
  return (
    <SheetPanel sheet="404" title="Sheet not found">
      <p>This page doesn&rsquo;t exist, or it hasn&rsquo;t been published yet.</p>
      <div>
        <Button href="/" variant="primary">
          Go to Sheetfolio
        </Button>
      </div>
    </SheetPanel>
  );
}
