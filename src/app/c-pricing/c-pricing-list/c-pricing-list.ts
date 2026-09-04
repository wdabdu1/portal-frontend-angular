import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ExcelHeaderFilter } from '../../shared/excel-header-filter';
import { applyFilters, columnOptions } from '../../shared/table-filter.util';
import { TablePreferencesService } from '../../table-preferences/table-preferences.service';
import { LookupEntity, SettingsLookupService } from '../../settings/settings-lookup.service';
import { CPricingCategory, CPricingItemRow, CPricingService, CPricingType, SaveCPricingItemRequest } from '../c-pricing.service';

interface RowEdit {
  cPricingCategoryId: number | null;
  cPricingTypeId: number | null;
  hsCode: string;
  description: string;
  currencyId: number | null;
  cp: number | null;
}

// Columns a daily user can sort by and drag to reorder — Status and the
// Save action stay fixed at the end of the row (see the template) since
// they aren't "data" in the same sense and reordering them would be
// confusing rather than useful.
type SortColumn = keyof CPricingItemRow;

interface ColumnDef {
  key: SortColumn;
  label: string;
  // Only genuinely categorical columns get an Excel-style checklist filter
  // — free-text/numeric columns (HS Code, Description, CP, PO Unit Price)
  // are sortable but not filterable, same convention as the other tables.
  filterable?: boolean;
}

const DEFAULT_COLUMNS: ColumnDef[] = [
  { key: 'businessUnit', label: 'BU', filterable: true },
  { key: 'blAwbNo', label: 'BL' },
  { key: 'category', label: 'Cat', filterable: true },
  { key: 'modelProduct', label: 'Model/Product' },
  { key: 'eta', label: 'ETA' },
  { key: 'cPricingCategoryName', label: 'C_Cat', filterable: true },
  { key: 'cPricingTypeName', label: 'C_Type', filterable: true },
  { key: 'hsCode', label: 'HS Code' },
  { key: 'description', label: 'Description' },
  { key: 'currencyCode', label: 'Currency', filterable: true },
  { key: 'cp', label: 'CP' },
  { key: 'poUnitPriceUsd', label: 'PO Unit Price (USD)' }
];

@Component({
  selector: 'app-c-pricing-list',
  imports: [CommonModule, FormsModule, RouterLink, ExcelHeaderFilter],
  templateUrl: './c-pricing-list.html'
})
export class CPricingList implements OnInit {
  private cdr = inject(ChangeDetectorRef);

  allItems: CPricingItemRow[] = [];
  categories: CPricingCategory[] = [];
  types: CPricingType[] = [];
  currencies: LookupEntity[] = [];

  loading = true;
  error = '';

  // Defaults to Pending so the C Pricing user lands on their actual work
  // queue — a completed item disappears here and reappears under Confirmed.
  statusFilter: 'Pending' | 'Confirmed' | 'All' = 'Pending';
  searchText = '';

  // Default: soonest-arriving items first, so the daily user works down
  // the list in the order shipments actually land.
  sortColumn: SortColumn = 'eta';
  sortAsc = true;

  columns: ColumnDef[] = [...DEFAULT_COLUMNS];
  private dragFromIndex: number | null = null;

  filters: Record<string, Set<string>> = {};

  edits: Record<number, RowEdit> = {};
  savingId: number | null = null;
  savedId: number | null = null;
  rowError: Record<number, string> = {};

  constructor(private service: CPricingService, private lookups: SettingsLookupService, private tablePrefs: TablePreferencesService) {}

  ngOnInit(): void {
    this.tablePrefs.get('cPricingList').subscribe({
      next: (pref) => {
        if (pref) {
          this.sortColumn = pref.sortColumn as SortColumn;
          this.sortAsc = pref.sortAsc;
        }
        this.load();
      },
      error: () => this.load()
    });

    this.tablePrefs.getColumnOrder('cPricingList').subscribe({
      next: (order) => { if (order && order.length > 0) this.applyColumnOrder(order); }
    });

    this.service.getCategories().subscribe({ next: (r) => { this.categories = r; this.cdr.markForCheck(); } });
    this.service.getTypes().subscribe({ next: (r) => { this.types = r; this.cdr.markForCheck(); } });
    this.lookups.getAll<LookupEntity>('currencies').subscribe({ next: (r) => { this.currencies = r; this.cdr.markForCheck(); } });
  }

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
    this.tablePrefs.saveColumnOrder('cPricingList', cols.map((c) => c.key)).subscribe();
  }

  load(): void {
    this.loading = true;
    this.service.getItems().subscribe({
      next: (r) => {
        this.allItems = r;
        this.edits = {};
        for (const item of r) {
          this.edits[item.shipmentLineItemId] = {
            cPricingCategoryId: item.cPricingCategoryId,
            cPricingTypeId: item.cPricingTypeId,
            hsCode: item.hsCode ?? '',
            description: item.description ?? '',
            currencyId: item.currencyId,
            cp: item.cp
          };
        }
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => { this.error = 'Could not load C Pricing items.'; this.loading = false; this.cdr.markForCheck(); }
    });
  }

  typesFor(categoryId: number | null): CPricingType[] {
    if (!categoryId) return [];
    return this.types.filter((t) => t.cPricingCategoryId === categoryId);
  }

  onCategoryChange(row: CPricingItemRow): void {
    const edit = this.edits[row.shipmentLineItemId];
    const stillValid = this.typesFor(edit.cPricingCategoryId).some((t) => t.id === edit.cPricingTypeId);
    if (!stillValid) edit.cPricingTypeId = null;
  }

  private ensureFilterKey(key: string): void {
    if (!this.filters[key]) this.filters[key] = new Set();
  }

  getValue(row: CPricingItemRow, col: string): string {
    return String((row as any)[col] ?? '');
  }

  optionsFor(col: string): string[] {
    this.ensureFilterKey(col);
    return columnOptions(this.allItems, this.filters, col, (r, c) => this.getValue(r, c));
  }

  onFilterChange(col: string, values: Set<string>): void {
    this.filters[col] = values;
    this.cdr.markForCheck();
  }

  isColumnFiltered(col: string): boolean {
    const selected = this.filters[col];
    if (!selected || selected.size === 0) return false;
    return selected.size < this.optionsFor(col).length;
  }

  get items(): CPricingItemRow[] {
    let filtered = this.allItems;
    if (this.statusFilter === 'Pending') filtered = filtered.filter((i) => !i.isConfirmed);
    if (this.statusFilter === 'Confirmed') filtered = filtered.filter((i) => i.isConfirmed);

    const q = this.searchText.trim().toLowerCase();
    if (q) {
      filtered = filtered.filter((i) => i.blAwbNo.toLowerCase().includes(q) || i.modelProduct.toLowerCase().includes(q));
    }

    filtered = applyFilters(filtered, this.filters, (r, col) => this.getValue(r, col));

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
    this.tablePrefs.save('cPricingList', this.sortColumn, this.sortAsc).subscribe();
  }

  save(row: CPricingItemRow): void {
    const edit = this.edits[row.shipmentLineItemId];
    this.rowError[row.shipmentLineItemId] = '';

    if (edit.cp !== null && edit.cp !== undefined && !edit.currencyId) {
      this.rowError[row.shipmentLineItemId] = 'Select a Currency before saving.';
      this.cdr.markForCheck();
      return;
    }

    this.savingId = row.shipmentLineItemId;
    this.savedId = null;
    const req: SaveCPricingItemRequest = {
      cPricingCategoryId: edit.cPricingCategoryId,
      cPricingTypeId: edit.cPricingTypeId,
      hsCode: edit.hsCode || null,
      description: edit.description || null,
      currencyId: edit.currencyId,
      cp: edit.cp
    };

    this.service.saveItem(row.shipmentLineItemId, req).subscribe({
      next: () => {
        this.savingId = null;
        this.savedId = row.shipmentLineItemId;
        this.load();
      },
      error: () => {
        this.savingId = null;
        this.rowError[row.shipmentLineItemId] = 'Could not save this item.';
        this.cdr.markForCheck();
      }
    });
  }
}
