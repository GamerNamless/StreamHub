const { contextBridge, ipcRenderer, shell } = require('electron');
contextBridge.exposeInMainWorld('api', {
    getDonations: () => ipcRenderer.invoke('get-donations'),
    updateStatus: (id, status) => ipcRenderer.invoke('update-status', { id, status }),
    markAllRead: () => ipcRenderer.invoke('mark-all-read'),
    clearAllData: () => ipcRenderer.invoke('clear-all-data'),
    sendToObs: (id) => ipcRenderer.invoke('send-to-obs', id),
    addFake: (data) => ipcRenderer.invoke('add-fake', data),
    importDb: (data) => ipcRenderer.invoke('import-db', data),
    connectDa: (token) => ipcRenderer.invoke('connect-da', token),
    getDaStatus: () => ipcRenderer.invoke('get-da-status'),
    openExternal: (url) => shell.openExternal(url),
    onNewDonation: (callback) => ipcRenderer.on('new-donation', (e, val) => callback(val)),
    onDaStatus: (callback) => ipcRenderer.on('da-status', (e, val) => callback(val))
});
