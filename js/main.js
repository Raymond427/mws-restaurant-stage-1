import('/js/idb.js')

let restaurants,
  neighborhoods,
  cuisines
var newMap
var markers = []

/**
 * Fetch neighborhoods and cuisines as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', (event) => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('http://localhost:8000/serviceWorker.js', { scope: '/' })
  }
  initMap(); // added 
  fetchNeighborhoods();
  fetchCuisines();
});

/**
 * Fetch all neighborhoods and set their HTML.
 */
fetchNeighborhoods = () => {
  DataFetcher.fetchNeighborhoods((error, neighborhoods) => {
    if (error) { // Got an error
      console.error(error);
    } else {
      self.neighborhoods = neighborhoods;
      fillNeighborhoodsHTML();
    }
  });
}

/**
 * Set neighborhoods HTML.
 */
fillNeighborhoodsHTML = (neighborhoods = self.neighborhoods) => {
  const select = document.getElementById('neighborhoods-select');
  neighborhoods.forEach(neighborhood => {
    const option = document.createElement('option');
    option.innerHTML = neighborhood;
    option.value = neighborhood;
    select.append(option);
  });
}

/**
 * Fetch all cuisines and set their HTML.
 */
fetchCuisines = () => {
  DataFetcher.fetchCuisines((error, cuisines) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      self.cuisines = cuisines;
      fillCuisinesHTML();
    }
  });
}

/**
 * Set cuisines HTML.
 */
fillCuisinesHTML = (cuisines = self.cuisines) => {
  const select = document.getElementById('cuisines-select');

  cuisines.forEach(cuisine => {
    const option = document.createElement('option');
    option.innerHTML = cuisine;
    option.value = cuisine;
    select.append(option);
  });
}

/**
 * Initialize leaflet map, called from HTML.
 */
initMap = () => {
  self.newMap = L.map('map', {
        center: [40.722216, -73.987501],
        zoom: 12,
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

  updateRestaurants();
}
/* window.initMap = () => {
  let loc = {
    lat: 40.722216,
    lng: -73.987501
  };
  self.map = new google.maps.Map(document.getElementById('map'), {
    zoom: 12,
    center: loc,
    scrollwheel: false
  });
  updateRestaurants();
} */

/**
 * Update page and map for current restaurants.
 */
updateRestaurants = () => {
  const cSelect = document.getElementById('cuisines-select');
  const nSelect = document.getElementById('neighborhoods-select');

  const cIndex = cSelect.selectedIndex;
  const nIndex = nSelect.selectedIndex;

  const cuisine = cSelect[cIndex].value;
  const neighborhood = nSelect[nIndex].value;

  DataFetcher.fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, (error, restaurants) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      resetRestaurants(restaurants);
      fillRestaurantsHTML();
    }
  })
}

/**
 * Clear current restaurants, their HTML and remove their map markers.
 */
resetRestaurants = (restaurants) => {
  // Remove all restaurants
  self.restaurants = [];
  const ul = document.getElementById('restaurants-list');
  ul.innerHTML = '';

  // Remove all map markers
  if (self.markers) {
    self.markers.forEach(marker => marker.remove());
  }
  self.markers = [];
  self.restaurants = restaurants;
}

/**
 * Create all restaurants HTML and add them to the webpage.
 */
fillRestaurantsHTML = (restaurants = self.restaurants) => {
  const ul = document.getElementById('restaurants-list');
  restaurants.forEach(restaurant => {
    ul.append(createRestaurantHTML(restaurant));
  });
  addMarkersToMap();
}

/**
 * Create restaurant HTML.
 */
createRestaurantHTML = (restaurant) => {
  const li = document.createElement('li');

  const image = document.createElement('img');
  image.className = 'restaurant-img';
  image.src = DataFetcher.imageUrlForRestaurant(restaurant, 'small');
  image.alt = restaurant.name;
  li.append(image);

  const name = document.createElement('h1');
  name.innerHTML = restaurant.name;
  li.append(name);

  const neighborhood = document.createElement('p');
  neighborhood.innerHTML = restaurant.neighborhood;
  li.append(neighborhood);

  const address = document.createElement('p');
  address.innerHTML = restaurant.address;
  li.append(address);

  const more = document.createElement('a');
  more.innerHTML = 'View Details';
  more.href = DataFetcher.urlForRestaurant(restaurant);
  more.role = "button";
  more.ariaLabel = `View Details for ${restaurant.name}`
  li.append(more)

  const favoriteLabel = document.createElement('label')
  favoriteLabel.for = `favorite-${restaurant.id}`
  favoriteLabel.innerHTML = 'Favorite'
  const favorite = document.createElement('input')
  favorite.type = 'checkbox'
  favorite.checked = restaurant.is_favorite && restaurant.is_favorite !== 'false'
  favorite.id = `restaurant-favorite--${restaurant.id}`
  li.append(favorite)
  li.append(favoriteLabel)

  const favoriteRestaurant = (id, isFavorited) => {
    fetch(`http://localhost:1337/restaurants/${id}/?is_favorite=${isFavorited}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' }
    })
    .then(response => {
      import('/js/idb.js')
      idb.open('RestaurantDatabase', 1).then(db => {
        db.transaction('restaurants', 'readwrite')
          .objectStore('restaurants')
            .put({ ...restaurant, is_favorite: isFavorited })
      })
    }).catch(() => {
      idb.open('RestaurantDatabase', 1).then(db => {
        db.transaction('restaurants', 'readwrite')
          .objectStore('restaurants')
            .put({ ...restaurant, is_favorite: isFavorited })
      })
      idb.open('RestaurantDatabase', 1).then(db => {
        const favorites = db.transaction('favoritesCache', 'readwrite').objectStore('favoritesCache')
        favorites.get(id).then(favoriteInDatabase => favoriteInDatabase ? favorites.put({ id, is_favorite: isFavorited }) : favorites.add({ id, is_favorite: isFavorited }))
      })
    })
  }

  favorite.addEventListener('click', event => {
    favoriteRestaurant(restaurant.id, event.target.checked)
  })

  return li
}

/**
 * Add markers for current restaurants to the map.
 */
addMarkersToMap = (restaurants = self.restaurants) => {
  restaurants.forEach(restaurant => {
    // Add marker to the map
    const marker = DataFetcher.mapMarkerForRestaurant(restaurant, self.newMap);
    marker.on("click", onClick);
    function onClick() {
      window.location.href = marker.options.url;
    }
    self.markers.push(marker);
  });

} 
/* addMarkersToMap = (restaurants = self.restaurants) => {
  restaurants.forEach(restaurant => {
    // Add marker to the map
    const marker = DataFetcher.mapMarkerForRestaurant(restaurant, self.map);
    google.maps.event.addListener(marker, 'click', () => {
      window.location.href = marker.url
    });
    self.markers.push(marker);
  });
} */

