import { useState, useMemo, useEffect } from 'react';
import { Hotel, HotelFilters } from '@/types/hotel';
import { HotelTable } from './HotelTable';
import { HotelGridView } from './HotelGridView';
import { HotelCardView } from './HotelCardView';
import { HotelFiltersComponent } from './HotelFilters';
import { HotelStats } from './HotelStats';
import { HotelFormModal } from './HotelFormModal';
import { HotelPagination } from './HotelPagination';
import { ViewControls, ViewMode } from './ViewControls';
import { Navigation } from './Navigation';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export const HotelDashboard = () => {
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [activeTab, setActiveTab] = useState<string>('inventory');
  const [filters, setFilters] = useState<HotelFilters>({
    search: '',
    country: '',
    city: '',
    year: new Date().getFullYear(),
    contractStatus: 'all',
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHotel, setEditingHotel] = useState<Hotel | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(12);
  const { toast } = useToast();

  // Load from API with fallback to mock generator
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/hotels');
        if (!res.ok) throw new Error('Failed');
        const data: Hotel[] = await res.json();
        setHotels(data);
      } catch {
        setHotels([]);
        toast({
          title: 'Failed to load hotels',
          description: 'Could not fetch data from the server. Please try again later.',
          variant: 'destructive',
        });
      }
    })();
  }, []);

  const filteredHotels = useMemo(() => {
    return hotels.filter(hotel => {
      const matchesSearch = hotel.name.toLowerCase().includes(filters.search.toLowerCase()) ||
                           hotel.city.toLowerCase().includes(filters.search.toLowerCase()) ||
                           hotel.country.toLowerCase().includes(filters.search.toLowerCase());
      
      const matchesCountry = !filters.country || hotel.country === filters.country;
      const matchesCity = !filters.city || hotel.city === filters.city;
      
      let matchesContract = true;
      if (filters.contractStatus !== 'all') { 
        const targetYear = filters.year || new Date().getFullYear();
        // Use nearest-year fallback like views to avoid mismatch
        let yearData = hotel.rateAvailability.find(rate => rate.year === targetYear);
        if (!yearData && hotel.rateAvailability.length > 0) {
          yearData = hotel.rateAvailability.reduce((prev, curr) => {
            return Math.abs(curr.year - targetYear) < Math.abs(prev.year - targetYear) ? curr : prev;
          });
        }
        if (filters.contractStatus === 'available') {
          matchesContract = yearData?.available === true;
        } else {
          matchesContract = yearData?.available === false;
        }
      }

      return matchesSearch && matchesCountry && matchesCity && matchesContract;
    });
  }, [hotels, filters]);

  // Pagination logic
  const totalPages = Math.ceil(filteredHotels.length / itemsPerPage);
  const paginatedHotels = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredHotels.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredHotels, currentPage, itemsPerPage]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  const handleAddHotel = (hotelData: Omit<Hotel, 'id' | 'createdAt' | 'updatedAt'>) => {
    (async () => {
      try {
        const res = await fetch('/api/hotels', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(hotelData),
        });
        if (!res.ok) throw new Error('Create failed');
        const created: Hotel = await res.json();
        setHotels(prev => [...prev, created]);
        toast({ title: 'Hotel Added', description: `${created.name} has been added to the inventory.` });
      } catch {
        toast({ title: 'Add failed', description: 'Could not create hotel. Please try again later.', variant: 'destructive' });
      }
    })();
  };

  const handleEditHotel = (hotelData: Omit<Hotel, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!editingHotel) return;
    
    (async () => {
      try {
        const res = await fetch(`/api/hotels/${editingHotel.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(hotelData),
        });
        if (!res.ok) throw new Error('Update failed');
        const updated: Hotel = await res.json();
        setHotels(prev => prev.map(h => (h.id === editingHotel.id ? updated : h)));
        toast({ title: 'Hotel Updated', description: `${updated.name} has been updated.` });
      } catch {
        toast({ title: 'Update failed', description: 'Could not update hotel. Please try again later.', variant: 'destructive' });
      } finally {
        setEditingHotel(null);
      }
    })();
  };

  const handleDeleteHotel = (hotelId: string) => {
    (async () => {
      const hotel = hotels.find(h => h.id === hotelId);
      try {
        const res = await fetch(`/api/hotels/${hotelId}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Delete failed');
        setHotels(prev => prev.filter(h => h.id !== hotelId));
      } catch {
        toast({ title: 'Delete failed', description: 'Could not delete hotel. Please try again later.', variant: 'destructive' });
      } finally {
        toast({ title: 'Hotel Deleted', description: `${hotel?.name} has been removed from the inventory.`, variant: 'destructive' });
      }
    })();
  };

  const openEditModal = (hotel: Hotel) => {
    setEditingHotel(hotel);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingHotel(null);
  };

  const renderHotelView = () => {
    switch (viewMode) {
      case 'grid':
        return (
          <HotelGridView 
            hotels={paginatedHotels}
            onEdit={openEditModal}
            onDelete={handleDeleteHotel}
            year={filters.year}
          />
        );
      case 'card':
        return (
          <HotelCardView 
            hotels={paginatedHotels}
            onEdit={openEditModal}
            onDelete={handleDeleteHotel}
            year={filters.year}
          />
        );
      default:
        return (
          <HotelTable 
            hotels={paginatedHotels}
            onEdit={openEditModal}
            onDelete={handleDeleteHotel}
            year={filters.year}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <Navigation totalHotels={hotels.length} activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="container mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Eros Africa OTH Inventory Database</h1>
            <p className="text-muted-foreground mt-1">Hotel contract present in the B2B Online Booking Platform </p>
          </div>
          <Button 
            onClick={() => setIsModalOpen(true)}
            className="bg-primary hover:bg-primary/90 w-full sm:w-auto"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Hotel
          </Button>
        </div>

        {activeTab === 'inventory' ? (
          <>
            {/* Stats */}
            <HotelStats hotels={hotels} />

            {/* Filters */}
            <HotelFiltersComponent 
              filters={filters}
              onFiltersChange={setFilters}
              hotels={hotels}
            />

            {/* View Controls */}
            <ViewControls
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              totalCount={filteredHotels.length}
              currentPage={currentPage}
              totalPages={totalPages}
            />

            {/* Hotel Views */}
            {renderHotelView()}

            {/* Pagination */}
            <HotelPagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </>
        ) : activeTab === 'analytics' ? (
          <div className="text-center text-muted-foreground py-12">Analytics dashboard coming soon.</div>
        ) : activeTab === 'settings' ? (
          <div className="text-center text-muted-foreground py-12">Settings page coming soon.</div>
        ) : activeTab === 'help' ? (
          <div className="text-center text-muted-foreground py-12">Help & Support content coming soon.</div>
        ) : null}

        {/* Modal */}
        <HotelFormModal
          isOpen={isModalOpen}
          onClose={closeModal}
          onSubmit={editingHotel ? handleEditHotel : handleAddHotel}
          hotel={editingHotel}
        />
      </div>
    </div>
  );
};