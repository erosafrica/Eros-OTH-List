import { useEffect, useState } from 'react';
import { Hotel, HotelFilters } from '@/types/hotel';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Search, Filter } from 'lucide-react';

interface HotelFiltersComponentProps {
  filters: HotelFilters;
  onFiltersChange: (filters: HotelFilters) => void;
  hotels: Hotel[];
  totalHotels: number;
}

interface FilterOptions {
  countries: string[];
  cities: string[];
}

export const HotelFiltersComponent = ({ filters, onFiltersChange, hotels, totalHotels }: HotelFiltersComponentProps) => {
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({ countries: [], cities: [] });
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);
  
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - 1 + i);

  const API = import.meta.env.VITE_API_BASE_URL || '';

  // Fetch filter options from database
  const fetchFilterOptions = async () => {
    setIsLoadingOptions(true);
    try {
      const res = await fetch(`${API}/api/hotels/filter-options`, {
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache',
        }
      });
      
      if (res.ok) {
        const options = await res.json();
        setFilterOptions(options);
      }
    } catch (error) {
      console.error('Failed to fetch filter options:', error);
      // Fallback to current page data
      const uniqueCountries = Array.from(new Set(
        hotels.map((h) => h.country).filter((c): c is string => !!c && c.trim() !== '')
      )).sort();
      const uniqueCities = Array.from(new Set(
        hotels.map((h) => h.city).filter((c): c is string => !!c && c.trim() !== '')
      )).sort();
      setFilterOptions({ countries: uniqueCountries, cities: uniqueCities });
    } finally {
      setIsLoadingOptions(false);
    }
  };

  useEffect(() => {
    fetchFilterOptions();
  }, []);

  // Local draft state for staged changes
  const [draft, setDraft] = useState<HotelFilters>({
    search: '',
    country: '',
    city: '',
    year: filters.year ?? currentYear,
    contractStatus: 'all',
  });

  // Sync draft when external filters change
  useEffect(() => {
    setDraft({
      search: filters.search ?? '',
      country: filters.country ?? '',
      city: filters.city ?? '',
      year: filters.year ?? currentYear,
      contractStatus: filters.contractStatus ?? 'all',
    });
  }, [filters, currentYear]);

  const handleDraftChange = (key: keyof HotelFilters, value: any) => {
    setDraft(prev => ({ ...prev, [key]: value }));
  };

  const handleApplyFilters = () => {
    onFiltersChange(draft);
  };

  const handleClearFilters = () => {
    const cleared: HotelFilters = {
      search: '',
      country: '',
      city: '',
      year: currentYear,
      contractStatus: 'all',
    };
    setDraft(cleared);
    onFiltersChange(cleared);
  };

  // Check if filters are different from current
  const hasChanges = JSON.stringify(draft) !== JSON.stringify(filters);
  
  // Check if any filters are active
  const hasActiveFilters = filters.search || filters.country || filters.city || filters.contractStatus !== 'all';

  return (
    <Card className="border-border/50">
      <CardContent className="p-4">
        <div className="flex items-center space-x-2 mb-4">
          <Filter className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-medium text-foreground">Filters</h3>
          <span className="text-xs text-muted-foreground ml-auto">
            {totalHotels} total hotels in database
          </span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search hotels..."
              value={draft.search}
              onChange={(e) => handleDraftChange('search', e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleApplyFilters();
              }}
              className="pl-10 border-input"
            />
          </div>

          {/* Country */}
          <Select 
            value={draft.country} 
            onValueChange={(value) => handleDraftChange('country', value === 'all' ? '' : value)}
          >
            <SelectTrigger className="border-input">
              <SelectValue placeholder={isLoadingOptions ? "Loading..." : "All Countries"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Countries</SelectItem>
              {filterOptions.countries.map(country => (
                <SelectItem key={country} value={country}>{country}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* City */}
          <Select 
            value={draft.city} 
            onValueChange={(value) => handleDraftChange('city', value === 'all' ? '' : value)}
          >
            <SelectTrigger className="border-input">
              <SelectValue placeholder={isLoadingOptions ? "Loading..." : "All Cities"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Cities</SelectItem>
              {filterOptions.cities.map(city => (
                <SelectItem key={city} value={city}>{city}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Year */}
          <Select 
            value={(draft.year ?? currentYear).toString()} 
            onValueChange={(value) => handleDraftChange('year', parseInt(value))}
          >
            <SelectTrigger className="border-input">
              <SelectValue placeholder="Select Year" />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map(y => (
                <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Contract Status */}
          <Select 
            value={draft.contractStatus} 
            onValueChange={(value) => handleDraftChange('contractStatus', value)}
          >
            <SelectTrigger className="border-input">
              <SelectValue placeholder="Contract Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="available">Available</SelectItem>
              <SelectItem value="unavailable">Unavailable</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Apply / Clear Buttons */}
        <div className="flex items-center gap-2">
          <Button 
            className="w-full md:w-auto" 
            onClick={handleApplyFilters}
            disabled={!hasChanges}
          >
            Apply Filters
          </Button>
          <Button
            variant="outline"
            className="w-full md:w-auto"
            onClick={handleClearFilters}
            disabled={!hasActiveFilters}
          >
            Clear Filters
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};