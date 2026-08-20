import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { UserActivityRow, UserActivityService } from './user-activity.service';

@Component({
  selector: 'app-user-activity',
  imports: [CommonModule, RouterLink],
  templateUrl: './user-activity.html'
})
export class UserActivity implements OnInit {
  private cdr = inject(ChangeDetectorRef);

  rows: UserActivityRow[] = [];
  loading = true;
  error = '';

  constructor(private service: UserActivityService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.error = '';
    this.service.getActivity().subscribe({
      next: (r) => { this.loading = false; this.rows = r; this.cdr.markForCheck(); },
      error: () => { this.loading = false; this.error = 'Failed to load activity data.'; this.cdr.markForCheck(); }
    });
  }

  liveCount(): number {
    return this.rows.filter(r => r.isLiveNow).length;
  }

  formatLastSeen(value: string | null): string {
    if (!value) return 'Never';
    const date = new Date(value + 'Z'); // backend sends UTC without offset marker
    return date.toLocaleString();
  }
}
