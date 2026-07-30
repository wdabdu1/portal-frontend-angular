import { Routes } from '@angular/router';
import { authGuard } from './auth/auth.guard';
import { Login } from './auth/login/login';
import { BusinessUnits } from './settings/business-units/business-units';
import { NewSupplierOrder } from './purchase-orders/new-supplier-order/new-supplier-order';
import { OrderList } from './purchase-orders/order-list/order-list';

export const routes: Routes = [
  { path: '', redirectTo: 'orders', pathMatch: 'full' },
  { path: 'login', component: Login },
  { path: 'settings/business-units', component: BusinessUnits, canActivate: [authGuard] },
  { path: 'orders', component: OrderList, canActivate: [authGuard] },
  { path: 'orders/new', component: NewSupplierOrder, canActivate: [authGuard] }
];
