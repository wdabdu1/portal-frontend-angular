import { Component, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { AuthService } from './auth/auth.service';

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
      { label: 'Cashflow', route: '/dashboards/cashflow', canAccess: (a) => a.hasRole('CorpFinance') || a.hasRole('Treasury') || a.hasRole('Manager') || a.hasRole('SuperUser') }
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
      { label: 'Logistics', route: '/logistics', canAccess: () => true },
      { label: 'Truck Loads', route: '/logistics/truck-loads', canAccess: () => true }
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
      { label: 'Bank Dues', route: '/bank-dues', canAccess: (a) => a.canSeeBankDues() }
    ]
  }
];

@Component({
  selector: 'app-root',
  imports: [CommonModule, RouterOutlet, RouterLink],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  menuGroups = MENU_GROUPS;
  openMenu: string | null = null;

  constructor(public auth: AuthService, private router: Router) {}

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
