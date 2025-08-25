import { Building2, BarChart3, Settings, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface NavigationProps {
  totalHotels: number;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

export const Navigation = ({ totalHotels, activeTab = 'inventory', onTabChange }: NavigationProps) => {
  const navItems = [
    {
      id: 'inventory',
      label: 'Hotel Inventory',
      icon: Building2,
      description: 'Manage your hotel portfolio',
      badge: totalHotels.toString()
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: BarChart3,
      description: 'View performance metrics'
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
      description: 'Configure preferences'
    },
    {
      id: 'help',
      label: 'Help & Support',
      icon: HelpCircle,
      description: 'Get assistance'
    }
  ];

  return (
    <nav className="bg-card border-b border-border sticky top-0 z-40 backdrop-blur-sm bg-background/95">
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo/Brand */}
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-xl font-bold text-foreground">HotelManager</h1>
              <p className="text-xs text-muted-foreground">Inventory Management System</p>
            </div>
          </div>

          {/* Navigation Items */}
          <div className="flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              
              return (
                <Button
                  key={item.id}
                  variant={isActive ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => onTabChange?.(item.id)}
                  className="relative h-9"
                  title={item.description}
                >
                  <Icon className="h-4 w-4" />
                  <span className="ml-2 hidden md:inline">{item.label}</span>
                  {item.badge && (
                    <Badge 
                      variant="secondary" 
                      className="ml-2 h-5 text-xs px-1.5 hidden lg:inline-flex"
                    >
                      {item.badge}
                    </Badge>
                  )}
                </Button>
              );
            })}
          </div>

          {/* Quick Actions */}
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="text-xs hidden sm:inline-flex">
              East & South Africa
            </Badge>
          </div>
        </div>
      </div>
    </nav>
  );
};