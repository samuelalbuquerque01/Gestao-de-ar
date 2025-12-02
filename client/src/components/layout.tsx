import React from 'react';
import { Link, useLocation } from 'wouter';
import { LayoutDashboard, Fan, Wrench, FileText, Users, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

interface LayoutProps {
  children: React.ReactNode;
}

const NAV_ITEMS = [
  { label: 'Dashboard', path: '/', icon: LayoutDashboard },
  { label: 'Máquinas', path: '/maquinas', icon: Fan },
  { label: 'Serviços', path: '/servicos', icon: Wrench },
  { label: 'Técnicos', path: '/tecnicos', icon: Users },
  { label: 'Relatórios', path: '/relatorios', icon: FileText },
];

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const NavContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-2 font-bold text-xl text-primary">
          <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center text-primary-foreground">
            <Fan className="w-5 h-5" />
          </div>
          Neuropsicocentro
        </div>
        <p className="text-xs text-muted-foreground mt-1">Gestão de Ar Condicionado</p>
      </div>
      
      <nav className="flex-1 p-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive = location === item.path;
          return (
            <Link key={item.path} href={item.path}>
              <Button
                variant={isActive ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start gap-3 mb-1 font-medium",
                  isActive ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => setMobileOpen(false)}
              >
                <item.icon className={cn("w-5 h-5", isActive ? "text-primary" : "text-muted-foreground")} />
                {item.label}
              </Button>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3 p-2 rounded-lg bg-sidebar-accent/50">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
            AD
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-medium truncate">Admin User</p>
            <p className="text-xs text-muted-foreground truncate">admin@neuro.com</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden md:block w-64 border-r border-sidebar-border bg-sidebar text-sidebar-foreground fixed inset-y-0 left-0 z-30">
        <NavContent />
      </aside>

      {/* Mobile Header & Content Wrapper */}
      <div className="flex-1 md:ml-64 flex flex-col min-h-screen transition-all duration-300 ease-in-out">
        {/* Mobile Header */}
        <header className="md:hidden h-16 border-b bg-background/80 backdrop-blur-md sticky top-0 z-20 flex items-center px-4 justify-between">
          <div className="flex items-center gap-2 font-bold text-lg text-primary">
             <Fan className="w-5 h-5" /> Neuropsicocentro
          </div>
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-72 bg-sidebar border-r border-sidebar-border">
              <NavContent />
            </SheetContent>
          </Sheet>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-8 overflow-x-hidden animate-in fade-in duration-500">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
