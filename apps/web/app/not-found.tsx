import { Button } from "@/components/sp/Button";
import { AuthPanel } from "@/components/AuthPanel";

export default function NotFound() {
  return (
    <AuthPanel title="Page not found">
      <p>This page doesn&rsquo;t exist, or it hasn&rsquo;t been published yet.</p>
      <div>
        <Button href="/" variant="primary">
          Go to Sheetfolio
        </Button>
      </div>
    </AuthPanel>
  );
}
