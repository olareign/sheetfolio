/*
 * Copy and picture references for the marketing pages (/, /product, /featured, /use-cases).
 * Nothing here is presented as a real person's words: the use-case pages describe what a page can hold, with no
 * invented names, quotes or results. Real stories belong here only once real users have agreed to them.
 * /pricing exists but is hidden (redirected in next.config.ts) until plans are settled.
 */

export const NAV = [
  { href: "/", label: "Home" },
  { href: "/product", label: "Product" },
  { href: "/featured", label: "Featured" },
  { href: "/use-cases", label: "Use cases" },
] as const;

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

export const FEATURES = [
  {
    icon: "grid",
    title: "A page that looks finished",
    text: "Add projects, experience and credentials. Your page is laid out for you, in light or dark.",
  },
  {
    icon: "doc",
    title: "The CV layout you choose",
    text: "Pick one of four ATS-friendly layouts for your Download CV button. Preview each before you publish.",
  },
  {
    icon: "mail",
    title: "Enquiries in your inbox",
    text: "Visitors message you from the page. Every lead is saved and emailed to you.",
  },
  {
    icon: "eye",
    title: "See who is looking",
    text: "Page views and enquiries in one place, so you know what is working.",
  },
] as const;
export type FeatureIcon =
  | (typeof FEATURES)[number]["icon"]
  | "link"
  | "bolt"
  | "check"
  | "user"
  | "phone"
  | "moon"
  | "shield"
  | "image"
  | "upload"
  | "search"
  | "chat";

export type UseCase = {
  /** Who it is for, as a group. Never a named person. */
  who: string;
  photo: string;
  alt: string;
  title: string;
  text: string;
  /** What that group typically puts on the page. */
  puts: readonly string[];
};

export const USE_CASES: readonly UseCase[] = [
  {
    who: "Engineers and builders",
    photo: "/stock/projects/building.jpg",
    alt: "A tall building under construction with a crane",
    title: "One link on every bid",
    text: "Show the buildings, roads and sites you have delivered, then send a single link instead of a heavy PDF.",
    puts: ["Projects with role, location and status", "Registrations and certificates", "A CV clients can download"],
  },
  {
    who: "Freelancers and consultants",
    photo: "/stock/landing/team-laptops.jpg",
    alt: "Colleagues working together at laptops",
    title: "Let clients check you out before they call",
    text: "Past work and a clear way to get in touch, so the first conversation starts further along.",
    puts: ["Client work and outcomes", "A WhatsApp button and enquiry form", "Your CV, ready to download"],
  },
  {
    who: "Nurses, teachers and health workers",
    photo: "/stock/projects/healthcare.jpg",
    alt: "A doctor and patient at a health screening",
    title: "Credentials in one place",
    text: "Certificates, training and research are easy to lose in folders. Put them in front of employers in one scroll.",
    puts: ["Certifications with scans", "Experience and education", "Referees, shown only if you choose"],
  },
  {
    who: "Architects, designers and makers",
    photo: "/stock/landing/crafts-market.jpg",
    alt: "A crafts market stall with masks and paintings",
    title: "Start the pitch with the portfolio",
    text: "Pick the three projects worth talking through and let the rest sit one tap away.",
    puts: ["Photo-led project pages", "A picture pulled from any project's website", "Light and dark themes"],
  },
  {
    who: "Students and job seekers",
    photo: "/stock/landing/classroom.jpg",
    alt: "A girl reading in a crowded classroom",
    title: "A proper page before the first job",
    text: "Coursework, volunteering and early projects count. Show them properly and keep it current as you grow.",
    puts: ["Projects and volunteering", "Education and certificates", "One link for every application"],
  },
  {
    who: "Researchers and academics",
    photo: "/stock/projects/data-ai.jpg",
    alt: "A person coding on a laptop",
    title: "Publications beside your CV",
    text: "Reviewers and collaborators find your work and your CV in the same place.",
    puts: ["Research and publications", "A projects-first CV layout", "Contact details you control"],
  },
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
    points: [
      "One published page",
      "Your CV in the layout you choose",
      "Enquiry form and WhatsApp button",
      "Basic page views",
    ],
  },
  {
    name: "Pro",
    price: "$12",
    per: "a month, planned",
    blurb: "For people who want more control.",
    tag: "Planned",
    points: ["Everything in Starter", "Your own domain", "Full visitor insights", "Remove the Dosinex footer"],
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
  {
    q: "Is it really free?",
    a: "Yes, while we test. We will tell you well before any paid plan starts, and your page stays yours.",
  },
  { q: "Can I use my own domain?", a: "Not yet. It is planned for the Pro plan." },
  {
    q: "Who sees my phone number?",
    a: "Only what you choose to show. Visitors can message you through the form without it.",
  },
  {
    q: "Which CV layouts are there?",
    a: "Classic, Modern, Projects and Minimal. All are single column with real text so recruiter systems can read them.",
  },
  {
    q: "Do I need photos for my projects?",
    a: "No. Add a website link and we read its picture, title and description. Otherwise upload a photo, or we show a stock photo for the category until you do.",
  },
] as const;

export const FOOTER_COLUMNS = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "/product" },
      { label: "CV layouts", href: "/product" },
      { label: "Enquiries", href: "/product" },
      { label: "Insights", href: "/product" },
      { label: "Link previews", href: "/product" },
    ],
  },
  {
    title: "Made for everyone",
    links: [
      { label: "Job seekers", href: "/use-cases" },
      { label: "Freelancers", href: "/use-cases" },
      { label: "Students", href: "/use-cases" },
      { label: "Small businesses", href: "/use-cases" },
      { label: "Anyone with work to show", href: "/use-cases" },
    ],
  },
  {
    title: "Explore",
    links: [
      { label: "Featured users", href: "/featured" },
      { label: "Use cases", href: "/use-cases" },
      { label: "How it works", href: "/product#how-it-works" },
      { label: "Questions", href: "/product#questions" },
    ],
  },
  {
    title: "Account",
    links: [
      { label: "Sign in", href: "/login" },
      { label: "Create your page", href: "/signup" },
      { label: "Dashboard", href: "/dashboard" },
      { label: "Reset password", href: "/forgot-password" },
    ],
  },
  {
    title: "Legal",
    links: [{ label: "Privacy policy", href: "/privacy" }],
  },
] as const;

/** Every picture the marketing pages point at, so a test can check each file exists. */
export function marketingImagePaths(): string[] {
  const paths = new Set<string>();
  for (const l of Object.values(LANDING)) paths.add(l.src);
  for (const u of USE_CASES) paths.add(u.photo);
  return [...paths];
}
