/*
 * The privacy policy, written against what the app actually does (see lib/ for the code each statement describes).
 * Keep it in step with the product: a new service provider, a new kind of data, or a new retention period means
 * an edit here and a new `PRIVACY_UPDATED` date.
 */

export const PRIVACY_UPDATED = "23 October 2026";

type Block = { p: string } | { ul: readonly string[] };
export type PrivacySection = { id: string; title: string; blocks: readonly Block[] };

export const PRIVACY: readonly PrivacySection[] = [
  {
    id: "who",
    title: "Who we are and what this covers",
    blocks: [
      {
        p: "Sheetfolio lets people publish a page with their projects, credentials, CV and contact details. This policy explains what personal data we handle when you use sheetfolio, whether you own a page, visit someone's page, or just browse this website.",
      },
      {
        p: "We are the controller of the account data described below. For what an owner puts on their own page, the owner decides what is shown; we host it on their behalf.",
      },
      {
        p: "We follow the Nigeria Data Protection Act 2023 and, for people in the UK and the European Economic Area, the principles of the UK and EU GDPR.",
      },
    ],
  },
  {
    id: "collect",
    title: "What we collect",
    blocks: [
      { p: "If you create a page (an account), we keep:" },
      {
        ul: [
          "Your name, email address, page address and a password. The password is stored only as a salted scrypt hash, never in readable form.",
          "What you add to your page: headline, summary, location, photo, WhatsApp number, public email, projects (with pictures and website links), experience, education, certifications and their scans, testimonials and referees.",
          "Private details you choose to enter, such as date of birth, place of birth, state of origin, marital status and nationality. They are hidden from your public page and from your CV unless you tick “Show on page” for that detail.",
          "Your settings, such as theme and whether your page appears on the Featured list, and your CV layout choice.",
          "The CV file you upload when you use “Start from your CV”. We read it once to suggest entries for you to check, and we do not keep the file itself.",
        ],
      },
      { p: "If you visit a published page or send an enquiry, we keep:" },
      {
        ul: [
          "Enquiry details you type into the contact form: your name, email, company (optional) and message. They are stored in the page owner's leads list and emailed to the owner.",
          "Anonymous counts: how many times a page and each project were opened per day, and how many times the Download CV button was pressed. These counts are not linked to you, and we do not store your IP address with them.",
        ],
      },
      { p: "Technical data:" },
      {
        ul: [
          "Your IP address is used briefly to limit abuse, for example repeated sign-in attempts, password-reset requests, sign-ups and enquiries. It is kept only for the length of the limiting window (up to one hour).",
          "Our hosting provider keeps standard server logs (request time, address, errors) for security and troubleshooting.",
        ],
      },
    ],
  },
  {
    id: "not",
    title: "What we do not do",
    blocks: [
      {
        ul: [
          "We do not sell personal data.",
          "We do not run advertising or cross-site tracking, and there are no analytics scripts on public pages.",
          "We do not use your content to train AI models.",
        ],
      },
    ],
  },
  {
    id: "use",
    title: "Why we use your data",
    blocks: [
      {
        ul: [
          "To provide the service you asked for: creating and publishing your page, sending your enquiries to you, producing your CV, and showing you your page views. Legal basis: performing our agreement with you.",
          "To keep the service secure and prevent abuse. Legal basis: our legitimate interest in running a safe service.",
          "To email you about your account, such as password resets and enquiries. Legal basis: performing our agreement with you.",
          "To show your published page in search results and on the Featured list. Legal basis: your consent, which you give by publishing and can withdraw by unpublishing, leaving the Featured list in Settings, or contacting us.",
        ],
      },
    ],
  },
  {
    id: "public",
    title: "What is public",
    blocks: [
      {
        p: "Once you publish, your page is public and search engines can index it. Anyone with the link can see what you chose to show: your name, headline, summary, location, photo, projects, credentials, and the contact options you enabled.",
      },
      {
        p: "Pages that have not opted out also appear on the Featured list, with your name, headline, location, photo and a view count. You can leave the list at any time in Settings. Link previews (for example on WhatsApp or LinkedIn) show your photo, name and headline.",
      },
      {
        p: "Think before you add information you would not want strangers to see. Private details stay private unless you reveal them.",
      },
    ],
  },
  {
    id: "providers",
    title: "Who helps us run sheetfolio",
    blocks: [
      { p: "We use these service providers. They process data only to provide their service to us:" },
      {
        ul: [
          "Vercel: hosts the website and application.",
          "Upstash: the database that stores accounts, pages, enquiries and counters.",
          "Cloudinary: stores the pictures and documents you upload.",
          "Resend: sends our emails, such as password resets and enquiry alerts.",
          "A website screenshot service (Microlink by default): when you add a project website link, we fetch that site's public title, description and picture, and may ask this service for a screenshot. It receives the link you entered.",
        ],
      },
      { p: "We may disclose data if the law requires it, or to protect people from harm or fraud." },
    ],
  },
  {
    id: "transfers",
    title: "Where data is kept",
    blocks: [
      {
        p: "Our providers run servers in several countries, including the United States and Europe, so your data may be processed outside Nigeria. Where that happens we rely on our providers' contractual and security commitments for the protection of personal data.",
      },
    ],
  },
  {
    id: "keep",
    title: "How long we keep data",
    blocks: [
      {
        ul: [
          "Account and page data: until you ask us to delete it, or your account is closed.",
          "Daily page-view counts: 90 days. Total project views and CV downloads: until the account is deleted.",
          "Enquiries: the most recent 500 per page, until deleted.",
          "Password-reset links: one hour, or until used.",
          "Sign-in sessions: up to 30 days, or until you sign out or change your password.",
        ],
      },
    ],
  },
  {
    id: "cookies",
    title: "Cookies and similar storage",
    blocks: [
      {
        p: "We use only what is needed for the site to work. When you sign in, a secure session cookie keeps you signed in, and a security cookie protects against forged requests. Your light or dark theme choice is saved in your browser's local storage. We do not use advertising or tracking cookies, so there is no cookie banner.",
      },
    ],
  },
  {
    id: "rights",
    title: "Your rights",
    blocks: [
      { p: "You can ask us to:" },
      {
        ul: [
          "give you a copy of the personal data we hold about you;",
          "correct data that is wrong or incomplete (you can also edit most of it yourself in your dashboard);",
          "delete your data and close your account;",
          "restrict or object to how we use your data, or withdraw consent you gave;",
          "give you your data in a portable form.",
        ],
      },
      {
        p: "We will reply within 30 days. If you are unhappy with our answer you can complain to the Nigeria Data Protection Commission, or, if you live in the UK or EEA, to your local data protection authority.",
      },
    ],
  },
  {
    id: "security",
    title: "Keeping data safe",
    blocks: [
      {
        p: "Connections use HTTPS, passwords are hashed, access to a page's dashboard needs a signed-in session, and uploads are limited to your own folder. No system is perfectly secure, so please choose a strong password and tell us at once if you suspect misuse.",
      },
    ],
  },
  {
    id: "children",
    title: "Children",
    blocks: [
      {
        p: "Sheetfolio is not meant for people under 18, and we do not knowingly collect their data. If you believe a child has made a page, contact us and we will remove it.",
      },
    ],
  },
  {
    id: "changes",
    title: "Changes to this policy",
    blocks: [
      {
        p: "When we change this policy we will update the date at the top. If a change affects how we use your data in a significant way, we will tell account holders by email.",
      },
    ],
  },
];
