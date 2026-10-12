import * as React from 'react';
import { cn } from '@/lib/utils';

type Shape =
  | ['path', string]
  | ['circle', number, number, number]
  | ['rect', number, number, number, number, number];

export interface IconProps extends Omit<React.SVGProps<SVGSVGElement>, 'ref'> {
  /** Stroke width on the 24px grid. */
  weight?: number;
  /** Off by default, so a plain icon is fully static. Set it to redraw the strokes when the icon (or a `group` parent) is hovered. */
  draw?: boolean;
  /** Milliseconds each stroke takes to draw. Only used with `draw`. */
  speed?: number;
}

function make(name: string, shapes: Shape[]) {
  const Icon = ({ weight = 1.75, draw, speed = 900, className, style, ...props }: IconProps) => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={weight}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={props['aria-label'] ? undefined : true}
      className={cn('size-4 shrink-0', draw && 'icon-draw', className)}
      style={draw ? ({ '--icon-ms': `${speed}ms`, ...style } as React.CSSProperties) : style}
      {...props}
    >
      {shapes.map((s, i) => {
        const st = { '--i': i } as React.CSSProperties;
        return s[0] === 'path' ? <path key={i} d={s[1]} pathLength={1} style={st} />
          : s[0] === 'circle' ? <circle key={i} cx={s[1]} cy={s[2]} r={s[3]} pathLength={1} style={st} />
          : <rect key={i} x={s[1]} y={s[2]} width={s[3]} height={s[4]} rx={s[5]} pathLength={1} style={st} />;
      })}
    </svg>
  );
  Icon.displayName = name;
  return Icon;
}

const p = (d: string): Shape => ['path', d];

export const BefMark = make('BefMark', [p('M8 4v16h6a4 4 0 0 0 0-8H8h5a4 4 0 0 0 0-8H8')]);
export const SearchIcon = make('SearchIcon', [['circle', 11, 11, 6], p('M20 20l-4.5-4.5')]);
export const CopyIcon = make('CopyIcon', [['rect', 9, 9, 11, 11, 2.5], p('M15 5H6.5A1.5 1.5 0 0 0 5 6.5V15')]);
export const CheckIcon = make('CheckIcon', [p('M5 12.5l4.5 4.5L19 7.5')]);
export const XIcon = make('XIcon', [p('M6 6l12 12M18 6L6 18')]);
export const PlusIcon = make('PlusIcon', [p('M12 5v14M5 12h14')]);
export const MenuIcon = make('MenuIcon', [p('M4 7h16M4 12h10M4 17h16')]);
export const ArrowRightIcon = make('ArrowRightIcon', [p('M5 12h14M13 6l6 6-6 6')]);
export const ChevronRightIcon = make('ChevronRightIcon', [p('M9 6l6 6-6 6')]);
export const SunIcon = make('SunIcon', [['circle', 12, 12, 4], p('M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6L7 7M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4')]);
export const MoonIcon = make('MoonIcon', [p('M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z')]);
export const SparkleIcon = make('SparkleIcon', [p('M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z'), p('M19 17v4M17 19h4')]);
export const ZapIcon = make('ZapIcon', [p('M13 3L5 13.5h6L10 21l9-11h-6z')]);
export const ComponentsIcon = make('ComponentsIcon', [['rect', 4, 4, 7, 7, 2], ['rect', 13, 4, 7, 7, 2], ['rect', 4, 13, 7, 7, 2], ['circle', 16.5, 16.5, 3.5]]);
export const BlocksIcon = make('BlocksIcon', [['rect', 3, 4, 18, 6, 2], ['rect', 3, 14, 8, 6, 2], ['rect', 14, 14, 7, 6, 2]]);
export const LayersIcon = make('LayersIcon', [p('M12 3l9 5-9 5-9-5z'), p('M3 13l9 5 9-5')]);
export const PackageIcon = make('PackageIcon', [p('M12 3l8 4.5v9L12 21l-8-4.5v-9z'), p('M4 7.5l8 4.5 8-4.5M12 12v9')]);
export const PaletteIcon = make('PaletteIcon', [p('M12 3a9 9 0 1 0 0 18c1.5 0 2-1 1.5-2.2-.5-1.2.3-2.3 1.7-2.3H17a4 4 0 0 0 4-4 9 9 0 0 0-9-9z'), ['circle', 7.5, 11, 0.6], ['circle', 10, 7, 0.6], ['circle', 15, 7, 0.6]]);
export const BookIcon = make('BookIcon', [p('M5 5.5A1.5 1.5 0 0 1 6.5 4H19v13H6.5A1.5 1.5 0 0 0 5 18.5z'), p('M5 18.5A1.5 1.5 0 0 0 6.5 20H19v-3')]);
export const CommandKeyIcon = make('CommandKeyIcon', [p('M9 6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3z')]);
export const MonitorIcon = make('MonitorIcon', [['rect', 3, 4, 18, 12, 2], p('M9 20h6M12 16v4')]);
export const TabletIcon = make('TabletIcon', [['rect', 5, 3, 14, 18, 2.5], p('M11 18h2')]);
export const PhoneIcon = make('PhoneIcon', [['rect', 7, 3, 10, 18, 2.5], p('M11 18h2')]);
export const UploadIcon = make('UploadIcon', [p('M12 16V4M7 9l5-5 5 5'), p('M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3')]);

// Arrows and chevrons
export const ChevronLeftIcon = make('ChevronLeftIcon', [p('M15 6l-6 6 6 6')]);
export const ChevronDownIcon = make('ChevronDownIcon', [p('M6 9l6 6 6-6')]);
export const ChevronUpIcon = make('ChevronUpIcon', [p('M6 15l6-6 6 6')]);
export const ArrowLeftIcon = make('ArrowLeftIcon', [p('M19 12H5M11 6l-6 6 6 6')]);
export const ArrowUpIcon = make('ArrowUpIcon', [p('M12 19V5M6 11l6-6 6 6')]);
export const ArrowDownIcon = make('ArrowDownIcon', [p('M12 5v14M6 13l6 6 6-6')]);
export const SortIcon = make('SortIcon', [p('M8 4v16M4 8l4-4 4 4M16 20V4M12 16l4 4 4-4')]);
export const MinusIcon = make('MinusIcon', [p('M5 12h14')]);
export const MoreIcon = make('MoreIcon', [['circle', 5, 12, 1], ['circle', 12, 12, 1], ['circle', 19, 12, 1]]);
export const RefreshIcon = make('RefreshIcon', [p('M20 11a8 8 0 0 0-14-4L4 9M4 4v5h5'), p('M4 13a8 8 0 0 0 14 4l2-2M20 20v-5h-5')]);

// Status
export const InfoIcon = make('InfoIcon', [['circle', 12, 12, 9], p('M12 11v5M12 8v.01')]);
export const AlertIcon = make('AlertIcon', [p('M12 4l9 16H3z'), p('M12 10v4M12 17v.01')]);
export const AlertCircleIcon = make('AlertCircleIcon', [['circle', 12, 12, 9], p('M12 7v6M12 16.5v.01')]);
export const CheckCircleIcon = make('CheckCircleIcon', [['circle', 12, 12, 9], p('M8 12.5l3 3 5-6')]);
export const XCircleIcon = make('XCircleIcon', [['circle', 12, 12, 9], p('M9 9l6 6M15 9l-6 6')]);
export const LoaderIcon = make('LoaderIcon', [p('M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8')]);
export const ShieldIcon = make('ShieldIcon', [p('M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z'), p('M9 12l2 2 4-4')]);

// People and communication
export const UserIcon = make('UserIcon', [['circle', 12, 8, 4], p('M4 20a8 8 0 0 1 16 0')]);
export const UsersIcon = make('UsersIcon', [['circle', 9, 8, 3.5], p('M2.5 19a6.5 6.5 0 0 1 13 0'), ['circle', 17, 9, 2.5], p('M17 14a5 5 0 0 1 4.5 5')]);
export const MailIcon = make('MailIcon', [['rect', 3, 5, 18, 14, 2.5], p('M3.5 7l8.5 6 8.5-6')]);
export const BellIcon = make('BellIcon', [p('M6 17v-6a6 6 0 0 1 12 0v6l1.5 2h-15z'), p('M10 21h4')]);

// Objects
export const CalendarIcon = make('CalendarIcon', [['rect', 3, 5, 18, 16, 2.5], p('M3 10h18M8 3v4M16 3v4')]);
export const ClockIcon = make('ClockIcon', [['circle', 12, 12, 9], p('M12 7v5l3 2')]);
export const HomeIcon = make('HomeIcon', [p('M4 11l8-7 8 7'), p('M6 10v10h12V10M10 20v-5h4v5')]);
export const SettingsIcon = make('SettingsIcon', [p('M4 7h10M18 7h2M4 17h2M10 17h10'), ['circle', 16, 7, 2], ['circle', 8, 17, 2]]);
export const LockIcon = make('LockIcon', [['rect', 5, 11, 14, 9, 2.5], p('M8 11V8a4 4 0 0 1 8 0v3')]);
export const GlobeIcon = make('GlobeIcon', [['circle', 12, 12, 9], p('M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18')]);
export const StarIcon = make('StarIcon', [p('M12 3.5l2.6 5.5 6 .8-4.4 4.2 1.1 6-5.3-3-5.3 3 1.1-6L3.4 9.8l6-.8z')]);
export const HeartIcon = make('HeartIcon', [p('M12 20s-8-4.8-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 9c0 6.2-8 11-8 11z')]);
export const BookmarkIcon = make('BookmarkIcon', [p('M6 4h12v17l-6-4-6 4z')]);

// Actions
export const EditIcon = make('EditIcon', [p('M4 20l1-4L16 5a2 2 0 0 1 3 3L8 19z'), p('M14 7l3 3')]);
export const TrashIcon = make('TrashIcon', [p('M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v5M14 11v5')]);
export const DownloadIcon = make('DownloadIcon', [p('M12 4v12M7 11l5 5 5-5M4 20h16')]);
export const FilterIcon = make('FilterIcon', [p('M4 5h16l-6 8v6l-4-2v-4z')]);
export const EyeIcon = make('EyeIcon', [p('M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z'), ['circle', 12, 12, 3]]);
export const EyeOffIcon = make('EyeOffIcon', [p('M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z'), ['circle', 12, 12, 3], p('M4 4l16 16')]);
export const LinkIcon = make('LinkIcon', [p('M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1'), p('M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1')]);
export const ExternalLinkIcon = make('ExternalLinkIcon', [p('M14 4h6v6M20 4l-9 9'), p('M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5')]);
export const LogOutIcon = make('LogOutIcon', [p('M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3'), p('M16 12H6M9 8l-4 4 4 4')]);
export const ListIcon = make('ListIcon', [p('M9 6h11M9 12h11M9 18h11M4.5 6v.01M4.5 12v.01M4.5 18v.01')]);

// Content and media
export const FileIcon = make('FileIcon', [p('M7 3h7l5 5v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z'), p('M14 3v5h5')]);
export const FolderIcon = make('FolderIcon', [p('M3 7a1 1 0 0 1 1-1h5l2 2h8a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z')]);
export const ImageIcon = make('ImageIcon', [['rect', 3, 4, 18, 16, 2.5], ['circle', 9, 10, 1.8], p('M4 18l5-5 4 4 3-3 4 4')]);
export const PlayIcon = make('PlayIcon', [p('M8 5l11 7-11 7z')]);
export const PauseIcon = make('PauseIcon', [p('M8 5v14M16 5v14')]);
export const BarChartIcon = make('BarChartIcon', [p('M5 20v-9M12 20V5M19 20v-7')]);
export const TrendingIcon = make('TrendingIcon', [p('M3 17l6-6 4 4 8-8M15 7h6v6')]);
export const CodeIcon = make('CodeIcon', [p('M8 7l-5 5 5 5M16 7l5 5-5 5M14 4l-4 16')]);
export const TerminalIcon = make('TerminalIcon', [['rect', 3, 4, 18, 16, 2.5], p('M7 9l3 3-3 3M13 15h4')]);


/** Everything above by name, for galleries and pickers. */
export const ArchiveIcon = make('ArchiveIcon', [['rect', 3, 4, 18, 4, 1], p('M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8M10 12h4')]);
export const CakeIcon = make('CakeIcon', [p('M4 20h16M5 20v-7a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v7M12 12V8M12 5.5v.01M5 16c2 1.5 3.5 1.5 5 0s3.5-1.5 5 0 2.5 1.2 4 .3')]);
export const CreditCardIcon = make('CreditCardIcon', [['rect', 2, 5, 20, 14, 2.5], p('M2 10h20M6 15h3')]);
export const FolderInputIcon = make('FolderInputIcon', [p('M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM9 13h6M12.5 10.5L15 13l-2.5 2.5')]);
export const GitMergeIcon = make('GitMergeIcon', [['circle', 6, 5, 2], ['circle', 6, 19, 2], ['circle', 18, 12, 2], p('M6 7v10M8 5c6 0 10 2 10 5')]);
export const InboxIcon = make('InboxIcon', [p('M3 13l3-8h12l3 8v5a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1zM3 13h5l1 3h6l1-3h5')]);
export const IndianRupeeIcon = make('IndianRupeeIcon', [p('M7 5h10M7 9.5h10M8 5c4.5 0 6.5 1.5 6.5 4.5S12.5 14 8 14l7 6')]);
export const LayoutDashboardIcon = make('LayoutDashboardIcon', [['rect', 3, 3, 7, 9, 1.5], ['rect', 14, 3, 7, 5, 1.5], ['rect', 14, 12, 7, 9, 1.5], ['rect', 3, 16, 7, 5, 1.5]]);
export const LayoutGridIcon = make('LayoutGridIcon', [['rect', 3, 3, 7, 7, 1.5], ['rect', 14, 3, 7, 7, 1.5], ['rect', 3, 14, 7, 7, 1.5], ['rect', 14, 14, 7, 7, 1.5]]);
export const MegaphoneIcon = make('MegaphoneIcon', [p('M4 10v4a1 1 0 0 0 1 1h2l8 4V5L7 9H5a1 1 0 0 0-1 1zM18 9a4 4 0 0 1 0 6')]);
export const MessageSquareIcon = make('MessageSquareIcon', [p('M5 4h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-7l-5 4v-4H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z')]);
export const MousePointerClickIcon = make('MousePointerClickIcon', [p('M9 9l5 12 2-5 5-2zM5 3.5L6 6M3.5 8L6 8.5M8 3l-.5 2.5')]);
export const PanelLeftIcon = make('PanelLeftIcon', [['rect', 3, 4, 18, 16, 2.5], p('M9 4v16')]);
export const SaveIcon = make('SaveIcon', [p('M5 4h11l3 3v12a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1zM8 4v5h7V4M8 20v-6h8v6')]);
export const Share2Icon = make('Share2Icon', [['circle', 18, 5, 2.5], ['circle', 6, 12, 2.5], ['circle', 18, 19, 2.5], p('M8.2 10.8l7.6-4.6M8.2 13.2l7.6 4.6')]);
export const TargetIcon = make('TargetIcon', [['circle', 12, 12, 9], ['circle', 12, 12, 5], ['circle', 12, 12, 1]]);
export const UserCircleIcon = make('UserCircleIcon', [['circle', 12, 12, 9], ['circle', 12, 10, 3], p('M6.5 18.5c1.5-2.5 3.2-3.5 5.5-3.5s4 1 5.5 3.5')]);
export const UserMinusIcon = make('UserMinusIcon', [['circle', 9, 8, 3.5], p('M3 20c0-3.5 2.7-6 6-6s6 2.5 6 6M17 11h5')]);
export const UserPlusIcon = make('UserPlusIcon', [['circle', 9, 8, 3.5], p('M3 20c0-3.5 2.7-6 6-6s6 2.5 6 6M19.5 8.5v5M17 11h5')]);
export const WalletIcon = make('WalletIcon', [p('M4 7a2 2 0 0 1 2-2h12v4M4 7v10a2 2 0 0 0 2 2h14V9H6a2 2 0 0 1-2-2zM16 14h.01')]);
export const ArrowUpRightIcon = make('ArrowUpRightIcon', [p('M7 17L17 7M8 7h9v9')]);
export const ArrowDownRightIcon = make('ArrowDownRightIcon', [p('M7 7l10 10M17 8v9H8')]);

export const PrinterIcon = make('PrinterIcon', [p('M7 9V4h10v5M7 17H5a1 1 0 0 1-1-1v-5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v5a1 1 0 0 1-1 1h-2M7 14h10v6H7z')]);
export const CallIcon = make('CallIcon', [p('M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z')]);
export const MapPinIcon = make('MapPinIcon', [p('M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z'), ['circle', 12, 10, 2.5]]);
export const CameraIcon = make('CameraIcon', [p('M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z'), ['circle', 12, 13, 3.5]]);
export const MicIcon = make('MicIcon', [['rect', 9, 3, 6, 11, 3], p('M5 11a7 7 0 0 0 14 0M12 18v3')]);
export const VideoIcon = make('VideoIcon', [['rect', 3, 6, 13, 12, 2], p('M16 10l5-3v10l-5-3')]);
export const WifiIcon = make('WifiIcon', [p('M2 9a15 15 0 0 1 20 0M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0M12 19.5v.01')]);
export const BatteryIcon = make('BatteryIcon', [['rect', 2, 8, 17, 9, 2], p('M22 11v3M6 11v3')]);
export const BluetoothIcon = make('BluetoothIcon', [p('M7 7l10 10-5 4V3l5 4L7 17')]);
export const ShareIcon = make('ShareIcon', [p('M12 15V4M8 8l4-4 4 4M5 13v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5')]);
export const SendIcon = make('SendIcon', [p('M21 3L10 14M21 3l-7 18-4-7-7-4z')]);
export const PaperclipIcon = make('PaperclipIcon', [p('M20 11l-8.5 8.5a5 5 0 0 1-7-7L13 4a3.5 3.5 0 0 1 5 5l-8.5 8.5a2 2 0 0 1-3-3L14 7')]);
export const TagIcon = make('TagIcon', [p('M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9z'), ['circle', 7.5, 7.5, 1.2]]);
export const FlagIcon = make('FlagIcon', [p('M5 21V4M5 4h11l-2 4 2 4H5')]);
export const PinIcon = make('PinIcon', [p('M9 4h6l-1 6 3 3H7l3-3zM12 13v8')]);
export const ThumbsUpIcon = make('ThumbsUpIcon', [p('M7 11v9H4v-9zM7 11l4-7a2 2 0 0 1 2.5 2.4L13 10h5.5a2 2 0 0 1 2 2.4l-1.3 6A2 2 0 0 1 17.3 20H7')]);
export const SmileIcon = make('SmileIcon', [['circle', 12, 12, 9], p('M8.5 14a4 4 0 0 0 7 0M9 9.5v.01M15 9.5v.01')]);
export const KeyIcon = make('KeyIcon', [['circle', 8, 15, 4], p('M11 12l9-9M16 7l3 3')]);
export const UnlockIcon = make('UnlockIcon', [['rect', 5, 11, 14, 10, 2], p('M8 11V7a4 4 0 0 1 7.5-2')]);
export const TableIcon = make('TableIcon', [['rect', 3, 4, 18, 16, 2], p('M3 10h18M3 15h18M9 4v16')]);
export const DatabaseIcon = make('DatabaseIcon', [p('M4 6c0 1.7 3.6 3 8 3s8-1.3 8-3-3.6-3-8-3-8 1.3-8 3zM4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3')]);
export const ServerIcon = make('ServerIcon', [['rect', 3, 4, 18, 7, 2], ['rect', 3, 13, 18, 7, 2], p('M7 7.5v.01M7 16.5v.01')]);
export const CloudIcon = make('CloudIcon', [p('M7 18a4.5 4.5 0 0 1-.6-8.96A6 6 0 0 1 18 9.5a4 4 0 0 1-.5 8.5z')]);
export const CloudUploadIcon = make('CloudUploadIcon', [p('M7 18a4.5 4.5 0 0 1-.6-8.96A6 6 0 0 1 18 9.5a4 4 0 0 1-.5 8.5M12 17v-6M9.5 13.5L12 11l2.5 2.5')]);
export const PieChartIcon = make('PieChartIcon', [p('M12 3v9h9A9 9 0 0 0 12 3zM10 5a8 8 0 1 0 9 9')]);
export const LineChartIcon = make('LineChartIcon', [p('M3 3v17a1 1 0 0 0 1 1h17M7 15l4-5 3 3 5-6')]);
export const ActivityIcon = make('ActivityIcon', [p('M3 12h4l3-8 4 16 3-8h4')]);
export const PercentIcon = make('PercentIcon', [p('M19 5L5 19'), ['circle', 7, 7, 2], ['circle', 17, 17, 2]]);
export const CalculatorIcon = make('CalculatorIcon', [['rect', 5, 3, 14, 18, 2], p('M8 7h8M8 12v.01M12 12v.01M16 12v.01M8 16v.01M12 16v.01M16 16v.01')]);
export const ReceiptIcon = make('ReceiptIcon', [p('M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6')]);
export const TruckIcon = make('TruckIcon', [p('M3 6h11v10H3zM14 9h4l3 3v4h-7'), ['circle', 7, 18, 2], ['circle', 17, 18, 2]]);
export const ShoppingCartIcon = make('ShoppingCartIcon', [p('M3 4h2l2.5 11h10l2-8H6.5'), ['circle', 9, 19, 1.5], ['circle', 17, 19, 1.5]]);
export const ShoppingBagIcon = make('ShoppingBagIcon', [p('M5 8h14l-1 12H6zM9 8V6a3 3 0 0 1 6 0v2')]);
export const GiftIcon = make('GiftIcon', [['rect', 3, 8, 18, 4, 1], p('M5 12v8h14v-8M12 8v12M12 8c-2 0-4-1-4-3a2 2 0 0 1 4 0zM12 8c2 0 4-1 4-3a2 2 0 0 0-4 0')]);
export const BriefcaseIcon = make('BriefcaseIcon', [['rect', 3, 7, 18, 13, 2], p('M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M3 13h18')]);
export const BuildingIcon = make('BuildingIcon', [['rect', 5, 3, 14, 18, 1], p('M9 8h.01M13 8h.01M9 12h.01M13 12h.01M10 21v-4h4v4')]);
export const GraduationCapIcon = make('GraduationCapIcon', [p('M2 9l10-5 10 5-10 5zM6 11.5V16c0 1.5 3 3 6 3s6-1.5 6-3v-4.5M22 9v6')]);
export const AwardIcon = make('AwardIcon', [['circle', 12, 9, 6], p('M8.5 14L7 21l5-3 5 3-1.5-7')]);
export const TrophyIcon = make('TrophyIcon', [p('M7 4h10v5a5 5 0 0 1-10 0zM7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3M12 14v4M8 21h8M10 18h4')]);
export const RocketIcon = make('RocketIcon', [p('M14 5c4-2 6-2 7-2 0 1 0 3-2 7l-6 6-5-5zM9 12L5 11l3-3 4 1M12 15l1 4 3-3-1-4M5 15c-1 1-2 4-2 6 2 0 5-1 6-2')]);
export const LightbulbIcon = make('LightbulbIcon', [p('M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3z')]);
export const FlameIcon = make('FlameIcon', [p('M12 3c1 3 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-4-1-6 1-9z')]);
export const DropletIcon = make('DropletIcon', [p('M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z')]);
export const LeafIcon = make('LeafIcon', [p('M5 19c0-9 5-14 15-14 0 10-5 15-14 15M5 19l8-8')]);
export const MoreVerticalIcon = make('MoreVerticalIcon', [['circle', 12, 5, 1], ['circle', 12, 12, 1], ['circle', 12, 19, 1]]);
export const GripIcon = make('GripIcon', [['circle', 9, 6, 1.2], ['circle', 15, 6, 1.2], ['circle', 9, 12, 1.2], ['circle', 15, 12, 1.2], ['circle', 9, 18, 1.2], ['circle', 15, 18, 1.2]]);
export const MaximizeIcon = make('MaximizeIcon', [p('M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5')]);
export const MinimizeIcon = make('MinimizeIcon', [p('M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5')]);
export const ZoomInIcon = make('ZoomInIcon', [['circle', 11, 11, 6], p('M20 20l-4.5-4.5M11 8.5v5M8.5 11h5')]);
export const ZoomOutIcon = make('ZoomOutIcon', [['circle', 11, 11, 6], p('M20 20l-4.5-4.5M8.5 11h5')]);
export const UndoIcon = make('UndoIcon', [p('M9 14L4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3')]);
export const RedoIcon = make('RedoIcon', [p('M15 14l5-5-5-5M20 9H10a6 6 0 0 0 0 12h3')]);
export const BoldIcon = make('BoldIcon', [p('M7 4h6a3.5 3.5 0 0 1 0 7H7zM7 11h7a3.5 3.5 0 0 1 0 7H7z')]);
export const ItalicIcon = make('ItalicIcon', [p('M10 4h8M6 20h8M14 4l-4 16')]);
export const UnderlineIcon = make('UnderlineIcon', [p('M7 4v7a5 5 0 0 0 10 0V4M5 21h14')]);
export const AlignLeftIcon = make('AlignLeftIcon', [p('M4 6h16M4 10h10M4 14h16M4 18h10')]);
export const AlignCenterIcon = make('AlignCenterIcon', [p('M4 6h16M7 10h10M4 14h16M7 18h10')]);
export const QuoteIcon = make('QuoteIcon', [p('M5 17c2 0 3-1 3-3H5V8h5v6c0 3-2 5-5 5zM14 17c2 0 3-1 3-3h-3V8h5v6c0 3-2 5-5 5z')]);
export const HashIcon = make('HashIcon', [p('M5 9h15M4 15h15M10 3L8 21M16 3l-2 18')]);
export const AtSignIcon = make('AtSignIcon', [['circle', 12, 12, 4], p('M16 12v1.5a2.5 2.5 0 0 0 5 0V12a9 9 0 1 0-3.5 7.1')]);
export const GitBranchIcon = make('GitBranchIcon', [['circle', 6, 5, 2], ['circle', 6, 19, 2], ['circle', 18, 8, 2], p('M6 7v10M18 10c0 4-6 3-12 6')]);
export const HelpCircleIcon = make('HelpCircleIcon', [['circle', 12, 12, 9], p('M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.7M12 17v.01')]);
export const ShieldCheckIcon = make('ShieldCheckIcon', [p('M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6zM9 12l2 2 4-4')]);
export const BanIcon = make('BanIcon', [['circle', 12, 12, 9], p('M5.6 5.6l12.8 12.8')]);
export const LifeBuoyIcon = make('LifeBuoyIcon', [['circle', 12, 12, 9], ['circle', 12, 12, 3.5], p('M5.6 5.6l3.9 3.9M14.5 14.5l3.9 3.9M18.4 5.6l-3.9 3.9M9.5 14.5l-3.9 3.9')]);
export const PowerIcon = make('PowerIcon', [p('M12 3v8M6.5 6.5a8 8 0 1 0 11 0')]);
export const TimerIcon = make('TimerIcon', [['circle', 12, 13, 8], p('M12 9v4l2 2M9 3h6')]);
export const HourglassIcon = make('HourglassIcon', [p('M6 3h12M6 21h12M7 3c0 5 5 6 5 9s-5 4-5 9M17 3c0 5-5 6-5 9s5 4 5 9')]);
export const CompassIcon = make('CompassIcon', [['circle', 12, 12, 9], p('M15.5 8.5l-2 5-5 2 2-5z')]);
export const MapIcon = make('MapIcon', [p('M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2zM9 4v14M15 6v14')]);
export const NavigationIcon = make('NavigationIcon', [p('M4 11l16-7-7 16-2-7z')]);
export const BoxIcon = make('BoxIcon', [p('M12 3l8 4.5v9L12 21l-8-4.5v-9zM4 7.5L12 12l8-4.5M12 12v9')]);
export const CornerDownRightIcon = make('CornerDownRightIcon', [p('M5 5v6a3 3 0 0 0 3 3h11M15 10l4 4-4 4')]);
export const ChevronsLeftIcon = make('ChevronsLeftIcon', [p('M11 6l-6 6 6 6M19 6l-6 6 6 6')]);
export const ChevronsRightIcon = make('ChevronsRightIcon', [p('M13 6l6 6-6 6M5 6l6 6-6 6')]);
export const PlusCircleIcon = make('PlusCircleIcon', [['circle', 12, 12, 9], p('M12 8v8M8 12h8')]);
export const MinusCircleIcon = make('MinusCircleIcon', [['circle', 12, 12, 9], p('M8 12h8')]);
export const UserCheckIcon = make('UserCheckIcon', [['circle', 9, 8, 3.5], p('M3 20c0-3.5 2.7-6 6-6s6 2.5 6 6M16 11l2 2 4-4')]);
export const FileTextIcon = make('FileTextIcon', [p('M6 3h8l5 5v13H6zM14 3v5h5M9 13h6M9 17h6')]);
export const FileSpreadsheetIcon = make('FileSpreadsheetIcon', [p('M6 3h8l5 5v13H6zM14 3v5h5M9 12h6M9 16h6M12 11v8')]);
export const FolderPlusIcon = make('FolderPlusIcon', [p('M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM12 11v6M9 14h6')]);
export const FolderOpenIcon = make('FolderOpenIcon', [p('M3 8V6a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v2M3 8h18l-2 10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z')]);
export const KanbanIcon = make('KanbanIcon', [['rect', 3, 4, 5, 12, 1.5], ['rect', 9.5, 4, 5, 16, 1.5], ['rect', 16, 4, 5, 8, 1.5]]);
export const PanelRightIcon = make('PanelRightIcon', [['rect', 3, 4, 18, 16, 2.5], p('M15 4v16')]);
export const ColumnsIcon = make('ColumnsIcon', [['rect', 3, 4, 18, 16, 2], p('M12 4v16')]);
export const TextIcon = make('TextIcon', [p('M5 6V5h14v1M12 5v14M9 19h6')]);
export const ClipboardIcon = make('ClipboardIcon', [['rect', 6, 5, 12, 16, 2], p('M9 5V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1M9 12h6M9 16h4')]);
export const ClipboardCheckIcon = make('ClipboardCheckIcon', [['rect', 6, 5, 12, 16, 2], p('M9 5V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1M9 14l2 2 4-4')]);
export const CheckSquareIcon = make('CheckSquareIcon', [['rect', 4, 4, 16, 16, 3], p('M8.5 12l2.5 2.5 4.5-5')]);
export const SquareIcon = make('SquareIcon', [['rect', 4, 4, 16, 16, 3]]);
export const CircleIcon = make('CircleIcon', [['circle', 12, 12, 9]]);
export const VolumeIcon = make('VolumeIcon', [p('M4 10v4h3l5 4V6L7 10zM16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11')]);
export const VolumeOffIcon = make('VolumeOffIcon', [p('M4 10v4h3l5 4V6L7 10zM16 9l5 6M21 9l-5 6')]);
export const SkipForwardIcon = make('SkipForwardIcon', [p('M5 4l10 8-10 8zM19 5v14')]);
export const SkipBackIcon = make('SkipBackIcon', [p('M19 4L9 12l10 8zM5 5v14')]);

export const icons = {
  PrinterIcon,
  CallIcon,
  MapPinIcon,
  CameraIcon,
  MicIcon,
  VideoIcon,
  WifiIcon,
  BatteryIcon,
  BluetoothIcon,
  ShareIcon,
  SendIcon,
  PaperclipIcon,
  TagIcon,
  FlagIcon,
  PinIcon,
  ThumbsUpIcon,
  SmileIcon,
  KeyIcon,
  UnlockIcon,
  TableIcon,
  DatabaseIcon,
  ServerIcon,
  CloudIcon,
  CloudUploadIcon,
  PieChartIcon,
  LineChartIcon,
  ActivityIcon,
  PercentIcon,
  CalculatorIcon,
  ReceiptIcon,
  TruckIcon,
  ShoppingCartIcon,
  ShoppingBagIcon,
  GiftIcon,
  BriefcaseIcon,
  BuildingIcon,
  GraduationCapIcon,
  AwardIcon,
  TrophyIcon,
  RocketIcon,
  LightbulbIcon,
  FlameIcon,
  DropletIcon,
  LeafIcon,
  MoreVerticalIcon,
  GripIcon,
  MaximizeIcon,
  MinimizeIcon,
  ZoomInIcon,
  ZoomOutIcon,
  UndoIcon,
  RedoIcon,
  BoldIcon,
  ItalicIcon,
  UnderlineIcon,
  AlignLeftIcon,
  AlignCenterIcon,
  QuoteIcon,
  HashIcon,
  AtSignIcon,
  GitBranchIcon,
  HelpCircleIcon,
  ShieldCheckIcon,
  BanIcon,
  LifeBuoyIcon,
  PowerIcon,
  TimerIcon,
  HourglassIcon,
  CompassIcon,
  MapIcon,
  NavigationIcon,
  BoxIcon,
  CornerDownRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
  PlusCircleIcon,
  MinusCircleIcon,
  UserCheckIcon,
  FileTextIcon,
  FileSpreadsheetIcon,
  FolderPlusIcon,
  FolderOpenIcon,
  KanbanIcon,
  PanelRightIcon,
  ColumnsIcon,
  TextIcon,
  ClipboardIcon,
  ClipboardCheckIcon,
  CheckSquareIcon,
  SquareIcon,
  CircleIcon,
  VolumeIcon,
  VolumeOffIcon,
  SkipForwardIcon,
  SkipBackIcon,

  ArchiveIcon,
  CakeIcon,
  CreditCardIcon,
  FolderInputIcon,
  GitMergeIcon,
  InboxIcon,
  IndianRupeeIcon,
  LayoutDashboardIcon,
  LayoutGridIcon,
  MegaphoneIcon,
  MessageSquareIcon,
  MousePointerClickIcon,
  PanelLeftIcon,
  SaveIcon,
  Share2Icon,
  TargetIcon,
  UserCircleIcon,
  UserMinusIcon,
  UserPlusIcon,
  WalletIcon,
  ArrowUpRightIcon,
  ArrowDownRightIcon,

  BefMark,
  SearchIcon,
  CopyIcon,
  CheckIcon,
  XIcon,
  PlusIcon,
  MenuIcon,
  ArrowRightIcon,
  ChevronRightIcon,
  SunIcon,
  MoonIcon,
  SparkleIcon,
  ZapIcon,
  ComponentsIcon,
  BlocksIcon,
  LayersIcon,
  PackageIcon,
  PaletteIcon,
  BookIcon,
  CommandKeyIcon,
  MonitorIcon,
  TabletIcon,
  PhoneIcon,
  UploadIcon,
  ChevronLeftIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ArrowLeftIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  SortIcon,
  MinusIcon,
  MoreIcon,
  RefreshIcon,
  InfoIcon,
  AlertIcon,
  AlertCircleIcon,
  CheckCircleIcon,
  XCircleIcon,
  LoaderIcon,
  ShieldIcon,
  UserIcon,
  UsersIcon,
  MailIcon,
  BellIcon,
  CalendarIcon,
  ClockIcon,
  HomeIcon,
  SettingsIcon,
  LockIcon,
  GlobeIcon,
  StarIcon,
  HeartIcon,
  BookmarkIcon,
  EditIcon,
  TrashIcon,
  DownloadIcon,
  FilterIcon,
  EyeIcon,
  EyeOffIcon,
  LinkIcon,
  ExternalLinkIcon,
  LogOutIcon,
  ListIcon,
  FileIcon,
  FolderIcon,
  ImageIcon,
  PlayIcon,
  PauseIcon,
  BarChartIcon,
  TrendingIcon,
  CodeIcon,
  TerminalIcon,
};
