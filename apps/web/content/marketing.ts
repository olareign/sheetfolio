/*
 * Copy and picture references for the marketing pages (/, /product, /examples, /stories, /pricing).
 * Stories, quotes and figures are SAMPLES until real users replace them: every item carries `sample: true`,
 * the pages show a "Sample" badge for it, and nothing here may be presented as a real person's words.
 * To publish a real story or quote, change `sample` to false and fill in the real name, role and words.
 */

export type Sample = { /** Shown with a "Sample" badge until it is a real person's story or words. */ sample: boolean };

export const NAV = [
  { href: "/", label: "Home" },
  { href: "/product", label: "Product" },
  { href: "/featured", label: "Featured" },
  { href: "/stories", label: "Stories" },
  { href: "/pricing", label: "Pricing" },
] as const;

/** Portraits in /public/stock/people. Free stock photos (Unsplash licence), shown with sample names. */
export const PEOPLE = {
  amara: { name: "Amara Okafor", file: "amara" },
  chidi: { name: "Chidi Nwosu", file: "chidi" },
  ruth: { name: "Ruth Adeyemi", file: "ruth" },
  tobi: { name: "Tobi Sanusi", file: "tobi" },
  kemi: { name: "Kemi Balogun", file: "kemi" },
  ngozi: { name: "Ngozi Eze", file: "ngozi" },
  emeka: { name: "Emeka Obi", file: "emeka" },
  bisi: { name: "Bisi Lawal", file: "bisi" },
  sola: { name: "Sola Adebayo", file: "sola" },
  claire: { name: "Claire Bennett", file: "claire" },
  mark: { name: "Mark Holloway", file: "mark" },
} as const;
export type PersonKey = keyof typeof PEOPLE;

export const personSrc = (key: PersonKey): string => `/stock/people/${PEOPLE[key].file}.jpg`;

/** The "early users" row under the hero buttons: eight Black faces to two white, in that proportion. */
export const PROOF_FACES: readonly PersonKey[] = ["amara", "chidi", "kemi", "emeka", "claire"];

export const LANDING = {
  skyline: { src: "/stock/landing/lagos-skyline.jpg", alt: "Lagos skyline under a blue sky" },
  waterfront: { src: "/stock/landing/lagos-waterfront.jpg", alt: "Aerial view of the Lagos waterfront and bridge" },
  bridge: { src: "/stock/landing/lekki-bridge.jpg", alt: "The Lekki-Ikoyi cable-stayed bridge" },
  traffic: { src: "/stock/landing/lagos-traffic.jpg", alt: "Aerial view of a busy Lagos street" },
  crafts: { src: "/stock/landing/crafts-market.jpg", alt: "A crafts market stall with masks and paintings" },
  fabrics: { src: "/stock/landing/fabrics.jpg", alt: "Folded African wax-print fabrics" },
  classroom: { src: "/stock/landing/classroom.jpg", alt: "A girl reading in a crowded classroom" },
  team: { src: "/stock/landing/team-laptops.jpg", alt: "Colleagues working together at laptops" },
} as const;

export const AUDIENCE = [
  "Job seekers",
  "Freelancers",
  "Students",
  "Creators",
  "Consultants",
  "Small businesses",
  "Researchers",
  "Volunteers",
  "Anyone with work to show",
] as const;

export const TILES = [
  { tone: "accent", big: "4", text: "CV layouts to pick from. Visitors download the one you choose." },
  { tone: "plain", label: "Pages you can publish", big: "1 link", text: "Projects, credentials, CV and contact in one place." },
  { tone: "soft", label: "While we test", big: "Free", text: "No card. Publish and update whenever you like." },
  { tone: "dark", label: "Who can use it", big: "Anyone", text: "Any profession with work to show." },
] as const;

export const FEATURES = [
  { icon: "grid", title: "A page that looks finished", text: "Add projects, experience and credentials. Your page is laid out for you, in light or dark." },
  { icon: "doc", title: "The CV layout you choose", text: "Pick one of four ATS-friendly layouts for your Download CV button. Preview each before you publish." },
  { icon: "mail", title: "Enquiries in your inbox", text: "Visitors message you from the page. Every lead is saved and emailed to you." },
  { icon: "eye", title: "See who is looking", text: "Page views and enquiries in one place, so you know what is working." },
] as const;
export type FeatureIcon = (typeof FEATURES)[number]["icon"] | "link" | "bolt" | "check" | "user";

export const STEPS = [
  { icon: "user", title: "Sign up", text: "Use your email or a password. It takes under a minute." },
  { icon: "grid", title: "Add your work", text: "Fill in your profile, projects and credentials. A website link fills in a project's picture for you." },
  { icon: "bolt", title: "Publish", text: "Your link goes live. Share it anywhere." },
] as const;

export type Story = Sample & {
  person: PersonKey;
  role: string;
  /** Category photo from /public/stock/projects, standing in for the person's own work until they add theirs. */
  photo: string;
  alt: string;
  title: string;
  quote: string;
  outcomes: readonly { figure: string; label: string }[];
};

export const STORIES: readonly Story[] = [
  {
    sample: true,
    person: "amara",
    role: "Site Engineer, Lagos",
    photo: "/stock/projects/building.jpg",
    alt: "A tall building under construction with a crane",
    title: "From a PDF in every email to one link on every bid",
    quote: "I used to attach the same heavy PDF to every bid. Now I send my link, and clients open the projects that matter to them.",
    outcomes: [
      { figure: "3", label: "enquiries in the first week" },
      { figure: "1", label: "CV, in the layout she chose" },
      { figure: "1", label: "link on every bid" },
    ],
  },
  {
    sample: true,
    person: "chidi",
    role: "Freelance accountant, Abuja",
    photo: "/stock/projects/fintech.jpg",
    alt: "A shopkeeper standing in a small shop",
    title: "Clients check the page before they call",
    quote: "People read about my past clients first, so the first call is already a conversation about their books.",
    outcomes: [
      { figure: "2", label: "new clients from the page" },
      { figure: "1", label: "CV layout for job applications" },
      { figure: "0", label: "emails with attachments" },
    ],
  },
  {
    sample: true,
    person: "ruth",
    role: "Nurse educator, Ibadan",
    photo: "/stock/projects/healthcare.jpg",
    alt: "A doctor and patient at a health screening",
    title: "Credentials in one place, for every application",
    quote: "My certificates, training and research used to live in folders. Now an employer sees them in one scroll.",
    outcomes: [
      { figure: "5", label: "applications sent with one link" },
      { figure: "2", label: "interview calls" },
      { figure: "1", label: "page, always current" },
    ],
  },
  {
    sample: true,
    person: "tobi",
    role: "Architect, Lagos",
    photo: "/stock/projects/institutional.jpg",
    alt: "A white building with a clock tower",
    title: "Pitches that start with the portfolio",
    quote: "Instead of building a deck for each pitch, I send the link and pick the three projects to talk through.",
    outcomes: [],
  },
];

export type Quote = Sample & { person: PersonKey; role: string; text: string };

/** Ten quotes: eight from Black users and two from white users, the mix the product is built around. */
export const QUOTES: readonly Quote[] = [
  { sample: true, person: "tobi", role: "Architect, Lagos", text: "The projects page does the talking. I stopped re-making portfolio decks for every pitch." },
  { sample: true, person: "emeka", role: "Civil engineer, Enugu", text: "I choose the CV layout, and every visitor gets that exact PDF. That was the feature that sold me." },
  { sample: true, person: "kemi", role: "Photographer, Abeokuta", text: "Enquiries arrive in my inbox with the project they were looking at. That context saves me hours." },
  { sample: true, person: "sola", role: "Secondary school teacher, Ondo", text: "I am not a designer. The page looked finished after one evening of filling it in." },
  { sample: true, person: "ngozi", role: "Pharmacist, Port Harcourt", text: "It works on a phone, which is where most people open the link." },
  { sample: true, person: "bisi", role: "Brand writer, Lagos", text: "Light and dark themes, a CV, and my work. Nothing else I need to host." },
  { sample: true, person: "amara", role: "Site Engineer, Lagos", text: "I add a website link to a project and the picture appears. I never opened an image editor." },
  { sample: true, person: "claire", role: "Freelance consultant, Manchester", text: "One link in my email signature replaced a folder of attachments." },
  { sample: true, person: "chidi", role: "Accountant, Abuja", text: "Clients tell me they read the page before the first call. It saves us both time." },
  { sample: true, person: "mark", role: "Researcher, Leeds", text: "My publications and CV sit side by side. Reviewers find everything in one place." },
];

export type Plan = {
  name: string;
  price: string;
  per: string;
  blurb: string;
  tag: "Available now" | "Planned";
  featured?: boolean;
  points: readonly string[];
};

export const PLANS: readonly Plan[] = [
  {
    name: "Starter",
    price: "$0",
    per: "while we test",
    blurb: "Everything below is free during testing.",
    tag: "Available now",
    featured: true,
    points: ["One published page", "Your CV in the layout you choose", "Enquiry form and WhatsApp button", "Basic page views"],
  },
  {
    name: "Pro",
    price: "$12",
    per: "a month, planned",
    blurb: "For people who want more control.",
    tag: "Planned",
    points: ["Everything in Starter", "Your own domain", "Full visitor insights", "Remove the Sheetfolio footer"],
  },
  {
    name: "Recruiter",
    price: "From $99",
    per: "a month, planned",
    blurb: "For teams who review many candidates.",
    tag: "Planned",
    points: ["Shortlist candidate pages", "Compare CVs side by side", "Team seats", "Priority support"],
  },
];

export const FAQS = [
  { q: "Is it really free?", a: "Yes, while we test. We will tell you well before any paid plan starts, and your page stays yours." },
  { q: "Can I use my own domain?", a: "Not yet. It is planned for the Pro plan." },
  { q: "Who sees my phone number?", a: "Only what you choose to show. Visitors can message you through the form without it." },
  { q: "Which CV layouts are there?", a: "Classic, Modern, Projects and Minimal. All are single column with real text so recruiter systems can read them." },
  { q: "Do I need photos for my projects?", a: "No. Add a website link and we read its picture, title and description. Otherwise upload a photo, or we show a stock photo for the category until you do." },
] as const;

export const FOOTER_COLUMNS = [
  { title: "Product", links: [{ label: "Features", href: "/product" }, { label: "CV layouts", href: "/product" }, { label: "Enquiries", href: "/product" }, { label: "Insights", href: "/product" }, { label: "Pricing", href: "/pricing" }] },
  { title: "Made for everyone", links: [{ label: "Job seekers", href: "/featured" }, { label: "Freelancers", href: "/featured" }, { label: "Students", href: "/featured" }, { label: "Small businesses", href: "/featured" }, { label: "Anyone with work to show", href: "/featured" }] },
  { title: "Explore", links: [{ label: "Featured users", href: "/featured" }, { label: "Success stories", href: "/stories" }, { label: "How it works", href: "/featured#how-it-works" }, { label: "Questions", href: "/pricing#questions" }] },
  { title: "Account", links: [{ label: "Sign in", href: "/login" }, { label: "Create your page", href: "/login" }, { label: "Dashboard", href: "/dashboard" }, { label: "Reset password", href: "/forgot-password" }] },
] as const;

/** Every picture the marketing pages point at, so a test can check each file exists. */
export function marketingImagePaths(): string[] {
  const paths = new Set<string>();
  for (const k of Object.keys(PEOPLE) as PersonKey[]) paths.add(personSrc(k));
  for (const l of Object.values(LANDING)) paths.add(l.src);
  for (const s of STORIES) paths.add(s.photo);
  return [...paths];
}
