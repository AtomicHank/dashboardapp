// preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  fetchFlightData: (url) => ipcRenderer.invoke('fetch-flight-data', url)
});