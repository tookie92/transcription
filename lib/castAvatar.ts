/** Portrait URL for Cast fiches (legacy PersonaGenerator approach). */

const FEMALE_FIRST = new Set([
  "mary", "patricia", "jennifer", "linda", "elizabeth", "barbara", "susan",
  "jessica", "sarah", "karen", "lisa", "nancy", "betty", "margaret", "sandra",
  "ashley", "kimberly", "emily", "donna", "michelle", "dorothy", "carol",
  "amanda", "melissa", "deborah", "stephanie", "rebecca", "sharon", "laura",
  "cynthia", "amy", "angela", "helen", "anna", "brenda", "nicole", "samantha",
  "katherine", "christine", "rachel", "catherine", "maria", "heather", "diane",
  "julie", "olivia", "victoria", "kelly", "lauren", "christina", "evelyn",
  "megan", "andrea", "hannah", "martha", "gloria", "teresa", "ann", "sara",
  "madison", "abigail", "alice", "sophia", "grace", "denise", "amber",
  "danielle", "isabella", "diana", "natalie", "charlotte", "marie", "kayla",
]);

const MALE_FIRST = new Set([
  "john", "james", "robert", "michael", "william", "david", "richard",
  "joseph", "thomas", "charles", "christopher", "daniel", "matthew", "anthony",
  "mark", "steven", "paul", "andrew", "joshua", "kevin", "brian", "george",
  "edward", "timothy", "jason", "ryan", "jacob", "nicholas", "eric", "jonathan",
  "stephen", "larry", "justin", "scott", "brandon", "benjamin", "samuel",
  "patrick", "alexander", "jack", "dennis", "jerry", "tyler", "aaron", "adam",
  "nathan", "henry", "zachary", "peter", "kyle", "noah", "ethan", "jeremy",
  "christian", "austin", "sean", "dylan", "jordan", "jesse", "bryan", "gabriel",
  "logan", "albert", "philip", "ralph", "louis", "howard", "vincent", "martin",
  "harry", "lewis",
]);

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

export function inferCastGender(
  name: string,
  gender?: "male" | "female" | null
): "men" | "women" {
  if (gender === "female") return "women";
  if (gender === "male") return "men";

  const first = name.trim().split(/\s+/)[0]?.toLowerCase() ?? "";
  if (FEMALE_FIRST.has(first)) return "women";
  if (MALE_FIRST.has(first)) return "men";

  const lower = name.trim().toLowerCase();
  if (
    lower.endsWith("a") ||
    lower.endsWith("ine") ||
    lower.endsWith("elle") ||
    lower.endsWith("ie")
  ) {
    return "women";
  }
  return "men";
}

export function castAvatarUrl(
  name: string,
  gender?: "male" | "female" | null
): string {
  const bucket = inferCastGender(name, gender);
  const id = (Math.abs(hashCode(name)) % 99) + 1;
  return `https://randomuser.me/api/portraits/${bucket}/${id}.jpg`;
}

export function castAvatarFallback(name: string): string {
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
    name
  )}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;
}

export function castInitialsAvatar(name: string): string {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(
    name
  )}&background=1a1a1a&color=fff&size=400`;
}

/**
 * Prefer stored URL; if missing or already a soft fallback, derive randomuser from name.
 * Dicebear / ui-avatars are only for onError recovery.
 */
export function resolveCastAvatar(
  name: string,
  profileImage?: string | null,
  gender?: "male" | "female" | null
): string {
  const stored = profileImage?.trim();
  if (
    stored &&
    !stored.includes("dicebear.com") &&
    !stored.includes("ui-avatars.com")
  ) {
    return stored;
  }
  return castAvatarUrl(name, gender);
}

/** Next step after a failed load: randomuser → initials → dicebear. */
export function nextCastAvatarFallback(
  name: string,
  failedSrc: string
): string {
  if (failedSrc.includes("randomuser.me")) {
    return castInitialsAvatar(name);
  }
  if (failedSrc.includes("ui-avatars.com")) {
    return castAvatarFallback(name);
  }
  return castAvatarFallback(name);
}
