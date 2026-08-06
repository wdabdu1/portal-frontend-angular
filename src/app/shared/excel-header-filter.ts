import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, HostListener, Input, OnChanges, Output } from '@angular/core';

// Click the small arrow next to a column header to open a checklist of
// every distinct value in that column — check/uncheck to filter, same
// pattern as Excel's AutoFilter. An empty `selected` set means "no filter,
// show everything" (not "show nothing").
@Component({
  selector: 'app-excel-header-filter',
  imports: [CommonModule],
  template: `
    <span style="position:relative; display:inline-flex; align-items:center;">
      <span (click)="onToggleClick($event)" style="cursor:pointer; font-size:9px; margin-left:4px;" [style.color]="isActive ? '#0a3d62' : '#bbb'">▼</span>
      <div *ngIf="open" (click)="$event.stopPropagation()" style="position:absolute; top:18px; left:0; z-index:50; background:white; border:1px solid #ccc; border-radius:4px; box-shadow:0 2px 10px rgba(0,0,0,0.18); padding:8px; min-width:170px; max-height:260px; overflow-y:auto; font-weight:normal;">
        <div style="font-size:12px; margin-bottom:6px; white-space:nowrap;">
          <a (click)="selectAll()" style="color:#0a3d62; cursor:pointer; margin-right:10px;">Select All</a>
          <a (click)="clearAll()" style="color:#0a3d62; cursor:pointer;">Clear</a>
        </div>
        <div *ngFor="let opt of options" style="font-size:13px; padding:2px 0; white-space:nowrap;">
          <label style="display:flex; align-items:center; gap:6px; cursor:pointer; font-weight:normal;">
            <input type="checkbox" [checked]="draft.has(opt)" (change)="toggleOption(opt)" />
            {{ opt || '(blank)' }}
          </label>
        </div>
        <p *ngIf="options.length === 0" style="font-size:12px; color:#888; margin:4px 0;">No values</p>
        <button (click)="apply()" style="margin-top:8px; width:100%; padding:4px; background:#0a3d62; color:white; border:none; border-radius:4px; cursor:pointer; font-size:12px;">Apply</button>
      </div>
    </span>
  `
})
export class ExcelHeaderFilter implements OnChanges {
  @Input() options: string[] = [];
  @Input() selected: Set<string> = new Set();
  @Output() selectedChange = new EventEmitter<Set<string>>();

  open = false;
  draft: Set<string> = new Set();

  constructor(private elRef: ElementRef) {}

  // "Active" only if it's a genuine partial filter — a full selection
  // (e.g. from clicking "Select All" as a reset) behaves identically to
  // no filter at all, so it shouldn't look active either.
  get isActive(): boolean {
    return this.selected.size > 0 && this.selected.size < this.options.length;
  }

  ngOnChanges(): void {
    // Only sync draft from the confirmed selection while the popover is
    // closed — while open, the user's in-progress checkbox clicks must
    // never be overwritten by an unrelated re-render elsewhere on the page.
    if (!this.open) this.draft = new Set(this.selected);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.open && !this.elRef.nativeElement.contains(event.target)) {
      this.open = false;
    }
  }

  onToggleClick(event: MouseEvent): void {
    event.stopPropagation();
    this.open = !this.open;
    if (this.open) this.draft = new Set(this.selected);
  }

  toggleOption(opt: string): void {
    if (this.draft.has(opt)) this.draft.delete(opt);
    else this.draft.add(opt);
  }

  selectAll(): void {
    this.draft = new Set(this.options);
  }

  clearAll(): void {
    this.draft = new Set();
  }

  apply(): void {
    this.selectedChange.emit(new Set(this.draft));
    this.open = false;
  }
}
