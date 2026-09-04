import { Routes } from '@angular/router';
import { authGuard } from './auth/auth.guard';
import { cPricingLockGuard } from './auth/c-pricing-lock.guard';
import { CPricingList } from './c-pricing/c-pricing-list/c-pricing-list';
import { CPricingHistory } from './c-pricing/c-pricing-history/c-pricing-history';
import { CPricingSettings } from './c-pricing/c-pricing-settings/c-pricing-settings';
import { Login } from './auth/login/login';
import { ShippingLines } from './settings/shipping-lines/shipping-lines';
import { ShipmentDetails } from './shipments/shipment-details/shipment-details';
import { Users } from './users/users';
import { DataMigration } from './data-migration/data-migration';
import { UserActivity } from './user-activity/user-activity';
import { Profile } from './profile/profile';
import { OrderDetails } from './purchase-orders/order-details/order-details';
import { SpcStorageTiers } from './settings/spc-storage-tiers/spc-storage-tiers';
import { EstimateLineItems } from './clearance/estimate-line-items/estimate-line-items';
import { BankDuesList } from './bank-dues/bank-dues-list/bank-dues-list';
import { DirectSalesList } from './direct-sales/direct-sales-list/direct-sales-list';
import { PayBankDues } from './pay-bank-dues/pay-bank-dues';
import { SupplierDuesList } from './supplier-dues/supplier-dues-list/supplier-dues-list';
import { BusinessUnits } from './settings/business-units/business-units';
import { SettingsMenu } from './settings/settings-menu/settings-menu';
import { SimpleLookup } from './settings/simple-lookup/simple-lookup';
import { ReceiverBanks } from './settings/receiver-banks/receiver-banks';
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
import { OffshoreMarkupDefaults } from './settings/offshore-markup-defaults/offshore-markup-defaults';
import { Home } from './home/home';
import { FzInventoryList } from './fz-inventory/fz-inventory-list/fz-inventory-list';
import { WithdrawalDetailComponent } from './withdrawal/withdrawal-detail/withdrawal-detail';
import { LogisticsList } from './logistics/logistics-list/logistics-list';
import { TruckLoadList } from './logistics/truck-load-list/truck-load-list';
import { TruckLoadDetailComponent } from './logistics/truck-load-detail/truck-load-detail';
import { TruckAvailability } from './logistics/truck-availability/truck-availability';
import { TruckAllocations } from './logistics/truck-allocations/truck-allocations';
import { TransferPricingDetailComponent } from './transfer-pricing/transfer-pricing-detail/transfer-pricing-detail';
import { TransferPricingList } from './transfer-pricing/transfer-pricing-list/transfer-pricing-list';
import { TransferPricingAccumulated } from './transfer-pricing/transfer-pricing-accumulated/transfer-pricing-accumulated';
import { ClearanceReadiness } from './dashboards/clearance-readiness/clearance-readiness';
import { PipelineHealthMobile } from './dashboards/pipeline-health-mobile/pipeline-health-mobile';
import { CashflowDashboard } from './dashboards/cashflow-dashboard/cashflow-dashboard';
import { PoDashboard } from './dashboards/po-dashboard/po-dashboard';
import { FzDashboard } from './dashboards/fz-dashboard/fz-dashboard';
import { ShipmentDashboard } from './dashboards/shipment-dashboard/shipment-dashboard';
import { UnderClearanceDashboard } from './dashboards/under-clearance-dashboard/under-clearance-dashboard';
import { GoodsInTransitDashboard } from './dashboards/goods-in-transit-dashboard/goods-in-transit-dashboard';
import { DepartmentPerformance } from './dashboards/department-performance/department-performance';
import { DemurrageAnalysis } from './dashboards/demurrage-analysis/demurrage-analysis';
import { SupplierDelay } from './dashboards/supplier-delay/supplier-delay';
import { ProcessPerformance } from './dashboards/process-performance/process-performance';


export const routes: Routes = [
  { path: '', component: Home, canActivate: [authGuard, cPricingLockGuard], pathMatch: 'full' },
  { path: 'login', component: Login },

  {
    path: 'settings/tariff-groups',
    component: SimpleLookup,
    canActivate: [authGuard, cPricingLockGuard],
    data: { title: 'Tariff Groups', resource: 'tariff-groups', fields: [{ key: 'name', label: 'Name', type: 'text' }] }
  },
  {
    path: 'settings/clearance-charge-types',
    component: SimpleLookup,
    canActivate: [authGuard, cPricingLockGuard],
    data: { title: 'Clearance Charge Types', resource: 'clearance-charge-types', fields: [{ key: 'name', label: 'Name', type: 'text' }] }
  },
  { path: 'settings', component: SettingsMenu, canActivate: [authGuard, cPricingLockGuard] },
  { path: 'profile', component: Profile, canActivate: [authGuard, cPricingLockGuard] },
  { path: 'settings/business-units', component: BusinessUnits, canActivate: [authGuard, cPricingLockGuard] },
  { path: 'settings/divisions', component: Divisions, canActivate: [authGuard, cPricingLockGuard] },
  { path: 'settings/fx-rates', component: FxRates, canActivate: [authGuard, cPricingLockGuard] },
  { path: 'clearance', component: ClearanceList, canActivate: [authGuard, cPricingLockGuard] },
  { path: 'bank-dues', component: BankDuesList, canActivate: [authGuard, cPricingLockGuard] },
  { path: 'direct-sales', component: DirectSalesList, canActivate: [authGuard, cPricingLockGuard] },
  // 'price-history' route removed — superseded by 'c-pricing/history' below;
  // its backend endpoint moved from api/price-history to api/c-pricing/history.
  { path: 'pay-bank-dues', component: PayBankDues, canActivate: [authGuard, cPricingLockGuard] },
  { path: 'clearance/:id/estimate-items', component: EstimateLineItems, canActivate: [authGuard, cPricingLockGuard] },
  { path: 'clearance/:id', component: ClearanceDetailComponent, canActivate: [authGuard, cPricingLockGuard] },
  { path: 'settings/clearance-sla', component: ClearanceSla, canActivate: [authGuard, cPricingLockGuard] },
  { path: 'settings/offshore-markup-defaults', component: OffshoreMarkupDefaults, canActivate: [authGuard, cPricingLockGuard] },
  { path: 'supplier-dues', component: SupplierDuesList, canActivate: [authGuard, cPricingLockGuard] },
  { path: 'users', component: Users, canActivate: [authGuard, cPricingLockGuard] },
  { path: 'data-migration', component: DataMigration, canActivate: [authGuard, cPricingLockGuard] },
  { path: 'user-activity', component: UserActivity, canActivate: [authGuard, cPricingLockGuard] },
  { path: 'fz-inventory', component: FzInventoryList, canActivate: [authGuard, cPricingLockGuard] },
  { path: 'withdrawals/:id', component: WithdrawalDetailComponent, canActivate: [authGuard, cPricingLockGuard] },
  { path: 'logistics', component: LogisticsList, canActivate: [authGuard, cPricingLockGuard] },
  { path: 'logistics/truck-loads', component: TruckLoadList, canActivate: [authGuard, cPricingLockGuard] },
  { path: 'logistics/truck-loads/:id', component: TruckLoadDetailComponent, canActivate: [authGuard, cPricingLockGuard] },
  { path: 'logistics/truck-availability', component: TruckAvailability, canActivate: [authGuard, cPricingLockGuard] },
  { path: 'logistics/truck-allocations', component: TruckAllocations, canActivate: [authGuard, cPricingLockGuard] },
  { path: 'transfer-pricing', component: TransferPricingList, canActivate: [authGuard, cPricingLockGuard] },
  { path: 'transfer-pricing/accumulated', component: TransferPricingAccumulated, canActivate: [authGuard, cPricingLockGuard] },
  { path: 'transfer-pricing/:shipmentId', component: TransferPricingDetailComponent, canActivate: [authGuard, cPricingLockGuard] },
  { path: 'clearance', component: ClearanceList, canActivate: [authGuard, cPricingLockGuard] },
  { path: 'dashboards/clearance-readiness', component: ClearanceReadiness, canActivate: [authGuard, cPricingLockGuard] },
  { path: 'mobile/pipeline-health', component: PipelineHealthMobile, canActivate: [authGuard, cPricingLockGuard] },
  { path: 'dashboards/cashflow', component: CashflowDashboard, canActivate: [authGuard, cPricingLockGuard] },
  { path: 'dashboards/purchase-orders', component: PoDashboard, canActivate: [authGuard, cPricingLockGuard] },
  { path: 'dashboards/fz', component: FzDashboard, canActivate: [authGuard, cPricingLockGuard] },
  { path: 'dashboards/shipments', component: ShipmentDashboard, canActivate: [authGuard, cPricingLockGuard] },
  { path: 'dashboards/under-clearance', component: UnderClearanceDashboard, canActivate: [authGuard, cPricingLockGuard] },
  { path: 'dashboards/goods-in-transit', component: GoodsInTransitDashboard, canActivate: [authGuard, cPricingLockGuard] },
  { path: 'dashboards/department-performance', component: DepartmentPerformance, canActivate: [authGuard, cPricingLockGuard] },
  { path: 'dashboards/demurrage-analysis', component: DemurrageAnalysis, canActivate: [authGuard, cPricingLockGuard] },
  { path: 'dashboards/supplier-delay', component: SupplierDelay, canActivate: [authGuard, cPricingLockGuard] },
  { path: 'dashboards/process-performance', component: ProcessPerformance, canActivate: [authGuard, cPricingLockGuard] },

  {
    path: 'settings/business-partners',
    component: SimpleLookup,
    canActivate: [authGuard, cPricingLockGuard],
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
    canActivate: [authGuard, cPricingLockGuard],
    data: { title: 'Approval Types', resource: 'approval-types', fields: [{ key: 'name', label: 'Name', type: 'text' }] }
  },
  {
    path: 'settings/payment-terms',
    component: SimpleLookup,
    canActivate: [authGuard, cPricingLockGuard],
    data: { title: 'Payment Terms', resource: 'payment-terms', fields: [{ key: 'name', label: 'Name', type: 'text' }] }
  },
  {
    path: 'settings/incoterms',
    component: SimpleLookup,
    canActivate: [authGuard, cPricingLockGuard],
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
    canActivate: [authGuard, cPricingLockGuard],
    data: { title: 'Origin Countries', resource: 'origin-countries', fields: [{ key: 'name', label: 'Name', type: 'text' }] }
  },
  {
    path: 'settings/units-of-measure',
    component: SimpleLookup,
    canActivate: [authGuard, cPricingLockGuard],
    data: { title: 'Units of Measure', resource: 'units-of-measure', fields: [{ key: 'code', label: 'Code', type: 'text' }] }
  },
  {
    path: 'settings/shipment-modes',
    component: SimpleLookup,
    canActivate: [authGuard, cPricingLockGuard],
    data: { title: 'Shipment Modes', resource: 'shipment-modes', fields: [{ key: 'name', label: 'Name', type: 'text' }] }
  },
  {
    path: 'settings/product-categories',
    component: SimpleLookup,
    canActivate: [authGuard, cPricingLockGuard],
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
    canActivate: [authGuard, cPricingLockGuard],
    data: { title: 'Product Types', resource: 'product-types', fields: [{ key: 'name', label: 'Name', type: 'text' }] }
  },
  {
    path: 'settings/model-products',
    component: SimpleLookup,
    canActivate: [authGuard, cPricingLockGuard],
    data: { title: 'Model/Product', resource: 'model-products', fields: [{ key: 'name', label: 'Name', type: 'text' }] }
  },
  {
    path: 'settings/currencies',
    component: SimpleLookup,
    canActivate: [authGuard, cPricingLockGuard],
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
    canActivate: [authGuard, cPricingLockGuard]
  },
  {
    path: 'settings/couriers',
    component: SimpleLookup,
    canActivate: [authGuard, cPricingLockGuard],
    data: { title: 'Couriers', resource: 'couriers', fields: [{ key: 'name', label: 'Name', type: 'text' }] }
  },
  {
    path: 'settings/forwarders',
    component: SimpleLookup,
    canActivate: [authGuard, cPricingLockGuard],
    data: { title: 'Forwarders', resource: 'forwarders', fields: [{ key: 'name', label: 'Name', type: 'text' }] }
  },
  {
    path: 'settings/shipment-destinations',
    component: SimpleLookup,
    canActivate: [authGuard, cPricingLockGuard],
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
    canActivate: [authGuard, cPricingLockGuard],
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
    canActivate: [authGuard, cPricingLockGuard],
    data: { title: 'Tenors', resource: 'tenors', fields: [{ key: 'days', label: 'No of Days', type: 'number' }] }
  },
  {
    path: 'settings/sender-banks',
    component: SimpleLookup,
    canActivate: [authGuard, cPricingLockGuard],
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
  
  { path: 'settings/receiver-banks', component: ReceiverBanks, canActivate: [authGuard, cPricingLockGuard] },
  {
    path: 'settings/spc-storage-tiers',
    component: SpcStorageTiers,
    canActivate: [authGuard, cPricingLockGuard]
  },
  {
    path: 'settings/acd-cost-settings',
    component: SimpleLookup,
    canActivate: [authGuard, cPricingLockGuard],
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
    canActivate: [authGuard, cPricingLockGuard],
    data: {
      title: 'Logistics — Cities',
      resource: 'logistics-cities',
      fields: [{ key: 'name', label: 'Name', type: 'text' }]
    }
  },
  {
    path: 'settings/drivers',
    component: SimpleLookup,
    canActivate: [authGuard, cPricingLockGuard],
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
    canActivate: [authGuard, cPricingLockGuard],
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
    canActivate: [authGuard, cPricingLockGuard],
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

  { path: 'orders', component: OrderList, canActivate: [authGuard, cPricingLockGuard] },
  { path: 'orders/new', component: NewSupplierOrder, canActivate: [authGuard, cPricingLockGuard] },
  { path: 'orders/:id', component: OrderDetails, canActivate: [authGuard, cPricingLockGuard] },
  { path: 'shipments', component: ShipmentList, canActivate: [authGuard, cPricingLockGuard] },
  { path: 'shipments/new', component: NewShipment, canActivate: [authGuard, cPricingLockGuard] },
  { path: 'shipments/:id/update', component: UpdateShipment, canActivate: [authGuard, cPricingLockGuard] },
  { path: 'shipments/:id', component: ShipmentDetails, canActivate: [authGuard, cPricingLockGuard] },

  // C Pricing — these three are deliberately NOT given cPricingLockGuard
  // (every other route below is): that guard redirects a CPricing-only
  // user straight back to /c-pricing, so applying it here too would loop.
  { path: 'c-pricing', component: CPricingList, canActivate: [authGuard] },
  { path: 'c-pricing/history', component: CPricingHistory, canActivate: [authGuard] },
  { path: 'c-pricing/settings', component: CPricingSettings, canActivate: [authGuard] },
];
