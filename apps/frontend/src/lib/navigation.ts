import {
  AudioLines,
  FileText,
  FolderKanban,
  LayoutDashboard,
  Link2,
  ListChecks,
  NotebookText,
  Settings,
  UserRound,
  UsersRound,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** One-line purpose, used as the page's description and the nav tooltip. */
  description: string;
  /** Shown only if the user holds at least one. The API still enforces its own checks. */
  anyOf: string[];
  /** Other path prefixes that count as "inside" this area. */
  matches?: string[];
}

/**
 * The admin workspace's primary navigation, in the order the work happens:
 * plan (Projects) → who collects (Enumerators) → what came in (Submissions)
 * → make it trustworthy (Transcripts: reviewed and approved) → use it
 * (Reports). Everything else lives inside the page where it is needed.
 *
 * Not here, on purpose:
 *  - Assignments: replaced by Enumerators (`/assignments` redirects there).
 *    Booking an interview in advance is a button on Submissions.
 *  - AI Dialogue: a question asked of one approved transcript, so it opens
 *    from that transcript.
 *  - Findings: a tab of Reports.
 *  - The legacy MERL questionnaires and translations (deregistered;
 *    LEGACY.md), Organizations and Workspaces.
 */
export const PRIMARY_NAV: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    description: 'What needs your attention across projects, submissions and transcripts',
    anyOf: ['view.projects'],
  },
  {
    label: 'Projects',
    href: '/projects',
    icon: FolderKanban,
    description: 'Research studies, their interview types and teams',
    anyOf: ['view.projects'],
  },
  {
    label: 'Enumerators',
    href: '/enumerators',
    icon: UsersRound,
    description: 'Field staff: their projects, access codes and submissions',
    anyOf: ['view.enumerators'],
  },
  {
    label: 'Submissions',
    href: '/interviews',
    icon: AudioLines,
    description: 'Interviews collected, with participants, consent and recordings',
    anyOf: ['view.interviews'],
    matches: ['/participants', '/assignments'],
  },
  {
    label: 'Transcripts',
    href: '/transcripts',
    icon: FileText,
    description: 'Review, compare and approve transcripts before they are used',
    anyOf: ['view.transcripts'],
    matches: ['/ai'],
  },
  {
    label: 'Reports',
    href: '/analysis',
    icon: NotebookText,
    description: 'Reports and findings built only from approved transcripts',
    anyOf: ['view.reports', 'view.findings'],
    matches: ['/findings'],
  },
];

/** Secondary: set-up material rather than a step in the flow. */
export const SETUP_NAV: NavItem[] = [
  {
    label: 'Guides',
    href: '/guides',
    icon: ListChecks,
    description: 'Approved interview guides (question sets) for field teams',
    anyOf: ['view.guides'],
  },
  {
    label: 'Self-interviews',
    href: '/links',
    icon: Link2,
    description: 'Links key informants open to answer on their own, with no account',
    anyOf: ['view.links'],
  },
];

export const ACCOUNT_NAV: NavItem[] = [
  {
    label: 'Profile',
    href: '/profile',
    icon: UserRound,
    description: 'Your details and session',
    anyOf: [],
  },
  {
    label: 'Settings',
    href: '/admin/settings',
    icon: Settings,
    description: 'Organization, members, roles and AI',
    anyOf: ['view.users', 'view.roles', 'configure.ai', 'view.audit', 'edit.organizations'],
    matches: ['/admin'],
  },
];

export function isActive(item: NavItem, pathname: string): boolean {
  return [item.href, ...(item.matches ?? [])].some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + '/'),
  );
}

export function findArea(pathname: string): NavItem | undefined {
  return [...PRIMARY_NAV, ...SETUP_NAV, ...ACCOUNT_NAV].find((item) => isActive(item, pathname));
}

/** Items a user may see, given their permissions (the API still enforces its own). */
export function visibleNav(items: NavItem[], can: (...slugs: string[]) => boolean, resolved: boolean): NavItem[] {
  return items.filter((item) => !resolved || item.anyOf.length === 0 || can(...item.anyOf));
}
