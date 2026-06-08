// State variables
let selectedDirectory = null;
let scannedFiles = []; // Array of all file and folder entries
let printableFiles = []; // Array of all printable file entries
let systemPrinters = []; // Array of system printers
let totalSize = 0;
let foldersCount = 0;
let filesCount = 0;

// Check if file is printable (Amazon receipts are mostly pdf, html, or text)
const PRINTABLE_EXTENSIONS = new Set([
  '.pdf', '.html', '.htm', '.txt', '.md', '.json', '.log', '.properties', '.csv'
]);

function isPrintable(file) {
  if (file.isDirectory) return false;
  return PRINTABLE_EXTENSIONS.has((file.ext || '').toLowerCase());
}

let activeTab = 'queue';
let searchQuery = '';
let sortBy = 'name-asc';
let checkedFilePaths = new Set();
let filePrintStatuses = {};

// DOM elements
const dropzone = document.getElementById('dropzone');
const selectBtn = document.getElementById('select-btn');
const folderDetails = document.getElementById('folder-details');
const displayFolderName = document.getElementById('display-folder-name');
const displayFolderPath = document.getElementById('display-folder-path');
const rescanBtn = document.getElementById('rescan-btn');

const exportPanel = document.getElementById('export-panel');
const exportTxtBtn = document.getElementById('export-txt-btn');
const exportCsvBtn = document.getElementById('export-csv-btn');
const exportJsonBtn = document.getElementById('export-json-btn');
const copyBtn = document.getElementById('copy-btn');
const printBtn = document.getElementById('print-btn');

const statusDot = document.getElementById('status-dot');
const statusMessage = document.getElementById('status-message');

const statFilesCount = document.getElementById('stat-files-count');
const statFoldersCount = document.getElementById('stat-folders-count');
const statTotalSize = document.getElementById('stat-total-size');

const searchInput = document.getElementById('search-input');
const clearSearchBtn = document.getElementById('clear-search');
const tabTree = document.getElementById('tab-tree');
const tabList = document.getElementById('tab-list');
const tabQueue = document.getElementById('tab-queue');
const sortSelectorWrapper = document.getElementById('sort-selector-wrapper');
const sortSelect = document.getElementById('sort-select');

const emptyState = document.getElementById('empty-state');
const scanningState = document.getElementById('scanning-state');
const scanningTitle = document.getElementById('scanning-title');
const scanningDetail = document.getElementById('scanning-detail');
const progressBarFill = document.getElementById('progress-bar-fill');

const paneTree = document.getElementById('pane-tree');
const paneList = document.getElementById('pane-list');
const paneQueue = document.getElementById('pane-queue');
const treeContainer = document.getElementById('tree-container');
const listContainer = document.getElementById('list-container');
const queueContainer = document.getElementById('queue-container');

const printerSelect = document.getElementById('printer-select');
const startPrintBtn = document.getElementById('start-print-btn');
const queueCheckAll = document.getElementById('queue-check-all');

const analysisRow = document.getElementById('analysis-row');
const extensionsChartContainer = document.getElementById('extensions-chart-container');
const largeFilesContainer = document.getElementById('large-files-container');

// Preview Pane & Sidebar Print button
const previewPane = document.getElementById('preview-pane');
const previewIframe = document.getElementById('preview-iframe');
const previewText = document.getElementById('preview-text');
const previewPlaceholder = document.getElementById('preview-placeholder');
const sidebarPrintDocsBtn = document.getElementById('sidebar-print-docs-btn');

// New Workspace elements
const workspaceGrid = document.getElementById('workspace-grid');
const headerNewBtn = document.getElementById('header-new-btn');
const headerOpenBtn = document.getElementById('header-open-btn');
const headerSettingsBtn = document.getElementById('header-settings-btn');
const previewFilename = document.getElementById('preview-filename');
const previewMetadata = document.getElementById('preview-metadata');
const previewMetaSize = document.getElementById('preview-meta-size');
const previewMetaDate = document.getElementById('preview-meta-date');
const previewActions = document.getElementById('preview-actions');
const previewOpenBtn = document.getElementById('preview-open-btn');
const previewShareBtn = document.getElementById('preview-share-btn');
const previewPrintBtn = document.getElementById('preview-print-btn');
const printQueueSummary = document.getElementById('print-queue-summary');

// Settings & Updates Modal elements
const settingsModal = document.getElementById('settings-modal');
const closeSettingsBtn = document.getElementById('close-settings-btn');
const tabSettingsGeneral = document.getElementById('tab-settings-general');
const tabSettingsUpdates = document.getElementById('tab-settings-updates');
const paneSettingsGeneral = document.getElementById('pane-settings-general');
const paneSettingsUpdates = document.getElementById('pane-settings-updates');
const modalPrinterSelect = document.getElementById('modal-printer-select');
const currentVersionText = document.getElementById('current-version-text');
const latestVersionText = document.getElementById('latest-version-text');
const updateStatusMessage = document.getElementById('update-status-message');
const modalCheckUpdatesBtn = document.getElementById('modal-check-updates-btn');
const updateInfoSection = document.getElementById('update-info-section');
const updateTitle = document.getElementById('update-title');
const releaseNotesText = document.getElementById('release-notes-text');
const updateDownloadProgressBox = document.getElementById('update-download-progress-box');
const downloadProgressStatus = document.getElementById('download-progress-status');
const downloadProgressPercent = document.getElementById('download-progress-percent');
const downloadProgressBarFill = document.getElementById('download-progress-bar-fill');
const modalDownloadUpdatesBtn = document.getElementById('modal-download-updates-btn');
const settingsUpdateBadge = document.getElementById('settings-update-badge');
const tabUpdateBadge = document.getElementById('tab-update-badge');

// Welcome Wizard & Profile elements
const welcomeWizardModal = document.getElementById('welcome-wizard-modal');
const wizardProfileName = document.getElementById('wizard-profile-name');
const wizardProfileCompany = document.getElementById('wizard-profile-company');
const wizardProfileEmail = document.getElementById('wizard-profile-email');
const wizardStartBtn = document.getElementById('wizard-start-btn');

const tabSettingsProfile = document.getElementById('tab-settings-profile');
const paneSettingsProfile = document.getElementById('pane-settings-profile');
const settingsProfileName = document.getElementById('settings-profile-name');
const settingsProfileCompany = document.getElementById('settings-profile-company');
const settingsProfileEmail = document.getElementById('settings-profile-email');
const settingsProfileSaveBtn = document.getElementById('settings-profile-save-btn');

const userAvatar = document.getElementById('user-avatar');

let userProfile = null; // Saved locally under 'folderscope_profile'
let latestDownloadUrl = null;

// Global Workspace state variables
let activeDirectoryPath = '';
let lastSelectedFilePath = '';

// Helper function to format dates
function formatDate(mtime) {
  if (!mtime) return '-';
  const date = new Date(mtime);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

// File icon selector helper
function getFileIconSVG(ext) {
  const e = (ext || '').toLowerCase();
  if (e === '.pdf') {
    return `<svg class="file-icon-svg pdf" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" style="color:#ef4444;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" fill="rgba(239, 68, 68, 0.1)" stroke="#ef4444"></path><polyline points="14 2 14 8 20 8" stroke="#ef4444"></polyline></svg>`;
  }
  if (e === '.html' || e === '.htm') {
    return `<svg class="file-icon-svg html" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" style="color:#10b981;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" fill="rgba(16, 185, 129, 0.1)" stroke="#10b981"></path><polyline points="14 2 14 8 20 8" stroke="#10b981"></polyline></svg>`;
  }
  if (['.doc', '.docx'].includes(e)) {
    return `<svg class="file-icon-svg doc" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" style="color:#3b82f6;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" fill="rgba(59, 130, 246, 0.1)" stroke="#3b82f6"></path><polyline points="14 2 14 8 20 8" stroke="#3b82f6"></polyline></svg>`;
  }
  if (['.txt', '.md', '.log'].includes(e)) {
    return `<svg class="file-icon-svg txt" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" style="color:#6b7280;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" fill="rgba(107, 114, 128, 0.1)" stroke="#6b7280"></path><polyline points="14 2 14 8 20 8" stroke="#6b7280"></polyline></svg>`;
  }
  return `<svg class="file-icon-svg default" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" style="color:#94a3b8;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="#94a3b8"></path><polyline points="14 2 14 8 20 8" stroke="#94a3b8"></polyline></svg>`;
}

// Reconstruct path helper
function getNodePath(node, name) {
  if (node.fileData && node.fileData.path) {
    return node.fileData.path;
  }
  return selectedDirectory ? `${selectedDirectory}/${node.relativePath || name}`.replace(/\\/g, '/') : name;
}

// Initialize events
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  loadSystemPrinters();
  // Initialize local profile and check first launch
  initializeLocalProfile();
  // Auto-check for updates silently on startup
  checkForUpdates(true);
});

function setupEventListeners() {
  // Prevent default drag behaviors on window to stop browser navigation
  window.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
  });
  
  window.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
  });

  // Make entire dropzone and header buttons clickable to select folder
  dropzone.addEventListener('click', handleSelectFolder);
  headerNewBtn.addEventListener('click', handleSelectFolder);
  headerOpenBtn.addEventListener('click', handleSelectFolder);
  
  headerSettingsBtn.addEventListener('click', openSettingsModal);
  closeSettingsBtn.addEventListener('click', closeSettingsModal);
  
  // Close modal when clicking outside the modal card
  settingsModal.addEventListener('click', (e) => {
    if (e.target === settingsModal) {
      closeSettingsModal();
    }
  });

  tabSettingsGeneral.addEventListener('click', () => switchSettingsTab('general'));
  tabSettingsUpdates.addEventListener('click', () => switchSettingsTab('updates'));
  tabSettingsProfile.addEventListener('click', () => switchSettingsTab('profile'));

  modalPrinterSelect.addEventListener('change', (e) => {
    printerSelect.value = e.target.value;
  });

  printerSelect.addEventListener('change', (e) => {
    modalPrinterSelect.value = e.target.value;
  });

  modalCheckUpdatesBtn.addEventListener('click', () => checkForUpdates(false));
  modalDownloadUpdatesBtn.addEventListener('click', downloadAndInstallUpdate);

  // Profile & Wizard Events
  userAvatar.addEventListener('click', openProfileSettings);
  settingsProfileSaveBtn.addEventListener('click', saveProfileFromSettings);
  wizardStartBtn.addEventListener('click', saveProfileFromWizard);
  
  // Drag and Drop events on dropzone
  dropzone.addEventListener('dragenter', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropzone.classList.add('dragover');
  });

  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropzone.classList.add('dragover');
  });
  
  dropzone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropzone.classList.remove('dragover');
  });
  
  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropzone.classList.remove('dragover');
    
    try {
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const file = e.dataTransfer.files[0];
        
        let path = '';
        if (window.api && window.api.getPathForFile) {
          try {
            path = window.api.getPathForFile(file);
          } catch (pathErr) {
            console.error('webUtils.getPathForFile error:', pathErr);
          }
        }
        
        // Fallback to file.path if webUtils returns empty or fails
        if (!path && file.path) {
          path = file.path;
        }
        
        if (path) {
          startScanning(path);
        } else {
          showStatus('Could not retrieve folder path. Try clicking the zone to select manually.', 'error');
        }
      }
    } catch (err) {
      showStatus(`Drop error: ${err.message}`, 'error');
      console.error(err);
    }
  });
  
  // Rescan button
  rescanBtn.addEventListener('click', () => {
    if (selectedDirectory) {
      startScanning(selectedDirectory);
    }
  });
  
  // Export actions
  exportTxtBtn.addEventListener('click', handleExportTxt);
  exportCsvBtn.addEventListener('click', handleExportCsv);
  exportJsonBtn.addEventListener('click', handleExportJson);
  copyBtn.addEventListener('click', handleCopyToClipboard);
  printBtn.addEventListener('click', () => {
    window.print();
  });
  
  // Search input
  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value.toLowerCase().trim();
    if (searchQuery) {
      clearSearchBtn.classList.remove('hidden');
    } else {
      clearSearchBtn.classList.add('hidden');
    }
    updateViews();
  });
  
  clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    searchQuery = '';
    clearSearchBtn.classList.add('hidden');
    updateViews();
  });
  
  // Tab controllers
  tabTree.addEventListener('click', () => switchTab('tree'));
  tabList.addEventListener('click', () => switchTab('list'));
  tabQueue.addEventListener('click', () => switchTab('queue'));
  
  // Print Queue Check All
  queueCheckAll.addEventListener('change', (e) => {
    let filesToRender = printableFiles;
    if (searchQuery) {
      filesToRender = printableFiles.filter(f => f.name.toLowerCase().includes(searchQuery) || f.relativePath.toLowerCase().includes(searchQuery));
    }
    
    const checkboxes = queueContainer.querySelectorAll('.queue-item-check');
    checkboxes.forEach(cb => {
      cb.checked = e.target.checked;
    });
    
    filesToRender.forEach(f => {
      if (e.target.checked) {
        checkedFilePaths.add(f.path);
      } else {
        checkedFilePaths.delete(f.path);
      }
    });
    
    updatePrintButtonState();
  });

  // Start Printing Selected Files
  startPrintBtn.addEventListener('click', handlePrintSelectedDocuments);
  
  // Sidebar Print All Documents Button
  sidebarPrintDocsBtn.addEventListener('click', () => {
    if (printableFiles.length === 0) {
      showStatus('No printable documents found to print.', 'error');
      return;
    }
    
    // Check all printable files
    printableFiles.forEach(f => checkedFilePaths.add(f.path));
    
    // Switch to queue tab to show options
    switchTab('queue');
    
    // Inform user they can review and print
    showStatus('Review selections and click "Print Selected Documents" to print.', 'active');
  });
  
  // Sort selector
  sortSelect.addEventListener('change', (e) => {
    sortBy = e.target.value;
    updateViews();
  });
}

// Select folder handler
async function handleSelectFolder() {
  try {
    const dirPath = await window.api.selectDirectory();
    if (dirPath) {
      startScanning(dirPath);
    }
  } catch (err) {
    showStatus(`Selection error: ${err.message}`, 'error');
  }
}

// Start Directory Scan
async function startScanning(dirPath) {
  selectedDirectory = dirPath;
  
  // Clear any existing preview
  clearFilePreview();
  sidebarPrintDocsBtn.disabled = true;
  
  // Update state UI
  showStatus('Scanning folder...', 'busy');
  
  // Update Folder Info Card
  displayFolderName.textContent = dirPath.split(/[\\/]/).pop() || dirPath;
  displayFolderPath.textContent = dirPath;
  folderDetails.classList.remove('hidden');
  
  // Switch explorer display to scanning state
  emptyState.classList.add('hidden');
  paneTree.classList.add('hidden');
  paneList.classList.add('hidden');
  analysisRow.classList.add('hidden');
  exportPanel.classList.add('hidden');
  scanningState.classList.remove('hidden');
  
  progressBarFill.style.width = '0%';
  scanningDetail.textContent = 'Preparing directory scan...';
  
  // Reset stats UI
  statFilesCount.textContent = '-';
  statFoldersCount.textContent = '-';
  statTotalSize.textContent = '-';
  
  // Disable search
  searchInput.disabled = true;
  searchInput.value = '';
  searchQuery = '';
  clearSearchBtn.classList.add('hidden');
  
  // Set progress listener
  const cleanupProgress = window.api.onScanProgress((progress) => {
    scanningDetail.textContent = `Scanned: ${progress.scannedCount} files, ${progress.foldersCount} folders...`;
    // We don't have a max size beforehand, so we simulate progress bar activity or step increments
    const widthVal = Math.min((progress.scannedCount / 2000) * 100, 95);
    progressBarFill.style.width = `${widthVal}%`;
  });
  
  try {
    const start = Date.now();
    const result = await window.api.scanDirectory(dirPath);
    const duration = ((Date.now() - start) / 1000).toFixed(2);
    
    // Save results
    scannedFiles = result.files;
    printableFiles = scannedFiles.filter(isPrintable);
    checkedFilePaths = new Set(printableFiles.map(f => f.path));
    filePrintStatuses = {};
    printableFiles.forEach(f => {
      filePrintStatuses[f.path] = 'Pending';
    });
    totalSize = result.totalSize;
    
    // Calculate files & folders count
    filesCount = scannedFiles.filter(f => !f.isDirectory).length;
    foldersCount = scannedFiles.filter(f => f.isDirectory).length;
    
    // Update Stats Display
    statFilesCount.textContent = formatNumber(filesCount);
    statFoldersCount.textContent = formatNumber(foldersCount);
    statTotalSize.textContent = formatBytes(totalSize);
    
    // Update main status
    showStatus(`Scanned ${filesCount} files in ${duration}s`, 'active');
    
    // Set active path for explorer view
    activeDirectoryPath = dirPath;
    
    // Show views
    scanningState.classList.add('hidden');
    emptyState.classList.add('hidden'); // Hide welcome screen
    workspaceGrid.classList.remove('hidden'); // Show workspace grid
    exportPanel.classList.remove('hidden');
    analysisRow.classList.remove('hidden');
    searchInput.disabled = false;
    sidebarPrintDocsBtn.disabled = printableFiles.length === 0;
    
    // Calculate analysis card data
    calculateTopExtensions();
    calculateLargestFiles();
    
    // Render
    updateViews();
    
  } catch (err) {
    scanningState.classList.add('hidden');
    emptyState.classList.remove('hidden');
    showStatus(`Scan failed: ${err.message}`, 'error');
    console.error(err);
  } finally {
    cleanupProgress();
  }
}

// Switch tabs between Tree, List, or Queue
function switchTab(tab) {
  activeTab = tab;
  
  // Reset active classes
  tabTree.classList.remove('active');
  tabList.classList.remove('active');
  tabQueue.classList.remove('active');
  
  if (tab === 'tree') {
    tabTree.classList.add('active');
    sortSelectorWrapper.classList.add('hidden');
  } else if (tab === 'list') {
    tabList.classList.add('active');
    sortSelectorWrapper.classList.remove('hidden');
  } else if (tab === 'queue') {
    tabQueue.classList.add('active');
    sortSelectorWrapper.classList.add('hidden');
  }
  updateViews();
}

// Update Explorer Displays
function updateViews() {
  if (scannedFiles.length === 0) return;
  
  // Keep all views visible simultaneously in the unified layout
  paneTree.classList.remove('hidden');
  paneList.classList.remove('hidden');
  paneQueue.classList.remove('hidden');
  
  renderTree();
  renderList();
  renderPrintQueue();
}

// TREE VIEW LOGIC

// Build node structure from flat files list
function buildDirectoryTree(files) {
  const root = { name: '', isDirectory: true, children: new Map(), fileData: null };
  
  for (const file of files) {
    const parts = file.relativePath.split('/');
    let current = root;
    
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (!part) continue;
      
      const isLast = i === parts.length - 1;
      
      if (isLast) {
        if (file.isDirectory) {
          if (!current.children.has(part)) {
            current.children.set(part, { name: part, isDirectory: true, children: new Map(), fileData: file });
          }
        } else {
          current.children.set(part, { name: part, isDirectory: false, fileData: file });
        }
      } else {
        if (!current.children.has(part)) {
          current.children.set(part, { name: part, isDirectory: true, children: new Map(), fileData: null });
        }
        current = current.children.get(part);
      }
    }
  }
  
  return root;
}

// Recursively filter tree nodes matching query
function filterTreeNodes(node, query) {
  if (!node.isDirectory) {
    return node.name.toLowerCase().includes(query) ? node : null;
  }
  
  const filteredChildren = new Map();
  for (const [name, child] of node.children.entries()) {
    const filteredChild = filterTreeNodes(child, query);
    if (filteredChild) {
      filteredChildren.set(name, filteredChild);
    }
  }
  
  // Return this node if any child matches, or if the directory name itself matches query
  if (filteredChildren.size > 0 || (node.name && node.name.toLowerCase().includes(query))) {
    return {
      ...node,
      children: filteredChildren
    };
  }
  
  return null;
}

// Render Tree to DOM
function renderTree() {
  treeContainer.innerHTML = '';
  
  let treeRoot = buildDirectoryTree(scannedFiles);
  
  // Apply search query filter if active
  if (searchQuery) {
    const filtered = filterTreeNodes(treeRoot, searchQuery);
    if (!filtered) {
      treeContainer.innerHTML = '<div class="empty-state">No files or folders match your search query.</div>';
      return;
    }
    treeRoot = filtered;
  }
  
  // Render nodes
  const sortedKeys = Array.from(treeRoot.children.keys()).sort((a, b) => {
    const childA = treeRoot.children.get(a);
    const childB = treeRoot.children.get(b);
    if (childA.isDirectory && !childB.isDirectory) return -1;
    if (!childA.isDirectory && childB.isDirectory) return 1;
    return a.localeCompare(b);
  });
  
  if (sortedKeys.length === 0) {
    treeContainer.innerHTML = '<div class="empty-state">Selected folder is empty.</div>';
    return;
  }
  
  for (const key of sortedKeys) {
    const childNode = treeRoot.children.get(key);
    treeContainer.appendChild(createTreeNodeDOM(childNode, key));
  }
}

function getExtensionBadgeHTML(ext) {
  if (!ext) return '';
  const e = ext.toLowerCase();
  if (e === '.pdf') {
    return `<span class="ext-badge pdf">pdf</span>`;
  }
  if (e === '.html' || e === '.htm') {
    return `<span class="ext-badge html">html</span>`;
  }
  if (['.txt', '.md'].includes(e)) {
    return `<span class="ext-badge text">${e.substring(1)}</span>`;
  }
  if (['.json', '.csv', '.xml', '.yaml', '.yml'].includes(e)) {
    return `<span class="ext-badge data">${e.substring(1)}</span>`;
  }
  if (['.js', '.ts', '.py', '.sh', '.bat', '.ps1', '.css', '.tsx', '.jsx'].includes(e)) {
    return `<span class="ext-badge code">${e.substring(1)}</span>`;
  }
  return '';
}

// Generate DOM Elements for Tree Node
function createTreeNodeDOM(node, name) {
  const item = document.createElement('div');
  item.className = 'tree-item';
  
  const nodeEl = document.createElement('div');
  nodeEl.className = `tree-node ${node.isDirectory ? 'directory' : 'file'}`;
  
  const arrow = document.createElement('span');
  arrow.className = 'tree-node-arrow';
  if (node.isDirectory && node.children.size > 0) {
    arrow.innerHTML = '&#x25B6;'; // Triangle pointing right
    arrow.classList.add('expanded');
    arrow.style.transform = 'rotate(90deg)'; // Rotate to point down initially
  } else {
    arrow.classList.add('empty');
    arrow.innerHTML = '&bull;';
  }
  nodeEl.appendChild(arrow);
  
  const icon = document.createElement('span');
  icon.className = `tree-node-icon ${node.isDirectory ? 'folder' : 'file'}`;
  if (node.isDirectory) {
    icon.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" fill="rgba(245, 158, 11, 0.2)" stroke="#f59e0b"></path></svg>`;
  } else {
    icon.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" fill="rgba(59, 130, 246, 0.15)" stroke="#3b82f6"></path><polyline points="14 2 14 8 20 8" stroke="#3b82f6"></polyline></svg>`;
  }
  nodeEl.appendChild(icon);
  
  const nameEl = document.createElement('span');
  nameEl.className = 'tree-node-name';
  nameEl.textContent = name;
  nodeEl.appendChild(nameEl);
  
  if (!node.isDirectory && node.fileData) {
    const ext = node.fileData.ext || '';
    nameEl.innerHTML = name + getExtensionBadgeHTML(ext);
    
    const meta = document.createElement('span');
    meta.className = 'tree-node-meta';
    meta.textContent = formatBytes(node.fileData.size);
    nodeEl.appendChild(meta);
    
    // Bind click listener for file preview
    nodeEl.addEventListener('click', (e) => {
      // Clear active style on other files/folders/rows
      document.querySelectorAll('.active-file').forEach(el => el.classList.remove('active-file'));
      nodeEl.classList.add('active-file');
      showFilePreview(node.fileData);
    });
  } else if (node.isDirectory) {
    if (!node.children || node.children.size === 0) {
      nodeEl.addEventListener('click', (e) => {
        const dirPath = node.fileData ? node.fileData.path : getNodePath(node, name);
        if (dirPath) {
          activeDirectoryPath = dirPath;
          renderList();
        }
      });
    }
  }
  
  item.appendChild(nodeEl);
  
  if (node.isDirectory && node.children.size > 0) {
    const childrenContainer = document.createElement('div');
    childrenContainer.className = 'tree-children';
    
    const sortedKeys = Array.from(node.children.keys()).sort((a, b) => {
      const childA = node.children.get(a);
      const childB = node.children.get(b);
      if (childA.isDirectory && !childB.isDirectory) return -1;
      if (!childA.isDirectory && childB.isDirectory) return 1;
      return a.localeCompare(b);
    });
    
    for (const key of sortedKeys) {
      const childNode = node.children.get(key);
      childrenContainer.appendChild(createTreeNodeDOM(childNode, key));
    }
    
    item.appendChild(childrenContainer);
    
    // Expand/Collapse Click & Navigate
    nodeEl.addEventListener('click', (e) => {
      const isHidden = childrenContainer.classList.contains('hidden') || childrenContainer.style.display === 'none';
      if (isHidden) {
        childrenContainer.style.display = 'flex';
        arrow.style.transform = 'rotate(90deg)';
      } else {
        childrenContainer.style.display = 'none';
        arrow.style.transform = 'rotate(0deg)';
      }
      const dirPath = node.fileData ? node.fileData.path : getNodePath(node, name);
      if (dirPath) {
        activeDirectoryPath = dirPath;
        renderList();
      }
    });
  }
  
  return item;
}

// FLAT LIST VIEW LOGIC
function getParentPath(filePath) {
  const parts = filePath.replace(/\\/g, '/').split('/');
  parts.pop();
  return parts.join('/');
}

// Flat list view logic rewritten for folder navigation
function renderList() {
  listContainer.innerHTML = '';
  
  if (!activeDirectoryPath && selectedDirectory) {
    activeDirectoryPath = selectedDirectory;
  }
  
  if (!activeDirectoryPath) return;
  
  const normalizedActive = activeDirectoryPath.replace(/\\/g, '/');
  const normalizedRoot = selectedDirectory.replace(/\\/g, '/');
  
  // Get direct children of active directory
  const directChildren = scannedFiles.filter(item => {
    if (item.path.replace(/\\/g, '/') === normalizedActive) return false;
    const parent = getParentPath(item.path);
    return parent === normalizedActive;
  });
  
  // Create folders section
  const folders = directChildren.filter(item => item.isDirectory);
  
  // Create files section
  let files = directChildren.filter(item => !item.isDirectory);
  if (searchQuery) {
    files = files.filter(f => f.name.toLowerCase().includes(searchQuery));
  }
  
  // Sort files
  files.sort((a, b) => {
    switch (sortBy) {
      case 'name-asc':
        return a.name.localeCompare(b.name);
      case 'name-desc':
        return b.name.localeCompare(a.name);
      case 'size-desc':
        return b.size - a.size;
      case 'size-asc':
        return a.size - b.size;
      case 'type-asc':
        return (a.ext || '').localeCompare(b.ext || '');
      default:
        return 0;
    }
  });
  
  // Build dynamic content
  const foldersTitle = document.createElement('div');
  foldersTitle.className = 'list-section-title';
  foldersTitle.textContent = 'Folders';
  listContainer.appendChild(foldersTitle);
  
  const foldersGrid = document.createElement('div');
  foldersGrid.className = 'folders-grid';
  listContainer.appendChild(foldersGrid);
  
  // Handle UP folder if not in root
  if (normalizedActive !== normalizedRoot) {
    const upItem = document.createElement('div');
    upItem.className = 'folder-card folder-up-card';
    upItem.innerHTML = `
      <svg class="folder-card-icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="15 18 9 12 15 6"></polyline>
      </svg>
      <span class="folder-card-name">.. (Up)</span>
    `;
    upItem.addEventListener('click', () => {
      activeDirectoryPath = getParentPath(activeDirectoryPath);
      renderList();
    });
    foldersGrid.appendChild(upItem);
  }
  
  if (folders.length === 0) {
    if (normalizedActive === normalizedRoot) {
      const emptyMsg = document.createElement('div');
      emptyMsg.className = 'empty-state-small';
      emptyMsg.textContent = 'No folders';
      foldersGrid.appendChild(emptyMsg);
    }
  } else {
    folders.forEach(folder => {
      const folderItem = document.createElement('div');
      folderItem.className = 'folder-card';
      folderItem.innerHTML = `
        <svg class="folder-card-icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" fill="rgba(0, 242, 254, 0.15)" stroke="#00f2fe"></path>
        </svg>
        <span class="folder-card-name">${folder.name}</span>
      `;
      folderItem.addEventListener('click', () => {
        activeDirectoryPath = folder.path;
        renderList();
      });
      foldersGrid.appendChild(folderItem);
    });
  }
  
  const filesTitle = document.createElement('div');
  filesTitle.className = 'list-section-title';
  filesTitle.textContent = 'Files';
  listContainer.appendChild(filesTitle);
  
  const filesTable = document.createElement('div');
  filesTable.className = 'files-table';
  listContainer.appendChild(filesTable);
  
  if (files.length === 0) {
    const emptyMsg = document.createElement('div');
    emptyMsg.className = 'empty-state-small';
    emptyMsg.textContent = 'No files';
    filesTable.appendChild(emptyMsg);
  } else {
    files.forEach(file => {
      const isPrintableFile = isPrintable(file);
      const isChecked = checkedFilePaths.has(file.path);
      
      const fileRow = document.createElement('div');
      fileRow.className = 'file-row-item';
      if (lastSelectedFilePath === file.path) {
        fileRow.classList.add('active-file');
      }
      
      fileRow.innerHTML = `
        <div class="file-col-left">
          ${isPrintableFile ? `<input type="checkbox" class="file-item-checkbox" ${isChecked ? 'checked' : ''}>` : '<span class="checkbox-spacer"></span>'}
          <span class="file-item-icon">${getFileIconSVG(file.ext)}</span>
          <span class="file-item-name">${file.name}</span>
        </div>
        <div class="file-col-right">
          <span class="file-item-size">${formatBytes(file.size)}</span>
          <span class="file-item-date">${formatDate(file.mtime)}</span>
        </div>
      `;
      
      // Select for preview
      fileRow.addEventListener('click', (e) => {
        if (e.target.type === 'checkbox') return;
        document.querySelectorAll('.file-row-item').forEach(el => el.classList.remove('active-file'));
        fileRow.classList.add('active-file');
        lastSelectedFilePath = file.path;
        showFilePreview(file);
      });
      
      // Checkbox event
      if (isPrintableFile) {
        const checkbox = fileRow.querySelector('.file-item-checkbox');
        checkbox.addEventListener('change', () => {
          if (checkbox.checked) {
            checkedFilePaths.add(file.path);
          } else {
            checkedFilePaths.delete(file.path);
          }
          updatePrintButtonState();
          renderPrintQueue();
        });
      }
      
      filesTable.appendChild(fileRow);
    });
  }
}

function calculateTopExtensions() {
  extensionsChartContainer.innerHTML = '';
  
  const extData = {};
  scannedFiles.forEach(file => {
    if (file.isDirectory) return;
    const ext = file.ext || '.unknown';
    if (!extData[ext]) {
      extData[ext] = { count: 0, size: 0 };
    }
    extData[ext].count++;
    extData[ext].size += file.size;
  });
  
  // Sort extensions by total size descending
  const sortedExts = Object.keys(extData)
    .map(ext => ({ ext, ...extData[ext] }))
    .sort((a, b) => b.size - a.size)
    .slice(0, 5); // top 5
    
  if (sortedExts.length === 0) {
    extensionsChartContainer.innerHTML = '<div class="status-message">No files found.</div>';
    return;
  }
  
  sortedExts.forEach(item => {
    // Percentage relative to total size
    const pct = totalSize > 0 ? ((item.size / totalSize) * 100).toFixed(1) : 0;
    
    const row = document.createElement('div');
    row.className = 'chart-bar-row';
    
    const info = document.createElement('div');
    info.className = 'chart-bar-info';
    
    const label = document.createElement('span');
    label.className = 'chart-bar-label';
    label.textContent = item.ext;
    info.appendChild(label);
    
    const stats = document.createElement('span');
    stats.className = 'chart-bar-stats';
    stats.textContent = `${formatBytes(item.size)} (${item.count} files - ${pct}%)`;
    info.appendChild(stats);
    
    row.appendChild(info);
    
    const barBg = document.createElement('div');
    barBg.className = 'chart-bar-bg';
    
    const barFill = document.createElement('div');
    barFill.className = 'chart-bar-fill';
    barFill.style.width = `${pct}%`;
    barBg.appendChild(barFill);
    
    row.appendChild(barBg);
    
    extensionsChartContainer.appendChild(row);
  });
}

function calculateLargestFiles() {
  largeFilesContainer.innerHTML = '';
  
  const filesOnly = scannedFiles.filter(f => !f.isDirectory);
  
  // Sort files by size descending
  const sortedFiles = [...filesOnly]
    .sort((a, b) => b.size - a.size)
    .slice(0, 5); // top 5
    
  if (sortedFiles.length === 0) {
    largeFilesContainer.innerHTML = '<div class="status-message">No files found.</div>';
    return;
  }
  
  sortedFiles.forEach(file => {
    const item = document.createElement('div');
    item.className = 'large-file-item';
    
    const wrapper = document.createElement('div');
    wrapper.className = 'large-file-name-wrapper';
    
    const icon = document.createElement('span');
    icon.className = 'tree-node-icon file';
    icon.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`;
    wrapper.appendChild(icon);
    
    const textDiv = document.createElement('div');
    textDiv.style.display = 'flex';
    textDiv.style.flexDirection = 'column';
    textDiv.style.overflow = 'hidden';
    
    const name = document.createElement('span');
    name.className = 'large-file-name';
    name.textContent = file.name;
    textDiv.appendChild(name);
    
    const path = document.createElement('span');
    path.className = 'large-file-path';
    path.textContent = file.relativePath;
    path.title = file.path;
    textDiv.appendChild(path);
    
    wrapper.appendChild(textDiv);
    item.appendChild(wrapper);
    
    const size = document.createElement('span');
    size.className = 'large-file-size';
    size.textContent = formatBytes(file.size);
    item.appendChild(size);
    
    largeFilesContainer.appendChild(item);
  });
}

// EXPORT FORMATTERS & UTILITIES
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatNumber(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function showStatus(msg, type = 'active') {
  statusMessage.textContent = msg;
  statusDot.className = 'status-indicator-dot';
  if (type === 'active') {
    statusDot.classList.add('active');
  } else if (type === 'busy') {
    statusDot.classList.add('busy');
  } else if (type === 'error') {
    statusDot.classList.add('error');
    statusDot.style.backgroundColor = 'var(--color-error)';
    statusDot.style.boxShadow = '0 0 8px var(--color-error)';
  }
}

// ASCII Text tree representation builder
function getAsciiTreeText() {
  const treeRoot = buildDirectoryTree(scannedFiles);
  
  let output = `${selectedDirectory.split(/[\\/]/).pop() || selectedDirectory}/\n`;
  output += recurseAsciiTreeText(treeRoot, '');
  return output;
}

function recurseAsciiTreeText(node, prefix = '') {
  let result = '';
  const sortedKeys = Array.from(node.children.keys()).sort((a, b) => {
    const childA = node.children.get(a);
    const childB = node.children.get(b);
    if (childA.isDirectory && !childB.isDirectory) return -1;
    if (!childA.isDirectory && childB.isDirectory) return 1;
    return a.localeCompare(b);
  });

  for (let i = 0; i < sortedKeys.length; i++) {
    const name = sortedKeys[i];
    const child = node.children.get(name);
    const isLast = i === sortedKeys.length - 1;
    const connector = isLast ? '└── ' : '├── ';
    
    if (child.isDirectory) {
      result += `${prefix}${connector}${name}/\n`;
      const newPrefix = prefix + (isLast ? '    ' : '│   ');
      result += recurseAsciiTreeText(child, newPrefix);
    } else {
      const sizeStr = child.fileData ? ` (${formatBytes(child.fileData.size)})` : '';
      result += `${prefix}${connector}${name}${sizeStr}\n`;
    }
  }
  return result;
}

// Clipboard copying
async function handleCopyToClipboard() {
  if (scannedFiles.length === 0) return;
  const text = getAsciiTreeText();
  const success = await window.api.copyToClipboard(text);
  if (success) {
    const origText = copyBtn.textContent;
    copyBtn.innerHTML = `
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="var(--color-success)" stroke-width="2">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
      Copied!
    `;
    setTimeout(() => {
      copyBtn.innerHTML = `
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>
        Copy Tree to Clipboard
      `;
    }, 2000);
  }
}

// Export as TXT file
async function handleExportTxt() {
  if (scannedFiles.length === 0) return;
  let text = getAsciiTreeText();
  
  // Append report branding if user profile exists
  if (userProfile && userProfile.name) {
    const dateStr = new Date().toLocaleString();
    const companyStr = userProfile.company ? ` (${userProfile.company})` : '';
    text += `\n--------------------------------------------------\n`;
    text += `FolderScope Report\n`;
    text += `Generated by: ${userProfile.name}${companyStr}\n`;
    text += `Date: ${dateStr}\n`;
    text += `--------------------------------------------------\n`;
  }

  const folderName = selectedDirectory.split(/[\\/]/).pop() || 'folder';
  const defaultName = `${folderName}_file_list.txt`;
  
  const result = await window.api.saveFile({
    content: text,
    defaultName: defaultName,
    filters: [{ name: 'Text Files', extensions: ['txt'] }]
  });
  
  if (result.success) {
    showStatus(`Exported list to ${result.filePath.split(/[\\/]/).pop()}`, 'active');
  } else if (result.error) {
    showStatus(`Export failed: ${result.error}`, 'error');
  }
}

// Export as CSV file
async function handleExportCsv() {
  if (scannedFiles.length === 0) return;
  
  // Build CSV content
  const filesOnly = scannedFiles.filter(f => !f.isDirectory);
  let csv = 'Name,Extension,Relative Path,Size (Bytes),Formatted Size\n';
  
  filesOnly.forEach(f => {
    // Escape quote characters in filenames/paths for valid CSV syntax
    const nameEscaped = `"${f.name.replace(/"/g, '""')}"`;
    const pathEscaped = `"${f.relativePath.replace(/"/g, '""')}"`;
    const ext = f.ext || '';
    const size = f.size || 0;
    const formatted = formatBytes(size);
    csv += `${nameEscaped},${ext},${pathEscaped},${size},${formatted}\n`;
  });
  
  // Append report branding if user profile exists
  if (userProfile && userProfile.name) {
    const dateStr = new Date().toLocaleString();
    csv += `\n# FolderScope Report Metadata\n`;
    csv += `# Generated by,${userProfile.name}\n`;
    if (userProfile.company) {
      csv += `# Company,${userProfile.company}\n`;
    }
    csv += `# Date,${dateStr}\n`;
  }

  const folderName = selectedDirectory.split(/[\\/]/).pop() || 'folder';
  const defaultName = `${folderName}_file_list.csv`;
  
  const result = await window.api.saveFile({
    content: csv,
    defaultName: defaultName,
    filters: [{ name: 'CSV Files', extensions: ['csv'] }]
  });
  
  if (result.success) {
    showStatus(`Exported CSV to ${result.filePath.split(/[\\/]/).pop()}`, 'active');
  } else if (result.error) {
    showStatus(`Export failed: ${result.error}`, 'error');
  }
}

// Export as JSON file
async function handleExportJson() {
  if (scannedFiles.length === 0) return;
  
  // Format json content (clean file structure)
  const filesOnly = scannedFiles.filter(f => !f.isDirectory).map(f => ({
    name: f.name,
    extension: f.ext,
    relativePath: f.relativePath,
    sizeBytes: f.size,
    lastModifiedMs: f.mtime
  }));
  
  const exportObj = {
    scanPath: selectedDirectory,
    totalFiles: filesCount,
    totalFolders: foldersCount,
    totalSizeBytes: totalSize,
    formattedTotalSize: formatBytes(totalSize),
    files: filesOnly
  };

  // Add report branding metadata if user profile exists
  if (userProfile && userProfile.name) {
    exportObj.exportMetadata = {
      generatedBy: userProfile.name,
      company: userProfile.company || null,
      email: userProfile.email || null,
      timestamp: new Date().toISOString()
    };
  }

  const jsonContent = JSON.stringify(exportObj, null, 2);
  
  const folderName = selectedDirectory.split(/[\\/]/).pop() || 'folder';
  const defaultName = `${folderName}_file_list.json`;
  
  const result = await window.api.saveFile({
    content: jsonContent,
    defaultName: defaultName,
    filters: [{ name: 'JSON Files', extensions: ['json'] }]
  });
  
  if (result.success) {
    showStatus(`Exported JSON to ${result.filePath.split(/[\\/]/).pop()}`, 'active');
  } else if (result.error) {
    showStatus(`Export failed: ${result.error}`, 'error');
  }
}

// --- Print Queue Tab Logic ---

// Load printers from Electron main process
async function loadSystemPrinters() {
  try {
    systemPrinters = await window.api.getPrinters();
    
    // Clear and populate dropdown
    printerSelect.innerHTML = '';
    modalPrinterSelect.innerHTML = '';
    
    if (systemPrinters.length === 0) {
      const optionStr = '<option value="">No printers found</option>';
      printerSelect.innerHTML = optionStr;
      modalPrinterSelect.innerHTML = optionStr;
      return;
    }
    
    // Add default blank option
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'System Default Printer';
    
    const defaultOptionModal = defaultOption.cloneNode(true);
    
    printerSelect.appendChild(defaultOption);
    modalPrinterSelect.appendChild(defaultOptionModal);
    
    systemPrinters.forEach(printer => {
      const option = document.createElement('option');
      option.value = printer.name;
      option.textContent = printer.displayName || printer.name;
      if (printer.isDefault) {
        option.selected = true;
        option.textContent += ' (Default)';
      }
      
      const optionModal = option.cloneNode(true);
      optionModal.selected = option.selected;
      
      printerSelect.appendChild(option);
      modalPrinterSelect.appendChild(optionModal);
    });
  } catch (err) {
    console.error('Failed to load system printers:', err);
    const optionStr = '<option value="">Error loading printers</option>';
    printerSelect.innerHTML = optionStr;
    modalPrinterSelect.innerHTML = optionStr;
  }
}

// Render the Printable Documents in the Print Queue Tab
function renderPrintQueue() {
  queueContainer.innerHTML = '';
  
  if (printableFiles.length === 0) {
    queueContainer.innerHTML = '<div class="empty-state">No printable documents (.pdf, .html, .txt) found in this folder.</div>';
    startPrintBtn.disabled = true;
    queueCheckAll.checked = false;
    queueCheckAll.disabled = true;
    return;
  }
  
  // Apply search query filter if active
  let filesToRender = printableFiles;
  if (searchQuery) {
    filesToRender = printableFiles.filter(f => f.name.toLowerCase().includes(searchQuery) || f.relativePath.toLowerCase().includes(searchQuery));
  }
  
  if (filesToRender.length === 0) {
    queueContainer.innerHTML = '<div class="empty-state">No documents match your search query.</div>';
    startPrintBtn.disabled = true;
    queueCheckAll.checked = false;
    queueCheckAll.disabled = true;
    return;
  }
  
  queueCheckAll.disabled = false;
  
  // Set check-all state based on visible items
  const allRenderedChecked = filesToRender.every(f => checkedFilePaths.has(f.path));
  queueCheckAll.checked = allRenderedChecked;
  
  // Render rows
  filesToRender.forEach((file) => {
    const actualIndex = printableFiles.indexOf(file);
    const row = document.createElement('div');
    row.className = 'queue-row';
    row.id = `queue-row-${actualIndex}`;
    
    // Checkbox column
    const checkCol = document.createElement('span');
    checkCol.className = 'col-check';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'queue-item-check';
    checkbox.checked = checkedFilePaths.has(file.path);
    checkbox.dataset.index = actualIndex;
    checkbox.dataset.path = file.path;
    
    checkbox.addEventListener('change', () => {
      if (checkbox.checked) {
        checkedFilePaths.add(file.path);
      } else {
        checkedFilePaths.delete(file.path);
      }
      updatePrintButtonState();
      
      const allChecked = filesToRender.every(f => checkedFilePaths.has(f.path));
      queueCheckAll.checked = allChecked;
    });
    
    checkCol.appendChild(checkbox);
    row.appendChild(checkCol);
    
    // Name column
    const nameCol = document.createElement('span');
    nameCol.className = 'col-name-q';
    nameCol.innerHTML = `${getFileIconSVG(file.ext)} <span style="margin-left: 8px; vertical-align: middle;">${file.name}</span>`;
    row.appendChild(nameCol);
    
    // Progress Bar column
    const progressCol = document.createElement('span');
    progressCol.className = 'col-progress-q';
    
    const barContainer = document.createElement('div');
    barContainer.className = 'queue-progress-bar-container';
    
    const barFill = document.createElement('div');
    barFill.className = 'queue-progress-bar-fill';
    barFill.id = `print-progress-bar-${actualIndex}`;
    
    // Set initial width based on status
    const currentStatus = filePrintStatuses[file.path] || 'Pending';
    const statusLower = currentStatus.toLowerCase();
    if (statusLower.includes('success')) {
      barFill.className = 'queue-progress-bar-fill success';
      barFill.style.width = '100%';
    } else if (statusLower.includes('failed')) {
      barFill.className = 'queue-progress-bar-fill failed';
      barFill.style.width = '100%';
    } else if (statusLower.includes('printing')) {
      barFill.className = 'queue-progress-bar-fill active';
      barFill.style.width = '50%';
    } else {
      barFill.style.width = '0%';
    }
    
    barContainer.appendChild(barFill);
    progressCol.appendChild(barContainer);
    row.appendChild(progressCol);
    
    // Status column
    const statusCol = document.createElement('span');
    statusCol.textContent = currentStatus;
    statusCol.id = `print-status-${actualIndex}`;
    statusCol.className = 'col-status-q';
    
    if (statusLower.includes('success')) {
      statusCol.className = 'col-status-q success';
    } else if (statusLower.includes('failed')) {
      statusCol.className = 'col-status-q failed';
    } else if (statusLower.includes('printing')) {
      statusCol.className = 'col-status-q printing';
    } else {
      statusCol.className = 'col-status-q pending';
    }
    row.appendChild(statusCol);
    
    // Bind click listener for file preview
    row.addEventListener('click', (e) => {
      if (e.target.tagName === 'INPUT' && e.target.type === 'checkbox') {
        return;
      }
      if (e.target.closest('.col-check')) {
        return;
      }
      
      document.querySelectorAll('.active-file').forEach(el => el.classList.remove('active-file'));
      row.classList.add('active-file');
      showFilePreview(file);
    });
    
    queueContainer.appendChild(row);
  });
  
  updatePrintButtonState();
}

// Update button counts based on set selections
function updatePrintButtonState() {
  const checkedCount = checkedFilePaths.size;
  startPrintBtn.disabled = checkedCount === 0;
  
  if (printQueueSummary) {
    if (checkedCount > 0) {
      printQueueSummary.textContent = `${checkedCount} documents queued`;
    } else {
      printQueueSummary.textContent = '0 documents queued';
    }
  }
  
  if (checkedCount > 0) {
    startPrintBtn.textContent = `Print Selected (${checkedCount})`;
  } else {
    startPrintBtn.textContent = 'Print Selected';
  }
}

// Handle Print Selected Documents sequence
async function handlePrintSelectedDocuments() {
  if (checkedFilePaths.size === 0) return;
  
  const filePaths = Array.from(checkedFilePaths);
  const selectedPrinter = printerSelect.value;
  
  // Disable UI elements
  startPrintBtn.disabled = true;
  startPrintBtn.textContent = 'Printing...';
  printerSelect.disabled = true;
  queueCheckAll.disabled = true;
  queueContainer.querySelectorAll('.queue-item-check').forEach(cb => cb.disabled = true);
  
  // Set all selected statuses to 'Waiting...' and others to 'Skipped'
  printableFiles.forEach((file, index) => {
    if (checkedFilePaths.has(file.path)) {
      filePrintStatuses[file.path] = 'Waiting...';
    } else {
      filePrintStatuses[file.path] = 'Skipped';
    }
    
    const statusEl = document.getElementById(`print-status-${index}`);
    if (statusEl) {
      statusEl.textContent = filePrintStatuses[file.path];
      statusEl.className = 'col-status-q pending';
    }
    
    const barFill = document.getElementById(`print-progress-bar-${index}`);
    if (barFill) {
      barFill.style.width = '0%';
      barFill.className = 'queue-progress-bar-fill';
    }
  });

  showStatus(`Sending ${filePaths.length} print jobs to ${selectedPrinter || 'default printer'}...`, 'busy');
  
  try {
    const result = await window.api.printFiles({
      filePaths: filePaths,
      printerName: selectedPrinter
    });
    
    showStatus(`Print complete: ${result.successCount} succeeded, ${result.failCount} failed`, result.failCount > 0 ? 'error' : 'active');
  } catch (err) {
    showStatus(`Print queue failed: ${err.message}`, 'error');
    console.error(err);
  } finally {
    // Re-enable UI elements
    printerSelect.disabled = false;
    queueCheckAll.disabled = false;
    queueContainer.querySelectorAll('.queue-item-check').forEach(cb => cb.disabled = false);
    updatePrintButtonState();
  }
}

// Bind the print progress updates
if (window.api && window.api.onPrintProgress) {
  window.api.onPrintProgress((progress) => {
    filePrintStatuses[progress.filePath] = progress.status;
    
    // We need to map filePath back to printableFiles index
    const index = printableFiles.findIndex(f => f.path === progress.filePath);
    if (index !== -1) {
      const statusEl = document.getElementById(`print-status-${index}`);
      const barFill = document.getElementById(`print-progress-bar-${index}`);
      
      if (statusEl) {
        statusEl.textContent = progress.status;
        statusEl.className = 'col-status-q'; // Reset class
        
        const statusText = progress.status.toLowerCase();
        if (statusText.includes('success')) {
          statusEl.className = 'col-status-q success';
          if (barFill) {
            barFill.className = 'queue-progress-bar-fill success';
            barFill.style.width = '100%';
          }
        } else if (statusText.includes('failed')) {
          statusEl.className = 'col-status-q failed';
          statusEl.title = progress.status;
          if (barFill) {
            barFill.className = 'queue-progress-bar-fill failed';
            barFill.style.width = '100%';
          }
        } else if (statusText.includes('printing')) {
          statusEl.className = 'col-status-q printing';
          if (barFill) {
            barFill.className = 'queue-progress-bar-fill active';
            barFill.style.width = '50%';
          }
        } else {
          statusEl.className = 'col-status-q pending';
          if (barFill) {
            barFill.className = 'queue-progress-bar-fill';
            barFill.style.width = '0%';
          }
        }
      }
    }
  });
}

// File Preview Pane Logic
async function showFilePreview(file) {
  if (!file || file.isDirectory) {
    clearFilePreview();
    return;
  }

  const ext = (file.ext || '').toLowerCase();
  const filePath = file.path;
  
  // Normalize path for iframe (replace backslashes, add file:// scheme)
  const fileUrl = `file://${filePath.replace(/\\/g, '/')}`;

  // Update details
  previewFilename.textContent = file.name;
  previewMetaSize.textContent = `Size: ${formatBytes(file.size)}`;
  previewMetaDate.textContent = `Modified: ${formatDate(file.mtime)}`;
  
  previewMetadata.classList.remove('hidden');
  previewActions.classList.remove('hidden');
  
  // Enable buttons
  previewOpenBtn.disabled = false;
  previewShareBtn.disabled = false;
  
  const isPrintableFile = isPrintable(file);
  previewPrintBtn.disabled = !isPrintableFile;
  
  // Remove previous listeners by cloning
  const openClone = previewOpenBtn.cloneNode(true);
  const shareClone = previewShareBtn.cloneNode(true);
  const printClone = previewPrintBtn.cloneNode(true);
  
  previewOpenBtn.parentNode.replaceChild(openClone, previewOpenBtn);
  previewShareBtn.parentNode.replaceChild(shareClone, previewShareBtn);
  previewPrintBtn.parentNode.replaceChild(printClone, previewPrintBtn);
  
  // Bind new listeners
  const newOpenBtn = document.getElementById('preview-open-btn');
  const newShareBtn = document.getElementById('preview-share-btn');
  const newPrintBtn = document.getElementById('preview-print-btn');
  
  newOpenBtn.addEventListener('click', async () => {
    if (window.api && window.api.openPath) {
      await window.api.openPath(filePath);
    }
  });
  
  newShareBtn.addEventListener('click', () => {
    if (window.api && window.api.copyToClipboard) {
      window.api.copyToClipboard(filePath);
      showStatus('File path copied to clipboard!', 'active');
    }
  });
  
  newPrintBtn.addEventListener('click', async () => {
    if (isPrintableFile) {
      newPrintBtn.disabled = true;
      showStatus(`Spooling print job for ${file.name}...`, 'busy');
      try {
        await window.api.printFiles({ filePaths: [filePath], printerName: printerSelect.value });
        showStatus('Print job sent successfully!', 'active');
      } catch (err) {
        showStatus(`Printing failed: ${err.message}`, 'error');
      } finally {
        newPrintBtn.disabled = false;
      }
    }
  });

  try {
    if (ext === '.pdf') {
      // PDF Preview
      previewPlaceholder.classList.add('hidden');
      previewText.classList.add('hidden');
      previewIframe.classList.remove('hidden');
      previewIframe.src = fileUrl;
    } else if (ext === '.html' || ext === '.htm') {
      // HTML Preview
      previewPlaceholder.classList.add('hidden');
      previewText.classList.add('hidden');
      previewIframe.classList.remove('hidden');
      previewIframe.src = fileUrl;
    } else if (['.txt', '.md', '.json', '.csv', '.log', '.properties', '.xml', '.yaml', '.yml'].includes(ext)) {
      // Text/Data Preview (using the secure readFileContent IPC API)
      previewPlaceholder.classList.add('hidden');
      previewIframe.classList.add('hidden');
      previewIframe.src = '';
      previewText.classList.remove('hidden');
      previewText.textContent = 'Loading text preview...';
      
      const content = await window.api.readFileContent(filePath);
      previewText.textContent = content;
    } else if (['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.ico'].includes(ext)) {
      // Image Preview (supported natively by iframe in Electron!)
      previewPlaceholder.classList.add('hidden');
      previewText.classList.add('hidden');
      previewIframe.classList.remove('hidden');
      previewIframe.src = fileUrl;
    } else {
      // Unsupported format placeholder fallback
      previewIframe.classList.add('hidden');
      previewIframe.src = '';
      previewText.classList.add('hidden');
      previewPlaceholder.classList.remove('hidden');
      
      previewPlaceholder.innerHTML = `
        <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.5" style="color: var(--text-dark);">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
          <line x1="12" y1="9" x2="12" y2="13"></line>
          <line x1="12" y1="17" x2="12.01" y2="17"></line>
        </svg>
        <p>Preview not available for ${ext || 'this file'}</p>
      `;
    }
  } catch (err) {
    console.error('Error previewing file:', err);
    previewIframe.classList.add('hidden');
    previewIframe.src = '';
    previewText.classList.remove('hidden');
    previewText.textContent = `Error loading file preview: ${err.message}`;
  }
}

function clearFilePreview() {
  previewFilename.textContent = 'Select a file to preview';
  previewMetadata.classList.add('hidden');
  previewActions.classList.add('hidden');
  
  previewIframe.classList.add('hidden');
  previewIframe.src = '';
  previewText.classList.add('hidden');
  previewPlaceholder.classList.remove('hidden');
  previewPlaceholder.innerHTML = `
    <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.5">
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path>
      <circle cx="12" cy="12" r="3"></circle>
    </svg>
    <p>Select a file to preview</p>
  `;
}

// --- Settings & Updates Modal Controller ---

function openSettingsModal() {
  settingsModal.classList.remove('hidden');
  switchSettingsTab('general');
  
  // Sync selected printer
  modalPrinterSelect.value = printerSelect.value;
}

function closeSettingsModal() {
  settingsModal.classList.add('hidden');
}

function switchSettingsTab(tab) {
  tabSettingsGeneral.classList.remove('active');
  tabSettingsUpdates.classList.remove('active');
  tabSettingsProfile.classList.remove('active');
  
  paneSettingsGeneral.classList.add('hidden');
  paneSettingsUpdates.classList.add('hidden');
  paneSettingsProfile.classList.add('hidden');
  
  if (tab === 'general') {
    tabSettingsGeneral.classList.add('active');
    paneSettingsGeneral.classList.remove('hidden');
  } else if (tab === 'updates') {
    tabSettingsUpdates.classList.add('active');
    paneSettingsUpdates.classList.remove('hidden');
    
    // Clear check updates button state
    modalCheckUpdatesBtn.textContent = 'Check for Updates';
    modalCheckUpdatesBtn.disabled = false;
  } else if (tab === 'profile') {
    tabSettingsProfile.classList.add('active');
    paneSettingsProfile.classList.remove('hidden');
    
    // Load inputs
    if (userProfile) {
      settingsProfileName.value = userProfile.name || '';
      settingsProfileCompany.value = userProfile.company || '';
      settingsProfileEmail.value = userProfile.email || '';
    }
  }
}

async function checkForUpdates(isAuto = false) {
  try {
    if (!isAuto) {
      modalCheckUpdatesBtn.textContent = 'Checking for updates...';
      modalCheckUpdatesBtn.disabled = true;
      updateStatusMessage.textContent = 'Contacting GitHub Releases API...';
    }
    
    const result = await window.api.checkForUpdates();
    
    currentVersionText.textContent = `v${result.currentVersion}`;
    latestVersionText.textContent = `v${result.latestVersion}`;
    
    if (result.updateAvailable) {
      // Show badges
      settingsUpdateBadge.classList.remove('hidden');
      tabUpdateBadge.classList.remove('hidden');
      
      // Update status message
      updateStatusMessage.innerHTML = `<span style="color:var(--accent-cyan); font-weight:600;">Update Available!</span> A new version (v${result.latestVersion}) is ready to download.`;
      
      // Show release notes & download button
      updateInfoSection.classList.remove('hidden');
      releaseNotesText.textContent = result.releaseNotes;
      latestDownloadUrl = result.downloadUrl;
      
      // Reset progress box
      updateDownloadProgressBox.classList.add('hidden');
      modalDownloadUpdatesBtn.classList.remove('hidden');
      modalDownloadUpdatesBtn.textContent = 'Download & Install Update';
      modalDownloadUpdatesBtn.disabled = !result.downloadUrl;
      
      if (!result.downloadUrl) {
        updateStatusMessage.innerHTML += " <span style='color:var(--warning);'>(No installer asset .exe found in release)</span>";
      }
    } else {
      // Hide badges
      settingsUpdateBadge.classList.add('hidden');
      tabUpdateBadge.classList.add('hidden');
      
      updateStatusMessage.textContent = 'FolderScope is up to date! You are running the latest version.';
      updateInfoSection.classList.add('hidden');
    }
  } catch (err) {
    console.error('Update check error:', err);
    if (!isAuto) {
      updateStatusMessage.innerHTML = `<span style="color:var(--error);">Failed to check for updates:</span> ${err.message || 'Network error'}. Make sure you have an internet connection.`;
    }
  } finally {
    if (!isAuto) {
      modalCheckUpdatesBtn.textContent = 'Check for Updates';
      modalCheckUpdatesBtn.disabled = false;
    }
  }
}

async function downloadAndInstallUpdate() {
  if (!latestDownloadUrl) return;
  
  modalDownloadUpdatesBtn.disabled = true;
  modalDownloadUpdatesBtn.textContent = 'Downloading...';
  modalCheckUpdatesBtn.disabled = true;
  closeSettingsBtn.style.display = 'none'; // Prevent closing during download
  
  updateDownloadProgressBox.classList.remove('hidden');
  downloadProgressPercent.textContent = '0%';
  downloadProgressBarFill.style.width = '0%';
  downloadProgressStatus.textContent = 'Starting download...';
  
  const cleanupProgress = window.api.onDownloadProgress((progress) => {
    downloadProgressPercent.textContent = `${progress.percent}%`;
    downloadProgressBarFill.style.width = `${progress.percent}%`;
    downloadProgressStatus.textContent = `Downloaded: ${formatBytes(progress.downloaded)} of ${formatBytes(progress.total)}`;
  });
  
  try {
    const filePath = await window.api.downloadUpdate(latestDownloadUrl);
    downloadProgressStatus.textContent = 'Download complete. Executing setup...';
    downloadProgressPercent.textContent = '100%';
    downloadProgressBarFill.style.width = '100%';
    
    // Tiny delay to let user see 100%
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const result = await window.api.installUpdate(filePath);
    if (!result.success) {
      throw new Error(result.error);
    }
  } catch (err) {
    console.error('Download/install failed:', err);
    updateStatusMessage.innerHTML = `<span style="color:var(--error);">Update installation failed:</span> ${err.message || 'Download error'}.`;
    
    // Restore UI
    modalDownloadUpdatesBtn.disabled = false;
    modalDownloadUpdatesBtn.textContent = 'Download & Install Update';
    modalCheckUpdatesBtn.disabled = false;
    closeSettingsBtn.style.display = 'block';
    updateDownloadProgressBox.classList.add('hidden');
  } finally {
    cleanupProgress();
  }
}

// --- User Profile & Welcome Wizard Controller ---

async function initializeLocalProfile() {
  // Query and set current version text dynamically on start
  try {
    const version = await window.api.getAppVersion();
    currentVersionText.textContent = `v${version}`;
  } catch (e) {
    console.error('Failed to get app version:', e);
  }

  const profileRaw = localStorage.getItem('folderscope_profile');
  if (profileRaw) {
    try {
      userProfile = JSON.parse(profileRaw);
      updateAvatar();
    } catch (e) {
      console.error('Failed to parse local profile:', e);
      welcomeWizardModal.classList.remove('hidden');
    }
  } else {
    // First launch! Show welcome wizard
    welcomeWizardModal.classList.remove('hidden');
  }
}

function updateAvatar() {
  if (userProfile && userProfile.name) {
    const initials = extractInitials(userProfile.name);
    userAvatar.textContent = initials;
    
    // Fill settings profile inputs
    settingsProfileName.value = userProfile.name || '';
    settingsProfileCompany.value = userProfile.company || '';
    settingsProfileEmail.value = userProfile.email || '';
  } else {
    // Default silhouette icon
    userAvatar.innerHTML = `
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: middle;">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
        <circle cx="12" cy="7" r="4"></circle>
      </svg>
    `;
  }
}

function extractInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return '?';
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function openProfileSettings() {
  openSettingsModal();
  switchSettingsTab('profile');
}

function saveProfileFromWizard() {
  const name = wizardProfileName.value.trim();
  const company = wizardProfileCompany.value.trim();
  const email = wizardProfileEmail.value.trim();
  
  if (!name) {
    alert('Please enter your name to personalize your workspace.');
    return;
  }
  if (!company) {
    alert('Please enter your company/organization name.');
    return;
  }
  
  userProfile = { name, company, email };
  localStorage.setItem('folderscope_profile', JSON.stringify(userProfile));
  
  updateAvatar();
  welcomeWizardModal.classList.add('hidden');
  
  showStatus('Welcome! Profile created and workspace personalized.', 'active');
}

function saveProfileFromSettings() {
  const name = settingsProfileName.value.trim();
  const company = settingsProfileCompany.value.trim();
  const email = settingsProfileEmail.value.trim();
  
  if (!name) {
    alert('Please enter your name.');
    return;
  }
  if (!company) {
    alert('Please enter your company/organization name.');
    return;
  }
  
  userProfile = { name, company, email };
  localStorage.setItem('folderscope_profile', JSON.stringify(userProfile));
  
  updateAvatar();
  closeSettingsModal();
  
  showStatus('Profile updated successfully!', 'active');
}
