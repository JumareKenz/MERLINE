import {
  AudioLines,
  ClipboardList,
  FileText,
  FolderKanban,
  ListChecks,
  MessagesSquare,
  Quote,
  Settings,
  UserRound,
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
 * The admin workspace's primary navigation — deliberately short. Each item
 * is a step in the research workflow; everything else (participants,
 * consent, recordings, quotations, members, roles…) lives inside the page
 * where it is needed.
 *
 * Not here, on purpose:
 *  - The legacy MERL questionnaires and translations (deregistered;
 *    LEGACY.md). Interview guides are the qualitative replacement.
 *  - Organizations / Workspaces: rarely used, and GET /organizations is not
 *    yet tenant-filtered (see DEPLOYMENT.md known gaps).
 */
export const PRIMARY_NAV: NavItem[] = [
  {
    label: 'Projects',
    href: '/projects',
    icon: FolderKanban,
    description: 'Research studies and what needs attention',
    anyOf: ['view.projects'],
  },
  {
    label: 'Guides',
    href: '/guides',
    icon: ListChecks,
    description: 'Approved interview guides (question sets) for field teams',
    anyOf: ['view.guides'],
  },
  {
    label: 'Assignments',
    href: '/assignments',
    icon: ClipboardList,
    description: 'Field team and the projects they collect interviews for',
    anyOf: ['create.interviews'],
  },
  {
    label: 'Results',
    href: '/interviews',
    icon: AudioLines,
    description: 'Collected interviews, participants, consent and recordings',
    anyOf: ['view.interviews'],
    matches: ['/participants'],
  },
  {
    label: 'Transcripts',
    href: '/transcripts',
    icon: FileText,
    description: 'Transcripts and their segments',
    anyOf: ['view.transcripts'],
  },
  {
    label: 'Reports',
    href: '/findings',
    icon: Quote,
    description: 'Evidence-linked findings, review and publication',
    anyOf: ['view.findings'],
  },
  {
    label: 'AI Dialogue',
    href: '/ai',
    icon: MessagesSquare,
    description: 'Ask grounded questions of a transcript',
    anyOf: ['use.ai'],
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
  return [...PRIMARY_NAV, ...ACCOUNT_NAV].find((item) => isActive(item, pathname));
}
