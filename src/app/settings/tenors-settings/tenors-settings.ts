import { Component } from '@angular/core';
import { SimpleLookup } from '../simple-lookup/simple-lookup';
import { CbosTenorSetting } from '../cbos-tenor-setting/cbos-tenor-setting';

// Wraps the generic Tenors CRUD table with a second, bespoke section
// below it (CBOS Tenor) — kept as a separate wrapper component rather
// than extending SimpleLookup itself, since SimpleLookup is shared by
// every other lookup route and has no reason to know about CBOS Tenor.
// SimpleLookup reads the route's own `data` (title/resource/fields) via
// ActivatedRoute regardless of which component hosts it, so nesting it
// here works with no changes to SimpleLookup itself.
@Component({
  selector: 'app-tenors-settings',
  imports: [SimpleLookup, CbosTenorSetting],
  template: `
    <app-simple-lookup></app-simple-lookup>
    <app-cbos-tenor-setting></app-cbos-tenor-setting>
  `
})
export class TenorsSettingsPage {}
