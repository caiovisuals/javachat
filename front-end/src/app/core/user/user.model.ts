export interface User {
    id: string
    username: string
    displayName: string
    avatarUrl: string | null
    lastSeenAt: string | null
}

export function initials(user: Pick<User, 'displayName' | 'username'>): string {
    const source = user.displayName.trim() || user.username
    const parts = source.split(/\s+/).filter(Boolean)

    if (parts.length === 0) {
        return '?'
    }
    if (parts.length === 1) {
        return parts[0].slice(0, 2).toUpperCase()
    }
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}