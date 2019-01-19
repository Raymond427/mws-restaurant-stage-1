importScripts('/js/idb.js')

const cacheName = 'SWCache'
const filesToCache = [ '/', '/restaurant.html', '/js/main.js', '/js/data_fetcher.js', '/js/restaurant_info.js',
'/css/styles.css', '/img/small/1.jpg', '/img/small/2.jpg', '/img/small/3.jpg', '/img/small/4.jpg', 
'/img/small/5.jpg', '/img/small/6.jpg', '/img/small/7.jpg', '/img/small/8.jpg', '/img/small/9.jpg', '/img/small/10.jpg',
'/img/1.jpg', '/img/2.jpg', '/img/3.jpg', '/img/4.jpg', 
'/img/5.jpg', '/img/6.jpg', '/img/7.jpg', '/img/8.jpg', '/img/9.jpg', '/img/10.jpg',
'https://unpkg.com/leaflet@1.3.1/dist/leaflet.js', 'https://unpkg.com/leaflet@1.3.1/dist/leaflet.css',
'/favicon.ico', '/icons-192.png', '/icons-512.png', '/manifest.json' ]
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
        if (!upgradeEvent.objectStoreNames.contains('restaurantReviews')) {
            upgradeEvent.createObjectStore('restaurantReviews', { keyPath: 'key', autoIncrement: true });
        }
        if (!upgradeEvent.objectStoreNames.contains('reviewsCache')) {
            upgradeEvent.createObjectStore('reviewsCache', { keyPath: 'key', autoIncrement: true });
        }
        if (!upgradeEvent.objectStoreNames.contains('favoritesCache')) {
            upgradeEvent.createObjectStore('favoritesCache', { keyPath: 'id' });
        }
    })
}

self.addEventListener('install', event => {
    event.waitUntil(Promise.all([
        caches.open(cacheName)
            .then(cache => cache.addAll(filesToCache))
            .catch(() => console.log('Caching is disabled or unsupported')),
        idbAvailable
            ? fetch(restaurantRequestURL)
                .then(response => response.json())
                .catch(() => console.log('Failed to populate/update database'))
            : null,
        idbAvailable
            ? fetch('http://localhost:1337/reviews/')
                .then(response => response.json())
                .catch(() => console.log('Failed to populate/update database'))
            : null
    ]).then(([ cache, restaurants, reviews ]) => {
        if (restaurants) {
            dbPromise.then(db => {
                const restaurantObjectStore = db.transaction(objectStoreName, 'readwrite').objectStore(objectStoreName)
                restaurantObjectStore.count().then(count => {
                    if (count === 0) {
                        restaurants.forEach(restaurant => restaurantObjectStore.add(restaurant))
                    }
                })
                const restaurantReviewsObjectStore = db.transaction('restaurantReviews', 'readwrite').objectStore('restaurantReviews')
                restaurantReviewsObjectStore.count().then(count => {
                    if (count === 0) {
                        reviews.forEach(review => restaurantReviewsObjectStore.add(review))
                    }
                })
            })
        }
    }))
})

self.addEventListener('activate', event => {
    importScripts('/js/idb.js')
    const updateServer = () => {
        console.log('UPDATING SERVER!')
        return Promise.all([
            dbPromise.then(db => {
                db.transaction('reviewsCache', 'readwrite')
                    .objectStore('reviewsCache').getAll().then(reviews => {
                        reviews.forEach(review => fetch('http://localhost:1337/reviews/', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(review)
                        }).then(response => {
                            if (response.ok) {
                                db.transaction('reviewsCache', 'readwrite')
                                    .objectStore('reviewsCache')
                                        .delete(review.key)
                            }
                        }))
                    })
            }),
            dbPromise.then(db => {
                db.transaction('favoritesCache', 'readwrite')
                    .objectStore('favoritesCache').getAll().then(favorites => {
                        favorites.forEach(favorite => fetch(`http://localhost:1337/restaurants/${favorite.id}/?is_favorite=${favorite.is_favorite}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' }
                        }).then(response => {
                            if (response.ok) {
                                db.transaction('favoritesCache', 'readwrite')
                                    .objectStore('favoritesCache')
                                        .delete(favorite.id)
                            }
                        })
                        )            
                    })
            })
        ])
    }
    return event.waitUntil(updateServer())
})

self.addEventListener('fetch', event => event.respondWith(
    function responseHandler(event){
        if (idbAvailable) {
            const requestURL = event.request.url
            if (requestURL === restaurantRequestURL) {
                return dbPromise.then(db =>
                    db.transaction(objectStoreName, 'readonly').objectStore(objectStoreName).getAll())
                        .then(restaurants => new Response(JSON.stringify(restaurants)))
            } else if (requestURL === 'http://localhost:1337/reviews/' && event.request.method === 'GET') {
                return dbPromise.then(db =>
                    db.transaction('restaurantReviews', 'readonly').objectStore('restaurantReviews').getAll())
                        .then(reviews => new Response(JSON.stringify(reviews)))
            } else if (requestURL.includes('http://localhost:8000/restaurant.html?id=')) {
                return caches.match('http://localhost:8000/restaurant.html')
                    .then(response => response || fetch(event.request)
                        .then(response => response.ok
                            ? new Response('Something went wrong...')
                            : response)
                        .catch(() => new Response('Offline')))
            } else {
                return caches.match(event.request)
                    .then(response => response || fetch(event.request)
                        .then(response => response.status === 404
                            ? new Response('Something went wrong...')
                            : response)
                        .catch(() => new Response('Offline')))
            }
        }
    }(event)
))
