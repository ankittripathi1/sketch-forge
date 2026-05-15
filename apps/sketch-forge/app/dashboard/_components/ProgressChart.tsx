"use client";

interface FolderProgress {
  folderId: string | null;
  name: string;
  total: number;
  mastered: number;
  learning: number;
  new: number;
}

interface ProgressChartProps {
  data: FolderProgress[];
}

export function ProgressChart({ data }: ProgressChartProps) {
  return (
    <div className="bg-surface-overlay/50 p-4 rounded-xl border border-border-default">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-sm font-semibold text-text-heading tracking-tight">
          Folder Progress
        </h2>
        <div className="flex gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-status-success" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">
              Mastered
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-accent" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">
              Learning
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-surface-hover" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">
              New
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {data.length === 0 ? (
          <div className="text-center py-10 text-text-dim text-sm italic">
            No folder data available yet.
          </div>
        ) : (
          data.map((folder) => {
            const total = folder.total;
            const masteredPercent = total > 0 ? (folder.mastered / total) * 100 : 0;
            const learningPercent = total > 0 ? (folder.learning / total) * 100 : 0;
            const newPercent = total > 0 ? (folder.new / total) * 100 : 0;

            return (
              <div key={folder.folderId} className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-text-body">
                    {folder.name}
                  </span>
                  <span className="text-text-muted font-medium">
                    {folder.total} pages
                  </span>
                </div>
                <div className="flex h-3 w-full rounded-full bg-surface-raised overflow-hidden">
                  <div
                    className="bg-status-success transition-all duration-1000 ease-out border-r border-black/10"
                    style={{ width: `${masteredPercent}%` }}
                  />
                  <div
                    className="bg-accent transition-all duration-1000 delay-100 ease-out border-r border-black/10"
                    style={{ width: `${learningPercent}%` }}
                  />
                  <div
                    className="bg-surface-hover transition-all duration-1000 delay-200 ease-out"
                    style={{ width: `${newPercent}%` }}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
