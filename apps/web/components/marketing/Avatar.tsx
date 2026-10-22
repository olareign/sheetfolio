import Image from "next/image";
import { PEOPLE, personSrc, type PersonKey } from "@/content/marketing";

/** A round stock portrait. The alt text names the sample person it is shown as. */
export function Avatar({ person, size = 44 }: { person: PersonKey; size?: number }) {
  return (
    <Image
      className="mk-avatar"
      src={personSrc(person)}
      alt={`Portrait of ${PEOPLE[person].name}`}
      width={size}
      height={size}
      sizes={`${size}px`}
    />
  );
}
