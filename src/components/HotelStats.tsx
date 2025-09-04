import { useState, useEffect } from 'react';
import { Hotel } from '@/types/hotel';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, MapPin, CheckCircle, XCircle } from 'lucide-react';

interface HotelStatsProps {
  hotels: Hotel[];
  totalHotels: number;
}

interface DatabaseStats {
  totalHotels: number;
  uniqueCountries: number;
  uniqueCities: number;
  availableContracts: number;
  unavailableContracts: number;
}

export const HotelStats = ({ hotels, totalHotels }: HotelStatsProps) => {
  const [dbStats, setDbStats] = useState<DatabaseStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const API = import.meta.env.VITE_API_BASE_URL || '';

  // Fetch total stats from database
  const fetchStats = async () => {
    setIsLoading(true);
    try {
      console.log('Fetching stats from:', `${API}/api/hotels/stats`);
      const res = await fetch(`${API}/api/hotels/stats`, {
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache',
        }
      });
      
      console.log('Stats response status:', res.status);
      if (res.ok) {
        const stats = await res.json();
        console.log('Received stats:', stats);
        setDbStats(stats);
      } else {
        console.error('Stats API error:', res.status, res.statusText);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Only fetch stats once on component mount
  useEffect(() => {
    fetchStats();
  }, []); // Empty dependency array to run only once

  // Use database stats for all metrics
  const stats = [
    {
      title: 'Total Hotels',
      value: dbStats?.totalHotels?.toString() || totalHotels.toString(),
      description: 'Hotels in inventory',
      icon: Building2,
      color: 'text-primary',
    },
    {
      title: 'Countries',
      value: dbStats?.uniqueCountries?.toString() || '0',
      description: 'Countries covered',
      icon: MapPin,
      color: 'text-accent',
    },
    {
      title: 'Cities',
      value: dbStats?.uniqueCities?.toString() || '0',
      description: 'Cities with properties',
      icon: MapPin,
      color: 'text-success',
    },
    {
      title: 'Available Contracts',
      value: dbStats?.availableContracts?.toString() || '0',
      description: 'Total available contract entries',
      icon: CheckCircle,
      color: 'text-success',
    },
    {
      title: 'Unavailable Contracts',
      value: dbStats?.unavailableContracts?.toString() || '0',
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
            <div className="text-2xl font-bold text-foreground">
              {isLoading ? '...' : stat.value}
            </div>
            <p className="text-xs text-muted-foreground">
              {stat.description}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};