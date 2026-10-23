import type { FeatureIcon } from "./marketing";

/** The four steps on the Product page, in the order a new person meets them. */
export const JOURNEY: readonly { icon: FeatureIcon; title: string; text: string }[] = [
  { icon: "user", title: "Sign up", text: "Pick your page address and a password. It takes about a minute." },
  {
    icon: "upload",
    title: "Start from your CV",
    text: "Upload a PDF to fill in the basics, or start fresh. A guide takes you through each step.",
  },
  {
    icon: "check",
    title: "Check and publish",
    text: "The guide shows what is still needed. Publish when you are ready, and change it any time.",
  },
  {
    icon: "link",
    title: "Share your link",
    text: "Send it anywhere. The preview shows your photo and details, and enquiries come to you.",
  },
];

/** Smaller capabilities, shown as cards. Only things the product really does. */
export const CAPABILITIES: readonly { icon: FeatureIcon; title: string; text: string }[] = [
  {
    icon: "phone",
    title: "Built for phones",
    text: "Most people open a link on their phone, so every page is laid out for a small screen first.",
  },
  { icon: "moon", title: "Light and dark", text: "Your page follows the visitor's theme, and you choose the default." },
  {
    icon: "chat",
    title: "WhatsApp built in",
    text: "A button opens a chat with a message already written for the visitor.",
  },
  {
    icon: "image",
    title: "Pictures without editing",
    text: "Add a website link to a project and its picture and description are filled in for you.",
  },
  {
    icon: "shield",
    title: "Private by default",
    text: "Date of birth, phone and other personal details stay hidden until you choose to show them.",
  },
  {
    icon: "search",
    title: "Found in search",
    text: "Each page has its own title, description and link preview, so it reads well in search results and chats.",
  },
];
