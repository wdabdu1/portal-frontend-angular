import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { HomePageResponse, HomePageService } from './home.service';

@Component({
  selector: 'app-home',
  imports: [CommonModule],
  templateUrl: './home.html'
})
export class Home implements OnInit {
  private cdr = inject(ChangeDetectorRef);

  loading = true;
  data: HomePageResponse | null = null;
  today = new Date();

  constructor(private service: HomePageService, private router: Router) {}

  ngOnInit(): void {
    this.service.get().subscribe({
      next: (r) => { this.data = r; this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.loading = false; this.cdr.markForCheck(); }
    });
  }

  goToPipelineHealth(): void {
    this.router.navigate(['/dashboards/clearance-readiness']);
  }

  // Dates within the +/-2 day window are colored by how close they are
  // to today, so the eye is drawn to what needs attention first without
  // needing to read every row.
  dateColor(dateStr: string): string {
    const diffDays = Math.round((new Date(dateStr).getTime() - new Date().setHours(0, 0, 0, 0)) / 86400000);
    if (diffDays < 0) return '#c0392b';
    if (diffDays === 0) return '#a66a00';
    return '#1e7e34';
  }
}
