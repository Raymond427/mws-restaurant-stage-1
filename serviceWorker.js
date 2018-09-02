const cacheName = 'SWCache'
const filesToCache = [ 'restaurant.html', '/js/restaurant_info.js' ]

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(cacheName).then(cache => {
            cache.addAll(filesToCache)
        })
    )
});

self.addEventListener('fetch', event => {
    console.log(`Caught ${event.request}`)
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                if (response) {
                    return response
                }
                fetch(event.request).then(response => {
                    caches.open(cacheName).then(cache => {
                        cache.put(event.request, response.clone())
                        console.log('added to cache!')
                    })
                    return response;
                })
            }
        )
    )}
);