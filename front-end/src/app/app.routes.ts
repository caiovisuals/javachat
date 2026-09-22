import { Routes } from '@angular/router'
import { authGuard, guestGuard } from './core/auth/auth-guard'

export const routes: Routes = [
    {
        path: '',
        canActivate: [authGuard],
        title: 'JAVACHAT',
        loadComponent: () => import('./features/home/home-page').then((m) => m.HomePage),
    },
    {
        path: 'chats',
        canActivate: [authGuard],
        title: 'Conversas - JAVACHAT',
        loadComponent: () => import('./features/chat/chat-page').then((m) => m.ChatPage),
    },
    {
        path: 'c/:conversationId',
        canActivate: [authGuard],
        title: 'JAVACHAT',
        loadComponent: () => import('./features/chat/chat-page').then((m) => m.ChatPage),
    },
    {
        path: 'entrar',
        canActivate: [guestGuard],
        title: 'Entrar - JAVACHAT',
        loadComponent: () => import('./features/auth/login-page').then((m) => m.LoginPage),
    },
    {
        path: 'criar-conta',
        canActivate: [guestGuard],
        title: 'Criar conta - JAVACHAT',
        loadComponent: () => import('./features/auth/register-page').then((m) => m.RegisterPage),
    },
    {
        path: 'status',
        title: 'Status - JAVACHAT',
        loadComponent: () => import('./features/status/status-page').then((m) => m.StatusPage),
    },
    {
        path: '**',
        title: 'Página não encontrada · JAVACHAT',
        loadComponent: () => import('./features/errors/not-found-page').then((m) => m.NotFoundPage),
    },
]