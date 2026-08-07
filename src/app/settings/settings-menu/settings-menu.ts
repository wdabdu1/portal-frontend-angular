import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

interface MenuGroup {
  title: string;
  links: { label: string; path: string }[];
}

@Component({
  selector: 'app-settings-menu',
  imports: [CommonModule, RouterLink],
  templateUrl: './settings-menu.html'
})
export class SettingsMenu {
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
        { label: 'Origin Countries', path: '/settings/origin-countries' },
        { label: 'Units of Measure', path: '/settings/units-of-measure' },
        { label: 'Shipment Modes', path: '/settings/shipment-modes' },
        { label: 'Product Categories', path: '/settings/product-categories' },
        { label: 'Tariff Groups', path: '/settings/tariff-groups' },
        { label: 'Product Types', path: '/settings/product-types' },
        { label: 'Model/Product', path: '/settings/model-products' },
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
        { label: 'Clearance SLA', path: '/settings/clearance-sla' },
        { label: 'Clearance Charge Types', path: '/settings/clearance-charge-types' },
        { label: 'Logistics Cities', path: '/settings/logistics-cities' },
        { label: 'Drivers', path: '/settings/drivers' },
        { label: 'Trucks', path: '/settings/trucks' },
        { label: 'Warehouses', path: '/settings/warehouses' }
      ]
    },
    {
      title: 'Finance',
      links: [
        { label: 'Tenors', path: '/settings/tenors' },
        { label: 'Sender Banks', path: '/settings/sender-banks' },
        { label: 'Receiver Banks', path: '/settings/receiver-banks' },
        { label: 'SPC Storage Tiers', path: '/settings/spc-storage-tiers' },
        { label: 'ACD Cost Settings', path: '/settings/acd-cost-settings' }
      ]
    }
  ];
}
