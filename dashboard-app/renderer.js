// Personal Dashboard Renderer - Main Application Logic

// Configuration
const CONFIG = {
  // Base location (Oberjosbach, Germany)
  location: {
    lat: 50.1109,
    lon: 8.2767,
    name: "Oberjosbach, Germany",
    timezone: "Europe/Berlin"
  },
  
  // Update intervals (in milliseconds)
  intervals: {
    clock: 1000,        // 1 second
    weather: 300000,    // 5 minutes
    flights: 15000,     // 15 seconds
    system: 2000,       // 2 seconds
    traffic: 600000,    // 10 minutes
    calendar: 900000    // 15 minutes
  },
  
  // API configurations
  apis: {
    weather: {
      key: '',
      baseUrl: 'https://api.openweathermap.org/data/2.5'
    },
    flights: {
      baseUrl: 'https://opensky-network.org/api/states/all',
      radius: 50 // km
    },
    traffic: {
      // You'll need to get a Google Maps API key for traffic data
      // key: 'YOUR_GOOGLE_MAPS_API_KEY'
    }
  }
};

// Global variables
let updateTimers = {};
let flightMap;
let systemChart;
let tasks = [];

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  console.log('🚀 Dashboard DOM loaded, initializing...');
  initializeDashboard();
  startUpdateCycles();
  setupEventListeners();
});

// Initialize all dashboard components
function initializeDashboard() {
  console.log('🔧 Initializing Personal Dashboard...');
  
  // Start the clock immediately
  updateClock();
  console.log('✅ Clock initialized');
  
  // Initialize flight map
  try {
    initializeFlightMap();
    console.log('✅ Flight map initialized');
  } catch (error) {
    console.error('❌ Flight map initialization failed:', error);
  }
  
  // Load saved tasks
  try {
    loadTasks();
    console.log('✅ Tasks loaded');
  } catch (error) {
    console.error('❌ Tasks loading failed:', error);
  }
  
  // Initial data load for all panels with error handling
  console.log('📡 Starting data updates...');
  
  setTimeout(() => {
    console.log('🌤️ Updating weather...');
    updateWeatherPanel();
  }, 1000);
  
  setTimeout(() => {
    console.log('✈️ Updating flights...');
    updateFlightPanel();
  }, 2000);
  
  setTimeout(() => {
    console.log('💻 Updating system...');
    updateSystemPanel();
  }, 3000);
  
  setTimeout(() => {
    console.log('🚗 Updating traffic...');
    updateTrafficPanel();
  }, 4000);
  
  setTimeout(() => {
    console.log('📅 Updating calendar...');
    updateCalendarPanel();
  }, 5000);
}

// Start all update cycles
function startUpdateCycles() {
  // Clock updates every second
  updateTimers.clock = setInterval(updateClock, CONFIG.intervals.clock);
  
  // Weather updates every 5 minutes
  updateTimers.weather = setInterval(updateWeatherPanel, CONFIG.intervals.weather);
  
  // Flight tracking updates every 15 seconds
  updateTimers.flights = setInterval(updateFlightPanel, CONFIG.intervals.flights);
  
  // System monitoring updates every 2 seconds
  updateTimers.system = setInterval(updateSystemPanel, CONFIG.intervals.system);
  
  // Traffic updates every 10 minutes
  updateTimers.traffic = setInterval(updateTrafficPanel, CONFIG.intervals.traffic);
  
  // Calendar updates every 15 minutes
  updateTimers.calendar = setInterval(updateCalendarPanel, CONFIG.intervals.calendar);
}

// Setup event listeners
function setupEventListeners() {
  // Header controls
  document.getElementById('refresh-all-btn').addEventListener('click', refreshAllPanels);
  document.getElementById('settings-btn').addEventListener('click', openSettings);
  document.getElementById('minimize-btn').addEventListener('click', minimizeWindow);
  
  // Panel refresh buttons
  document.querySelectorAll('.refresh-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const panel = e.target.dataset.panel;
      refreshPanel(panel);
    });
  });
  
  // Task management
  document.getElementById('add-task-btn').addEventListener('click', showAddTaskForm);
  document.getElementById('save-task-btn').addEventListener('click', saveNewTask);
  document.getElementById('cancel-task-btn').addEventListener('click', hideAddTaskForm);
  
  // Task filters
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const filter = e.target.dataset.filter;
      filterTasks(filter);
    });
  });
  
  // Enter key for new task input
  document.getElementById('new-task-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      saveNewTask();
    }
  });
}

// Clock and date functions
function updateClock() {
  const now = new Date();
  
  // Update time
  const timeString = now.toLocaleTimeString('en-US', { 
    hour12: false, 
    hour: '2-digit', 
    minute: '2-digit',
    second: '2-digit'
  });
  document.getElementById('current-time').textContent = timeString;
  
  // Update date
  const dateString = now.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  document.getElementById('current-date').textContent = dateString;
  
  // Update location
  document.getElementById('current-location').textContent = CONFIG.location.name;
}

// Weather Panel Functions
async function updateWeatherPanel() {
  console.log('🌤️ Starting weather update...');
  
  // Show loading state
  document.getElementById('weather-forecast').innerHTML = `
    <div class="loading" style="grid-column: 1 / -1; display: flex; align-items: center; justify-content: center; color: #a0aec0;">
      Loading weather data...
    </div>
  `;
  
  try {
    // Using the 5-day forecast API which gives us daily forecasts
    const forecastUrl = `${CONFIG.apis.weather.baseUrl}/weather?lat=${CONFIG.location.lat}&lon=${CONFIG.location.lon}&appid=${CONFIG.apis.weather.key}&units=metric`;
    
    console.log('🌐 Fetching weather from:', forecastUrl);
    console.log('🔑 Using API key:', CONFIG.apis.weather.key ? CONFIG.apis.weather.key.substring(0, 8) + '...' : 'MISSING');
    
    const response = await fetch(forecastUrl);
    console.log('📡 Weather API response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Weather API error:', response.status, errorText);
      throw new Error(`Weather API error: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    console.log('✅ Weather data received:', data);
    
    // For now, create mock 10-day forecast since we only have current weather
    const mockForecasts = [];
    const today = new Date();
    
    for (let i = 0; i < 10; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      
      // Create mock weather with some variation
      const baseTemp = data.main.temp || 20;
      const tempVariation = (Math.random() - 0.5) * 10;
      
      mockForecasts.push({
        date: date,
        temp: {
          max: baseTemp + tempVariation + 5,
          min: baseTemp + tempVariation - 5
        },
        weather: data.weather || [{ main: 'Clear', description: 'clear sky' }],
        description: data.weather ? data.weather[0].description : 'clear sky'
      });
    }
    
    console.log('📊 Generated', mockForecasts.length, 'forecast days');
    
    // Update 10-day forecast as individual cards in 2x5 grid
    const forecastHTML = mockForecasts.map((day, index) => {
      const date = day.date;
      const dayName = index === 0 ? 'Today' : date.toLocaleDateString('en-US', { weekday: 'short' });
      const dayMonth = `${date.getDate().toString().padStart(2, '0')}/${date.toLocaleDateString('en-US', { month: 'short' })}`; // DD/MMM format
      
      const weatherIcon = getWeatherIcon(day.weather[0].main);
      const description = day.description;
      const highTemp = Math.round(day.temp.max);
      const lowTemp = Math.round(day.temp.min);
      
      return `
        <div class="forecast-day">
          <div class="forecast-day-name">${dayName}</div>
          <div class="forecast-date-text">${dayMonth}</div>
          <div class="forecast-icon">${weatherIcon}</div>
          <div class="forecast-desc">${description}</div>
          <div class="forecast-temps">
            <span class="temp-high">${highTemp}°</span>
            <span class="temp-divider">/</span>
            <span class="temp-low">${lowTemp}°</span>
          </div>
        </div>
      `;
    }).join('');
    
    document.getElementById('weather-forecast').innerHTML = forecastHTML;
    updateLastUpdate('weather');
    console.log('✅ Weather panel updated successfully');
    
  } catch (error) {
    console.error('❌ Error updating weather:', error);
    document.getElementById('weather-forecast').innerHTML = `
      <div class="error" style="color: #ff6b6b; text-align: center; padding: 40px; grid-column: 1 / -1;">
        <div style="font-size: 16px; margin-bottom: 8px;">⚠️ Weather data unavailable</div>
        <div style="font-size: 12px; color: #a0aec0;">${error.message}</div>
        <div style="font-size: 10px; color: #666; margin-top: 8px;">Check console for details</div>
      </div>
    `;
  }
}

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

// Flight Panel Functions
function initializeFlightMap() {
  console.log('🗺️ Initializing flight map...');
  try {
    flightMap = L.map('flight-map').setView([CONFIG.location.lat, CONFIG.location.lon], 9);
    
    // Base map layers
    const baseMaps = {
      "🌙 Dark (Default)": L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 18
      }),
      "🛰️ Satellite": L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
        maxZoom: 18
      }),
      "🗺️ Light Roads": L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 18
      }),
      "🗺️ Streets": L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19
      }),
      "🌍 Terrain": L.tileLayer('https://stamen-tiles-{s}.a.ssl.fastly.net/terrain/{z}/{x}/{y}{r}.png', {
        attribution: 'Map tiles by <a href="http://stamen.com">Stamen Design</a>, <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a> &mdash; Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        subdomains: 'abcd',
        maxZoom: 18
      })
    };
    
    // Set default base layer
    baseMaps["🌙 Dark (Default)"].addTo(flightMap);
    
    // Weather overlay layers
    const weatherLayers = {
      precipitation: L.tileLayer(`https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png?appid=${CONFIG.apis.weather.key}`, {
        attribution: 'Weather data © OpenWeatherMap',
        opacity: 0.6,
        maxZoom: 12
      }),
      clouds: L.tileLayer(`https://tile.openweathermap.org/map/clouds_new/{z}/{x}/{y}.png?appid=${CONFIG.apis.weather.key}`, {
        attribution: 'Weather data © OpenWeatherMap',
        opacity: 0.4,
        maxZoom: 12
      }),
      temperature: L.tileLayer(`https://tile.openweathermap.org/map/temp_new/{z}/{x}/{y}.png?appid=${CONFIG.apis.weather.key}`, {
        attribution: 'Weather data © OpenWeatherMap',
        opacity: 0.5,
        maxZoom: 12
      }),
      wind: L.tileLayer(`https://tile.openweathermap.org/map/wind_new/{z}/{x}/{y}.png?appid=${CONFIG.apis.weather.key}`, {
        attribution: 'Weather data © OpenWeatherMap',
        opacity: 0.5,
        maxZoom: 12
      }),
      pressure: L.tileLayer(`https://tile.openweathermap.org/map/pressure_new/{z}/{x}/{y}.png?appid=${CONFIG.apis.weather.key}`, {
        attribution: 'Weather data © OpenWeatherMap',
        opacity: 0.5,
        maxZoom: 12
      })
    };
    
    // Traffic overlay layers
    const trafficLayers = {
      googleTraffic: L.tileLayer('https://mt1.google.com/vt?lyrs=h@159000000,traffic|seconds_into_week:-1&style=3&x={x}&y={y}&z={z}', {
        attribution: 'Traffic data © Google',
        opacity: 0.7,
        maxZoom: 18
      }),
      hereTraffic: L.tileLayer('https://2.traffic.maps.ls.hereapi.com/maptile/2.1/traffictile/newest/normal.traffic.day/{z}/{x}/{y}/512/png?min_traffic_congestion=heavy', {
        attribution: 'Traffic data © HERE',
        opacity: 0.6,
        maxZoom: 18
      }),
      tomtomFlow: L.tileLayer(`https://api.tomtom.com/traffic/map/4/tile/flow/absolute/{z}/{x}/{y}.png?key=YOUR_TOMTOM_KEY&thickness=10`, {
        attribution: 'Traffic data © TomTom',
        opacity: 0.7,
        maxZoom: 18
      }),
      mapboxTraffic: L.tileLayer('https://api.mapbox.com/styles/v1/mapbox/traffic-day-v2/tiles/{z}/{x}/{y}?access_token=YOUR_MAPBOX_TOKEN', {
        attribution: 'Traffic data © Mapbox',
        tileSize: 512,
        zoomOffset: -1,
        opacity: 0.7,
        maxZoom: 18
      })
    };
    
    // Combined overlays object
    const overlays = {
      "🌧️ Precipitation": weatherLayers.precipitation,
      "☁️ Clouds": weatherLayers.clouds,
      "🌡️ Temperature": weatherLayers.temperature,
      "💨 Wind": weatherLayers.wind,
      "📊 Pressure": weatherLayers.pressure,
      "🚗 Traffic (Google)": trafficLayers.googleTraffic,
      "🚦 Traffic Flow (HERE)": trafficLayers.hereTraffic,
      "🛣️ Traffic (TomTom)": trafficLayers.tomtomFlow,
      "🚙 Traffic (Mapbox)": trafficLayers.mapboxTraffic
    };
    
    // Add comprehensive layer control with combined overlays
    const layerControl = L.control.layers(baseMaps, overlays, {
      position: 'topright',
      collapsed: true
    }).addTo(flightMap);
    
    // Add precipitation, clouds, and traffic layers by default
    weatherLayers.precipitation.addTo(flightMap);
    weatherLayers.clouds.addTo(flightMap);
    trafficLayers.googleTraffic.addTo(flightMap);
    
    // Store references for later use
    flightMap.baseMaps = baseMaps;
    flightMap.weatherLayers = weatherLayers;
    flightMap.trafficLayers = trafficLayers;
    flightMap.layerControl = layerControl;
    
    // Add base location marker
    const baseIcon = L.divIcon({
      html: '<div style="background: #00d4ff; width: 10px; height: 10px; border-radius: 50%; border: 2px solid #fff; box-shadow: 0 0 10px rgba(0,212,255,0.8);"></div>',
      className: 'base-marker',
      iconSize: [14, 14],
      iconAnchor: [7, 7]
    });
    
    flightMap.baseLocationMarker = L.marker([CONFIG.location.lat, CONFIG.location.lon], { icon: baseIcon })
      .addTo(flightMap)
      .bindPopup(`<strong>Base Location</strong><br>${CONFIG.location.name}`);
    
    // Add tracking radius circle
    flightMap.trackingCircle = L.circle([CONFIG.location.lat, CONFIG.location.lon], {
      color: '#00d4ff',
      fillColor: '#00d4ff',
      fillOpacity: 0.1,
      radius: CONFIG.apis.flights.radius * 1000 // Convert km to meters
    }).addTo(flightMap);
    
    // Add weather legend
    addWeatherLegend();
    
    // Add map style indicator
    addMapStyleIndicator();
    
    // Listen for base layer changes to update flight marker styles
    flightMap.on('baselayerchange', function(e) {
      console.log('🗺️ Base layer changed to:', e.name);
      updateFlightMarkersForBaseMap(e.name);
      updateMapStyleIndicator(e.name);
    });
    
    console.log('✅ Flight map with weather overlay and base map selection initialized successfully');
  } catch (error) {
    console.error('❌ Flight map initialization failed:', error);
    // Show error in map container
    document.getElementById('flight-map').innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #ff6b6b; text-align: center;">
        <div>
          <div>⚠️ Map initialization failed</div>
          <div style="font-size: 12px; margin-top: 8px;">${error.message}</div>
        </div>
      </div>
    `;
  }
}

// Add map style indicator
function addMapStyleIndicator() {
  const indicator = L.control({ position: 'bottomright' });
  
  indicator.onAdd = function() {
    const div = L.DomUtil.create('div', 'map-style-indicator');
    div.innerHTML = `
      <div style="background: rgba(26, 26, 46, 0.9); padding: 6px 10px; border-radius: 4px; color: #00d4ff; font-size: 10px; font-weight: 600; border: 1px solid #2d3748;">
        🌙 Dark Mode
      </div>
    `;
    return div;
  };
  
  indicator.addTo(flightMap);
  flightMap.styleIndicator = indicator;
}

// Update map style indicator
function updateMapStyleIndicator(layerName) {
  if (flightMap.styleIndicator) {
    const indicatorElement = flightMap.styleIndicator.getContainer().querySelector('div');
    if (indicatorElement) {
      indicatorElement.innerHTML = layerName;
    }
  }
}

// Update flight markers based on base map for better visibility
function updateFlightMarkersForBaseMap(baseMapName) {
  const isDarkMap = baseMapName.includes('Dark');
  const isSatellite = baseMapName.includes('Satellite');
  
  // Update base location marker for visibility
  if (flightMap.baseLocationMarker) {
    const newIcon = L.divIcon({
      html: `<div style="background: #00d4ff; width: 12px; height: 12px; border-radius: 50%; border: 2px solid ${isDarkMap || isSatellite ? '#fff' : '#000'}; box-shadow: 0 0 10px rgba(0,212,255,0.8);"></div>`,
      className: 'base-marker',
      iconSize: [16, 16],
      iconAnchor: [8, 8]
    });
    flightMap.baseLocationMarker.setIcon(newIcon);
  }
  
  // Update tracking circle for visibility
  if (flightMap.trackingCircle) {
    flightMap.trackingCircle.setStyle({
      color: '#00d4ff',
      fillColor: '#00d4ff',
      fillOpacity: isDarkMap ? 0.1 : 0.05,
      weight: isDarkMap ? 2 : 3
    });
  }
  
  // Update flight markers if they exist
  flightMap.eachLayer(layer => {
    if (layer instanceof L.Marker && layer.options.flightData) {
      const flight = layer.options.flightData;
      const newIcon = createFlightIconForBaseMap(flight, isDarkMap, isSatellite);
      layer.setIcon(newIcon);
    }
  });
}

// Add weather and traffic legend to the map
function addWeatherLegend() {
  const legend = L.control({ position: 'bottomleft' });
  
  legend.onAdd = function() {
    const div = L.DomUtil.create('div', 'weather-legend');
    div.innerHTML = `
      <div style="background: rgba(26, 26, 46, 0.9); padding: 8px; border-radius: 6px; color: #fff; font-size: 11px; border: 1px solid #2d3748;">
        <div style="font-weight: 600; margin-bottom: 4px; color: #00d4ff;">Map Overlays</div>
        <div style="display: flex; gap: 16px;">
          <div>
            <div style="font-weight: 500; margin-bottom: 2px; color: #4fc3f7;">Weather</div>
            <div style="display: flex; flex-direction: column; gap: 1px; font-size: 10px;">
              <div><span style="color: #4fc3f7;">🌧️</span> Precipitation</div>
              <div><span style="color: #90a4ae;">☁️</span> Clouds</div>
              <div><span style="color: #ff7043;">🌡️</span> Temperature</div>
              <div><span style="color: #66bb6a;">💨</span> Wind</div>
              <div><span style="color: #ffa726;">📊</span> Pressure</div>
            </div>
          </div>
          <div>
            <div style="font-weight: 500; margin-bottom: 2px; color: #ff6b6b;">Traffic</div>
            <div style="display: flex; flex-direction: column; gap: 1px; font-size: 10px;">
              <div><span style="color: #4caf50;">🟢</span> Normal</div>
              <div><span style="color: #ff9800;">🟠</span> Moderate</div>
              <div><span style="color: #f44336;">🔴</span> Heavy</div>
              <div><span style="color: #9c27b0;">🟣</span> Severe</div>
            </div>
          </div>
        </div>
        <div style="font-size: 9px; color: #a0aec0; margin-top: 4px;">Use layer control (🗺️) to toggle</div>
      </div>
    `;
    return div;
  };
  
  legend.addTo(flightMap);
}

async function updateFlightPanel() {
  console.log('✈️ Starting flight panel update...');
  
  // Show loading state
  document.getElementById('flight-list').innerHTML = `
    <div class="loading" style="text-align: center; color: #a0aec0; padding: 20px;">
      Scanning for flights...
    </div>
  `;
  
  try {
    const bounds = calculateBoundingBox(CONFIG.location.lat, CONFIG.location.lon, CONFIG.apis.flights.radius);
    const url = `${CONFIG.apis.flights.baseUrl}?lamin=${bounds.south}&lomin=${bounds.west}&lamax=${bounds.north}&lomax=${bounds.east}`;
    
    console.log('📍 Search bounds:', bounds);
    console.log('📡 Base location:', CONFIG.location);
    
    let data;
    
    // Use IPC to fetch flight data through main process
    try {
      console.log('🌐 Fetching flights through IPC from:', url);
      data = await window.electronAPI.fetchFlightData(url);
      console.log('✅ Flight data received:', data);
      console.log('📊 Flight states count:', data.states ? data.states.length : 'No states');
    } catch (error) {
      console.error('❌ Flight API error:', error.message);
      throw error;
    }
    
    if (data && data.states && Array.isArray(data.states)) {
      const flights = processFlightData(data.states);
      console.log('✈️ Processed flights:', flights.length);
      updateFlightMap(flights);
      updateFlightList(flights);
      document.getElementById('flight-count').textContent = `${flights.length} flights`;
      console.log('✅ Flight panel updated successfully');
    } else {
      console.warn('⚠️ No flight states in response, using mock data');
      // Use mock flight data as fallback
      const mockFlights = generateMockFlights();
      updateFlightMap(mockFlights);
      updateFlightList(mockFlights);
      document.getElementById('flight-count').textContent = `${mockFlights.length} flights (demo)`;
    }
    
    updateLastUpdate('flights');
    
  } catch (error) {
    console.error('❌ Error updating flights:', error);
    console.log('🔄 Falling back to mock data');
    
    // Fallback to mock data
    const mockFlights = generateMockFlights();
    updateFlightMap(mockFlights);
    updateFlightList(mockFlights);
    document.getElementById('flight-count').textContent = `${mockFlights.length} flights (demo)`;
    
    document.getElementById('flight-list').innerHTML = `
      <div style="background: #2d3748; padding: 8px; border-radius: 4px; margin-bottom: 8px; font-size: 10px; color: #ffd93d;">
        ⚠️ Live data unavailable - showing demo flights
      </div>
      ${mockFlights.slice(0, 8).map(flight => `
        <div class="flight-item" style="cursor: pointer;" onclick="centerOnFlight(${flight.latitude}, ${flight.longitude}, '${flight.callsign}')">
          <div class="flight-callsign">${flight.callsign}</div>
          <div class="flight-details">
            ${flight.distance}km • ${flight.altitude}ft • ${flight.speed}kts
          </div>
        </div>
      `).join('')}`;
  }
}

// Generate mock flight data for demonstration
function generateMockFlights() {
  console.log('🎭 Generating mock flight data...');
  const mockFlights = [];
  const airlines = ['LH', 'BA', 'AF', 'KL', 'EW', 'U2', 'FR'];
  
  for (let i = 0; i < 8; i++) {
    // Generate random position within radius
    const angle = Math.random() * 2 * Math.PI;
    const distance = Math.random() * CONFIG.apis.flights.radius;
    const lat = CONFIG.location.lat + (distance / 111) * Math.cos(angle);
    const lon = CONFIG.location.lon + (distance / (111 * Math.cos(CONFIG.location.lat * Math.PI / 180))) * Math.sin(angle);
    
    const airline = airlines[Math.floor(Math.random() * airlines.length)];
    const flightNum = Math.floor(Math.random() * 9000) + 1000;
    
    mockFlights.push({
      icao24: `mock${i}`,
      callsign: `${airline}${flightNum}`,
      country: 'Germany',
      latitude: lat,
      longitude: lon,
      altitude: Math.floor(Math.random() * 35000) + 5000,
      speed: Math.floor(Math.random() * 400) + 200,
      heading: Math.floor(Math.random() * 360),
      distance: Math.round(distance),
      type: i < 3 ? 'commercial' : i < 6 ? 'cargo' : 'private'
    });
  }
  
  console.log('✅ Generated', mockFlights.length, 'mock flights');
  return mockFlights.sort((a, b) => a.distance - b.distance);
}

function processFlightData(states) {
  const flights = [];
  
  states.forEach(state => {
    const [icao24, callsign, origin_country, time_position, last_contact,
           longitude, latitude, baro_altitude, on_ground, velocity, true_track] = state;
    
    if (!latitude || !longitude || on_ground) return;
    
    const distance = calculateDistance(CONFIG.location.lat, CONFIG.location.lon, latitude, longitude);
    
    if (distance <= CONFIG.apis.flights.radius) {
      flights.push({
        icao24,
        callsign: callsign ? callsign.trim() : `N/A-${icao24.slice(-4)}`,
        country: origin_country,
        latitude,
        longitude,
        altitude: baro_altitude ? Math.round(baro_altitude * 3.28084) : 0,
        speed: velocity ? Math.round(velocity * 1.94384) : 0,
        heading: true_track || 0,
        distance: Math.round(distance)
      });
    }
  });
  
  return flights.sort((a, b) => a.distance - b.distance);
}

function updateFlightMap(flights) {
  console.log('Updating flight map with', flights.length, 'flights');
  
  // Clear existing flight markers (keep base location and circle)
  flightMap.eachLayer(layer => {
    if (layer instanceof L.Marker && layer.options.flightData) {
      flightMap.removeLayer(layer);
    }
  });
  
  // Add new flight markers
  flights.forEach(flight => {
    const icon = createFlightIcon(flight);
    const marker = L.marker([flight.latitude, flight.longitude], { 
      icon: icon,
      flightData: flight // Store flight data for later reference
    });
    
    // Create popup content
    const popupContent = `
      <div style="min-width: 200px; font-family: 'Segoe UI', sans-serif;">
        <h3 style="margin: 0 0 8px 0; color: #00d4ff; font-size: 14px;">${flight.callsign}</h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; font-size: 12px;">
          <div><strong>Altitude:</strong></div><div>${flight.altitude.toLocaleString()} ft</div>
          <div><strong>Speed:</strong></div><div>${flight.speed} kts</div>
          <div><strong>Distance:</strong></div><div>${flight.distance} km</div>
          <div><strong>Country:</strong></div><div>${flight.country}</div>
          <div><strong>Heading:</strong></div><div>${Math.round(flight.heading)}°</div>
        </div>
      </div>
    `;
    
    marker.bindPopup(popupContent);
    marker.addTo(flightMap);
  });
}

// Add traffic incidents to the map
async function addTrafficIncidents() {
  try {
    // HERE Traffic Incidents API (free tier available)
    const bounds = calculateBoundingBox(CONFIG.location.lat, CONFIG.location.lon, CONFIG.apis.flights.radius);
    const bbox = `${bounds.west},${bounds.south},${bounds.east},${bounds.north}`;
    
    // Note: You'll need to sign up for a free HERE API key at developer.here.com
    const hereApiKey = 'YOUR_HERE_API_KEY';
    const incidentsUrl = `https://data.traffic.hereapi.com/v7/incidents?locationReferencing=shape&bbox=${bbox}&apiKey=${hereApiKey}`;
    
    // For now, let's add some mock incidents
    const mockIncidents = [
      {
        type: 'accident',
        severity: 'major',
        description: 'Multi-vehicle accident on A3',
        lat: CONFIG.location.lat + 0.05,
        lon: CONFIG.location.lon + 0.03,
        delay: '15 min'
      },
      {
        type: 'construction',
        severity: 'minor',
        description: 'Lane closure on B455',
        lat: CONFIG.location.lat - 0.03,
        lon: CONFIG.location.lon + 0.02,
        delay: '5 min'
      },
      {
        type: 'congestion',
        severity: 'moderate',
        description: 'Heavy traffic on A66',
        lat: CONFIG.location.lat + 0.02,
        lon: CONFIG.location.lon - 0.04,
        delay: '10 min'
      }
    ];
    
    // Clear existing incident markers
    flightMap.eachLayer(layer => {
      if (layer.options && layer.options.isIncident) {
        flightMap.removeLayer(layer);
      }
    });
    
    // Add incident markers
    mockIncidents.forEach(incident => {
      const icon = createIncidentIcon(incident.type, incident.severity);
      const marker = L.marker([incident.lat, incident.lon], { 
        icon: icon,
        isIncident: true
      });
      
      const popupContent = `
        <div style="min-width: 180px; font-family: 'Segoe UI', sans-serif;">
          <h3 style="margin: 0 0 6px 0; color: #ff6b6b; font-size: 13px; text-transform: capitalize;">
            ${incident.type}
          </h3>
          <div style="font-size: 11px;">
            <div style="margin-bottom: 4px;">${incident.description}</div>
            <div style="color: #ffd93d;"><strong>Delay:</strong> ${incident.delay}</div>
            <div style="color: #a0aec0; text-transform: capitalize;">
              <strong>Severity:</strong> ${incident.severity}
            </div>
          </div>
        </div>
      `;
      
      marker.bindPopup(popupContent);
      marker.addTo(flightMap);
    });
    
  } catch (error) {
    console.error('Error loading traffic incidents:', error);
  }
}

// Create traffic incident icon
function createIncidentIcon(type, severity) {
  const icons = {
    accident: '🚗',
    construction: '🚧',
    congestion: '🚦',
    closure: '⛔',
    event: '📍'
  };
  
  const colors = {
    minor: '#ffd93d',
    moderate: '#ff9800',
    major: '#f44336',
    severe: '#9c27b0'
  };
  
  const icon = icons[type] || '⚠️';
  const color = colors[severity] || '#ff6b6b';
  
  return L.divIcon({
    html: `
      <div style="
        background: ${color};
        width: 24px;
        height: 24px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        border: 2px solid #fff;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      ">${icon}</div>
    `,
    className: 'incident-icon',
    iconSize: [28, 28],
    iconAnchor: [14, 14]
  });
}

// Create flight icon based on type and heading, adapted for base map
function createFlightIconForBaseMap(flight, isDarkMap = true, isSatellite = false) {
  const colors = {
    commercial: '#00d4ff',
    cargo: '#ff6b35',
    private: '#4ecdc4'
  };
  
  const color = colors[flight.type] || colors.private;
  const rotation = flight.heading || 0;
  
  // Adjust icon styling based on base map
  const borderColor = isDarkMap || isSatellite ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';
  const shadowIntensity = isDarkMap ? '0.8' : '0.4';
  
  return L.divIcon({
    html: `
      <div style="
        transform: rotate(${rotation}deg);
        width: 16px;
        height: 16px;
        background: ${color};
        clip-path: polygon(50% 0%, 0% 100%, 100% 100%);
        filter: drop-shadow(0 0 3px rgba(0,0,0,${shadowIntensity}));
        border: 1px solid ${borderColor};
      "></div>
    `,
    className: 'flight-icon',
    iconSize: [16, 16],
    iconAnchor: [8, 8]
  });
}

// Create flight icon based on type and heading
function createFlightIcon(flight) {
  // Check current base map if available
  let isDarkMap = true;
  let isSatellite = false;
  
  if (flightMap && flightMap.styleIndicator) {
    const currentStyle = flightMap.styleIndicator.getContainer().textContent;
    isDarkMap = currentStyle.includes('Dark');
    isSatellite = currentStyle.includes('Satellite');
  }
  
  return createFlightIconForBaseMap(flight, isDarkMap, isSatellite);
}

function updateFlightList(flights) {
  const container = document.getElementById('flight-list');
  
  if (flights.length === 0) {
    container.innerHTML = '<div class="no-data" style="text-align: center; color: #4a5568; padding: 20px; font-style: italic;">No flights detected in tracking area</div>';
    return;
  }
  
  // Sort flights by selected criteria
  const sortBy = document.getElementById('sort-filter').value;
  const sortedFlights = [...flights].sort((a, b) => {
    switch (sortBy) {
      case 'distance': return a.distance - b.distance;
      case 'altitude': return b.altitude - a.altitude;
      case 'speed': return b.speed - a.speed;
      default: return a.distance - b.distance;
    }
  });
  
  container.innerHTML = sortedFlights.slice(0, 12).map(flight => `
    <div class="flight-item" style="cursor: pointer;" onclick="centerOnFlight(${flight.latitude}, ${flight.longitude}, '${flight.callsign}')">
      <div class="flight-callsign">${flight.callsign}</div>
      <div class="flight-details">
        ${flight.distance}km • ${flight.altitude}ft • ${flight.speed}kts
      </div>
    </div>
  `).join('');
}

// Function to center map on selected flight
function centerOnFlight(lat, lon, callsign) {
  if (flightMap) {
    flightMap.setView([lat, lon], 12);
    
    // Find and open the popup for this flight
    flightMap.eachLayer(layer => {
      if (layer instanceof L.Marker && layer.getPopup()) {
        const popup = layer.getPopup();
        if (popup.getContent().includes(callsign)) {
          layer.openPopup();
        }
      }
    });
  }
}

// System Monitor Functions
async function updateSystemPanel() {
  try {
    // Simulate system metrics (you'd use real system APIs in production)
    const cpuUsage = Math.random() * 100;
    const memoryUsage = Math.random() * 16; // GB
    
    // Simulate multiple hard drives with more variety
    const drives = [
      {
        letter: 'C:',
        type: 'System SSD',
        used: 180 + Math.random() * 120, // GB
        total: 500,
        percentage: null,
        free: null
      },
      {
        letter: 'D:',
        type: 'Data HDD',
        used: 950 + Math.random() * 300, // GB
        total: 2000,
        percentage: null,
        free: null
      },
      {
        letter: 'E:',
        type: 'Backup HDD',
        used: 1800 + Math.random() * 800, // GB
        total: 4000,
        percentage: null,
        free: null
      },
      {
        letter: 'F:',
        type: 'Media SSD',
        used: 400 + Math.random() * 200, // GB
        total: 1000,
        percentage: null,
        free: null
      },
      {
        letter: 'G:',
        type: 'Archive HDD',
        used: 4500 + Math.random() * 1000, // GB
        total: 8000,
        percentage: null,
        free: null
      }
    ];
    
    // Calculate percentages and free space
    drives.forEach(drive => {
      drive.percentage = (drive.used / drive.total) * 100;
      drive.free = drive.total - drive.used;
    });
    
    // Update CPU and Memory display (no bars)
    document.getElementById('cpu-usage').textContent = `${Math.round(cpuUsage)}%`;
    document.getElementById('memory-usage').textContent = `${memoryUsage.toFixed(1)} GB`;
    
    // Update drives display
    const drivesContainer = document.getElementById('drives-list');
    drivesContainer.innerHTML = drives.map(drive => {
      const usedSpace = drive.used.toFixed(0);
      const freeSpace = drive.free.toFixed(0);
      const totalSpace = drive.total.toFixed(0);
      const percentage = drive.percentage.toFixed(1);
      
      // Determine warning level for color coding
      let percentageClass = 'normal';
      if (drive.percentage > 90) percentageClass = 'critical';
      else if (drive.percentage > 75) percentageClass = 'warning';
      
      return `
        <div class="drive-item">
          <div class="drive-info">
            <div class="drive-letter">${drive.letter}</div>
            <div class="drive-type">${drive.type}</div>
          </div>
          <div class="drive-usage">
            <div class="drive-percentage ${percentageClass}">${percentage}%</div>
            <div class="drive-space">${usedSpace}/${totalSpace} GB</div>
            <div class="drive-free">${freeSpace} GB free</div>
          </div>
        </div>
      `;
    }).join('');
    
    updateLastUpdate('system');
    
  } catch (error) {
    console.error('Error updating system metrics:', error);
    document.getElementById('drives-list').innerHTML = '<div class="error">System data unavailable</div>';
  }
}

// Traffic Panel Functions
async function updateTrafficPanel() {
  try {
    // Calculate traffic conditions based on the visible traffic layer
    const routes = [
      { 
        route: 'A3 to Frankfurt', 
        distance: '28 km',
        normalTime: 20,
        currentTime: 25,
        status: 'moderate',
        incidents: 1
      },
      { 
        route: 'B455 to Wiesbaden', 
        distance: '15 km',
        normalTime: 12,
        currentTime: 15,
        status: 'heavy',
        incidents: 0
      },
      { 
        route: 'A66 to Mainz', 
        distance: '42 km',
        normalTime: 30,
        currentTime: 35,
        status: 'light',
        incidents: 2
      },
      { 
        route: 'L3014 Local', 
        distance: '8 km',
        normalTime: 8,
        currentTime: 8,
        status: 'normal',
        incidents: 0
      }
    ];
    
    // Calculate overall traffic condition
    const heavyRoutes = routes.filter(r => r.status === 'heavy').length;
    const moderateRoutes = routes.filter(r => r.status === 'moderate').length;
    let overallStatus = 'Normal';
    let statusColor = '#4caf50';
    
    if (heavyRoutes > 1) {
      overallStatus = 'Heavy';
      statusColor = '#f44336';
    } else if (heavyRoutes > 0 || moderateRoutes > 1) {
      overallStatus = 'Moderate';
      statusColor = '#ff9800';
    } else if (moderateRoutes > 0) {
      overallStatus = 'Light';
      statusColor = '#ffd93d';
    }
    
    const statusHTML = `
      <div class="traffic-condition">
        <span>Overall Traffic</span>
        <span style="color: ${statusColor}; font-weight: 600;">${overallStatus}</span>
      </div>
      <div style="margin-top: 8px; font-size: 10px; color: #a0aec0;">
        ${routes.reduce((sum, r) => sum + r.incidents, 0)} active incidents in area
      </div>
    `;
    
    const routesHTML = routes.map(route => {
      const delay = route.currentTime - route.normalTime;
      const delayText = delay > 0 ? `+${delay}min` : 'on time';
      const statusColors = {
        normal: '#4caf50',
        light: '#ffd93d',
        moderate: '#ff9800',
        heavy: '#f44336'
      };
      
      return `
        <div class="traffic-route" style="background: #16213e; padding: 10px; border-radius: 4px; margin-bottom: 6px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
            <span style="font-weight: 500;">${route.route}</span>
            <span class="route-time" style="color: ${statusColors[route.status]};">
              ${route.currentTime} min
            </span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 10px; color: #a0aec0;">
            <span>${route.distance}</span>
            <span style="color: ${delay > 0 ? '#ff9800' : '#4caf50'};">${delayText}</span>
          </div>
          ${route.incidents > 0 ? `
            <div style="font-size: 9px; color: #ff6b6b; margin-top: 4px;">
              ⚠️ ${route.incidents} incident${route.incidents > 1 ? 's' : ''}
            </div>
          ` : ''}
        </div>
      `;
    }).join('');
    
    document.getElementById('traffic-status').innerHTML = statusHTML;
    document.getElementById('traffic-routes').innerHTML = `
      <div style="margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
        <h4 style="font-size: 12px; color: #00d4ff; margin: 0;">Popular Routes</h4>
        <button onclick="centerMapOnTraffic()" style="background: #2d3748; border: 1px solid #4a5568; color: #00d4ff; padding: 2px 8px; border-radius: 3px; font-size: 10px; cursor: pointer;">
          View on Map
        </button>
      </div>
      ${routesHTML}
    `;
    
    // Update traffic incidents on map
    await addTrafficIncidents();
    
    updateLastUpdate('traffic');
    
  } catch (error) {
    console.error('Error updating traffic:', error);
    document.getElementById('traffic-status').innerHTML = '<div class="error">Traffic data unavailable</div>';
  }
}

// Center map on traffic area
function centerMapOnTraffic() {
  if (flightMap) {
    // Zoom out to show broader traffic area
    flightMap.setView([CONFIG.location.lat, CONFIG.location.lon], 10);
    
    // Enable traffic layer if not already
    if (!flightMap.hasLayer(flightMap.trafficLayers.googleTraffic)) {
      flightMap.trafficLayers.googleTraffic.addTo(flightMap);
    }
  }
}

// Calendar and Tasks Functions
async function updateCalendarPanel() {
  try {
    // Simulate calendar events (you'd integrate with Google Calendar API in production)
    const todayEvents = [
      { time: '09:00', title: 'Team Meeting' },
      { time: '14:30', title: 'Doctor Appointment' }
    ];
    
    const upcomingEvents = [
      { time: 'Tomorrow 10:00', title: 'Project Review' },
      { time: 'Thu 16:00', title: 'Client Call' }
    ];
    
    document.getElementById('today-events-list').innerHTML = 
      todayEvents.length ? todayEvents.map(event => `
        <div class="event-item">
          <span class="event-time">${event.time}</span>
          <span class="event-title">${event.title}</span>
        </div>
      `).join('') : '<div class="no-data">No events today</div>';
    
    document.getElementById('upcoming-events-list').innerHTML = 
      upcomingEvents.map(event => `
        <div class="event-item">
          <span class="event-time">${event.time}</span>
          <span class="event-title">${event.title}</span>
        </div>
      `).join('');
    
    updateLastUpdate('calendar');
    
  } catch (error) {
    console.error('Error updating calendar:', error);
  }
}

// Tasks Management Functions
function loadTasks() {
  console.log('📋 Loading tasks from localStorage...');
  try {
    const savedTasks = localStorage.getItem('dashboard-tasks');
    if (savedTasks) {
      tasks = JSON.parse(savedTasks);
      console.log('✅ Loaded', tasks.length, 'saved tasks');
    } else {
      // Default tasks
      tasks = [
        { id: 1, text: 'Check weather forecast', priority: 'low', completed: true },
        { id: 2, text: 'Review flight schedules', priority: 'medium', completed: false },
        { id: 3, text: 'Update system monitoring', priority: 'high', completed: false }
      ];
      console.log('✅ Created default tasks');
    }
    renderTasks();
  } catch (error) {
    console.error('❌ Error loading tasks:', error);
    // Create empty tasks array as fallback
    tasks = [];
    renderTasks();
  }
}

function saveTasks() {
  localStorage.setItem('dashboard-tasks', JSON.stringify(tasks));
}

function renderTasks(filter = 'all') {
  let filteredTasks = tasks;
  
  if (filter === 'pending') {
    filteredTasks = tasks.filter(task => !task.completed);
  } else if (filter === 'completed') {
    filteredTasks = tasks.filter(task => task.completed);
  }
  
  const container = document.getElementById('task-list');
  container.innerHTML = filteredTasks.map(task => `
    <div class="task-item">
      <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''} 
             onchange="toggleTask(${task.id})">
      <span class="task-text ${task.completed ? 'completed' : ''}">${task.text}</span>
      <span class="task-priority ${task.priority}">${task.priority}</span>
      <button onclick="deleteTask(${task.id})" style="background: none; border: none; color: #ff6b6b; cursor: pointer;">✕</button>
    </div>
  `).join('');
}

function showAddTaskForm() {
  document.getElementById('add-task-form').style.display = 'flex';
  document.getElementById('new-task-input').focus();
}

function hideAddTaskForm() {
  document.getElementById('add-task-form').style.display = 'none';
  document.getElementById('new-task-input').value = '';
}

function saveNewTask() {
  const text = document.getElementById('new-task-input').value.trim();
  const priority = document.getElementById('task-priority').value;
  
  if (text) {
    const newTask = {
      id: Date.now(),
      text: text,
      priority: priority,
      completed: false
    };
    
    tasks.unshift(newTask);
    saveTasks();
    renderTasks();
    hideAddTaskForm();
  }
}

function toggleTask(id) {
  const task = tasks.find(t => t.id === id);
  if (task) {
    task.completed = !task.completed;
    saveTasks();
    renderTasks();
  }
}

function deleteTask(id) {
  tasks = tasks.filter(t => t.id !== id);
  saveTasks();
  renderTasks();
}

function filterTasks(filter) {
  document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelector(`[data-filter="${filter}"]`).classList.add('active');
  renderTasks(filter);
}

// Utility Functions
function calculateBoundingBox(lat, lon, radiusKm) {
  const radiusDeg = radiusKm / 111.32;
  return {
    north: lat + radiusDeg,
    south: lat - radiusDeg,
    east: lon + radiusDeg,
    west: lon - radiusDeg
  };
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function updateLastUpdate(panel) {
  const now = new Date();
  const timeString = now.toLocaleTimeString('en-US', { 
    hour12: false, 
    hour: '2-digit', 
    minute: '2-digit' 
  });
  document.getElementById(`${panel}-last-update`).textContent = timeString;
}

// Control Functions
function refreshAllPanels() {
  updateWeatherPanel();
  updateFlightPanel();
  updateSystemPanel();
  updateTrafficPanel();
  updateCalendarPanel();
  refreshWeatherOverlay();
}

function refreshPanel(panel) {
  switch (panel) {
    case 'weather': 
      updateWeatherPanel(); 
      refreshWeatherOverlay();
      break;
    case 'flights': 
      updateFlightPanel(); 
      addTrafficIncidents(); // Add this line
      refreshWeatherOverlay();
      break;
    case 'system': updateSystemPanel(); break;
    case 'traffic': updateTrafficPanel(); break;
    case 'calendar': updateCalendarPanel(); break;
  }
}

// Refresh weather overlay on the map
function refreshWeatherOverlay() {
  if (flightMap) {
    console.log('🌤️ Refreshing weather overlay on map...');
    
    // Force refresh of weather tiles by adding a timestamp parameter
    const timestamp = Date.now();
    
    flightMap.eachLayer(layer => {
      if (layer._url && layer._url.includes('openweathermap.org')) {
        // Update the URL with a cache-busting parameter
        const originalUrl = layer._url.split('?')[0];
        layer.setUrl(originalUrl + `?appid=${CONFIG.apis.weather.key}&_t=${timestamp}`);
      }
    });
    
    console.log('✅ Weather overlay refreshed');
  }
}

function openSettings() {
  // Implement settings modal
  alert('Settings panel - coming soon!');
}

function minimizeWindow() {
  // This would need to communicate with the main process
  window.close();
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  Object.values(updateTimers).forEach(timer => clearInterval(timer));
});
