import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { exportToExcel } from '../../shared/excel-export.util';
import { ExcelHeaderFilter } from '../../shared/excel-header-filter';
import { applyFilters, columnOptions } from '../../shared/table-filter.util';
import { TablePreferencesService } from '../../table-preferences/table-preferences.service';
import { MotCertificateRow, MotCertificatesDashboardService } from '../mot-certificates-dashboard.service';

interface ColumnDef { key: string; label: string; }

const DEFAULT_COLUMNS: ColumnDef[] = [
  { key: 'businessUnit', label: 'BU' },
  { key: 'category', label: 'Cat' },
  { key: 'blAwbNo', label: 'BL' },
  { key: 'piNo', label: 'PI No.' },
  { key: 'approvalDate', label: 'Approval Date' },
  { key: 'expiryDate', label: 'Expiry Date' },
  { key: 'daysRemaining', label: 'Days Remaining' }
];

@Component({
  selector: 'app-mot-certificates-dashboard',
  imports: [CommonModule, FormsModule, RouterLink, ExcelHeaderFilter],
  templateUrl: './mot-certificates-dashboard.html'
})
export class MotCertificatesDashboard implements OnInit {
  private cdr = inject(ChangeDetectorRef);

  loading = true;
  // Surfaced on a failed load instead of silently rendering an empty table
  // — see the Under Clearance Dashboard fix this mirrors.
  error: string | null = null;
  allRows: MotCertificateRow[] = [];
  columns: ColumnDef[] = [...DEFAULT_COLUMNS];
  filters: Record<string, Set<string>> = {};

  // Default sort: Expiry Date, closest first.
  sortColumn = 'expiryDate';
  sortAsc = true;

  // Defaults to hiding shipments whose clearance is already done — this
  // stays the active "needs chasing" queue; Completed ones are still one
  // click away via the toggle. Same "Open"/"Completed"/"All" shape as the
  // Under Clearance Dashboard's status filter.
  statusFilter = 'Open';

  // Free-text search across BL No. and PI No. together — separate from the
  // per-column Excel-style filters (those are exact-value multi-select;
  // this is a plain substring match spanning both fields at once).
  searchText = '';

  private dragIndex: number | null = null;

  constructor(private service: MotCertificatesDashboardService, private tablePrefs: TablePreferencesService) {}

  ngOnInit(): void {
    this.service.getAll().subscribe({
      next: (r) => {
        this.allRows = r;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.error = err?.status === 403
          ? 'You do not have permission to view the MOT Certificates dashboard.'
          : 'Could not load the MOT Certificates dashboard.';
        this.loading = false;
        this.cdr.markForCheck();
      }
    });

    this.tablePrefs.getColumnOrder('mot-certificates-dashboard').subscribe({
      next: (o) => { if (o && o.length > 0) this.columns = this.applyOrder(o); }
    });
  }

  private applyOrder(savedOrder: string[]): ColumnDef[] {
    const byKey = new Map(DEFAULT_COLUMNS.map((c) => [c.key, c]));
    const ordered: ColumnDef[] = [];
    for (const key of savedOrder) {
      const col = byKey.get(key);
      if (col) { ordered.push(col); byKey.delete(key); }
    }
    ordered.push(...byKey.values());
    return ordered;
  }

  getValue(row: any, col: string): string {
    return String(row[col] ?? '');
  }

  // Red: under 2 weeks remaining (including already expired). Green: more
  // than a month out. Yellow: everything in between. Mirrors the backend's
  // urgencyLevel exactly — kept here too since the column can be re-sorted
  // to any position and each row still needs its own color regardless.
  urgencyColors(level: string): { bg: string; color: string } {
    if (level === 'Red') return { bg: '#fde8e8', color: '#c0392b' };
    if (level === 'Yellow') return { bg: '#fff4e5', color: '#a66a00' };
    return { bg: '#e6f4ea', color: '#1e7e34' };
  }

  optionsFor(col: string): string[] {
    if (!this.filters[col]) this.filters[col] = new Set();
    return columnOptions(this.allRows, this.filters, col, (r, c) => this.getValue(r, c));
  }
  onFilterChange(col: string, values: Set<string>): void { this.filters[col] = values; this.cdr.markForCheck(); }
  isColumnFiltered(col: string): boolean {
    const selected = this.filters[col];
    if (!selected || selected.size === 0) return false;
    return selected.size < this.optionsFor(col).length;
  }

  get rows(): MotCertificateRow[] {
    let filtered = applyFilters(this.allRows, this.filters, (r, col) => this.getValue(r, col));
    if (this.statusFilter !== 'All') filtered = filtered.filter((r) => r.status === this.statusFilter);
    const search = this.searchText.trim().toLowerCase();
    if (search) {
      filtered = filtered.filter((r) =>
        r.blAwbNo.toLowerCase().includes(search) || r.piNo.toLowerCase().includes(search)
      );
    }
    const dir = this.sortAsc ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const av = (a as any)[this.sortColumn] ?? '';
      const bv = (b as any)[this.sortColumn] ?? '';
      return av < bv ? -1 * dir : av > bv ? 1 * dir : 0;
    });
  }

  sortBy(col: string): void {
    if (this.sortColumn === col) this.sortAsc = !this.sortAsc;
    else { this.sortColumn = col; this.sortAsc = true; }
  }

  onDragStart(i: number): void { this.dragIndex = i; }
  onDrop(i: number): void {
    if (this.dragIndex === null || this.dragIndex === i) return;
    const cols = [...this.columns];
    const [moved] = cols.splice(this.dragIndex, 1);
    cols.splice(i, 0, moved);
    this.columns = cols;
    this.dragIndex = null;
    this.tablePrefs.saveColumnOrder('mot-certificates-dashboard', cols.map((c) => c.key)).subscribe();
  }

  onExportClick(): void {
    exportToExcel('MOT Certificates', this.columns, this.rows);
  }
}
