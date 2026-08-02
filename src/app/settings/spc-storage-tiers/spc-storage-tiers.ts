import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../auth/auth.service';
import { ThousandsInputDirective } from '../../shared/thousands-input.directive';
import { API_URL } from '../../api-config';

interface SpcStorageTier {
  id: number;
  tierOrder: number;
  label: string;
  durationDays: number | null;
  rate20: number;
  rate40: number;
}

@Component({
  selector: 'app-spc-storage-tiers',
  imports: [CommonModule, FormsModule, RouterLink, ThousandsInputDirective],
  templateUrl: './spc-storage-tiers.html'
})
export class SpcStorageTiers implements OnInit {
  private cdr = inject(ChangeDetectorRef);

  tiers: SpcStorageTier[] = [];
  loading = true;
  error = '';
  savingId: number | null = null;
  savedId: number | null = null;

  constructor(private http: HttpClient, public auth: AuthService) {}

  get canEdit(): boolean {
    return this.auth.hasRole('Manager') || this.auth.hasRole('SuperUser');
  }

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.http.get<SpcStorageTier[]>(`${API_URL}/settings/spc-storage-tiers`).subscribe({
      next: (r) => { this.tiers = r; this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.error = 'Could not load SPC Storage Tiers.'; this.loading = false; this.cdr.markForCheck(); }
    });
  }

  save(tier: SpcStorageTier): void {
    this.savingId = tier.id;
    this.savedId = null;
    this.http.put(`${API_URL}/settings/spc-storage-tiers/${tier.id}`, {
      durationDays: tier.durationDays, rate20: tier.rate20, rate40: tier.rate40
    }).subscribe({
      next: () => { this.savingId = null; this.savedId = tier.id; this.cdr.markForCheck(); },
      error: () => { this.savingId = null; this.error = 'Could not save this tier.'; this.cdr.markForCheck(); }
    });
  }
}
