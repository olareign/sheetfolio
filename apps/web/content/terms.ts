import type { PrivacySection as LegalSection } from "./privacy";

/*
 * The terms of service, written against what the app actually does (see lib/ and content/privacy.ts, which it points
 * to). Keep it in step with the product: a new paid plan, a new kind of feature or a new rule for pages means an edit
 * here and a new `TERMS_UPDATED` date. The person agrees to it with a checkbox at sign-up (app/(auth)/signup).
 */

export const TERMS_UPDATED = "28 October 2026";

export const TERMS: readonly LegalSection[] = [
  {
    id: "agreeing",
    title: "Agreeing to these terms",
    blocks: [
      {
        p: "These terms are the agreement between you and Dosinex for using this website and the service that lets you publish a page with your projects, credentials, CV and contact details.",
      },
      {
        p: "You agree to them when you create an account, and each time you use the service afterwards. If you do not agree, please do not create an account. You can still visit published pages and read this website without one.",
      },
      {
        p: "You must be at least 18 years old. Our Privacy policy explains how we handle your personal data and is part of this agreement.",
      },
    ],
  },
  {
    id: "account",
    title: "Your account",
    blocks: [
      {
        ul: [
          "Give us true details, and keep them up to date. Do not claim to be someone you are not.",
          "Keep your password secret and choose a strong one. You are responsible for what happens under your account, so tell us at once if you think someone else has used it.",
          "Your page address (the part after the site name) is yours to use while your account is open. We may change or remove an address that impersonates another person or organisation, or that breaks these terms.",
        ],
      },
    ],
  },
  {
    id: "content",
    title: "Your content and your page",
    blocks: [
      {
        p: "Everything you add to your page remains yours: your text, photos, projects, certificates, CV details and anything else you upload. We do not claim ownership of it.",
      },
      {
        p: "To run the service you give us permission to store, process, copy and display your content, and to turn it into pages, previews, CV files and the other things you ask us for. This permission lasts only while the content is on your account, and ends when you delete it or your account, apart from short delays while copies are removed from backups.",
      },
      {
        p: "Once you publish, your page is public, and search engines can index it. You decide what to show. Please read the Privacy policy to see what becomes public.",
      },
      {
        p: "You are responsible for your content. You promise that you have the right to use everything you add, that it is accurate, and that you have the permission of anyone whose details you add, such as referees and the people who wrote testimonials.",
      },
    ],
  },
  {
    id: "rules",
    title: "What you must not do",
    blocks: [
      {
        ul: [
          "Break the law, or use Dosinex to help someone else break it.",
          "Publish false qualifications, certificates, experience or identity, or content that is misleading about who you are.",
          "Add content that infringes someone else's rights, or that is hateful, harassing, sexually explicit or threatening.",
          "Upload malware, or try to get into accounts, pages or systems that are not yours.",
          "Overload, scrape or interfere with the service, or get around the limits we set, such as the limits on sign-ups, sign-ins and enquiries.",
          "Use the contact details of people who send you enquiries for anything other than answering them, unless they agree.",
        ],
      },
    ],
  },
  {
    id: "enquiries",
    title: "Enquiries and visitors",
    blocks: [
      {
        p: "When a visitor sends an enquiry through your page, we pass it to you by email and keep it in your leads. What happens after that is between you and the visitor. We are not a party to any work, hiring, sale or other dealing that follows, and we do not check the people who contact you or the people you contact.",
      },
      {
        p: "You are responsible for how you handle the personal data in the enquiries you receive.",
      },
    ],
  },
  {
    id: "suggestions",
    title: "Suggestions from our tools",
    blocks: [
      {
        p: "Some features suggest content for you, for example entries read from the CV you upload. These suggestions can be wrong or incomplete. Check everything before you add it or publish it. What appears on your page, and on the CVs you share, is your responsibility.",
      },
    ],
  },
  {
    id: "service",
    title: "The service, and changes to it",
    blocks: [
      {
        p: "Dosinex is free while we test it. We may add paid features or plans later. If we do, we will tell you first, and you will not be charged for anything unless you choose it.",
      },
      {
        p: "We work to keep the service available, but we do not promise it will always be available or free of errors. We may change, add or remove features, and we may pause the service for maintenance.",
      },
      {
        p: "Keep your own copy of anything important, such as your CV and certificates. We cannot promise we will be able to recover content that is lost.",
      },
    ],
  },
  {
    id: "ending",
    title: "Suspending and ending your account",
    blocks: [
      {
        p: "You can stop using Dosinex at any time, and you can ask us to delete your account and your data (see the Privacy policy for how).",
      },
      {
        p: "We may suspend or remove a page, or close an account, if it breaks these terms, harms other people, or puts the service at risk. Where we reasonably can, we will tell you why and give you a chance to put it right. We may act immediately where the harm is serious.",
      },
    ],
  },
  {
    id: "ours",
    title: "Our property",
    blocks: [
      {
        p: "The Dosinex name, logo, design, software and the layouts we provide belong to us or our licensors. You may use them through the service as intended, but you may not copy them, resell them or pretend that they are yours. The CVs you download are yours to use.",
      },
    ],
  },
  {
    id: "liability",
    title: "What we are and are not responsible for",
    blocks: [
      {
        p: "The service is provided “as it is”. We do not promise that it will meet your needs, or that using it will get you work, clients, interviews or any other result. We are not responsible for what visitors or other users do, or for the content other people publish.",
      },
      {
        p: "To the extent the law allows, we are not liable for indirect or consequential losses, such as lost income, lost opportunities or lost data, and our total liability to you for anything connected with the service is limited to the amount you paid us for it in the twelve months before the problem, which is nothing while the service is free. Nothing in these terms limits liability that cannot lawfully be limited, including for fraud or for death or personal injury caused by negligence.",
      },
      {
        p: "If you break these terms and that causes us loss or a claim from someone else, you agree to cover that loss to the extent the law allows.",
      },
    ],
  },
  {
    id: "law",
    title: "Which law applies",
    blocks: [
      {
        p: "These terms are governed by the laws of the Federal Republic of Nigeria. If we cannot settle a disagreement by talking it through, the Nigerian courts can hear it. This does not take away any rights you have under the consumer or data protection law of the place where you live.",
      },
    ],
  },
  {
    id: "changes",
    title: "Changes to these terms",
    blocks: [
      {
        p: "When we change these terms we will update the date at the top. If a change matters to you, for example a new charge or a new rule, we will tell account holders by email before it applies. If you keep using Dosinex after a change applies, you accept it. If you do not accept it, you can close your account.",
      },
    ],
  },
];
