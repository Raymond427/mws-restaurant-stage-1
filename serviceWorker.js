importScripts('/js/idb.js')

const cacheName = 'SWCache'
const filesToCache = [ '/', '/restaurant.html', '/js/main.js', '/js/data_fetcher.js', '/js/restaurant_info.js',
'/css/styles.css', '/img/1.jpg', '/img/2.jpg', '/img/3.jpg', '/img/4.jpg', 
'/img/5.jpg', '/img/6.jpg', '/img/7.jpg', '/img/8.jpg', '/img/9.jpg', '/img/10.jpg', 'https://unpkg.com/leaflet@1.3.1/dist/leaflet.js', 'https://unpkg.com/leaflet@1.3.1/dist/leaflet.css' ]
const indexedDatabaseName = 'RestaurantDatabase'
const objectStoreName = 'restaurants'
const restaurantRequestURL = 'http://localhost:1337/restaurants'
const idbAvailable = self.indexedDB
let dbPromise, responseHandler

if (idbAvailable) {
    dbPromise = idb.open(indexedDatabaseName, 1, upgradeEvent => {
        if (!upgradeEvent.objectStoreNames.contains(objectStoreName)) {
            upgradeEvent.createObjectStore(objectStoreName, { keyPath: 'id' })
        }
    })
}

self.addEventListener('install', event => {
    responseHandler = event =>
        event.request.url === restaurantRequestURL && idbAvailable
            ? dbPromise.then(db =>
                db.transaction(objectStoreName, 'readonly').objectStore(objectStoreName).getAll()
              ).then(restaurants =>
                new Response(JSON.stringify(restaurants))
              )
            : caches.match(event.request).then(response =>
                    response || fetch(event.request).then(response =>
                        response.status === 404 ? new Response('Something went wrong...') : response
                    ).catch(() => new Response('Offline'))
              )

    event.waitUntil(Promise.all([
        caches.open(cacheName)
            .then(cache => cache.addAll(filesToCache))
            .catch(() => console.log('Caching is disabled or unsupported')),
        idbAvailable
            ? fetch(restaurantRequestURL)
                .then(response => response.json())
                .catch(() => console.log('Failed to populate/update database'))
            : null
    ]).then(([ cache, restaurants ]) => {
        if (restaurants) {
            dbPromise.then(db => {
                const objectStore = db.transaction(objectStoreName, 'readwrite').objectStore(objectStoreName)
                objectStore.count().then(count => {
                    if (count === 0) {
                        restaurants.forEach(restaurant => objectStore.add(restaurant))
                    }
                })
            })
        }
    }))
})

self.addEventListener('fetch', event => {
    event.respondWith(responseHandler(event))
})
