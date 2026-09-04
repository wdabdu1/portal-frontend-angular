import { ChangeDetectorRef, Component, HostListener, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService } from './auth/auth.service';
import { Favorite, FavoritesService } from './favorites.service';

interface MenuItem {
  label: string;
  route: string;
  canAccess: (auth: AuthService) => boolean;
}

interface MenuGroup {
  label: string;
  items: MenuItem[];
}

// Data-driven so the menu structure lives in one place — items that are
// visible-but-disabled (per the "always show the menu, gate the item"
// pattern) still appear here; canAccess just controls whether they're
// clickable, never whether they're shown at all.
const MENU_GROUPS: MenuGroup[] = [
  {
    label: 'Dashboard',
    items: [
      { label: 'Shipment Pipeline Health', route: '/dashboards/clearance-readiness', canAccess: (a) => a.canSeeShipments() },
      { label: 'Cashflow', route: '/dashboards/cashflow', canAccess: (a) => a.hasRole('CorpFinance') || a.hasRole('Treasury') || a.hasRole('Manager') || a.hasRole('SuperUser') || a.hasRole('IP_Supervisor') },
      { label: 'PO Dashboard', route: '/dashboards/purchase-orders', canAccess: (a) => a.canSeeOrders() },
      { label: 'Free Zones', route: '/dashboards/fz', canAccess: () => true },
      { label: 'Shipment Dashboard', route: '/dashboards/shipments', canAccess: (a) => a.canSeeShipments() },
      { label: 'Under Clearance', route: '/dashboards/under-clearance', canAccess: () => true },
      { label: 'Goods in Transit', route: '/dashboards/goods-in-transit', canAccess: () => true },
      { label: 'Department Performance', route: '/dashboards/department-performance', canAccess: (a) => a.hasRole('Manager') || a.hasRole('SuperUser') || a.hasRole('IP_Supervisor') },
      { label: 'Demurrage Analysis', route: '/dashboards/demurrage-analysis', canAccess: (a) => a.hasRole('Manager') || a.hasRole('SuperUser') || a.hasRole('CorpFinance') || a.hasRole('IP_Supervisor') },
      { label: 'Supplier Delay Watch', route: '/dashboards/supplier-delay', canAccess: () => true },
      { label: 'Process Performance', route: '/dashboards/process-performance', canAccess: (a) => a.hasRole('Manager') || a.hasRole('SuperUser') || a.hasRole('IP_Supervisor') }
    ]
  },
  {
    label: 'New Entry',
    items: [
      { label: 'New Supplier Order', route: '/orders/new', canAccess: (a) => a.canCreateOrders() },
      { label: 'New Shipment', route: '/shipments/new', canAccess: (a) => a.canSeeShipments() }
    ]
  },
  {
    label: 'Update Order',
    items: [
      { label: 'Orders', route: '/orders', canAccess: (a) => a.canSeeOrders() },
      { label: 'Shipments', route: '/shipments', canAccess: (a) => a.canSeeShipments() },
      { label: 'Clearance', route: '/clearance', canAccess: () => true }
    ]
  },
  {
    label: 'Logistics',
    items: [
      { label: 'Shipments for Dispatch', route: '/logistics', canAccess: () => true },
      { label: 'Truck Availability', route: '/logistics/truck-availability', canAccess: () => true },
      { label: 'Truck Allocation', route: '/logistics/truck-allocations', canAccess: () => true },
      { label: 'Cargo Under Delivery', route: '/dashboards/goods-in-transit', canAccess: () => true }
    ]
  },
  {
    label: 'Free Zone',
    items: [
      { label: 'FZ Inventory', route: '/fz-inventory', canAccess: () => true },
      { label: 'Withdrawals', route: '/fz-inventory', canAccess: () => true }
    ]
  },
  {
    label: 'Finance',
    items: [
      { label: 'Transfer Pricing', route: '/transfer-pricing', canAccess: (a) => a.hasRole('CorpFinance') || a.hasRole('Manager') || a.hasRole('SuperUser') },
      { label: 'Supplier Dues', route: '/supplier-dues', canAccess: (a) => a.canSeeSupplierDues() },
      { label: 'Bank Dues', route: '/bank-dues', canAccess: (a) => a.canSeeBankDues() },
      { label: 'Direct Sales', route: '/direct-sales', canAccess: (a) => a.canSeeBankDues() },
      { label: 'Pay Bank Dues', route: '/pay-bank-dues', canAccess: (a) => a.canSeePayBankDues() }
    ]
  },
  {
    // Moved out of Finance entirely — the CPricing role and its data are
    // deliberately not visible to Treasury/CorpFinance.
    label: 'C Pricing',
    items: [
      { label: 'C Pricing', route: '/c-pricing', canAccess: (a) => a.canSeeCPricing() },
      { label: 'History', route: '/c-pricing/history', canAccess: (a) => a.canSeeCPricing() },
      { label: 'Settings', route: '/c-pricing/settings', canAccess: (a) => a.canSeeCPricing() }
    ]
  }
];

@Component({
  selector: 'app-root',
  imports: [CommonModule, RouterOutlet, RouterLink],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  private cdr = inject(ChangeDetectorRef);

  menuGroups = MENU_GROUPS;
  openMenu: string | null = null;
  favorites: Favorite[] = [];

  constructor(public auth: AuthService, private router: Router, private favoritesService: FavoritesService) {}

  private favoritesLoadedForUser = false;

  ngOnInit(): void {
    if (this.auth.isLoggedIn()) this.loadFavorites();

    // App bootstraps once, before login — this catches the actual login
    // event (and logout, resetting for the next user) via navigation,
    // rather than only checking auth state a single time at startup.
    this.router.events.pipe(filter((e) => e instanceof NavigationEnd)).subscribe(() => {
      if (this.auth.isLoggedIn() && !this.favoritesLoadedForUser) {
        this.favoritesLoadedForUser = true;
        this.loadFavorites();
      } else if (!this.auth.isLoggedIn()) {
        this.favoritesLoadedForUser = false;
        this.favorites = [];
      }
    });
  }

  loadFavorites(): void {
    this.favoritesService.getAll().subscribe({ next: (r) => { this.favorites = r; this.cdr.markForCheck(); } });
  }

  isFavorite(item: MenuItem): boolean {
    return this.favorites.some((f) => f.route === item.route && f.label === item.label);
  }

  toggleFavorite(item: MenuItem, event: MouseEvent): void {
    event.stopPropagation();
    const existing = this.favorites.find((f) => f.route === item.route && f.label === item.label);
    if (existing) {
      this.favoritesService.remove(existing.id).subscribe({ next: () => this.loadFavorites() });
    } else {
      this.favoritesService.add(item.label, item.route).subscribe({ next: () => this.loadFavorites() });
    }
  }

  navigateFavorite(fav: Favorite): void {
    this.router.navigate([fav.route]);
  }

  get isBareRoute(): boolean {
    return this.router.url.startsWith('/mobile/');
  }

  removeFavorite(fav: Favorite): void {
    this.favoritesService.remove(fav.id).subscribe({ next: () => this.loadFavorites() });
  }

  toggleMenu(label: string, event: MouseEvent): void {
    event.stopPropagation();
    this.openMenu = this.openMenu === label ? null : label;
  }

  closeMenus(): void {
    this.openMenu = null;
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.closeMenus();
  }

  navigate(item: MenuItem): void {
    if (!item.canAccess(this.auth)) return;
    this.closeMenus();
    this.router.navigate([item.route]);
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
