import * as React from 'react';
import { ChevronRightIcon, FileIcon, FolderIcon } from './icons';
import { cn } from '@/lib/utils';

export interface TreeNode {
  id: string;
  label: string;
  children?: TreeNode[];
}

function Node({ node, depth, selected, onSelect }: { node: TreeNode; depth: number; selected?: string; onSelect?: (n: TreeNode) => void }) {
  const [open, setOpen] = React.useState(depth === 0);
  const isDir = !!node.children;
  const Icon = isDir ? FolderIcon : FileIcon;
  return (
    <li role="treeitem" aria-expanded={isDir ? open : undefined} aria-selected={selected === node.id}>
      <button
        type="button"
        onClick={() => (isDir ? setOpen(!open) : onSelect?.(node))}
        className={cn('flex w-full items-center gap-1.5 rounded-md py-1 pr-2 text-left text-sm outline-none transition-colors hover:bg-secondary focus-visible:bg-secondary', selected === node.id && 'bg-accent text-accent-foreground')}
        style={{ paddingLeft: depth * 16 + 6 }}
      >
        <ChevronRightIcon className={cn('size-3.5 text-muted-foreground transition-transform duration-200', open && 'rotate-90', !isDir && 'invisible')} />
        <Icon className={cn('size-4', isDir ? 'text-primary' : 'text-muted-foreground')} />
        {node.label}
      </button>
      {isDir && (
        <div className={cn('grid transition-[grid-template-rows] duration-200', open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}>
          <ul role="group" className="overflow-hidden">
            {node.children!.map((c) => <Node key={c.id} node={c} depth={depth + 1} selected={selected} onSelect={onSelect} />)}
          </ul>
        </div>
      )}
    </li>
  );
}

/** Nested expandable list for files, org charts and categories. */
export function TreeView({ nodes, selected, onSelect, className }: { nodes: TreeNode[]; selected?: string; onSelect?: (n: TreeNode) => void; className?: string }) {
  return (
    <ul role="tree" className={cn('grid', className)}>
      {nodes.map((n) => <Node key={n.id} node={n} depth={0} selected={selected} onSelect={onSelect} />)}
    </ul>
  );
}
