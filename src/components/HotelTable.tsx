import { Hotel } from '@/types/hotel';
import { useEffect, useState } from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Edit, Trash2, Star } from 'lucide-react';
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

interface HotelTableProps {
  hotels: Hotel[];
  onEdit: (hotel: Hotel) => void;
  onDelete: (hotelId: string) => void;
  year?: number;
}

export const HotelTable = ({ hotels, onEdit, onDelete, year }: HotelTableProps) => {
  const [canEdit, setCanEdit] = useState(false);
  useEffect(() => {
    try {
      setCanEdit(localStorage.getItem('role') === 'admin');
    } catch {}
  }, []);
  const getContractStatus = (hotel: Hotel) => {
    const targetYear = year ?? new Date().getFullYear();
    let yearData = hotel.rateAvailability.find(rate => rate.year === targetYear);
    // Fallback to nearest available year if exact year not found
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Hotel Inventory ({hotels.length} hotels)
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border">
                <TableHead className="font-medium">Hotel Name</TableHead>
                <TableHead className="font-medium">Location</TableHead>
                <TableHead className="font-medium">Stars</TableHead>
                <TableHead className="font-medium">Contract Status</TableHead>
                <TableHead className="font-medium text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {hotels.map((hotel) => {
                const contractStatus = getContractStatus(hotel);
                
                return (
                  <TableRow key={hotel.id} className="border-border hover:bg-muted/50">
                    <TableCell className="font-medium text-foreground">
                      {hotel.name}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      <div>
                        <div className="font-medium text-foreground">{hotel.city}</div>
                        <div className="text-xs">{hotel.country}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {renderStars(hotel.stars)}
                    </TableCell>
                    <TableCell>
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
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => canEdit && onEdit(hotel)}
                          disabled={!canEdit}
                          className="h-8 w-8 p-0 hover:bg-primary/10"
                        >
                          <Edit className="h-4 w-4 text-primary" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={!canEdit}
                              className="h-8 w-8 p-0 hover:bg-destructive/10"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
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
                              <AlertDialogAction onClick={() => canEdit && onDelete(hotel.id)} className="bg-destructive hover:bg-destructive/90">
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};