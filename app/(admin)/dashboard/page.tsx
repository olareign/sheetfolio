import type { Metadata } from "next";
import { Button } from "@/components/sp/Button";
import { collections, type CollectionName } from "@/content/schemas";
import { requireAccount } from "@/lib/session";
import { getDraft, getPublishedFresh } from "@/lib/site";
import { SheetPanel } from "@/components/SheetPanel";
import { signOutAction } from "./actions";

export const metadata: Metadata = { title: "Dashboard" };

// Day 1 stub: proves sign-in → slug → valid draft. The real dashboard (sidebar, editors, publish) lands on Day 2.
export default async function DashboardPage() {
  const { email, account } = await requireAccount();
  const [draft, published] = await Promise.all([getDraft(account.slug), getPublishedFresh(account.slug)]);

  return (
    <SheetPanel sheet="SP-000" title={`/${account.slug}`}>
      {draft ? (
        <table className="sp-spec">
          <tbody>
            <tr>
              <th scope="row">Signed in</th>
              <td>{email}</td>
            </tr>
            <tr>
              <th scope="row">Role</th>
              <td>{account.role}</td>
            </tr>
            <tr>
              <th scope="row">Name</th>
              <td>{draft.profile.name}</td>
            </tr>
            <tr>
              <th scope="row">Draft</th>
              <td>Valid · saved {new Date(draft.updatedAt).toUTCString()}</td>
            </tr>
            <tr>
              <th scope="row">Published</th>
              <td>{published?.publishedAt ? new Date(published.publishedAt).toUTCString() : "Not yet"}</td>
            </tr>
            {(Object.keys(collections) as CollectionName[]).map((name) => (
              <tr key={name}>
                <th scope="row">{collections[name].label}</th>
                <td>{draft[name].length}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="sp-alert" role="alert">
          Your page address is claimed but its draft is missing. Contact support.
        </p>
      )}
      <form action={signOutAction}>
        <Button type="submit" variant="default">
          Sign out
        </Button>
      </form>
    </SheetPanel>
  );
}
