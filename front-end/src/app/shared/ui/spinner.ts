import { ChangeDetectionStrategy, Component, input } from '@angular/core'

@Component({
    selector: 'app-spinner',
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <span
            class="inline-block animate-spin rounded-full border-2 border-current border-t-transparent"
            [class.size-4]="!large()"
            [class.size-8]="large()"
            [attr.aria-label]="label()"
            role="status"
        ></span>
    `,
})
export class Spinner {
    readonly large = input(false)
    readonly label = input('Carregando')
}