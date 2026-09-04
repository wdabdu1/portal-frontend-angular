import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
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

@Component({
  selector: 'app-c-pricing-list',
  imports: [CommonModule, FormsModule, RouterLink],
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
  buFilter = '';
  catFilter = '';
  searchText = '';

  edits: Record<number, RowEdit> = {};
  savingId: number | null = null;
  savedId: number | null = null;
  rowError: Record<number, string> = {};

  constructor(private service: CPricingService, private lookups: SettingsLookupService) {}

  ngOnInit(): void {
    this.load();
    this.service.getCategories().subscribe({ next: (r) => { this.categories = r; this.cdr.markForCheck(); } });
    this.service.getTypes().subscribe({ next: (r) => { this.types = r; this.cdr.markForCheck(); } });
    this.lookups.getAll<LookupEntity>('currencies').subscribe({ next: (r) => { this.currencies = r; this.cdr.markForCheck(); } });
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

  get businessUnits(): string[] {
    return [...new Set(this.allItems.map((i) => i.businessUnit))].sort();
  }

  get productCategories(): string[] {
    return [...new Set(this.allItems.map((i) => i.category))].sort();
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

  get items(): CPricingItemRow[] {
    let filtered = this.allItems;
    if (this.statusFilter === 'Pending') filtered = filtered.filter((i) => !i.isConfirmed);
    if (this.statusFilter === 'Confirmed') filtered = filtered.filter((i) => i.isConfirmed);
    if (this.buFilter) filtered = filtered.filter((i) => i.businessUnit === this.buFilter);
    if (this.catFilter) filtered = filtered.filter((i) => i.category === this.catFilter);

    const q = this.searchText.trim().toLowerCase();
    if (q) {
      filtered = filtered.filter((i) => i.blAwbNo.toLowerCase().includes(q) || i.modelProduct.toLowerCase().includes(q));
    }
    return filtered;
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
