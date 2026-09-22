import { ChangeDetectionStrategy, Component, input } from '@angular/core'
import { Icon, IconName } from './icon'

@Component({
    selector: 'app-empty-state',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [Icon],
    template: `
        <div class="flex flex-col items-center justify-center px-6 py-14 text-center">
            <span
                class="mb-4 flex size-14 items-center justify-center rounded-full bg-surface-alt text-2xl text-ink-muted"
            >
                <app-icon [name]="icon()" />
            </span>
            <p class="text-sm font-medium text-ink">{{ title() }}</p>
            @if (description()) {
                <p class="mt-1.5 max-w-xs text-sm text-ink-muted">{{ description() }}</p>
            }
            <ng-content />
        </div>
    `,
})
export class EmptyState {
    readonly icon = input<IconName>('chat')
    readonly title = input.required<string>()
    readonly description = input('')
}