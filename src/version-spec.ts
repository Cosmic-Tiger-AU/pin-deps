/** Parse `npm:@scope/pkg@version` or `npm:pkg@version` into package name and version. */
export const parseNpmAlias = (
  spec: string,
): { packageName: string; version: string } | null => {
  // Strip "npm:" prefix
  const rest = spec.slice(4);
  // Find the last "@" that separates name from version (scoped packages start with @)
  const atIdx = rest.lastIndexOf("@");
  if (atIdx <= 0) return null;
  const version = rest.slice(atIdx + 1);
  if (!version) return null;
  return { packageName: rest.slice(0, atIdx), version };
};

export const isUnpinned = (version: string): boolean => {
  if (/^(workspace:|git\+|http|file:|link:)/.test(version)) return false;
  if (/^npm:/.test(version)) {
    const aliasVersion = parseNpmAlias(version);
    return aliasVersion ? isUnpinned(aliasVersion.version) : false;
  }
  if (/^[\^~><]/.test(version) || version === "*") return true;
  // Bare major ("22") or major.minor ("8.5") are not fully pinned
  return !/^\d+\.\d+\.\d+/.test(version);
};
