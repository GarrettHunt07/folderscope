const { contextBridge, ipcRenderer, webUtils } = require('electron');

contextBridge.exposeInMainWorld('api', {
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  scanDirectory: (path) => ipcRenderer.invoke('scan-directory', path),
  onScanProgress: (callback) => {
    const listener = (event, data) => callback(data);
    ipcRenderer.on('scan-progress', listener);
    return () => {
      ipcRenderer.removeListener('scan-progress', listener);
    };
  },
  saveFile: (data) => ipcRenderer.invoke('save-file', data),
  copyToClipboard: (text) => ipcRenderer.invoke('copy-to-clipboard', text),
  getPathForFile: (file) => webUtils.getPathForFile(file),
  getPrinters: () => ipcRenderer.invoke('get-printers'),
  printFiles: (data) => ipcRenderer.invoke('print-files', data),
  onPrintProgress: (callback) => {
    const listener = (event, data) => callback(data);
    ipcRenderer.on('print-file-progress', listener);
    return () => {
      ipcRenderer.removeListener('print-file-progress', listener);
    };
  },
  readFileContent: (path) => ipcRenderer.invoke('read-file-content', path),
  openPath: (path) => ipcRenderer.invoke('open-path', path),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  downloadUpdate: (url) => ipcRenderer.invoke('download-update', url),
  installUpdate: (filePath) => ipcRenderer.invoke('install-update', filePath),
  onDownloadProgress: (callback) => {
    const listener = (event, data) => callback(data);
    ipcRenderer.on('download-progress', listener);
    return () => {
      ipcRenderer.removeListener('download-progress', listener);
    };
  }
});
