import('/js/idb.js')

let restaurant;
var newMap;
const SERVER_URL = 'http://localhost:1337';

/**
 * Initialize map as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', (event) => {  
  initMap();
});

/**
 * Initialize leaflet map
 */
initMap = () => {
  fetchRestaurantFromURL((error, restaurant) => {
    if (error) { // Got an error!
      console.error(error);
    } else {      
      self.newMap = L.map('map', {
        center: [restaurant.latlng.lat, restaurant.latlng.lng],
        zoom: 16,
        scrollWheelZoom: false
      });
      L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.jpg70?access_token={mapboxToken}', {
        mapboxToken: 'pk.eyJ1IjoiZmVycmVsbDQyNyIsImEiOiJjamsyNGNnMWMwa25nM3FxbXQ0bjNqbWRtIn0.IhvzQNPOx0RgFACUGdL88A',
        maxZoom: 18,
        attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
          '<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
          'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
        id: 'mapbox.streets'    
      }).addTo(newMap);
      fillBreadcrumb();
      DataFetcher.mapMarkerForRestaurant(self.restaurant, self.newMap);
    }
  });
}  
 
/* window.initMap = () => {
  fetchRestaurantFromURL((error, restaurant) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      self.map = new google.maps.Map(document.getElementById('map'), {
        zoom: 16,
        center: restaurant.latlng,
        scrollwheel: false
      });
      fillBreadcrumb();
      DataFetcher.mapMarkerForRestaurant(self.restaurant, self.map);
    }
  });
} */

/**
 * Get current restaurant from page URL.
 */
fetchRestaurantFromURL = (callback) => {
  if (self.restaurant) { // restaurant already fetched!
    callback(null, self.restaurant)
    return;
  }
  const id = getParameterByName('id');
  if (!id) { // no id found in URL
    error = 'No restaurant id in URL'
    callback(error, null);
  } else {
    DataFetcher.fetchRestaurantById(id, (error, restaurant) => {
      self.restaurant = restaurant;
      if (!restaurant) {
        console.error(error);
        return;
      }
      fillRestaurantHTML();
      callback(null, restaurant)
    });
  }
}

callServer = ( path = '', httpVerb = 'GET', body = {}) =>
  httpVerb === 'GET'
  ? fetch(`${SERVER_URL}${path}`, {
    method: httpVerb,
    headers: { 'Content-Type': 'application/json' }})
  : fetch(`${SERVER_URL}${path}`, {
    method: httpVerb,
    headers: { 'Content-Type': 'application/json' },
    body: Object.keys(body).length ? JSON.stringify(body) : ''})

createReview = review => {
  callServer('/reviews/', 'POST', review)
    .then(response => {
      response.text().then(responseText => {
        return idb.open('RestaurantDatabase', 1)
        .then(db => {
          db.transaction('restaurantReviews', 'readwrite')
            .objectStore('restaurantReviews')
              .add(review)
          if (responseText === 'Offline') {
            idb.open('RestaurantDatabase', 1).then(db =>
              db.transaction('reviewsCache', 'readwrite')
                  .objectStore('reviewsCache')
                    .add(review))
          }
        })
      })
    }).catch(() =>
      idb.open('RestaurantDatabase', 1).then(db =>
        db.transaction('reviewsCache', 'readwrite')
            .objectStore('reviewsCache')
              .add(review))
    )
}

/**
 * Create restaurant HTML and add it to the webpage
 */
fillRestaurantHTML = (restaurant = self.restaurant) => {
  const name = document.getElementById('restaurant-name');
  name.innerHTML = restaurant.name;

  const address = document.getElementById('restaurant-address');
  address.innerHTML = restaurant.address;

  const image = document.getElementById('restaurant-img');
  image.className = 'restaurant-img'
  image.src = DataFetcher.imageUrlForRestaurant(restaurant);
  image.alt = restaurant.name;

  const cuisine = document.getElementById('restaurant-cuisine');
  cuisine.innerHTML = restaurant.cuisine_type;

  // fill operating hours
  if (restaurant.operating_hours) {
    fillRestaurantHoursHTML();
  }
  // fill reviews
  fillReviewsHTML();

  document.getElementById('review-create--submit-input').addEventListener('click', event => {
    event.preventDefault()
    const formData = {
      restaurant_id: restaurant.id,
      name: `${document.getElementById('review-create--first-name').value} ${document.getElementById('review-create--last-name').value}`,
      rating: parseInt(document.getElementById('review-create--select-input').value),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      comments: document.getElementById('review-create--textarea-input').value
    }
    if (formData.name !== ' ' && formData.comments !== '') {
      const noComments = document.getElementById('review-comments--empty')
      if (noComments) {
        noComments.outerHTML = ''
      }
      const review = createReviewHTML(formData)
      document.getElementById('reviews-list').prepend(review)
      createReview(formData)
    }
  })
}

/**
 * Create restaurant operating hours HTML table and add it to the webpage.
 */
fillRestaurantHoursHTML = (operatingHours = self.restaurant.operating_hours) => {
  const hours = document.getElementById('restaurant-hours');
  for (let key in operatingHours) {
    const row = document.createElement('tr');
    row.tabIndex = 0;

    const day = document.createElement('td');
    day.innerHTML = key;
    row.appendChild(day);

    const time = document.createElement('td');
    time.innerHTML = operatingHours[key];
    row.appendChild(time);

    hours.appendChild(row);
  }
}

/**
 * Create all reviews HTML and add them to the webpage.
 */
fillReviewsHTML = (restaurantId = self.restaurant.id) => {
  callServer('/reviews/').then(response => response.json().then(responseBody => {
    const reviews = responseBody.filter(review => review.restaurant_id === restaurantId).sort((a, b) => b.updatedAt - a.updatedAt)

    const container = document.getElementById('reviews-container');
    const title = document.createElement('h2');
    title.innerHTML = 'Reviews';
    container.appendChild(title);
  
    if (!reviews || reviews.length === 0) {
      const noReviews = document.createElement('p');
      noReviews.innerHTML = 'No reviews yet!';
      noReviews.id = 'review-comments--empty'
      container.appendChild(noReviews);
      return;
    }
    const ul = document.getElementById('reviews-list');
    reviews.forEach(review => {
      ul.appendChild(createReviewHTML(review));
    });
    container.appendChild(ul);
  }))
}

/**
 * Create review HTML and add it to the webpage.
 */
createReviewHTML = (review) => {
  const li = document.createElement('li');
  li.tabIndex = 0;
  const name = document.createElement('p');
  name.innerHTML = review.name;
  li.appendChild(name);

  const date = document.createElement('p');
  date.innerHTML = new Date(review.updatedAt).toDateString();
  li.appendChild(date);

  const rating = document.createElement('p');
  rating.innerHTML = `Rating: ${review.rating}`;
  li.appendChild(rating);

  const comments = document.createElement('p');
  comments.innerHTML = review.comments;
  li.appendChild(comments);

  return li;
}

/**
 * Add restaurant name to the breadcrumb navigation menu
 */
fillBreadcrumb = (restaurant=self.restaurant) => {
  const breadcrumb = document.getElementById('breadcrumb');
  const li = document.createElement('li');
  li.innerHTML = restaurant.name;
  breadcrumb.appendChild(li);
}

/**
 * Get a parameter by name from page URL.
 */
getParameterByName = (name, url) => {
  if (!url)
    url = window.location.href;
  name = name.replace(/[\[\]]/g, '\\$&');
  const regex = new RegExp(`[?&]${name}(=([^&#]*)|&|#|$)`),
    results = regex.exec(url);
  if (!results)
    return null;
  if (!results[2])
    return '';
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
}
