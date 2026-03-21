// This optional code is used to register a service worker.
// register() is not called by default.

// This lets the app load faster on subsequent visits in production, and gives
// it offline capabilities. However, it also means that developers (and users)
// will only see deployed updates on subsequent visits to a page, after all the
// existing tabs open on the page have been closed, since previously cached
// resources are updated in the background.

// To learn more about the benefits of this model and instructions on how to
// opt-in, read https://cra.link/PWA

const isLocalhost = Boolean(
    window.location.hostname === 'localhost' ||
    window.location.hostname === '[::1]' ||
    /^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/.test(
        window.location.hostname,
    )
);

export type SWConfig = {
    onSuccess?(registration: ServiceWorkerRegistration): void;
    onUpdate?(registration: ServiceWorkerRegistration): void;
};

export function register(config?: SWConfig) {
    if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
        const publicUrl = new URL(process.env.PUBLIC_URL!, window.location.href);

        if (publicUrl.origin !== window.location.origin) return;

        window.addEventListener('load', () => {
            const swUrl = `${process.env.PUBLIC_URL}/service-worker.js`;

            if (isLocalhost) {
                checkValidServiceWorker(swUrl, config);

                navigator.serviceWorker.ready.then(() => {
                    console.log(
                        'This web app is being served cache-first by a service worker.',
                    );
                });
            } else {
                registerValidSW(swUrl, config);
            }
        });
    }
}

function registerValidSW(swUrl: string, config?: SWConfig) {
    navigator.serviceWorker
        .register(swUrl)
        .then((registration) => {
            registration.onupdatefound = () => {
                const installingWorker = registration.installing;
                if (!installingWorker) return;

                installingWorker.onstatechange = () => {
                    if (installingWorker.state === 'installed') {
                        if (navigator.serviceWorker.controller) {
                            if (config?.onUpdate) {
                                // Caller provides its own update UI — hand off control.
                                config.onUpdate(registration);
                            } else {
                                // No update handler: defer the SW swap until the user
                                // navigates, so unsaved form input is never lost.
                                const waiting = registration.waiting;
                                if (waiting) {
                                    const applyUpdate = () => {
                                        waiting.postMessage({ type: 'SKIP_WAITING' });
                                        navigator.serviceWorker.addEventListener('controllerchange', () => {
                                            window.location.reload();
                                        }, { once: true });
                                        unsubscribe();
                                    };

                                    // On pagehide (tab close / PWA backgrounded), activate the
                                    // new SW. If the page is then restored from bfcache the old
                                    // JS is still running with the new SW in control — reload to
                                    // resolve the mismatch (important on iOS Safari PWA).
                                    const onPageHide = () => {
                                        waiting.postMessage({ type: 'SKIP_WAITING' });
                                        window.addEventListener('pageshow', (e) => {
                                            if (e.persisted) window.location.reload();
                                        }, { once: true });
                                        unsubscribe();
                                    };

                                    // Declared after the handlers that reference it but before
                                    // the listeners are registered, so it is always assigned
                                    // before any callback can invoke it.
                                    const unsubscribe = () => {
                                        window.removeEventListener('popstate', applyUpdate);
                                        window.removeEventListener('pagehide', onPageHide);
                                    };

                                    // popstate fires on back/forward navigation.
                                    // Link clicks (React Router pushState) are intentionally
                                    // not intercepted to avoid converting SPA navigations into
                                    // hard reloads.
                                    window.addEventListener('popstate', applyUpdate, { once: true });
                                    window.addEventListener('pagehide', onPageHide, { once: true });
                                }
                            }
                        } else {
                            // At this point, everything has been precached.
                            // It's the perfect time to display a
                            // "Content is cached for offline use." message.
                            console.log('Content is cached for offline use.');
                            config?.onSuccess?.(registration);
                        }
                    }
                };
            };
        })
        .catch((error) =>
            console.error('Error during service-worker registration:', error),
        );
}

function checkValidServiceWorker(swUrl: string, config?: SWConfig) {
    fetch(swUrl, {headers: {'Service-Worker': 'script'}})
        .then((response) => {
            // Ensure a service worker exists and that we really are getting a JS file.
            const contentType = response.headers.get('content-type');
            if (
                response.status === 404 ||
                (contentType && !contentType.includes('javascript'))
            ) {
                // No service worker found. Probably a different app. Reload the page.
                navigator.serviceWorker.ready.then((registration) => {
                    registration.unregister().then(() => {
                        window.location.reload();
                    });
                });
            } else {
                // Service worker found. Proceed as normal.
                registerValidSW(swUrl, config);
            }
        })
        .catch(() => {
            console.log('No internet connection found. App is running in offline mode.');
        });
}

export function unregister() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready
            .then((registration) => registration.unregister())
            .catch((error) => console.error(error.message));
    }
}
