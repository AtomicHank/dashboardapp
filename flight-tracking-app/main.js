const { app, BrowserWindow, screen } = require('electron');
const path = require('path');
const fs = require('fs');

// Path to store window state
const windowStateFile = path.join(__dirname, 'window-state.json');

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
      isMaximized: win.isMaximized()
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
    // Allow for some tolerance (window can be partially off-screen)
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

// Get the best screen for the app (prefer secondary screen)
function getBestScreen() {
  const displays = screen.getAllDisplays();
  
  // If multiple displays, prefer a secondary one
  if (displays.length > 1) {
    const secondaryDisplay = displays.find(display => !display.primary);
    if (secondaryDisplay) {
      return secondaryDisplay;
    }
  }
  
  // Fall back to primary display
  return screen.getPrimaryDisplay();
}

// Calculate centered position on a display
function getCenteredPosition(display, width, height) {
  const { x, y, width: displayWidth, height: displayHeight } = display.bounds;
  
  return {
    x: x + Math.floor((displayWidth - width) / 2),
    y: y + Math.floor((displayHeight - height) / 2)
  };
}

function createWindow() {
  // Load previous window state
  const savedState = loadWindowState();
  
  // Default window dimensions (larger for flight tracking)
  const defaultWidth = 1400;
  const defaultHeight = 900;
  
  // Default window options
  let windowOptions = {
    width: defaultWidth,
    height: defaultHeight,
    webPreferences: {
      contextIsolation: false,
      nodeIntegration: true
    },
    show: false, // Don't show until ready
    title: 'Flight Tracker',
    icon: path.join(__dirname, 'assets', 'icon.png') // Optional: add app icon
  };

  // If we have a saved state and it's valid, use it
  if (savedState && isValidPosition(savedState)) {
    console.log('Using saved window position and size:', savedState);
    windowOptions.x = savedState.x;
    windowOptions.y = savedState.y;
    windowOptions.width = savedState.width;
    windowOptions.height = savedState.height;
    
    // Ensure minimum size constraints (larger for flight tracking)
    windowOptions.minWidth = 1000;
    windowOptions.minHeight = 700;
  } else {
    // No saved state or invalid position - use best screen
    console.log('Using default positioning on best available screen');
    const bestScreen = getBestScreen();
    const centeredPos = getCenteredPosition(bestScreen, defaultWidth, defaultHeight);
    
    windowOptions.x = centeredPos.x;
    windowOptions.y = centeredPos.y;
    
    // Ensure window fits within screen bounds
    windowOptions.width = Math.min(defaultWidth, bestScreen.bounds.width - 200);
    windowOptions.height = Math.min(defaultHeight, bestScreen.bounds.height - 200);
    windowOptions.minWidth = 1000;
    windowOptions.minHeight = 700;
  }

  console.log('Creating window with options:', windowOptions);
  const win = new BrowserWindow(windowOptions);

  // Force the window to the saved size after creation (workaround for Electron quirks)
  if (savedState && isValidPosition(savedState)) {
    win.setSize(savedState.width, savedState.height);
    win.setPosition(savedState.x, savedState.y);
    console.log('Forced window to saved size and position');
  }

  // Restore maximized state (but don't save it yet to avoid overwriting size)
  if (savedState && savedState.isMaximized) {
    win.maximize();
  }

  // Show window when ready
  win.once('ready-to-show', () => {
    win.show();
    console.log('Window opened with bounds:', win.getBounds());
  });

  // Add a small delay before enabling state saving to avoid saving initial state
  let canSaveState = false;
  setTimeout(() => {
    canSaveState = true;
    console.log('Window state saving enabled');
  }, 1000);

  // Save window state when moved or resized (with delay check)
  win.on('moved', () => {
    if (canSaveState) saveWindowState(win);
  });
  win.on('resized', () => {
    if (canSaveState) saveWindowState(win);
  });
  win.on('maximize', () => {
    if (canSaveState) saveWindowState(win);
  });
  win.on('unmaximize', () => {
    if (canSaveState) saveWindowState(win);
  });

  // Save state before closing
  win.on('close', () => saveWindowState(win));

  // Load the index.html file with proper path handling
  win.loadFile(path.join(__dirname, 'index.html'));
  
  // Optional: Open DevTools in development
  // win.webContents.openDevTools();
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});