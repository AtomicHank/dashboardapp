const apiKey = '2f8a680af17b41428c644f8bf2d43dda'; // Your OpenWeatherMap API Key

// Load current weather and forecast
async function getWeather() {
  const city = 'Oberjosbach,de';
  const lat = 50.1109; // Oberjosbach coordinates
  const lon = 8.2767;

  const urlCurrent = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`;
  const urlForecast = `https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lon}&exclude=minutely,hourly,alerts&appid=${apiKey}&units=metric`;

  try {
    const [currentRes, forecastRes] = await Promise.all([
      fetch(urlCurrent),
      fetch(urlForecast)
    ]);

    if (!currentRes.ok || !forecastRes.ok) {
      throw new Error('Failed to fetch weather data');
    }

    const current = await currentRes.json();
    const forecast = await forecastRes.json();

    document.getElementById('output').innerHTML = `
      <p><strong>${current.name}</strong></p>
      <p>🌡️ Temp: ${current.main.temp} °C</p>
      <p>☁️ Clouds: ${current.clouds.all} %</p>
      <p>🌬️ Wind: ${current.wind.speed} m/s</p>
      <p>🌧️ Rain: ${current.rain?.['1h'] || 0} mm</p>
      <p>🔽 Pressure: ${current.main.pressure} hPa</p>
    `;

    showMap(current.coord.lat, current.coord.lon);
    displayTenDayForecast(forecast.daily.slice(0, 10));
  } catch (error) {
    console.error('Error fetching weather data:', error);
    document.getElementById('output').innerHTML = '<p>Error loading weather data</p>';
  }
}

// Display 10-day forecast
function displayTenDayForecast(dailyData) {
  const container = document.getElementById('forecast-container');
  
  const forecastHTML = dailyData.map((day, index) => {
    const date = new Date(day.dt * 1000);
    const dayName = index === 0 ? 'Today' : date.toLocaleDateString('en-US', { weekday: 'short' });
    const monthDay = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    
    const weatherIcon = getWeatherIcon(day.weather[0].main);
    const description = day.weather[0].description;
    const highTemp = Math.round(day.temp.max);
    const lowTemp = Math.round(day.temp.min);
    
    return `
      <div class="forecast-day">
        <div class="forecast-date">
          <div>${dayName}</div>
          <div style="font-size: 12px; color: #666;">${monthDay}</div>
        </div>
        <div class="forecast-weather">
          <div class="forecast-icon">${weatherIcon}</div>
          <div class="forecast-desc">${description}</div>
        </div>
        <div class="forecast-temps">
          <span class="temp-high">${highTemp}°</span>
          <span class="temp-low">${lowTemp}°</span>
        </div>
      </div>
    `;
  }).join('');
  
  container.innerHTML = forecastHTML;
}

// Get weather icon emoji based on weather condition
function getWeatherIcon(weatherMain) {
  const icons = {
    'Clear': '☀️',
    'Clouds': '☁️',
    'Rain': '🌧️',
    'Drizzle': '🌦️',
    'Thunderstorm': '⛈️',
    'Snow': '❄️',
    'Mist': '🌫️',
    'Smoke': '🌫️',
    'Haze': '🌫️',
    'Dust': '🌫️',
    'Fog': '🌫️',
    'Sand': '🌫️',
    'Ash': '🌫️',
    'Squall': '💨',
    'Tornado': '🌪️'
  };
  
  return icons[weatherMain] || '🌤️';
}

// Show Leaflet map with cloud and rain overlays
function showMap(lat, lon) {
  const map = L.map('map').setView([lat, lon], 13);

  // Base layer - Satellite imagery
  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
    maxZoom: 18
  }).addTo(map);

  // Weather overlays
  const cloudsLayer = L.tileLayer(`https://tile.openweathermap.org/map/clouds_new/{z}/{x}/{y}.png?appid=${apiKey}`, {
    attribution: 'Clouds © OpenWeatherMap',
    tileSize: 512,
    zoomOffset: -1,
    opacity: 1
  });

  const precipitationLayer = L.tileLayer(`https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png?appid=${apiKey}`, {
    attribution: 'Rain © OpenWeatherMap',
    tileSize: 512,
    zoomOffset: -1,
    opacity: 1
  });

  // Add error handling for tile loading
  cloudsLayer.on('tileerror', function(error) {
    console.error('Error loading cloud tiles:', error);
  });

  precipitationLayer.on('tileerror', function(error) {
    console.error('Error loading precipitation tiles:', error);
  });

  // Add layers to map
  cloudsLayer.addTo(map);
  precipitationLayer.addTo(map);

  // Optional: Add layer control
  const overlayMaps = {
    "Clouds": cloudsLayer,
    "Precipitation": precipitationLayer
  };

  L.control.layers(null, overlayMaps).addTo(map);

  // Custom pin marker
  const pinIcon = L.divIcon({
    html: '<div style="background-color: #ff4444; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
    className: 'custom-pin',
    iconSize: [16, 16],
    iconAnchor: [8, 8]
  });

  L.marker([lat, lon], { icon: pinIcon }).addTo(map);
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  getWeather();
});