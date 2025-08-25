import { Hotel } from '@/types/hotel';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, Star, MapPin, Calendar } from 'lucide-react';
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

interface HotelCardViewProps {
  hotels: Hotel[];
  onEdit: (hotel: Hotel) => void;
  onDelete: (hotelId: string) => void;
  year?: number;
}

export const HotelCardView = ({ hotels, onEdit, onDelete, year }: HotelCardViewProps) => {
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
          <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
        ))}
        <span className="text-sm text-muted-foreground ml-1">{stars} star{stars !== 1 ? 's' : ''}</span>
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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {hotels.map((hotel) => {
        const contractStatus = getContractStatus(hotel);
        
        return (
          <Card key={hotel.id} className="hover:shadow-lg transition-all duration-200">
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-foreground mb-2" title={hotel.name}>
                    {hotel.name}
                  </h3>
                  <div className="flex items-center text-muted-foreground mb-3">
                    <MapPin className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span className="text-sm">{hotel.city}, {hotel.country}</span>
                  </div>
                  
                  <div className="flex items-center justify-between mb-3">
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
              </div>
            </CardHeader>
            
            <CardContent className="pt-0">
              <div className="space-y-4">
                
                <div className="flex items-center text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3 mr-1" />
                  <span>Updated: {new Date(hotel.updatedAt).toLocaleDateString()}</span>
                </div>
                
                <div className="flex items-center justify-end space-x-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEdit(hotel)}
                    className="hover:bg-primary/10"
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="hover:bg-destructive/10 text-destructive border-destructive/20"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
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
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};