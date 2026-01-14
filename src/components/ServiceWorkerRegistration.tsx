'use client';

import { useEffect } from 'react';

export default function ServiceWorkerRegistration() {
    useEffect(() => {
        if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
            window.addEventListener('load', () => {
                navigator.serviceWorker
                    .register('/sw.js')
                    .then((registration) => {
                        console.log('SW registered:', registration.scope);
                    })
                    .catch((error) => {
                        console.log('SW registration failed:', error);
                    });
            });
        }
    }, []);

    return null;
}

// Utility functions to interact with the service worker

export async function cacheDocumentForOffline(documentUrl: string): Promise<boolean> {
    if (!('serviceWorker' in navigator)) return false;

    const registration = await navigator.serviceWorker.ready;
    if (!registration.active) return false;

    return new Promise((resolve) => {
        const messageChannel = new MessageChannel();

        messageChannel.port1.onmessage = (event) => {
            resolve(event.data.success);
        };

        registration.active!.postMessage(
            { type: 'CACHE_DOCUMENT', url: documentUrl },
            [messageChannel.port2]
        );
    });
}

export async function removeDocumentFromOfflineCache(documentUrl: string): Promise<boolean> {
    if (!('serviceWorker' in navigator)) return false;

    const registration = await navigator.serviceWorker.ready;
    if (!registration.active) return false;

    return new Promise((resolve) => {
        const messageChannel = new MessageChannel();

        messageChannel.port1.onmessage = (event) => {
            resolve(event.data.success);
        };

        registration.active!.postMessage(
            { type: 'REMOVE_CACHED_DOCUMENT', url: documentUrl },
            [messageChannel.port2]
        );
    });
}
