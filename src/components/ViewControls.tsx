import { Grid, List, LayoutGrid } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export type ViewMode = 'table' | 'grid' | 'card';

interface ViewControlsProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  totalCount: number;
  currentPage: number;
  totalPages: number;
}

export const ViewControls = ({ 
  viewMode, 
  onViewModeChange, 
  totalCount,
  currentPage,
  totalPages
}: ViewControlsProps) => {
  return (
    <div className="flex items-center justify-between flex-wrap gap-4">
      <div className="flex items-center space-x-2">
        <span className="text-sm text-muted-foreground">View:</span>
        <div className="flex items-center border border-border rounded-lg p-1">
          <Button
            variant={viewMode === 'table' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onViewModeChange('table')}
            className="h-8 px-3"
          >
            <List className="h-4 w-4" />
            <span className="ml-1 hidden sm:inline">Table</span>
          </Button>
          <Button
            variant={viewMode === 'grid' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onViewModeChange('grid')}
            className="h-8 px-3"
          >
            <Grid className="h-4 w-4" />
            <span className="ml-1 hidden sm:inline">Grid</span>
          </Button>
          <Button
            variant={viewMode === 'card' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onViewModeChange('card')}
            className="h-8 px-3"
          >
            <LayoutGrid className="h-4 w-4" />
            <span className="ml-1 hidden sm:inline">Cards</span>
          </Button>
        </div>
      </div>
      
      <div className="flex items-center space-x-2">
        <Badge variant="secondary" className="text-xs">
          {totalCount} hotels
        </Badge>
        <Badge variant="outline" className="text-xs">
          Page {currentPage} of {totalPages}
        </Badge>
      </div>
    </div>
  );
};