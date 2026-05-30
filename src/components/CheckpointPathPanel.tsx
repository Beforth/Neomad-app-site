import { MapPin, Route } from 'lucide-react';
import type { DeliveryCheckpointRow } from '../lib/api';
import {
  checkpointJobRef,
  checkpointTypeLabel,
  segmentColorForCheckpoint,
  sortCheckpointsChronological,
} from '../lib/checkpointPaths';

type Props = {
  checkpoints: DeliveryCheckpointRow[];
  selectedCheckpointId: number | null;
  onSelectCheckpoint: (id: number | null) => void;
  loadingPath?: boolean;
  segmentPointCount?: number;
  segmentSmoothed?: boolean;
  viewMode: 'day' | 'segment';
  onViewModeChange: (mode: 'day' | 'segment') => void;
  compact?: boolean;
};

export default function CheckpointPathPanel({
  checkpoints,
  selectedCheckpointId,
  onSelectCheckpoint,
  loadingPath = false,
  segmentPointCount = 0,
  segmentSmoothed,
  viewMode,
  onViewModeChange,
  compact = false,
}: Props) {
  const sorted = sortCheckpointsChronological(checkpoints);

  return (
    <div className={compact ? 'space-y-2' : 'space-y-3'}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
          Trip checkpoints ({sorted.length})
        </p>
        <div className="flex rounded-lg border border-zinc-200 overflow-hidden text-[9px] font-bold uppercase">
          <button
            type="button"
            onClick={() => onViewModeChange('day')}
            className={`px-2 py-1 ${viewMode === 'day' ? 'bg-emerald-50 text-emerald-700' : 'bg-white text-zinc-500'}`}
          >
            Day
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange('segment')}
            disabled={selectedCheckpointId == null}
            className={`px-2 py-1 ${viewMode === 'segment' ? 'bg-emerald-50 text-emerald-700' : 'bg-white text-zinc-500'} disabled:opacity-40`}
          >
            Leg
          </button>
        </div>
      </div>

      {viewMode === 'segment' && selectedCheckpointId != null && (
        <div className="text-[10px] text-zinc-600 bg-zinc-50 border border-zinc-100 rounded-lg px-2 py-1.5 flex items-center justify-between">
          <span className="flex items-center gap-1 font-bold uppercase">
            <Route size={12} />
            {loadingPath ? 'Loading leg…' : `${segmentPointCount} pts`}
          </span>
          {segmentSmoothed != null && (
            <span className={segmentSmoothed ? 'text-emerald-600' : 'text-amber-600'}>
              {segmentSmoothed ? 'road-snapped' : 'raw GPS'}
            </span>
          )}
        </div>
      )}

      {sorted.length === 0 ? (
        <p className="text-[11px] text-zinc-400 py-2">No checkpoints for this day.</p>
      ) : (
        <div className={`overflow-auto rounded-lg border border-zinc-100 bg-white ${compact ? 'max-h-36' : 'max-h-52'}`}>
          {sorted.map((row) => {
            const selected = selectedCheckpointId === row.id;
            const color = segmentColorForCheckpoint(row.checkpoint_type);
            return (
              <button
                key={row.id}
                type="button"
                onClick={() => onSelectCheckpoint(selected ? null : row.id)}
                className={`w-full text-left px-2 py-2 border-b border-zinc-50 last:border-0 transition-colors ${
                  selected ? 'bg-emerald-50/80' : 'hover:bg-zinc-50'
                }`}
              >
                <div className="flex items-start gap-2">
                  <span
                    className="mt-1 w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-bold text-zinc-800 leading-tight">
                      {checkpointTypeLabel(row.checkpoint_type)}
                    </p>
                    <p className="text-[10px] text-zinc-500 truncate">{checkpointJobRef(row)}</p>
                    <div className="flex items-center gap-2 mt-0.5 text-[9px] text-zinc-400 font-medium">
                      <span>
                        {new Date(row.recorded_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      {row.path_id != null && (
                        <span className="text-emerald-600 font-bold uppercase">path</span>
                      )}
                      {row.lat != null && row.lng != null && (
                        <MapPin size={10} className="inline shrink-0" />
                      )}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
