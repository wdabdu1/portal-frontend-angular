import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_URL } from '../../api-config';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../../auth/auth.service';

interface MenuGroup {
  title: string;
  links: { label: string; path: string; logisticsList?: boolean }[];
}

@Component({
  selector: 'app-settings-menu',
  imports: [CommonModule, RouterLink],
  templateUrl: './settings-menu.html'
})
export class SettingsMenu implements OnInit {
  private cdr = inject(ChangeDetectorRef);
  // One admin switch (Logistics - Reveal Settings page) decides whether the
  // Drivers / Trucks / Warehouses / External Transporters / Cities links
  // also appear here. Default shown; the Logistics - Settings page in the
  // Logistics box always has them.
  showLogisticsLists = true;

  constructor(public auth: AuthService, private router: Router, private http: HttpClient) {}

  ngOnInit(): void {
    this.http.get<{ showLogisticsListsInMainSettings?: boolean }>(`${API_URL}/logistics/visibility-settings`).subscribe({
      next: (r) => { this.showLogisticsLists = r.showLogisticsListsInMainSettings !== false; this.cdr.markForCheck(); },
      error: () => { /* keep default (shown) */ }
    });
  }

  visibleLinks(group: MenuGroup) {
    return group.links.filter((l) => !l.logisticsList || this.showLogisticsLists);
  }


  goToUsers(): void {
    if (!this.auth.hasRole('SuperUser')) return;
    this.router.navigate(['/users']);
  }
  groups: MenuGroup[] = [
    {
      title: 'Organization',
      links: [
        { label: 'Business Units', path: '/settings/business-units' },
        { label: 'Divisions', path: '/settings/divisions' },
        { label: 'Business Partners (Suppliers/Consignees/Brands/Offshore)', path: '/settings/business-partners' }
      ]
    },
    {
      title: 'Order Details',
      links: [
        { label: 'Approval Types', path: '/settings/approval-types' },
        { label: 'Payment Terms', path: '/settings/payment-terms' },
        { label: 'Incoterms', path: '/settings/incoterms' },
        { label: 'Ports', path: '/settings/ports' },
        { label: 'Origin Countries', path: '/settings/origin-countries' },
        { label: 'Units of Measure', path: '/settings/units-of-measure' },
        { label: 'Shipment Modes', path: '/settings/shipment-modes' },
        { label: 'Product Categories', path: '/settings/product-categories' },
        { label: 'Tariff Groups', path: '/settings/tariff-groups' },
        { label: 'Product Types', path: '/settings/product-types' },
        // Model/Product moved out of Settings — it now lives at the end
        // of the "Update Order" top menu, restricted to Manager/
        // IP_Supervisor/SuperUser. See app.ts and app.routes.ts.
        { label: 'Currencies', path: '/settings/currencies' },
        { label: 'FX Rates', path: '/settings/fx-rates' }
      ]
    },
    {
      title: 'Shipping & Logistics',
      links: [
        { label: 'Shipping Lines', path: '/settings/shipping-lines' },
        { label: 'Couriers', path: '/settings/couriers' },
        { label: 'Forwarders', path: '/settings/forwarders' },
        { label: 'Shipment Destinations', path: '/settings/shipment-destinations' },
        { label: 'Public Holidays', path: '/settings/public-holidays' },
        { label: 'Process SLA', path: '/settings/clearance-sla' },
        { label: 'Clearance Charge Types', path: '/settings/clearance-charge-types' },
        { label: 'MOT Certificate Expiry', path: '/settings/mot-certificate' },
        { label: 'Logistics Cities', path: '/settings/logistics-cities', logisticsList: true },
        { label: 'Drivers', path: '/settings/drivers', logisticsList: true },
        { label: 'Trucks', path: '/settings/trucks', logisticsList: true },
        { label: 'Warehouses', path: '/settings/warehouses', logisticsList: true },
        { label: 'External Transporters', path: '/settings/external-transporters', logisticsList: true },
        // Moved out of the Logistics box on purpose: Coordinator could
        // previously reach and edit this from inside /logistics itself,
        // letting them widen their own reveal window. It now lives here
        // only, behind the same Manager/SuperUser-only Settings gate as
        // everything else in this menu.
        { label: 'Logistics — Reveal Settings', path: '/settings/logistics-visibility' }
      ]
    },
    {
      title: 'Finance',
      links: [
        { label: 'Tenors', path: '/settings/tenors' },
        { label: 'Sender Banks', path: '/settings/sender-banks' },
        { label: 'Receiver Banks', path: '/settings/receiver-banks' },
        { label: 'SPC Storage Tiers', path: '/settings/spc-storage-tiers' },
        { label: 'ACD Cost Settings', path: '/settings/acd-cost-settings' },
        { label: 'TP — Default Markups', path: '/settings/offshore-markup-defaults' }
      ]
    }
  ];
}
