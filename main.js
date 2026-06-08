const { app, BrowserWindow, ipcMain, dialog, clipboard, shell } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

// Single Instance Lock
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // Someone tried to run a second instance, focus the main window.
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    createWindow();

    app.on('activate', function () {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });
}

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
      height: 48
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

// --- In-App Updates Mechanism ---

const https = require('https');

// Helper to make HTTPS requests
function httpsGetJson(url) {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        'User-Agent': 'FolderScope-Updater'
      }
    };
    https.get(url, options, (res) => {
      if (res.statusCode < 200 || res.statusCode >= 300) {
        return reject(new Error(`HTTP Status Code: ${res.statusCode}`));
      }
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (err) {
          reject(err);
        }
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

// IPC handler to query GitHub Releases
ipcMain.handle('check-for-updates', async () => {
  try {
    const release = await httpsGetJson('https://api.github.com/repos/GarrettHunt07/folderscope/releases/latest');
    const latestVersion = release.tag_name.replace(/^v/, ''); // Clean 'v' prefix if present
    const currentVersion = app.getVersion();
    
    // Semver comparison
    const latestParts = latestVersion.split('.').map(Number);
    const currentParts = currentVersion.split('.').map(Number);
    
    let updateAvailable = false;
    for (let i = 0; i < Math.max(latestParts.length, currentParts.length); i++) {
      const latestPart = latestParts[i] || 0;
      const currentPart = currentParts[i] || 0;
      if (latestPart > currentPart) {
        updateAvailable = true;
        break;
      } else if (latestPart < currentPart) {
        break;
      }
    }
    
    // Find installer asset (.exe)
    let downloadUrl = null;
    if (release.assets && release.assets.length > 0) {
      const asset = release.assets.find(a => a.name.toLowerCase().endsWith('.exe'));
      if (asset) {
        downloadUrl = asset.browser_download_url;
      }
    }

    return {
      updateAvailable,
      latestVersion,
      currentVersion,
      releaseNotes: release.body || 'No release notes provided.',
      downloadUrl,
      publishDate: release.published_at
    };
  } catch (err) {
    console.error('Check for updates failed:', err);
    throw new Error(err.message || 'Failed to fetch updates');
  }
});

// IPC handler to download installer
ipcMain.handle('download-update', async (event, downloadUrl) => {
  const tempDir = app.getPath('temp');
  const fileName = 'FolderScope_Setup_Latest.exe';
  const filePath = path.join(tempDir, fileName);
  
  // Delete existing installer if present to avoid conflicts
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
    } catch (e) {
      console.error('Failed to delete old installer:', e);
    }
  }

  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filePath);
    const options = {
      headers: {
        'User-Agent': 'FolderScope-Updater'
      }
    };

    function download(url) {
      https.get(url, options, (response) => {
        // Handle redirect redirects
        if (response.statusCode === 301 || response.statusCode === 302) {
          download(response.headers.location);
          return;
        }

        if (response.statusCode !== 200) {
          reject(new Error(`Failed to download: Status Code ${response.statusCode}`));
          return;
        }

        const totalBytes = parseInt(response.headers['content-length'], 10) || 0;
        let downloadedBytes = 0;

        response.on('data', (chunk) => {
          downloadedBytes += chunk.length;
          file.write(chunk);

          // Broadcast download progress to renderer
          if (mainWindow) {
            mainWindow.webContents.send('download-progress', {
              downloaded: downloadedBytes,
              total: totalBytes,
              percent: totalBytes > 0 ? Math.round((downloadedBytes / totalBytes) * 100) : 0
            });
          }
        });

        response.on('end', () => {
          file.end();
          resolve(filePath);
        });
      }).on('error', (err) => {
        file.end();
        fs.unlink(filePath, () => {}); // clean up
        reject(err);
      });
    }

    download(downloadUrl);
  });
});

// IPC handler to run installer executable and quit
ipcMain.handle('install-update', async (event, filePath) => {
  try {
    if (!fs.existsSync(filePath)) {
      throw new Error('Installer file not found');
    }
    
    // Launch installer as a detached child process so it runs independently
    const { spawn } = require('child_process');
    const child = spawn(filePath, [], {
      detached: true,
      stdio: 'ignore'
    });
    child.unref();

    // Terminate this process immediately (after a tiny delay to allow IPC response to spool)
    // so the installer doesn't run into a locked-file race condition.
    setTimeout(() => {
      app.exit(0);
    }, 100);

    return { success: true };
  } catch (err) {
    console.error('Install error:', err);
    return { success: false, error: err.message };
  }
});

// IPC handler to get current application version
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});


