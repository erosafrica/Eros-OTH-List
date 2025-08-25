export interface Hotel {
  id: string;
  name: string;
  country: string;
  city: string;
  rateAvailability: {
    year: number;
    available: boolean;
    contractStart?: string;
    contractEnd?: string;
  }[];
  stars?: number;
  createdAt: string;
  updatedAt: string;
}

export interface HotelFilters {
  search: string;
  country: string;
  city: string;
  year: number | null;
  contractStatus: 'all' | 'available' | 'unavailable';
}