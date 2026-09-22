import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core'

import { User, initials } from '../../core/user/user.model'

type AvatarSize = 'sm' | 'md' | 'lg'

const SIZES: Record<AvatarSize, string> = {
    sm: 'size-9 text-xs',
    md: 'size-11 text-sm',
    lg: 'size-16 text-lg',
}

/** Matiz derivada do id: a mesma pessoa mantém a mesma cor em qualquer tela */
function hue(seed: string): number {
    let value = 0
    for (const char of seed) {
        value = (value * 31 + char.charCodeAt(0)) % 360
    }
    return value
}

@Component({
    selector: 'app-avatar',
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <span class="relative inline-flex shrink-0">
            @if (user().avatarUrl) {
                <img
                    [src]="user().avatarUrl"
                    [alt]="user().displayName"
                    [class]="'rounded-full object-cover ' + box()"
                />
            } @else {
                <span
                    [class]="'flex items-center justify-center rounded-full font-semibold ' + box()"
                    [style.background-color]="background()"
                    [style.color]="foreground()"
                    aria-hidden="true"
                >
                    {{ label() }}
                </span>
            }
            @if (showPresence()) {
                <span
                    class="absolute -right-0.5 -bottom-0.5 size-3 rounded-full border-2 border-surface"
                    [class.bg-success]="online()"
                    [class.bg-ink-muted]="!online()"
                    [attr.title]="online() ? 'Online' : 'Offline'"
                ></span>
            }
        </span>
    `,
})
export class Avatar {
    readonly user = input.required<User>()
    readonly size = input<AvatarSize>('md')
    readonly online = input(false)
    readonly showPresence = input(false)

    protected readonly box = computed(() => SIZES[this.size()])
    protected readonly label = computed(() => initials(this.user()))
    protected readonly background = computed(() => `oklch(90% 0.06 ${hue(this.user().id)})`)
    protected readonly foreground = computed(() => `oklch(35% 0.12 ${hue(this.user().id)})`)
}