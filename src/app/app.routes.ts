import { Routes } from '@angular/router';
import { authGuard } from './auth/auth.guard';
import { Login } from './auth/login/login';
import { ShippingLines } from './settings/shipping-lines/shipping-lines';
import { ShipmentDetails } from './shipments/shipment-details/shipment-details';
import { Users } from './users/users';
import { OrderDetails } from './purchase-orders/order-details/order-details';
import { SpcStorageTiers } from './settings/spc-storage-tiers/spc-storage-tiers';
import { EstimateLineItems } from './clearance/estimate-line-items/estimate-line-items';
import { BankDuesList } from './bank-dues/bank-dues-list/bank-dues-list';
import { SupplierDuesList } from './supplier-dues/supplier-dues-list/supplier-dues-list';
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
import { HomeRedirect } from './home-redirect';
import { FzInventoryList } from './fz-inventory/fz-inventory-list/fz-inventory-list';
import { WithdrawalDetailComponent } from './withdrawal/withdrawal-detail/withdrawal-detail';
import { LogisticsList } from './logistics/logistics-list/logistics-list';
import { TruckLoadList } from './logistics/truck-load-list/truck-load-list';
import { TruckLoadDetailComponent } from './logistics/truck-load-detail/truck-load-detail';
import { TransferPricingDetailComponent } from './transfer-pricing/transfer-pricing-detail/transfer-pricing-detail';
import { TransferPricingList } from './transfer-pricing/transfer-pricing-list/transfer-pricing-list';
import { TransferPricingAccumulated } from './transfer-pricing/transfer-pricing-accumulated/transfer-pricing-accumulated';
import { ClearanceReadiness } from './dashboards/clearance-readiness/clearance-readiness';
import { PipelineHealthMobile } from './dashboards/pipeline-health-mobile/pipeline-health-mobile';
import { CashflowDashboard } from './dashboards/cashflow-dashboard/cashflow-dashboard';


export const routes: Routes = [
  { path: '', component: HomeRedirect, canActivate: [authGuard], pathMatch: 'full' },
  { path: 'login', component: Login },

  {
    path: 'settings/tariff-groups',
    component: SimpleLookup,
    canActivate: [authGuard],
    data: { title: 'Tariff Groups', resource: 'tariff-groups', fields: [{ key: 'name', label: 'Name', type: 'text' }] }
  },
  {
    path: 'settings/clearance-charge-types',
    component: SimpleLookup,
    canActivate: [authGuard],
    data: { title: 'Clearance Charge Types', resource: 'clearance-charge-types', fields: [{ key: 'name', label: 'Name', type: 'text' }] }
  },
  { path: 'settings', component: SettingsMenu, canActivate: [authGuard] },
  { path: 'settings/business-units', component: BusinessUnits, canActivate: [authGuard] },
  { path: 'settings/divisions', component: Divisions, canActivate: [authGuard] },
  { path: 'settings/fx-rates', component: FxRates, canActivate: [authGuard] },
  { path: 'clearance', component: ClearanceList, canActivate: [authGuard] },
  { path: 'bank-dues', component: BankDuesList, canActivate: [authGuard] },
  { path: 'clearance/:id/estimate-items', component: EstimateLineItems, canActivate: [authGuard] },
  { path: 'clearance/:id', component: ClearanceDetailComponent, canActivate: [authGuard] },
  { path: 'settings/clearance-sla', component: ClearanceSla, canActivate: [authGuard] },
  { path: 'supplier-dues', component: SupplierDuesList, canActivate: [authGuard] },
  { path: 'users', component: Users, canActivate: [authGuard] },
  { path: 'fz-inventory', component: FzInventoryList, canActivate: [authGuard] },
  { path: 'withdrawals/:id', component: WithdrawalDetailComponent, canActivate: [authGuard] },
  { path: 'logistics', component: LogisticsList, canActivate: [authGuard] },
  { path: 'logistics/truck-loads', component: TruckLoadList, canActivate: [authGuard] },
  { path: 'logistics/truck-loads/:id', component: TruckLoadDetailComponent, canActivate: [authGuard] },
  { path: 'transfer-pricing', component: TransferPricingList, canActivate: [authGuard] },
  { path: 'transfer-pricing/accumulated', component: TransferPricingAccumulated, canActivate: [authGuard] },
  { path: 'transfer-pricing/:shipmentId', component: TransferPricingDetailComponent, canActivate: [authGuard] },
  { path: 'clearance', component: ClearanceList, canActivate: [authGuard] },
  { path: 'dashboards/clearance-readiness', component: ClearanceReadiness, canActivate: [authGuard] },
  { path: 'mobile/pipeline-health', component: PipelineHealthMobile, canActivate: [authGuard] },
  { path: 'dashboards/cashflow', component: CashflowDashboard, canActivate: [authGuard] },

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
    data: {
      title: 'Product Categories',
      resource: 'product-categories',
      fields: [
        { key: 'name', label: 'Name', type: 'text' },
        { key: 'tariffGroupId', label: 'Tariff Group', type: 'select', optionsResource: 'tariff-groups' }
      ]
    }
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
    component: ShippingLines,
    canActivate: [authGuard]
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
    data: { title: 'Tenors', resource: 'tenors', fields: [{ key: 'days', label: 'No of Days', type: 'number' }] }
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
    path: 'settings/spc-storage-tiers',
    component: SpcStorageTiers,
    canActivate: [authGuard]
  },
  {
    path: 'settings/acd-cost-settings',
    component: SimpleLookup,
    canActivate: [authGuard],
    data: {
      title: 'ACD Cost Settings',
      resource: 'acd-cost-settings',
      fields: [
        { key: 'rate20Usd', label: '20\' Rate (USD)', type: 'number' },
        { key: 'rate40Usd', label: '40\' Rate (USD)', type: 'number' },
        { key: 'effectiveDate', label: 'Effective Date', type: 'date' }
      ]
    }
  },
  {
    path: 'settings/logistics-cities',
    component: SimpleLookup,
    canActivate: [authGuard],
    data: {
      title: 'Logistics — Cities',
      resource: 'logistics-cities',
      fields: [{ key: 'name', label: 'Name', type: 'text' }]
    }
  },
  {
    path: 'settings/drivers',
    component: SimpleLookup,
    canActivate: [authGuard],
    data: {
      title: 'Logistics — Drivers',
      resource: 'drivers',
      fields: [
        { key: 'name', label: 'Name', type: 'text' },
        { key: 'phone', label: 'Phone', type: 'text' }
      ]
    }
  },
  {
    path: 'settings/trucks',
    component: SimpleLookup,
    canActivate: [authGuard],
    data: {
      title: 'Logistics — Trucks',
      resource: 'trucks',
      fields: [
        { key: 'plateNo', label: 'Plate No.', type: 'text' },
        { key: 'driverId', label: 'Assigned Driver', type: 'select', optionsResource: 'drivers' }
      ]
    }
  },
  {
    path: 'settings/warehouses',
    component: SimpleLookup,
    canActivate: [authGuard],
    data: {
      title: 'Logistics — Warehouses',
      resource: 'warehouses',
      fields: [
        { key: 'name', label: 'Name', type: 'text' },
        { key: 'cityId', label: 'City', type: 'select', optionsResource: 'logistics-cities' },
        { key: 'contactName', label: 'Default Contact Name', type: 'text' },
        { key: 'contactPhone', label: 'Default Contact Phone', type: 'text' }
      ]
    }
  },

  { path: 'orders', component: OrderList, canActivate: [authGuard] },
  { path: 'orders/new', component: NewSupplierOrder, canActivate: [authGuard] },
  { path: 'orders/:id', component: OrderDetails, canActivate: [authGuard] },
  { path: 'shipments', component: ShipmentList, canActivate: [authGuard] },
  { path: 'shipments/new', component: NewShipment, canActivate: [authGuard] },
  { path: 'shipments/:id/update', component: UpdateShipment, canActivate: [authGuard] },
  { path: 'shipments/:id', component: ShipmentDetails, canActivate: [authGuard] },
];
