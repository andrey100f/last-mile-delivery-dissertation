export function initialsFromEmail(email: string): string {
  const local = email.split('@')[0] ?? email;
  const cleaned = local.replace(/[^a-zA-Z0-9]/g, '');
  if (cleaned.length >= 2) {
    return (cleaned[0] + cleaned[1]).toUpperCase();
  }
  if (local.length >= 2) {
    return local.slice(0, 2).toUpperCase();
  }
  return local.slice(0, 1).toUpperCase() || '?';
}

export function displayNameFromEmail(email: string): string {
  const local = email.split('@')[0] ?? email;
  return local
    .split(/[._-]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

export function initialsFromDisplayName(displayName: string): string {
  const normalized = displayName.trim();
  if (normalized.length === 0) {
    return '?';
  }

  const parts = normalized.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  const cleaned = normalized.replace(/[^a-zA-Z0-9]/g, '');
  if (cleaned.length >= 2) {
    return (cleaned[0] + cleaned[1]).toUpperCase();
  }

  return normalized.slice(0, 1).toUpperCase();
}
