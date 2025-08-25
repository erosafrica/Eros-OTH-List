import { Hotel } from '@/types/hotel';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, Star, MapPin } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface HotelGridViewProps {
  hotels: Hotel[];
  onEdit: (hotel: Hotel) => void;
  onDelete: (hotelId: string) => void;
  year?: number;
}

export const HotelGridView = ({ hotels, onEdit, onDelete, year }: HotelGridViewProps) => {
  const getContractStatus = (hotel: Hotel) => {
    const targetYear = year ?? new Date().getFullYear();
    let yearData = hotel.rateAvailability.find(rate => rate.year === targetYear);
    let fromNearest = false;
    if (!yearData && hotel.rateAvailability.length > 0) {
      yearData = hotel.rateAvailability.reduce((prev, curr) => {
        return Math.abs(curr.year - targetYear) < Math.abs(prev.year - targetYear) ? curr : prev;
      });
      fromNearest = true;
    }
    if (!yearData) return { status: `No Data (${targetYear})`, variant: 'secondary' as const, tooltip: `No contract data for ${targetYear}` };
    const yearLabel = yearData.year;
    const range = yearData.contractStart && yearData.contractEnd
      ? ` (${yearData.contractStart} → ${yearData.contractEnd})`
      : '';
    const nearestNote = fromNearest && yearLabel !== targetYear
      ? ` (showing ${yearLabel}; no data for ${targetYear})`
      : '';
    return yearData.available 
      ? { status: `Available (${yearLabel})`, variant: 'default' as const, tooltip: `Available in ${yearLabel}${range}${nearestNote}` }
      : { status: `Unavailable`, variant: 'destructive' as const, tooltip: `Unavailable in ${yearLabel}${nearestNote}` };
  };

  const renderStars = (stars?: number) => {
    if (!stars) return null;
    
    return (
      <div className="flex items-center space-x-1">
        {Array.from({ length: stars }).map((_, i) => (
          <Star key={i} className="h-3 w-3 fill-yellow-400 text-yellow-400" />
        ))}
      </div>
    );
  };

  if (hotels.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">No hotels found matching your criteria.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {hotels.map((hotel) => {
        const contractStatus = getContractStatus(hotel);
        
        return (
          <Card key={hotel.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-base truncate" title={hotel.name}>
                    {hotel.name}
                  </CardTitle>
                  <div className="flex items-center mt-1 text-sm text-muted-foreground">
                    <MapPin className="h-3 w-3 mr-1 flex-shrink-0" />
                    <span className="truncate">{hotel.city}, {hotel.country}</span>
                  </div>
                </div>
                <div className="flex space-x-1 ml-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(hotel)}
                    className="h-7 w-7 p-0 hover:bg-primary/10"
                  >
                    <Edit className="h-3 w-3 text-primary" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 hover:bg-destructive/10"
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete hotel?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently remove {hotel.name}. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => onDelete(hotel.id)} className="bg-destructive hover:bg-destructive/90">
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  {renderStars(hotel.stars)}
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge variant={contractStatus.variant} className="text-xs cursor-default">
                          {contractStatus.status}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{contractStatus.tooltip}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};