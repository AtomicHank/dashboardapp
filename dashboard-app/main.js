const { app, BrowserWindow, screen, Menu, Tray, globalShortcut, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');

// IPC handler for flight data (avoids CORS in renderer)
ipcMain.handle('fetch-flight-data', async (event, url) => {
  return new Promise((resolve, reject) => {
    console.log('🌐 Main process fetching flight data from:', url);
    
    const request = https.get(url, {
      headers: {
        'User-Agent': 'PersonalDashboard/1.0',
        'Accept': 'application/json'
      }
    }, (response) => {
      let data = '';
      
      console.log('📡 Flight API response status:', response.statusCode);
      
      response.on('data', (chunk) => {
        data += chunk;
      });
      
      response.on('end', () => {
        try {
          if (response.statusCode === 200) {
            const jsonData = JSON.parse(data);
            console.log('✅ Flight data received in main process');
            resolve(jsonData);
          } else {
            console.error('❌ Flight API error status:', response.statusCode);
            reject(new Error(`HTTP ${response.statusCode}: ${data}`));
          }
        } catch (error) {
          console.error('❌ Error parsing flight data:', error);
          reject(error);
        }
      });
    });
    
    request.on('error', (error) => {
      console.error('❌ Flight request error:', error);
      reject(error);
    });
    
    request.setTimeout(10000, () => {
      console.error('❌ Flight request timeout');
      reject(new Error('Request timeout'));
    });
  });
});

// Path to store window state
const windowStateFile = path.join(__dirname, 'window-state.json');

// Global variables
let mainWindow;
let tray;

// Load saved window state
function loadWindowState() {
  try {
    if (fs.existsSync(windowStateFile)) {
      const data = fs.readFileSync(windowStateFile, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.log('Error loading window state:', error);
  }
  return null;
}

// Save window state
function saveWindowState(win) {
  try {
    const bounds = win.getBounds();
    const state = {
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      isMaximized: win.isMaximized(),
      isMinimized: win.isMinimized()
    };
    console.log('Saving window state:', state);
    fs.writeFileSync(windowStateFile, JSON.stringify(state, null, 2));
  } catch (error) {
    console.log('Error saving window state:', error);
  }
}

// Enhanced window position validation
function isValidPosition(state) {
  const displays = screen.getAllDisplays();
  
  for (const display of displays) {
    const { x, y, width, height } = display.bounds;
    
    // Check if the window position is within reasonable bounds of this display
    const tolerance = 100; // pixels
    
    if (state.x >= x - tolerance && 
        state.x < x + width - tolerance &&
        state.y >= y - tolerance && 
        state.y < y + height - tolerance) {
      console.log('Window position is valid on display:', display.bounds);
      return true;
    }
  }
  
  console.log('Window position is invalid - outside all display bounds');
  return false;
}

// Get the best screen for the dashboard (prefer largest screen)
function getBestScreen() {
  const displays = screen.getAllDisplays();
  
  // Sort by screen area (largest first)
  displays.sort((a, b) => {
    const areaA = a.bounds.width * a.bounds.height;
    const areaB = b.bounds.width * b.bounds.height;
    return areaB - areaA;
  });
  
  return displays[0]; // Return largest screen
}

// Calculate centered position on a display
function getCenteredPosition(display, width, height) {
  const { x, y, width: displayWidth, height: displayHeight } = display.bounds;
  
  return {
    x: x + Math.floor((displayWidth - width) / 2),
    y: y + Math.floor((displayHeight - height) / 2)
  };
}

// Create system tray
function createTray() {
  // You can add a tray icon file to your project
  // const iconPath = path.join(__dirname, 'assets', 'tray-icon.png');
  
  // For now, we'll skip the tray icon - uncomment above when you have an icon
  // tray = new Tray(iconPath);
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show Dashboard',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    },
    {
      label: 'Hide Dashboard',
      click: () => {
        if (mainWindow) {
          mainWindow.hide();
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Refresh All Panels',
      click: () => {
        if (mainWindow) {
          mainWindow.webContents.send('refresh-all-panels');
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Exit Dashboard',
      click: () => {
        app.quit();
      }
    }
  ]);
  
  if (tray) {
    tray.setContextMenu(contextMenu);
    tray.setToolTip('Personal Dashboard');
  }
}

function createWindow() {
  // Load previous window state
  const savedState = loadWindowState();
  
  // Default window dimensions (optimized for dashboard)
  const bestScreen = getBestScreen();
  const defaultWidth = Math.min(1600, bestScreen.bounds.width - 100);
  const defaultHeight = Math.min(1000, bestScreen.bounds.height - 100);
  
  // Default window options
  let windowOptions = {
    width: defaultWidth,
    height: defaultHeight,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js')
    },
    show: false, // Don't show until ready
    title: 'Personal Dashboard',
    icon: path.join(__dirname, 'assets', 'icon.png'), // Optional: add app icon
    minWidth: 1200,
    minHeight: 800,
    webSecurity: false // Disable web security for API access
  };

  // If we have a saved state and it's valid, use it
  if (savedState && isValidPosition(savedState)) {
    console.log('Using saved window position and size:', savedState);
    windowOptions.x = savedState.x;
    windowOptions.y = savedState.y;
    windowOptions.width = savedState.width;
    windowOptions.height = savedState.height;
  } else {
    // No saved state or invalid position - use best screen
    console.log('Using default positioning on best available screen');
    const centeredPos = getCenteredPosition(bestScreen, defaultWidth, defaultHeight);
    
    windowOptions.x = centeredPos.x;
    windowOptions.y = centeredPos.y;
  }

  console.log('Creating dashboard window with options:', windowOptions);
  mainWindow = new BrowserWindow(windowOptions);

  // Force the window to the saved size after creation
  if (savedState && isValidPosition(savedState)) {
    mainWindow.setSize(savedState.width, savedState.height);
    mainWindow.setPosition(savedState.x, savedState.y);
    console.log('Forced window to saved size and position');
  }

  // Restore maximized state
  if (savedState && savedState.isMaximized) {
    mainWindow.maximize();
  }

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    console.log('Dashboard opened with bounds:', mainWindow.getBounds());
  });

  // Add a small delay before enabling state saving
  let canSaveState = false;
  setTimeout(() => {
    canSaveState = true;
    console.log('Window state saving enabled');
  }, 1000);

  // Save window state when moved or resized (with delay check)
  mainWindow.on('moved', () => {
    if (canSaveState) saveWindowState(mainWindow);
  });
  mainWindow.on('resized', () => {
    if (canSaveState) saveWindowState(mainWindow);
  });
  mainWindow.on('maximize', () => {
    if (canSaveState) saveWindowState(mainWindow);
  });
  mainWindow.on('unmaximize', () => {
    if (canSaveState) saveWindowState(mainWindow);
  });

  // Handle minimize to tray (optional behavior)
  mainWindow.on('minimize', (event) => {
    // Uncomment to hide to tray instead of minimizing
    // event.preventDefault();
    // mainWindow.hide();
    if (canSaveState) saveWindowState(mainWindow);
  });

  // Save state before closing
  mainWindow.on('close', (event) => {
    saveWindowState(mainWindow);
    
    // Optional: Hide to tray instead of closing
    // event.preventDefault();
    // mainWindow.hide();
  });

  // Load the index.html file with proper path handling
  mainWindow.loadFile(path.join(__dirname, 'index.html'));
  
  // Optional: Open DevTools in development
  // mainWindow.webContents.openDevTools();

  // Register global shortcuts
  registerGlobalShortcuts();
}

// Register global keyboard shortcuts
function registerGlobalShortcuts() {
  // Ctrl+Shift+D to show/hide dashboard
  globalShortcut.register('CommandOrControl+Shift+D', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    }
  });

  // Ctrl+Shift+R to refresh all panels
  globalShortcut.register('CommandOrControl+Shift+R', () => {
    if (mainWindow) {
      mainWindow.webContents.send('refresh-all-panels');
    }
  });
}

// Set up auto-start (call this function to enable)
function setupAutoStart() {
  if (process.platform === 'darwin') {
    // macOS
    app.setLoginItemSettings({
      openAtLogin: true,
      openAsHidden: false
    });
  } else if (process.platform === 'win32') {
    // Windows
    app.setLoginItemSettings({
      openAtLogin: true,
      path: process.execPath,
      args: ['--hidden']
    });
  }
  // Linux auto-start would need to be handled differently
  // (creating a .desktop file in ~/.config/autostart/)
}

// Application event handlers
app.whenReady().then(() => {
  createWindow();
  createTray();
  
  // Uncomment to enable auto-start
  // setupAutoStart();
  
  console.log('Personal Dashboard is ready!');
});

app.on('window-all-closed', () => {
  // Unregister all global shortcuts
  globalShortcut.unregisterAll();
  
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  } else if (mainWindow) {
    mainWindow.show();
    mainWindow.focus();
  }
});

// Handle app being brought to front
app.on('before-quit', () => {
  // Clean up and save any final state
  if (mainWindow) {
    saveWindowState(mainWindow);
  }
});

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    // Someone tried to run a second instance, focus our window instead
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}