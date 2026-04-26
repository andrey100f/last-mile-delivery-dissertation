import { UserRole } from '@core/services/enum/auth.types';
import { APP_NAV_SECTIONS } from './app-nav.config';
import type { NavSection } from './app-nav.model';

/** Returns only sections and items the given role may see; drops empty sections. */
export function navSectionsForRole(role: UserRole | null): NavSection[] {
  if (role === null) {
    return [];
  }

  const sections: NavSection[] = [];

  for (const section of APP_NAV_SECTIONS) {
    const items = section.items.filter((item) => item.roles.includes(role));
    if (items.length === 0) {
      continue;
    }
    sections.push({ label: section.label, items });
  }

  return sections;
}
