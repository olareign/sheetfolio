import "server-only";
import { uploadBytes } from "./cloudinary";
import { ProjectPreview, type Project } from "@/content/schemas";
import { mutateDraft } from "./collections";
import { env } from "./env";
import { getDraft } from "./site";
import {
  DEFAULT_SCREENSHOT_TEMPLATE,
  fetchImageBytes,
  fetchSiteMeta,
  PreviewError,
  screenshotUrl,
  type PreviewDeps,
} from "./site-preview";

/*
 * A project with a website link needs no uploaded photo: we read the site's own title, description and
 * social picture, and fall back to a screenshot of its first screen. Only when both fail does the card
 * show a placeholder and ask the owner for an image.
 *
 * Pictures are copied into Blob storage when it is configured, so a project page never depends on someone
 * else's server staying up. Without Blob (local runs) the site's own https picture is linked directly and
 * screenshots are skipped, because a screenshot URL would call the screenshot service on every page view.
 */

export type StoreImage = (bytes: Uint8Array, contentType: string) => Promise<string | null>;

export type BuildContext = {
  now: Date;
  /** Saves the bytes somewhere durable and returns a public https URL, or null when no storage is configured. */
  store: StoreImage;
  screenshotTemplate?: string;
  fetchDeps?: PreviewDeps;
};

export type BuildResult = { preview: ProjectPreview; notice?: string } | { preview?: undefined; notice: string };

const NO_IMAGE_NOTICE =
  "We read your website, but couldn't get a picture from it. Upload a cover photo, or we'll show a placeholder.";

function reasonFor(err: unknown): string {
  if (err instanceof PreviewError) {
    if (err.code === "BLOCKED") return "That link can't be used for a preview. Check the address.";
    if (err.code === "SIZE") return "That page is too large to read. Upload a cover photo instead.";
  }
  return "We couldn't reach that website, so there's no automatic picture. Upload a cover photo, or try saving again later.";
}

type Stored = { status: "stored"; url: string } | { status: "unstored" } | { status: "failed" };

/** Downloads a picture and saves a durable copy. "unstored" means the picture is fine but no storage is configured. */
async function tryStore(url: string, ctx: BuildContext): Promise<Stored> {
  try {
    const { bytes, contentType } = await fetchImageBytes(url, ctx.fetchDeps);
    const saved = await ctx.store(bytes, contentType);
    return saved ? { status: "stored", url: saved } : { status: "unstored" };
  } catch (err) {
    if (!(err instanceof PreviewError)) throw err;
    return { status: "failed" };
  }
}

/** Reads the website and decides which picture to use. Never throws for an unreachable or odd site. */
export async function buildPreview(websiteUrl: string, ctx: BuildContext): Promise<BuildResult> {
  let meta;
  try {
    meta = await fetchSiteMeta(websiteUrl, ctx.fetchDeps);
  } catch (err) {
    if (!(err instanceof PreviewError)) throw err;
    return { notice: reasonFor(err) };
  }

  let image: string | undefined;
  let imageSource: "og" | "screenshot" | undefined;

  if (meta.image) {
    const copy = await tryStore(meta.image, ctx);
    if (copy.status === "stored") {
      image = copy.url;
      imageSource = "og";
    } else if (copy.status === "unstored" && meta.image.startsWith("https://")) {
      // The picture is valid but nowhere durable to keep it (local runs): link the site's own copy.
      image = meta.image;
      imageSource = "og";
    }
  }
  if (!image) {
    const shot = await tryStore(screenshotUrl(meta.url, ctx.screenshotTemplate), ctx);
    if (shot.status === "stored") {
      image = shot.url;
      imageSource = "screenshot";
    }
  }

  const preview = ProjectPreview.parse({
    sourceUrl: websiteUrl,
    image,
    imageSource,
    title: meta.title,
    description: meta.description,
    fetchedAt: ctx.now.toISOString(),
  });
  return image ? { preview } : { preview, notice: NO_IMAGE_NOTICE };
}

/** Keeps a project website's picture on our own image host, so the card doesn't depend on the other site. */
function imageStore(slug: string, projectId: string): StoreImage {
  return async (bytes, contentType) => {
    const cloudinary = env().CLOUDINARY_URL;
    if (!cloudinary) return null;
    return uploadBytes(cloudinary, bytes, contentType, { folder: `sheetfolio/${slug}/previews`, publicId: projectId });
  };
}

export type RefreshResult = { notice?: string };

/**
 * Brings a project's `preview` in line with its `websiteUrl`: reads the site when the link is new or changed,
 * drops the preview when the link is removed, and fills an empty "What was done" from the site's description.
 */
export async function refreshProjectPreview(
  slug: string,
  projectId: string,
  deps: { now?: Date; ctx?: Partial<BuildContext> } = {},
): Promise<RefreshResult> {
  const now = deps.now ?? new Date();
  const draft = await getDraft(slug);
  const project = draft?.projects.find((p) => p.id === projectId);
  if (!project) return {};

  if (!project.websiteUrl) {
    if (project.preview) await patchProject(slug, projectId, (p) => ({ ...p, preview: undefined }), now);
    return {};
  }
  if (project.preview?.sourceUrl === project.websiteUrl && project.preview.image) return {};

  const result = await buildPreview(project.websiteUrl, {
    now,
    store: imageStore(slug, projectId),
    screenshotTemplate: deps.ctx?.screenshotTemplate ?? env().SCREENSHOT_URL_TEMPLATE ?? DEFAULT_SCREENSHOT_TEMPLATE,
    ...deps.ctx,
  });
  if (!result.preview) return { notice: result.notice };

  const { preview } = result;
  await patchProject(slug, projectId, (p) => ({ ...p, preview, scope: p.scope || preview.description || "" }), now);
  return { notice: result.notice };
}

async function patchProject(slug: string, projectId: string, fn: (p: Project) => Project, now: Date): Promise<void> {
  await mutateDraft(
    slug,
    (draft) => ({ ...draft, projects: draft.projects.map((p) => (p.id === projectId ? fn(p) : p)) }),
    now,
  );
}
