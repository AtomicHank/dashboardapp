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
      key: '2f8a680af17b41428c644f8bf2d43dda',
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
  initializeDashboard();
  startUpdateCycles();
  setupEventListeners();
});

// Initialize all dashboard components
function initializeDashboard() {
  console.log('Initializing Personal Dashboard...');
  
  // Start the clock immediately
  updateClock();
  
  // Initialize flight map
  initializeFlightMap();
  
  // Initialize system monitoring chart
  initializeSystemChart();
  
  // Load saved tasks
  loadTasks();
  
  // Initial data load for all panels
  updateWeatherPanel();
  updateFlightPanel();
  updateSystemPanel();
  updateTrafficPanel();
  updateCalendarPanel();
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
  try {
    console.log('Updating weather panel...');
    const currentUrl = `${CONFIG.apis.weather.baseUrl}/weather?lat=${CONFIG.location.lat}&lon=${CONFIG.location.lon}&appid=${CONFIG.apis.weather.key}&units=metric`;
    const forecastUrl = `${CONFIG.apis.weather.baseUrl}/forecast?lat=${CONFIG.location.lat}&lon=${CONFIG.location.lon}&appid=${CONFIG.apis.weather.key}&units=metric`;
    
    console.log('Fetching weather from:', currentUrl);
    
    const [currentRes, forecastRes] = await Promise.all([
      fetch(currentUrl),
      fetch(forecastUrl)
    ]);
    
    if (!currentRes.ok || !forecastRes.ok) {
      console.error('Weather API response not ok:', currentRes.status, forecastRes.status);
      throw new Error(`Failed to fetch weather data: ${currentRes.status}, ${forecastRes.status}`);
    }
    
    const current = await currentRes.json();
    const forecast = await forecastRes.json();
    
    console.log('Weather data received:', current);
    
    // Update current weather
    document.getElementById('weather-current').innerHTML = `
      <div class="weather-info">
        <div class="temp-main" style="font-size: 28px; font-weight: bold; color: #00d4ff;">${Math.round(current.main.temp)}°C</div>
        <div class="weather-desc" style="text-transform: capitalize; margin: 8px 0; color: #a0aec0;">${current.weather[0].description}</div>
        <div class="weather-details" style="font-size: 12px; color: #a0aec0;">
          <div>Feels like: ${Math.round(current.main.feels_like)}°C</div>
          <div>Humidity: ${current.main.humidity}%</div>
          <div>Wind: ${current.wind.speed} m/s</div>
          <div>Pressure: ${current.main.pressure} hPa</div>
        </div>
      </div>
      <div class="weather-icon" style="font-size: 48px; text-align: center;">
        ${getWeatherIcon(current.weather[0].main)}
      </div>
    `;
    
    // Update forecast
    const forecastHTML = forecast.list.slice(0, 5).map(item => {
      const date = new Date(item.dt * 1000);
      const time = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      
      return `
        <div class="forecast-day">
          <div class="forecast-time">${time}</div>
          <div class="forecast-icon">${getWeatherIcon(item.weather[0].main)}</div>
          <div class="forecast-temp">${Math.round(item.main.temp)}°</div>
        </div>
      `;
    }).join('');
    
    document.getElementById('weather-forecast').innerHTML = forecastHTML;
    updateLastUpdate('weather');
    
  } catch (error) {
    console.error('Error updating weather:', error);
    document.getElementById('weather-current').innerHTML = `
      <div class="error" style="color: #ff6b6b; text-align: center; padding: 20px;">
        <div>Weather data unavailable</div>
        <div style="font-size: 12px; margin-top: 8px;">Check API key or connection</div>
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
  console.log('Initializing flight map...');
  flightMap = L.map('flight-map').setView([CONFIG.location.lat, CONFIG.location.lon], 9);
  
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
    subdomains: 'abcd',
    maxZoom: 12
  }).addTo(flightMap);
  
  // Add base location marker
  const baseIcon = L.divIcon({
    html: '<div style="background: #00d4ff; width: 10px; height: 10px; border-radius: 50%; border: 2px solid #fff; box-shadow: 0 0 10px rgba(0,212,255,0.8);"></div>',
    className: 'base-marker',
    iconSize: [14, 14],
    iconAnchor: [7, 7]
  });
  
  L.marker([CONFIG.location.lat, CONFIG.location.lon], { icon: baseIcon })
    .addTo(flightMap)
    .bindPopup(`<strong>Base Location</strong><br>${CONFIG.location.name}`);
  
  // Add tracking radius circle
  L.circle([CONFIG.location.lat, CONFIG.location.lon], {
    color: '#00d4ff',
    fillColor: '#00d4ff',
    fillOpacity: 0.1,
    radius: CONFIG.apis.flights.radius * 1000 // Convert km to meters
  }).addTo(flightMap);
  
  console.log('Flight map initialized');
}

async function updateFlightPanel() {
  try {
    console.log('Updating flight panel...');
    const bounds = calculateBoundingBox(CONFIG.location.lat, CONFIG.location.lon, CONFIG.apis.flights.radius);
    const url = `${CONFIG.apis.flights.baseUrl}?lamin=${bounds.south}&lomin=${bounds.west}&lamax=${bounds.north}&lomax=${bounds.east}`;
    
    console.log('Fetching flights from:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });
    
    if (!response.ok) {
      console.error('Flight API response not ok:', response.status, response.statusText);
      throw new Error(`Flight API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('Flight data received:', data);
    
    if (data && data.states && Array.isArray(data.states)) {
      const flights = processFlightData(data.states);
      console.log('Processed flights:', flights.length);
      updateFlightMap(flights);
      updateFlightList(flights);
      document.getElementById('flight-count').textContent = `${flights.length} flights`;
    } else {
      console.warn('No flight states in response:', data);
      document.getElementById('flight-list').innerHTML = '<div class="no-data">No flights detected in area</div>';
      document.getElementById('flight-count').textContent = '0 flights';
    }
    
    updateLastUpdate('flights');
    
  } catch (error) {
    console.error('Error updating flights:', error);
    document.getElementById('flight-list').innerHTML = `
      <div class="error" style="color: #ff6b6b; text-align: center; padding: 20px;">
        <div>Flight data unavailable</div>
        <div style="font-size: 12px; margin-top: 8px;">${error.message}</div>
      </div>
    `;
    document.getElementById('flight-count').textContent = 'Error';
  }
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
    if (layer instanceof L.Marker && !layer.options.isBase) {
      flightMap.removeLayer(layer);
    }
  });
  
  // Add new flight markers
  flights.forEach(flight => {
    const icon = createFlightIcon(flight);
    const marker = L.marker([flight.latitude, flight.longitude], { 
      icon: icon,
      isBase: false
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

// Create flight icon based on type and heading
function createFlightIcon(flight) {
  const colors = {
    commercial: '#00d4ff',
    cargo: '#ff6b35',
    private: '#4ecdc4'
  };
  
  const color = colors[flight.type] || colors.private;
  const rotation = flight.heading || 0;
  
  return L.divIcon({
    html: `
      <div style="
        transform: rotate(${rotation}deg);
        width: 16px;
        height: 16px;
        background: ${color};
        clip-path: polygon(50% 0%, 0% 100%, 100% 100%);
        filter: drop-shadow(0 0 3px rgba(0,0,0,0.8));
        border: 1px solid rgba(255,255,255,0.3);
      "></div>
    `,
    className: 'flight-icon',
    iconSize: [16, 16],
    iconAnchor: [8, 8]
  });
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
function initializeSystemChart() {
  const ctx = document.getElementById('system-chart').getContext('2d');
  systemChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: Array(30).fill('').map((_, i) => i),
      datasets: [{
        label: 'CPU %',
        data: Array(30).fill(0),
        borderColor: '#00d4ff',
        backgroundColor: 'rgba(0, 212, 255, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: { display: false },
        y: { 
          display: false,
          min: 0,
          max: 100
        }
      },
      elements: {
        point: { radius: 0 }
      }
    }
  });
}

async function updateSystemPanel() {
  try {
    // Simulate system metrics (you'd use real system APIs in production)
    const cpuUsage = Math.random() * 100;
    const memoryUsage = Math.random() * 16; // GB
    const diskUsage = Math.random() * 100;
    
    // Update metrics display
    document.getElementById('cpu-usage').textContent = `${Math.round(cpuUsage)}%`;
    document.getElementById('memory-usage').textContent = `${memoryUsage.toFixed(1)} GB`;
    document.getElementById('disk-usage').textContent = `${Math.round(diskUsage)}%`;
    
    // Update progress bars
    document.getElementById('cpu-bar').style.width = `${cpuUsage}%`;
    document.getElementById('memory-bar').style.width = `${(memoryUsage / 16) * 100}%`;
    document.getElementById('disk-bar').style.width = `${diskUsage}%`;
    
    // Update chart
    if (systemChart) {
      systemChart.data.datasets[0].data.shift();
      systemChart.data.datasets[0].data.push(cpuUsage);
      systemChart.update('none');
    }
    
    updateLastUpdate('system');
    
  } catch (error) {
    console.error('Error updating system metrics:', error);
  }
}

// Traffic Panel Functions
async function updateTrafficPanel() {
  try {
    // Simulate traffic data (you'd use Google Maps Traffic API in production)
    const trafficConditions = [
      { route: 'A3 to Frankfurt', time: '25 min', status: 'moderate' },
      { route: 'B455 to Wiesbaden', time: '15 min', status: 'light' },
      { route: 'A66 to Mainz', time: '35 min', status: 'heavy' }
    ];
    
    const statusHTML = `
      <div class="traffic-condition">
        <span>Overall Traffic</span>
        <span style="color: #ffd93d;">Moderate</span>
      </div>
    `;
    
    const routesHTML = trafficConditions.map(route => `
      <div class="traffic-route">
        <span>${route.route}</span>
        <span class="route-time">${route.time}</span>
      </div>
    `).join('');
    
    document.getElementById('traffic-status').innerHTML = statusHTML;
    document.getElementById('traffic-routes').innerHTML = routesHTML;
    
    updateLastUpdate('traffic');
    
  } catch (error) {
    console.error('Error updating traffic:', error);
    document.getElementById('traffic-status').innerHTML = '<div class="error">Traffic data unavailable</div>';
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

// Task Management Functions
function loadTasks() {
  const savedTasks = localStorage.getItem('dashboard-tasks');
  if (savedTasks) {
    tasks = JSON.parse(savedTasks);
  } else {
    // Default tasks
    tasks = [
      { id: 1, text: 'Check weather forecast', priority: 'low', completed: true },
      { id: 2, text: 'Review flight schedules', priority: 'medium', completed: false },
      { id: 3, text: 'Update system monitoring', priority: 'high', completed: false }
    ];
  }
  renderTasks();
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
}

function refreshPanel(panel) {
  switch (panel) {
    case 'weather': updateWeatherPanel(); break;
    case 'flights': updateFlightPanel(); break;
    case 'system': updateSystemPanel(); break;
    case 'traffic': updateTrafficPanel(); break;
    case 'calendar': updateCalendarPanel(); break;
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