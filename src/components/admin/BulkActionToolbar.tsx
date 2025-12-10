import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Download, Copy, Check, X, Trash2 } from "lucide-react";

interface BulkActionToolbarProps {
  totalCount: number;
  selectedCount: number;
  allSelected: boolean;
  onSelectAll: (checked: boolean) => void;
  onExportAll: () => void;
  onExportSelected: () => void;
  onCopy: () => void;
  onActivate: () => void;
  onDeactivate: () => void;
  onDelete: () => void;
}

const BulkActionToolbar = ({
  totalCount,
  selectedCount,
  allSelected,
  onSelectAll,
  onExportAll,
  onExportSelected,
  onCopy,
  onActivate,
  onDeactivate,
  onDelete,
}: BulkActionToolbarProps) => {
  return (
    <div className="flex flex-wrap items-center gap-2 p-3 bg-secondary/30 rounded-lg mb-4">
      <div className="flex items-center gap-2 mr-4">
        <Checkbox
          checked={allSelected && totalCount > 0}
          onCheckedChange={onSelectAll}
        />
        <span className="text-sm text-muted-foreground">
          {selectedCount} of {totalCount} selected
        </span>
      </div>

      <Button variant="outline" size="sm" onClick={onExportAll} className="gap-1">
        <Download className="w-3 h-3" />
        Export All CSV
      </Button>

      {selectedCount > 0 && (
        <>
          <Button variant="outline" size="sm" onClick={onExportSelected} className="gap-1">
            <Download className="w-3 h-3" />
            Export Selected ({selectedCount})
          </Button>
          
          <Button variant="outline" size="sm" onClick={onCopy} className="gap-1">
            <Copy className="w-3 h-3" />
            Copy
          </Button>
          
          <Button variant="outline" size="sm" onClick={onActivate} className="gap-1 text-green-500 hover:text-green-600">
            <Check className="w-3 h-3" />
            Activate
          </Button>
          
          <Button variant="outline" size="sm" onClick={onDeactivate} className="gap-1 text-yellow-500 hover:text-yellow-600">
            <X className="w-3 h-3" />
            Deactivate
          </Button>
          
          <Button variant="outline" size="sm" onClick={onDelete} className="gap-1 text-destructive hover:text-destructive">
            <Trash2 className="w-3 h-3" />
            Delete ({selectedCount})
          </Button>
        </>
      )}
    </div>
  );
};

export default BulkActionToolbar;
