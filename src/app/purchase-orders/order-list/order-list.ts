import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../auth/auth.service';
import { TablePreferencesService } from '../../table-preferences/table-preferences.service';
import { PurchaseOrderSummary, PurchaseOrdersService } from '../purchase-orders.service';

type SortColumn = keyof PurchaseOrderSummary;

interface ColumnDef {
  key: SortColumn;
  label: string;
}

const DEFAULT_COLUMNS: ColumnDef[] = [
  { key: 'businessUnit', label: 'Business Unit' },
  { key: 'poNumber', label: 'PO Number' },
  { key: 'supplier', label: 'Supplier' },
  { key: 'lineItemCount', label: 'Line Items' },
  { key: 'orderValueUsd', label: 'Order Value' },
  { key: 'percentShipped', label: '% Shipped' },
  { key: 'status', label: 'Status' },
  { key: 'createdAt', label: 'Created' }
];

@Component({
  selector: 'app-order-list',
  imports: [CommonModule, FormsModule],
  templateUrl: './order-list.html'
})
export class OrderList implements OnInit {
  private cdr = inject(ChangeDetectorRef);

  allOrders: PurchaseOrderSummary[] = [];
  loading = true;
  error = '';
  confirmingId: number | null = null;

  sortColumn: SortColumn = 'createdAt';
  sortAsc = false;

  filterBusinessUnit = '';
  filterStatus = '';

  columns: ColumnDef[] = [...DEFAULT_COLUMNS];
  private dragFromIndex: number | null = null;

  constructor(
    private ordersService: PurchaseOrdersService,
    public auth: AuthService,
    private router: Router,
    private tablePrefs: TablePreferencesService
  ) {}

  viewDetails(id: number): void {
    this.router.navigate(['/orders', id]);
  }

  ngOnInit(): void {
    this.tablePrefs.get('orders').subscribe({
      next: (pref) => {
        if (pref) {
          this.sortColumn = pref.sortColumn as SortColumn;
          this.sortAsc = pref.sortAsc;
        }
        this.load();
      },
      error: () => this.load()
    });

    this.tablePrefs.getColumnOrder('orders').subscribe({
      next: (order) => {
        if (order && order.length > 0) this.applyColumnOrder(order);
      }
    });
  }

  // Reorders `columns` to match the saved key order; any column not in the
  // saved list (e.g. a new one added later) is appended at the end; any
  // saved key no longer valid is silently dropped.
  private applyColumnOrder(savedOrder: string[]): void {
    const byKey = new Map(DEFAULT_COLUMNS.map((c) => [c.key, c]));
    const ordered: ColumnDef[] = [];
    for (const key of savedOrder) {
      const col = byKey.get(key as SortColumn);
      if (col) { ordered.push(col); byKey.delete(key as SortColumn); }
    }
    ordered.push(...byKey.values());
    this.columns = ordered;
    this.cdr.markForCheck();
  }

  onDragStart(index: number): void {
    this.dragFromIndex = index;
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  onDrop(index: number): void {
    if (this.dragFromIndex === null || this.dragFromIndex === index) return;
    const cols = [...this.columns];
    const [moved] = cols.splice(this.dragFromIndex, 1);
    cols.splice(index, 0, moved);
    this.columns = cols;
    this.dragFromIndex = null;
    this.tablePrefs.saveColumnOrder('orders', cols.map((c) => c.key)).subscribe();
  }

  load(): void {
    this.loading = true;
    this.ordersService.getAll().subscribe({
      next: (orders) => {
        this.allOrders = orders;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.error = 'Could not load purchase orders.';
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  get businessUnitOptions(): string[] {
    return [...new Set(this.allOrders.map((o) => o.businessUnit))].sort();
  }

  get statusOptions(): string[] {
    return [...new Set(this.allOrders.map((o) => o.status))].sort();
  }

  get orders(): PurchaseOrderSummary[] {
    let filtered = this.allOrders;
    if (this.filterBusinessUnit) filtered = filtered.filter((o) => o.businessUnit === this.filterBusinessUnit);
    if (this.filterStatus) filtered = filtered.filter((o) => o.status === this.filterStatus);

    const dir = this.sortAsc ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const av = a[this.sortColumn];
      const bv = b[this.sortColumn];
      if (av === null || av === undefined) return 1;
      if (bv === null || bv === undefined) return -1;
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
  }

  sortBy(column: SortColumn): void {
    if (this.sortColumn === column) {
      this.sortAsc = !this.sortAsc;
    } else {
      this.sortColumn = column;
      this.sortAsc = true;
    }
    this.tablePrefs.save('orders', this.sortColumn, this.sortAsc).subscribe();
  }

  confirm(id: number): void {
    this.confirmingId = id;
    this.ordersService.confirm(id).subscribe({
      next: () => {
        this.confirmingId = null;
        this.load();
      },
      error: () => {
        this.confirmingId = null;
        this.error = 'Could not confirm this order.';
        this.cdr.markForCheck();
      }
    });
  }
}
