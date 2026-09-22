import { ChangeDetectionStrategy, Component } from '@angular/core'
import { RouterLink } from '@angular/router'

@Component({
    selector: 'app-not-found-page',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [RouterLink],
    template: `
        <main class="flex min-h-dvh flex-col items-center justify-center p-6 text-center">
            <p class="font-mono text-sm text-ink-muted">404</p>
            <h1 class="mt-2 text-3xl font-bold tracking-tight">Esta página não existe</h1>
            <p class="mt-3 max-w-sm text-sm text-ink-muted">
                O endereço pode ter mudado de lugar ou nunca ter existido.
            </p>
            <a
                routerLink="/"
                class="mt-8 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-brand-ink transition-colors hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
                Voltar ao início
            </a>
        </main>
    `,
})
export class NotFoundPage {}