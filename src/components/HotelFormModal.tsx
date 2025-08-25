import { useState, useEffect } from 'react';
import { Hotel } from '@/types/hotel';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface HotelFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (hotel: Omit<Hotel, 'id' | 'createdAt' | 'updatedAt'>) => void;
  hotel?: Hotel | null;
}

export const HotelFormModal = ({ isOpen, onClose, onSubmit, hotel }: HotelFormModalProps) => {
  const [formData, setFormData] = useState<Omit<Hotel, 'id' | 'createdAt' | 'updatedAt'>>({
    name: '',
    country: '',
    city: '',
    stars: 3,
    rateAvailability: [{
      year: new Date().getFullYear(),
      available: false,
      contractStart: '',
      contractEnd: '',
    }],
  });

  const countries = ['Kenya', 'Tanzania', 'Uganda', 'South Africa'];
  
  const citiesByCountry: Record<string, string[]> = {
    Kenya: ['Nairobi', 'Mombasa', 'Diani', 'Maasai Mara', 'Malindi', 'Amboseli', 'Naivasha', 'Nakuru', 'Kisumu', 'Laikipia', 'Tsavo', 'Lamu', 'Kilifi'],
    Tanzania: ['Zanzibar', 'Arusha', 'Dar Es Salaam', 'Jambiani'],
    Uganda: ['Kampala'],
    'South Africa': ['Cape Town'],
  };

  useEffect(() => {
    if (hotel) {
      const first = hotel.rateAvailability?.[0];
      setFormData({
        name: hotel.name,
        country: hotel.country,
        city: hotel.city,
        stars: hotel.stars || 3,
        rateAvailability: first ? [{
          year: first.year,
          available: !!first.available,
          contractStart: first.contractStart || '',
          contractEnd: first.contractEnd || '',
        }] : [{
          year: new Date().getFullYear(),
          available: false,
          contractStart: '',
          contractEnd: '',
        }],
      });
    } else {
      setFormData({
        name: '',
        country: '',
        city: '',
        stars: 3,
        rateAvailability: [{
          year: new Date().getFullYear(),
          available: false,
          contractStart: '',
          contractEnd: '',
        }],
      });
    }
  }, [hotel, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // ensure availability reflects date range
    const updated = { ...formData };
    const r = { ...updated.rateAvailability[0] };
    r.available = !!(r.contractStart && r.contractEnd && new Date(r.contractStart) <= new Date(r.contractEnd));
    updated.rateAvailability = [r];
    onSubmit(updated);
    onClose();
  };

  const handleRateAvailabilityChange = (field: string, value: any) => {
    setFormData(prev => {
      const curr = { ...prev.rateAvailability[0], [field]: value } as any;
      // live compute available from dates
      if (field === 'contractStart' || field === 'contractEnd') {
        const start = field === 'contractStart' ? value : curr.contractStart;
        const end = field === 'contractEnd' ? value : curr.contractEnd;
        curr.available = !!(start && end && new Date(start) <= new Date(end));
      }
      return { ...prev, rateAvailability: [curr] };
    });
  };

  const handleYearChange = (value: number) => {
    setFormData(prev => ({
      ...prev,
      rateAvailability: [{ ...prev.rateAvailability[0], year: value }],
    }));
  };

  const currentRate = formData.rateAvailability[0];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            {hotel ? 'Edit Hotel' : 'Add New Hotel'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">Hotel Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="country">Country *</Label>
                  <Select 
                    value={formData.country} 
                    onValueChange={(value) => setFormData({ ...formData, country: value, city: '' })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent>
                      {countries.map(country => (
                        <SelectItem key={country} value={country}>{country}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="city">City *</Label>
                  <Select 
                    value={formData.city} 
                    onValueChange={(value) => setFormData({ ...formData, city: value })}
                    disabled={!formData.country}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select city" />
                    </SelectTrigger>
                    <SelectContent>
                      {formData.country && citiesByCountry[formData.country]?.map(city => (
                        <SelectItem key={city} value={city}>{city}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="stars">Star Rating</Label>
                <Select 
                  value={formData.stars?.toString() || '3'} 
                  onValueChange={(value) => setFormData({ ...formData, stars: parseInt(value) })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">3 Stars</SelectItem>
                    <SelectItem value="4">4 Stars</SelectItem>
                    <SelectItem value="5">5 Stars</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              </CardContent>
          </Card>

          {/* Rate Availability */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Rate Availability</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="year">Contract Year</Label>
                  <Input
                    id="year"
                    type="number"
                    min="2000"
                    max="2100"
                    value={currentRate?.year || new Date().getFullYear()}
                    onChange={(e) => handleYearChange(parseInt(e.target.value || `${new Date().getFullYear()}`))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="contractStart">Contract Start Date</Label>
                  <Input
                    id="contractStart"
                    type="date"
                    value={currentRate?.contractStart || ''}
                    onChange={(e) => handleRateAvailabilityChange('contractStart', e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="contractEnd">Contract End Date</Label>
                  <Input
                    id="contractEnd"
                    type="date"
                    value={currentRate?.contractEnd || ''}
                    onChange={(e) => handleRateAvailabilityChange('contractEnd', e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Availability will be marked as active when both dates are set and Start ≤ End.
              </p>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="bg-primary hover:bg-primary/90">
              {hotel ? 'Update Hotel' : 'Add Hotel'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};