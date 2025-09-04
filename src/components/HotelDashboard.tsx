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
import { Skeleton } from '@/components/ui/skeleton';

export const HotelDashboard = () => {
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [totalHotels, setTotalHotels] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
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

  // Admin state (from localStorage role)
  const [isAdmin, setIsAdmin] = useState<boolean>(typeof window !== 'undefined' ? localStorage.getItem('role') === 'admin' : false);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'role') setIsAdmin(localStorage.getItem('role') === 'admin');
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const API = import.meta.env.VITE_API_BASE_URL || '';

  // Load from API with server-side filtering
  const fetchHotels = async (showLoading = true, page = currentPage) => {
    if (showLoading) setIsLoading(true);
    else setIsRefreshing(true);
    
    try {
      // Build query parameters for server-side filtering
      const params = new URLSearchParams({
        page: page.toString(),
        limit: itemsPerPage.toString(),
        search: filters.search,
        country: filters.country,
        city: filters.city,
        year: filters.year.toString(),
        contractStatus: filters.contractStatus,
      });

      const res = await fetch(`${API}/api/hotels?${params}`, { 
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache',
        }
      });
      
      if (res.status === 401) {
        window.location.href = '/login';
        return;
      }
      if (!res.ok) throw new Error('Failed to fetch hotels');
      
      const data = await res.json();
      
      // Handle both old and new API response formats
      if (Array.isArray(data)) {
        // Old format: direct array of hotels
        setHotels(data);
        setTotalHotels(data.length);
        setTotalPages(1);
      } else if (data.hotels && data.pagination) {
        // New format: paginated response
        setHotels(data.hotels);
        setTotalHotels(data.pagination.total);
        setTotalPages(data.pagination.totalPages);
      } else {
        // Fallback for unexpected format
        console.warn('Unexpected API response format:', data);
        setHotels([]);
        setTotalHotels(0);
        setTotalPages(0);
      }
    } catch (error) {
      console.error('Failed to fetch hotels:', error);
      setHotels([]);
      setTotalHotels(0);
      setTotalPages(0);
      toast({
        title: 'Failed to load hotels',
        description: 'Could not fetch data from the server. Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchHotels();
  }, []);

  // Refetch when filters change
  useEffect(() => {
    setCurrentPage(1);
    fetchHotels(false, 1);
  }, [filters]);

  // Refetch when page changes
  useEffect(() => {
    if (currentPage > 1) {
      fetchHotels(false, currentPage);
    }
  }, [currentPage]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  const handleAddHotel = (hotelData: Omit<Hotel, 'id' | 'createdAt' | 'updatedAt'>) => {
    (async () => {
      try {
        const res = await fetch(`${API}/api/hotels`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(hotelData),
        });
        if (res.status === 401) { 
          toast({ title: 'Login required', description: 'Please log in to add hotels.', variant: 'destructive' });
          return; 
        }
        if (res.status === 403) {
          toast({ title: 'Admin required', description: 'Only admins can add hotels.', variant: 'destructive' });
          return;
        }
        if (!res.ok) throw new Error('Create failed');
        const created: Hotel = await res.json();
        // Refresh the data to show the new hotel
        fetchHotels(false);
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
        const res = await fetch(`${API}/api/hotels/${editingHotel.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(hotelData),
        });
        if (res.status === 401) { 
          toast({ title: 'Login required', description: 'Please log in to edit hotels.', variant: 'destructive' });
          return; 
        }
        if (res.status === 403) {
          toast({ title: 'Admin required', description: 'Only admins can edit hotels.', variant: 'destructive' });
          return;
        }
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
        const res = await fetch(`${API}/api/hotels/${hotelId}`, { method: 'DELETE', credentials: 'include' });
        if (res.status === 401) { 
          toast({ title: 'Login required', description: 'Please log in to delete hotels.', variant: 'destructive' });
          return; 
        }
        if (res.status === 403) {
          toast({ title: 'Admin required', description: 'Only admins can delete hotels.', variant: 'destructive' });
          return;
        }
        if (!res.ok) throw new Error('Delete failed');
        // Refresh the data to reflect the deletion
        fetchHotels(false);
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

  // Loading skeleton components
  const renderLoadingSkeleton = () => {
    const skeletons = Array.from({ length: itemsPerPage }, (_, i) => (
      <div key={i} className="space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    ));

    switch (viewMode) {
      case 'grid':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="space-y-3 p-4 border rounded-lg">
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        );
      case 'card':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="space-y-3 p-6 border rounded-lg">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        );
      default:
        return (
          <div className="space-y-4">
            {skeletons}
          </div>
        );
    }
  };

  const renderHotelView = () => {
    if (isLoading) {
      return renderLoadingSkeleton();
    }

    switch (viewMode) {
      case 'grid':
        return (
          <HotelGridView 
            hotels={hotels}
            onEdit={openEditModal}
            onDelete={handleDeleteHotel}
            year={filters.year}
          />
        );
      case 'card':
        return (
          <HotelCardView 
            hotels={hotels}
            onEdit={openEditModal}
            onDelete={handleDeleteHotel}
            year={filters.year}
          />
        );
      default:
        return (
          <HotelTable 
            hotels={hotels}
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
      <Navigation totalHotels={totalHotels} activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="container mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Eros Africa OTH Inventory Database</h1>
            <p className="text-muted-foreground mt-1">Hotel contract present in the B2B Online Booking Platform </p>
          </div>
                      <div className="flex items-center gap-2">
                          <Button 
              onClick={() => fetchHotels(false)}
              variant="outline"
              size="sm"
              disabled={isRefreshing}
            >
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
              <Button 
                onClick={() => setIsModalOpen(true)}
                className="bg-primary hover:bg-primary/90 w-full sm:w-auto"
                disabled={!isAdmin}
                title={isAdmin ? 'Add a new hotel' : 'Admin required to add'}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Hotel
              </Button>
            </div>
        </div>

        {activeTab === 'inventory' ? (
          <>
            {/* Stats */}
            <HotelStats hotels={hotels} totalHotels={totalHotels} />

            {/* Filters */}
            <HotelFiltersComponent 
              filters={filters}
              onFiltersChange={setFilters}
              hotels={hotels}
              totalHotels={totalHotels}
            />

            {/* View Controls */}
            <ViewControls
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              totalCount={totalHotels}
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