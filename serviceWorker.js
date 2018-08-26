if (navigator.serviceWorker) {
    navigator.serviceWorker.register('http://localhost:8000/serviceWorker.js', { scope: '/' }).then(() => {

        const filesToCache = [ '/', 'restaurant.html', 'js/main.js', 'js/dbhelper.js', 'js/restaurant_info.js',
        'css/styles.css', 'data/restaurants.json', 'img/1.jpg', 'img/2.jpg', 'img/3.jpg', 'img/4.jpg', 
        'img/5.jpg', 'img/6.jpg', 'img/7.jpg', 'img/8.jpg', 'img/9.jpg', 'img/10.jpg' ]

        self.addEventListener('install', event => {
            event.waitUntil(
                caches.open('SWCache')
                    .then(cache => {
                        console.log('cache opened');
                        return cache.addAll(filesToCache);
                    })
            )
        });

        self.addEventListener('fetch', event => 
            event.respondWith(
                caches.match(event.request)
                    .then(response => response || fetch(event.request).then(response => {
                        cache.put(event.request, response.clone());
                        return response;
                    })
            )
        ));


    })
}