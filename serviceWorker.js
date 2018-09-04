const cacheName = 'SWCache'
const filesToCache = [ '/', '/restaurant.html', '/js/main.js', '/js/dbhelper.js', '/js/restaurant_info.js',
'/css/styles.css', '/data/restaurants.json', '/img/1.jpg', '/img/2.jpg', '/img/3.jpg', '/img/4.jpg', 
'/img/5.jpg', '/img/6.jpg', '/img/7.jpg', '/img/8.jpg', '/img/9.jpg', '/img/10.jpg', 'https://unpkg.com/leaflet@1.3.1/dist/leaflet.js', 'https://unpkg.com/leaflet@1.3.1/dist/leaflet.css' ]

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(cacheName).then(cache => {
            cache.addAll(filesToCache)
        })
    )
})

self.addEventListener('fetch', event => 
    event.respondWith(
        caches.match(event.request).then(response => 
            response || fetch(event.request).then(response =>
                response.status === 404 ? new Response('Something went wrong...') : response
            ).catch(() => new Response('Offline'))
        )
    )
)