import { ArrowUpRight, Check, Eye, FileText, LayoutGrid, Link2, Mail, User, Zap, type LucideIcon } from "lucide-react";
import type { FeatureIcon } from "@/content/marketing";

const ICONS: Record<FeatureIcon, LucideIcon> = {
  grid: LayoutGrid,
  doc: FileText,
  mail: Mail,
  eye: Eye,
  link: Link2,
  bolt: Zap,
  check: Check,
  user: User,
};

export function Icon({ name, size = 20 }: { name: FeatureIcon; size?: number }) {
  const Glyph = ICONS[name];
  return <Glyph size={size} strokeWidth={1.8} aria-hidden="true" />;
}

export const Arrow = ({ size = 14 }: { size?: number }) => <ArrowUpRight size={size} strokeWidth={2} aria-hidden="true" />;
