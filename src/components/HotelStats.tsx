import { Hotel } from '@/types/hotel';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, MapPin, CheckCircle, XCircle } from 'lucide-react';

interface HotelStatsProps {
  hotels: Hotel[];
}

export const HotelStats = ({ hotels }: HotelStatsProps) => {
  const totalHotels = hotels.length;
  const uniqueCountries = new Set(hotels.map(h => h.country)).size;
  const uniqueCities = new Set(hotels.map(h => h.city)).size;
  
  const availableContracts = hotels.reduce((acc, hotel) => acc + hotel.rateAvailability.filter(r => r.available).length, 0);
  const unavailableContracts = hotels.reduce((acc, hotel) => acc + hotel.rateAvailability.filter(r => r.available === false).length, 0);

  const stats = [
    {
      title: 'Total Hotels',
      value: totalHotels.toString(),
      description: 'Hotels in inventory',
      icon: Building2,
      color: 'text-primary',
    },
    {
      title: 'Countries',
      value: uniqueCountries.toString(),
      description: 'Countries covered',
      icon: MapPin,
      color: 'text-accent',
    },
    {
      title: 'Cities',
      value: uniqueCities.toString(),
      description: 'Cities with properties',
      icon: MapPin,
      color: 'text-success',
    },
    {
      title: 'Available Contracts',
      value: availableContracts.toString(),
      description: 'Total available contract entries',
      icon: CheckCircle,
      color: 'text-success',
    },
    {
      title: 'Unavailable Contracts',
      value: unavailableContracts.toString(),
      description: 'Total unavailable contract entries',
      icon: XCircle,
      color: 'text-destructive',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <Card key={stat.title} className="border-border/50 hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {stat.title}
            </CardTitle>
            <stat.icon className={`h-4 w-4 ${stat.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stat.value}</div>
            <p className="text-xs text-muted-foreground">
              {stat.description}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};