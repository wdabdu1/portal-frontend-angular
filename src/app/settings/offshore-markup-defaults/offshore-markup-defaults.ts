import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { API_URL } from '../../api-config';
import { LookupEntity, SettingsLookupService } from '../settings-lookup.service';

interface OffshoreMarkupDefaultRow {
  businessPartnerId: number;
  businessPartnerName: string;
  defaultMarkupPercent: number;
  defaultCurrencyId: number;
  defaultCurrencyCode: string;
}

@Component({
  selector: 'app-offshore-markup-defaults',
  imports: [CommonModule, FormsModule],
  templateUrl: './offshore-markup-defaults.html'
})
export class OffshoreMarkupDefaults implements OnInit {
  private cdr = inject(ChangeDetectorRef);

  rows: OffshoreMarkupDefaultRow[] = [];
  currencies: LookupEntity[] = [];
  loading = true;
  error = '';
  savingId: number | null = null;
  savedId: number | null = null;

  constructor(private http: HttpClient, private lookups: SettingsLookupService) {}

  ngOnInit(): void {
    this.lookups.getAll<LookupEntity>('currencies').subscribe({
      next: (r) => { this.currencies = r; this.cdr.markForCheck(); }
    });
    this.load();
  }

  load(): void {
    this.loading = true;
    this.http.get<OffshoreMarkupDefaultRow[]>(`${API_URL}/settings/offshore-markup-defaults`).subscribe({
      next: (r) => { this.rows = r; this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.error = 'Could not load offshore markup defaults.'; this.loading = false; this.cdr.markForCheck(); }
    });
  }

  save(row: OffshoreMarkupDefaultRow): void {
    this.savingId = row.businessPartnerId;
    this.http.put(`${API_URL}/settings/offshore-markup-defaults`, {
      businessPartnerId: row.businessPartnerId,
      defaultMarkupPercent: row.defaultMarkupPercent,
      defaultCurrencyId: row.defaultCurrencyId
    }).subscribe({
      next: () => {
        this.savingId = null;
        this.savedId = row.businessPartnerId;
        setTimeout(() => { this.savedId = null; this.cdr.markForCheck(); }, 2000);
        this.cdr.markForCheck();
      },
      error: () => { this.savingId = null; this.error = 'Could not save.'; this.cdr.markForCheck(); }
    });
  }
}
