const { app, BrowserWindow, ipcMain, dialog, clipboard, shell } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 850,
    minWidth: 900,
    minHeight: 650,
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#0f172a',
      symbolColor: '#94a3b8',
      height: 45
    },
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      plugins: true,
      webSecurity: false,
      backgroundThrottling: false,
    },
    title: 'FolderScope',
    icon: path.join(__dirname, 'icon.ico'),
    backgroundColor: '#090b11', // Matches deep dark theme background to avoid white flicker
    show: false, // Show window when it is ready-to-show
  });

  mainWindow.loadFile('index.html');

  // Open the DevTools if in development mode
  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// IPC handler for directory selection dialog
ipcMain.handle('select-directory', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: 'Select Folder to Scan',
  });
  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }
  return result.filePaths[0];
});

// IPC handler for directory scanning
ipcMain.handle('scan-directory', async (event, rootPath) => {
  if (!rootPath || !fs.existsSync(rootPath)) {
    throw new Error('Invalid directory path');
  }

  const stack = [rootPath];
  const files = [];
  let foldersCount = 0;
  let totalSize = 0;
  let lastProgressUpdate = Date.now();
  let scannedCount = 0;

  while (stack.length > 0) {
    const currentDir = stack.pop();
    try {
      const entries = await fs.promises.readdir(currentDir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);
        const relativePath = path.relative(rootPath, fullPath);
        
        if (entry.isDirectory()) {
          stack.push(fullPath);
          files.push({
            name: entry.name,
            path: fullPath,
            relativePath: relativePath.replace(/\\/g, '/'), // Use normalized forward slashes
            isDirectory: true,
          });
          foldersCount++;
        } else if (entry.isFile()) {
          let size = 0;
          let mtime = null;
          try {
            const stats = await fs.promises.stat(fullPath);
            size = stats.size;
            mtime = stats.mtimeMs;
          } catch (e) {
            // Ignore stat errors for locked files
          }
          
          const ext = path.extname(entry.name).toLowerCase();
          files.push({
            name: entry.name,
            path: fullPath,
            relativePath: relativePath.replace(/\\/g, '/'),
            isDirectory: false,
            size: size,
            ext: ext,
            mtime: mtime,
          });
          totalSize += size;
          scannedCount++;
        }

        // Throttle progress updates to avoid freezing IPC channel
        const now = Date.now();
        if (now - lastProgressUpdate > 80) {
          event.sender.send('scan-progress', {
            scannedCount,
            foldersCount,
            currentPath: fullPath,
          });
          lastProgressUpdate = now;
        }
      }
    } catch (err) {
      console.error(`Error reading ${currentDir}:`, err.message);
    }
  }

  // Send final progress update
  event.sender.send('scan-progress', {
    scannedCount,
    foldersCount,
    currentPath: 'Scanning completed.',
  });

  return { files, totalSize };
});

// IPC handler to save file
ipcMain.handle('save-file', async (event, { content, defaultName, filters }) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: defaultName,
    filters: filters,
    title: 'Export File List',
  });

  if (result.canceled || !result.filePath) {
    return { success: false, canceled: true };
  }

  try {
    await fs.promises.writeFile(result.filePath, content, 'utf8');
    return { success: true, filePath: result.filePath };
  } catch (err) {
    console.error('Failed to save file:', err);
    return { success: false, error: err.message };
  }
});

// IPC handler to copy to clipboard
ipcMain.handle('copy-to-clipboard', async (event, text) => {
  clipboard.writeText(text);
  return true;
});

// IPC handler to get printer list
ipcMain.handle('get-printers', async () => {
  if (mainWindow && mainWindow.webContents.getPrintersAsync) {
    return await mainWindow.webContents.getPrintersAsync();
  }
  return mainWindow ? mainWindow.webContents.getPrinters() : [];
});

// Helper function to print a single file (HTML, PDF, TXT)
function printSingleFile(filePath, printerName) {
  return new Promise((resolve, reject) => {
    // Create a hidden printing window
    const printWindow = new BrowserWindow({
      show: false,
      webPreferences: {
        plugins: true, // Crucial for loading and printing PDF files
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false,
        webSecurity: false,
        backgroundThrottling: false,
      }
    });

    // Normalize path to file URL
    const fileUrl = `file://${filePath.replace(/\\/g, '/')}`;
    printWindow.loadURL(fileUrl);

    printWindow.webContents.on('did-finish-load', () => {
      // Give the PDF viewer or HTML rendering a bit of time to complete
      setTimeout(() => {
        const printOptions = {
          silent: true,
          printBackground: true,
        };
        
        // If a specific printer is chosen, set it
        if (printerName) {
          printOptions.deviceName = printerName;
        }

        printWindow.webContents.print(printOptions, (success, errorType) => {
          printWindow.destroy(); // Safely close and destroy window
          if (success) {
            resolve();
          } else {
            reject(new Error(`Print error: ${errorType}`));
          }
        });
      }, 1500); // 1.5s delay ensures PDFium and image assets are spooled correctly
    });

    printWindow.webContents.on('did-fail-load', (e, errorCode, errorDescription) => {
      printWindow.destroy();
      reject(new Error(`Load error: ${errorDescription} (${errorCode})`));
    });
  });
}

// IPC handler to print multiple files sequentially
ipcMain.handle('print-files', async (event, { filePaths, printerName }) => {
  let successCount = 0;
  let failCount = 0;
  const errors = [];

  for (let i = 0; i < filePaths.length; i++) {
    const filePath = filePaths[i];
    
    // Notify renderer which file is currently printing
    mainWindow.webContents.send('print-file-progress', {
      index: i,
      filePath: filePath,
      status: 'Printing...',
    });

    try {
      await printSingleFile(filePath, printerName);
      successCount++;
      
      mainWindow.webContents.send('print-file-progress', {
        index: i,
        filePath: filePath,
        status: 'Success',
      });
      
      // Delay to let the print spooler buffer the job
      await new Promise(resolve => setTimeout(resolve, 800));
    } catch (err) {
      console.error(`Failed to print ${filePath}:`, err);
      failCount++;
      errors.push({ path: filePath, error: err.message });

      mainWindow.webContents.send('print-file-progress', {
        index: i,
        filePath: filePath,
        status: `Failed: ${err.message}`,
      });
    }
  }

  return { successCount, failCount, errors };
});

// IPC handler to read file content (for text preview)
ipcMain.handle('read-file-content', async (event, filePath) => {
  try {
    const stats = await fs.promises.stat(filePath);
    if (!stats.isFile()) {
      throw new Error('Not a file');
    }
    // Limit preview size to 2MB to avoid UI freezing
    if (stats.size > 2 * 1024 * 1024) {
      return `File is too large to preview (${(stats.size / 1024 / 1024).toFixed(2)} MB).`;
    }
    return await fs.promises.readFile(filePath, 'utf8');
  } catch (err) {
    console.error('Failed to read file:', err);
    throw err;
  }
});

// IPC handler to open file in external default program
ipcMain.handle('open-path', async (event, filePath) => {
  try {
    await shell.openPath(filePath);
    return { success: true };
  } catch (err) {
    console.error('Failed to open path:', err);
    return { success: false, error: err.message };
  }
});

