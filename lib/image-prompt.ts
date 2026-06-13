const SFW_SUFFIX =
  "professional corporate logo, family-friendly, safe for work, no people, no nudity, no violence, no suggestive content";

/** Logo prompts must not include the user brief — it often triggers false NSFW blocks. */
export function buildLogoImagePrompt(name: string, styleModifier: string, safeMode = false): string {
  const base =
    "minimalist logo, monochrome, flat vector, geometric, generous negative space, no gradient, no photorealism, white background, centered";
  if (safeMode) {
    return `${base}, ${styleModifier}, abstract geometric brand mark, monochrome icon, ${SFW_SUFFIX}`;
  }
  return `${base}, ${styleModifier}, logo design for brand name "${name}", ${SFW_SUFFIX}`;
}

export function isNsfwImageError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /nsfw/i.test(msg) || /"code":3030/.test(msg) || /\b3030\b/.test(msg);
}
