import { provideHttpClient } from '@angular/common/http'
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { TestBed } from '@angular/core/testing'

import { AuthService } from '../auth/auth-service'
import { ChatService } from './chat-service'
import { Conversation, Message } from './chat.model'

const ME = {
    id: 'u1',
    username: 'caio',
    displayName: 'Caio',
    avatarUrl: null,
    lastSeenAt: null,
}

const OUTRO = {
    id: 'u2',
    username: 'eduardo',
    displayName: 'Eduardo',
    avatarUrl: null,
    lastSeenAt: null,
}

const CONVERSA: Conversation = {
    id: 'c1',
    type: 'DIRECT',
    title: null,
    participants: [ME, OUTRO],
    lastMessage: null,
    unreadCount: 3,
    updatedAt: '2026-09-21T20:00:00.000Z',
}

describe('ChatService', () => {
    let http: HttpTestingController
    let chat: ChatService

    const messages = (): Message[] => chat.history()['c1'] ?? []

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [provideHttpClient(), provideHttpClientTesting()],
        })

        http = TestBed.inject(HttpTestingController)
        chat = TestBed.inject(ChatService)

        const auth = TestBed.inject(AuthService)
        auth.login({ login: 'caio', password: 'segredo123' }).subscribe()
        http.expectOne((req) => req.url.endsWith('/api/auth/login')).flush({
            accessToken: 'token-1',
            expiresIn: 900,
            user: ME,
        })
    })

    afterEach(() => http.verify())

    it('ordena as conversas pela mais recente', () => {
        chat.loadConversations()
        http.expectOne((req) => req.url.endsWith('/api/conversations')).flush([
            { ...CONVERSA, id: 'antiga', updatedAt: '2026-09-01T10:00:00.000Z' },
            { ...CONVERSA, id: 'nova', updatedAt: '2026-09-21T10:00:00.000Z' },
        ])

        expect(chat.conversations().map((conversation) => conversation.id)).toEqual([
            'nova',
            'antiga',
        ])
        expect(chat.status()).toBe('ready')
    })

    it('mostra a mensagem antes da confirmação e não duplica quando o servidor responde', () => {
        chat.send('c1', 'oi')

        expect(messages()).toHaveLength(1)
        expect(messages()[0].delivery).toBe('sending')

        const request = http.expectOne((req) => req.url.endsWith('/api/conversations/c1/messages'))
        const { clientId } = request.request.body as { clientId: string }
        request.flush({
            id: 'm1',
            conversationId: 'c1',
            author: ME,
            content: 'oi',
            createdAt: '2026-09-21T20:01:00.000Z',
            clientId,
        })

        expect(messages()).toHaveLength(1)
        expect(messages()[0].id).toBe('m1')
        expect(messages()[0].delivery).toBe('sent')
    })

    it('marca a mensagem que não saiu e reenvia sob demanda', () => {
        chat.send('c1', 'oi')
        http.expectOne((req) => req.url.endsWith('/api/conversations/c1/messages')).error(
            new ProgressEvent('error'),
            { status: 500, statusText: 'erro' },
        )

        expect(messages()[0].delivery).toBe('failed')

        chat.resend(messages()[0])
        expect(messages()[0].delivery).toBe('sending')

        http.expectOne((req) => req.url.endsWith('/api/conversations/c1/messages')).flush({
            id: 'm1',
            conversationId: 'c1',
            author: ME,
            content: 'oi',
            createdAt: '2026-09-21T20:01:00.000Z',
            clientId: messages()[0].clientId,
        })

        expect(messages()).toHaveLength(1)
        expect(messages()[0].delivery).toBe('sent')
    })

    it('casa o eco pelo clientId, não por um id que já existe no histórico', () => {
        chat.open('c1')
        http.expectOne((req) => req.url.includes('/api/conversations/c1/messages')).flush({
            items: [
                {
                    id: 'm1',
                    conversationId: 'c1',
                    author: OUTRO,
                    content: 'mensagem do Eduardo',
                    createdAt: '2026-09-21T20:00:00.000Z',
                    clientId: null,
                },
            ],
            nextCursor: null,
        })
        http.expectOne((req) => req.url.endsWith('/api/conversations/c1/read')).flush(null)

        chat.send('c1', 'minha resposta')
        const request = http.expectOne((req) => req.url.endsWith('/api/conversations/c1/messages'))
        const { clientId } = request.request.body as { clientId: string }

        // Servidor devolve um id que já está na tela: quem manda é o clientId
        request.flush({
            id: 'm1',
            conversationId: 'c1',
            author: ME,
            content: 'minha resposta',
            createdAt: '2026-09-21T20:05:00.000Z',
            clientId,
        })

        expect(messages()).toHaveLength(2)
        expect(messages()[0].content).toBe('mensagem do Eduardo')
        expect(messages()[1].content).toBe('minha resposta')
    })

    it('não duplica quando o servidor devolve a mensagem sem o clientId', () => {
        chat.send('c1', 'oi')

        http.expectOne((req) => req.url.endsWith('/api/conversations/c1/messages')).flush({
            id: 'm1',
            conversationId: 'c1',
            author: ME,
            content: 'oi',
            createdAt: '2026-09-21T20:01:00.000Z',
            clientId: null,
        })

        expect(messages()).toHaveLength(1)
        expect(messages()[0].id).toBe('m1')
        expect(messages()[0].delivery).toBe('sent')
    })

    it('ignora mensagem em branco', () => {
        chat.send('c1', '   ')

        expect(messages()).toHaveLength(0)
        http.expectNone((req) => req.url.endsWith('/api/conversations/c1/messages'))
    })

    it('zera o não lido ao abrir a conversa', () => {
        chat.loadConversations()
        http.expectOne((req) => req.url.endsWith('/api/conversations')).flush([CONVERSA])
        expect(chat.unreadTotal()).toBe(3)

        chat.open('c1')
        http.expectOne((req) => req.url.includes('/api/conversations/c1/messages')).flush({
            items: [],
            nextCursor: null,
        })

        http.expectOne((req) => req.url.endsWith('/api/conversations/c1/read')).flush(null)
        expect(chat.unreadTotal()).toBe(0)
    })

    it('guarda o cursor para carregar mensagens anteriores', () => {
        chat.open('c1')
        http.expectOne((req) => req.url.includes('/api/conversations/c1/messages')).flush({
            items: [
                {
                    id: 'm2',
                    conversationId: 'c1',
                    author: OUTRO,
                    content: 'segunda',
                    createdAt: '2026-09-21T20:02:00.000Z',
                    clientId: null,
                },
            ],
            nextCursor: 'cursor-1',
        })
        http.expectOne((req) => req.url.endsWith('/api/conversations/c1/read')).flush(null)

        chat.loadOlder('c1')
        const older = http.expectOne((req) => req.urlWithParams.includes('before=cursor-1'))
        older.flush({
            items: [
                {
                    id: 'm1',
                    conversationId: 'c1',
                    author: ME,
                    content: 'primeira',
                    createdAt: '2026-09-21T20:01:00.000Z',
                    clientId: null,
                },
            ],
            nextCursor: null,
        })

        // A página antiga entra antes do que já estava na tela, em ordem de envio
        expect(messages().map((message) => message.id)).toEqual(['m1', 'm2'])
        expect(chat.cursors()['c1']).toBeNull()
    })

    it('não busca páginas anteriores quando o histórico chegou ao início', () => {
        chat.open('c1')
        http.expectOne((req) => req.url.includes('/api/conversations/c1/messages')).flush({
            items: [],
            nextCursor: null,
        })
        http.expectOne((req) => req.url.endsWith('/api/conversations/c1/read')).flush(null)

        chat.loadOlder('c1')
        http.expectNone((req) => req.urlWithParams.includes('before='))
    })
})