import type { ComponentType, SVGProps } from 'react';
import { AskIcon, BookIcon, CompassIcon, HomeIcon, JourneyIcon } from '../icons/Icons';

export interface NavItem {
  to: string;
  /** Translation key for the label. */
  labelKey: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  end?: boolean;
}

export const NAV_ITEMS: readonly NavItem[] = [
  { to: '/', labelKey: 'nav.home', icon: HomeIcon, end: true },
  { to: '/bible', labelKey: 'nav.bible', icon: BookIcon },
  { to: '/ask', labelKey: 'nav.ask', icon: AskIcon },
  { to: '/discover', labelKey: 'nav.discover', icon: CompassIcon },
  { to: '/journey', labelKey: 'nav.journey', icon: JourneyIcon },
];
