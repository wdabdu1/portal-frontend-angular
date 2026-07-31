import { Routes } from '@angular/router';
import { authGuard } from './auth/auth.guard';
import { Login } from './auth/login/login';
import { BusinessUnits } from './settings/business-units/business-units';
import { SettingsMenu } from './settings/settings-menu/settings-menu';
import { SimpleLookup } from './settings/simple-lookup/simple-lookup';
import { NewSupplierOrder } from './purchase-orders/new-supplier-order/new-supplier-order';
import { OrderList } from './purchase-orders/order-list/order-list';
import { NewShipment } from './shipments/new-shipment/new-shipment';
import { ShipmentList } from './shipments/shipment-list/shipment-list';
import { UpdateShipment } from './shipments/update-shipment/update-shipment';
import { Divisions } from './settings/divisions/divisions';
import { FxRates } from './settings/fx-rates/fx-rates';
import { ClearanceList } from './clearance/clearance-list/clearance-list';
import { ClearanceDetailComponent } from './clearance/clearance-detail/clearance-detail';
import { ClearanceSla } from './settings/clearance-sla/clearance-sla';

export const routes: Routes = [
  { path: '', redirectTo: 'orders', pathMatch: 'full' },
  { path: 'login', component: Login },

  { path: 'settings', component: SettingsMenu, canActivate: [authGuard] },
  { path: 'settings/business-units', component: BusinessUnits, canActivate: [authGuard] },
  { path: 'settings/divisions', component: Divisions, canActivate: [authGuard] },
  { path: 'settings/fx-rates', component: FxRates, canActivate: [authGuard] },
  { path: 'clearance', component: ClearanceList, canActivate: [authGuard] },
  { path: 'clearance/:id', component: ClearanceDetailComponent, canActivate: [authGuard] },
  { path: 'settings/clearance-sla', component: ClearanceSla, canActivate: [authGuard] },

  {
    path: 'settings/business-partners',
    component: SimpleLookup,
    canActivate: [authGuard],
    data: {
      title: 'Business Partners',
      resource: 'business-partners',
      fields: [
        { key: 'name', label: 'Name', type: 'text' },
        { key: 'isSupplier', label: 'Supplier', type: 'checkbox' },
        { key: 'isConsignee', label: 'Consignee', type: 'checkbox' },
        { key: 'isBrandManufacturer', label: 'Brand/Manufacturer', type: 'checkbox' },
        { key: 'isOffshoreEntity', label: 'Offshore Entity', type: 'checkbox' }
      ]
    }
  },
  {
    path: 'settings/approval-types',
    component: SimpleLookup,
    canActivate: [authGuard],
    data: { title: 'Approval Types', resource: 'approval-types', fields: [{ key: 'name', label: 'Name', type: 'text' }] }
  },
  {
    path: 'settings/payment-terms',
    component: SimpleLookup,
    canActivate: [authGuard],
    data: { title: 'Payment Terms', resource: 'payment-terms', fields: [{ key: 'name', label: 'Name', type: 'text' }] }
  },
  {
    path: 'settings/incoterms',
    component: SimpleLookup,
    canActivate: [authGuard],
    data: {
      title: 'Incoterms',
      resource: 'incoterms',
      fields: [
        { key: 'code', label: 'Code', type: 'text' },
        { key: 'name', label: 'Name', type: 'text' }
      ]
    }
  },
  {
    path: 'settings/origin-countries',
    component: SimpleLookup,
    canActivate: [authGuard],
    data: { title: 'Origin Countries', resource: 'origin-countries', fields: [{ key: 'name', label: 'Name', type: 'text' }] }
  },
  {
    path: 'settings/units-of-measure',
    component: SimpleLookup,
    canActivate: [authGuard],
    data: { title: 'Units of Measure', resource: 'units-of-measure', fields: [{ key: 'code', label: 'Code', type: 'text' }] }
  },
  {
    path: 'settings/shipment-modes',
    component: SimpleLookup,
    canActivate: [authGuard],
    data: { title: 'Shipment Modes', resource: 'shipment-modes', fields: [{ key: 'name', label: 'Name', type: 'text' }] }
  },
  {
    path: 'settings/product-categories',
    component: SimpleLookup,
    canActivate: [authGuard],
    data: { title: 'Product Categories', resource: 'product-categories', fields: [{ key: 'name', label: 'Name', type: 'text' }] }
  },
  {
    path: 'settings/product-types',
    component: SimpleLookup,
    canActivate: [authGuard],
    data: { title: 'Product Types', resource: 'product-types', fields: [{ key: 'name', label: 'Name', type: 'text' }] }
  },
  {
    path: 'settings/model-products',
    component: SimpleLookup,
    canActivate: [authGuard],
    data: { title: 'Model/Product', resource: 'model-products', fields: [{ key: 'name', label: 'Name', type: 'text' }] }
  },
  {
    path: 'settings/currencies',
    component: SimpleLookup,
    canActivate: [authGuard],
    data: {
      title: 'Currencies',
      resource: 'currencies',
      fields: [
        { key: 'code', label: 'Code', type: 'text' },
        { key: 'name', label: 'Name', type: 'text' }
      ]
    }
  },
  {
    path: 'settings/shipping-lines',
    component: SimpleLookup,
    canActivate: [authGuard],
    data: { title: 'Shipping Lines', resource: 'shipping-lines', fields: [{ key: 'name', label: 'Name', type: 'text' }] }
  },
  {
    path: 'settings/couriers',
    component: SimpleLookup,
    canActivate: [authGuard],
    data: { title: 'Couriers', resource: 'couriers', fields: [{ key: 'name', label: 'Name', type: 'text' }] }
  },
  {
    path: 'settings/forwarders',
    component: SimpleLookup,
    canActivate: [authGuard],
    data: { title: 'Forwarders', resource: 'forwarders', fields: [{ key: 'name', label: 'Name', type: 'text' }] }
  },
  {
    path: 'settings/shipment-destinations',
    component: SimpleLookup,
    canActivate: [authGuard],
    data: {
      title: 'Shipment Destinations',
      resource: 'shipment-destinations',
      fields: [
        { key: 'name', label: 'Name', type: 'text' },
        { key: 'isFreeZone', label: 'Free Zone', type: 'checkbox' },
        { key: 'defaultDurationDays', label: 'Default Duration (days)', type: 'number' }
      ]
    }
  },
  {
    path: 'settings/public-holidays',
    component: SimpleLookup,
    canActivate: [authGuard],
    data: {
      title: 'Public Holidays',
      resource: 'public-holidays',
      fields: [
        { key: 'date', label: 'Date', type: 'date' },
        { key: 'name', label: 'Name', type: 'text' },
        { key: 'affectsDxb', label: 'Affects DXB', type: 'checkbox' },
        { key: 'affectsClr', label: 'Affects CLR', type: 'checkbox' }
      ]
    }
  },
  {
    path: 'settings/tenors',
    component: SimpleLookup,
    canActivate: [authGuard],
    data: { title: 'Tenors', resource: 'tenors', fields: [{ key: 'name', label: 'Name', type: 'text' }] }
  },
  {
    path: 'settings/sender-banks',
    component: SimpleLookup,
    canActivate: [authGuard],
    data: {
      title: 'Sender Banks',
      resource: 'sender-banks',
      fields: [
        { key: 'name', label: 'Name', type: 'text' },
        { key: 'chargeRate', label: 'Charge Rate', type: 'number' },
        { key: 'minimumChargeAed', label: 'Minimum Charge (AED)', type: 'number' }
      ]
    }
  },
  {
    path: 'settings/receiver-banks',
    component: SimpleLookup,
    canActivate: [authGuard],
    data: {
      title: 'Receiver Banks',
      resource: 'receiver-banks',
      fields: [
        { key: 'name', label: 'Name', type: 'text' },
        { key: 'bankChargeRate', label: 'Bank Charge Rate', type: 'number' },
        { key: 'imChargeRate', label: 'IM Charge Rate', type: 'number' },
        { key: 'totalChargeRate', label: 'Total Charge Rate (%)', type: 'number', readonly: true, format: 'percent' }
      ]
    }
  },
  {
    path: 'settings/spc-rates',
    component: SimpleLookup,
    canActivate: [authGuard],
    data: {
      title: 'SPC Rates',
      resource: 'spc-rates',
      fields: [
        { key: 'euroToSdgRate', label: 'Euro to SDG Rate', type: 'number' },
        { key: 'effectiveDate', label: 'Effective Date', type: 'date' }
      ]
    }
  },
  {
    path: 'settings/acd-cost-settings',
    component: SimpleLookup,
    canActivate: [authGuard],
    data: {
      title: 'ACD Cost Settings',
      resource: 'acd-cost-settings',
      fields: [
        { key: 'costPerFclUsd', label: 'Cost per FCL (USD)', type: 'number' },
        { key: 'effectiveDate', label: 'Effective Date', type: 'date' }
      ]
    }
  },

  { path: 'orders', component: OrderList, canActivate: [authGuard] },
  { path: 'orders/new', component: NewSupplierOrder, canActivate: [authGuard] },
  { path: 'shipments', component: ShipmentList, canActivate: [authGuard] },
  { path: 'shipments/new', component: NewShipment, canActivate: [authGuard] },
  { path: 'shipments/:id', component: UpdateShipment, canActivate: [authGuard] }
];
