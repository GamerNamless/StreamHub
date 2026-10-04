const { app, BrowserWindow, ipcMain } = require('electron'); 
const path = require('path'); 
const fs = require('fs'); 
const express = require('express'); 

// 1. БАЗА ДАННЫХ 
const appFolder = process.env.PORTABLE_EXECUTABLE_DIR || app.getPath('userData');
const dbPath = path.join(appFolder, 'database.json'); 
let donations = []; 
if (fs.existsSync(dbPath)) { 
    try { donations = JSON.parse(fs.readFileSync(dbPath, 'utf8')); } catch(e) { donations = []; } 
} else { 
    fs.writeFileSync(dbPath, JSON.stringify(donations)); 
} 
function saveDb() { fs.writeFileSync(dbPath, JSON.stringify(donations, null, 2)); } 

// 2. СЕРВЕР OBS 
const obsServer = express(); 
let currentObsDonation = null; 
obsServer.get('/overlay', (req, res) => res.sendFile(path.join(__dirname, 'overlay.html'))); 
obsServer.get('/api/current', (req, res) => res.json(currentObsDonation)); 
obsServer.listen(3939, () => console.log('OBS Server running on :3939')); 

let mainWindow = null; 
let daWorkerWindow = null; 
let daConnected = false; 

// 3. ФОНОВЫЙ ПЕРЕХВАТЧИК (ТВОЙ ОРИГИНАЛЬНЫЙ 1 В 1)
function connectToDonationAlerts(rawInput) { 
    if (!rawInput) return; 

    let targetUrl = rawInput.trim(); 
    if (!targetUrl.startsWith('http')) { 
        targetUrl = 'https://www.donationalerts.com/widget/alerts?token=' + targetUrl; 
    } 

    console.log('Подключение к виджету DA...'); 

    if (daWorkerWindow) { 
        daWorkerWindow.destroy(); 
        daWorkerWindow = null; 
    } 

    daWorkerWindow = new BrowserWindow({ 
        width: 1280, 
        height: 720, 
        show: false, 
        webPreferences: { 
            nodeIntegration: false, 
            contextIsolation: false 
        } 
    }); 

    daWorkerWindow.loadURL(targetUrl); 

    daWorkerWindow.webContents.on('did-finish-load', () => { 
        daConnected = true; 
        if (mainWindow) mainWindow.webContents.send('da-status', true); 
        console.log('Фоновый виджет загружен. Устанавливаю точный парсер...'); 

        daWorkerWindow.webContents.executeJavaScript(` 
            (() => { 
                const observer = new MutationObserver(() => { 
                    const textElems = document.querySelectorAll('*'); 
                    textElems.forEach(el => { 
                        const t = (el.innerText || '').trim(); 
                        if ((t.includes('RUB') || t.includes('руб') || t.includes('₽')) && t.includes('-')) { 
                            const parent = el.closest('div'); 
                            if (parent && !parent.dataset.captured) { 
                                parent.dataset.captured = 'true'; 
                                console.log('__DOM_ALERT__' + parent.innerText.replace(/\\n/g, ' ')); 
                                setTimeout(() => { delete parent.dataset.captured; }, 8000); 
                            } 
                        } 
                    }); 
                }); 
                observer.observe(document.body, { childList: true, subtree: true }); 
            })(); 
        `); 
    }); 

    daWorkerWindow.webContents.on('console-message', (e, level, message) => { 
        if (message.startsWith('__DOM_ALERT__')) { 
            const raw = message.replace('__DOM_ALERT__', '').trim(); 
            if (!raw) return; 

            console.log('Разбор входящего сообщения:', raw); 

            const match = raw.match(/^(.+?)\s*-\s*([\d\s\.,]+)\s*([A-Za-zА-Яа-я₽$€]+)!\s*(.*)$/); 

            if (match) { 
                const username = match[1].trim(); 
                const amount = parseFloat(match[2].replace(/\s/g, '').replace(',', '.')) || 0; 
                const currency = match[3].trim(); 
                const textMessage = match[4].trim(); 

                handleIncomingDonation({ 
                    username: username, 
                    amount: amount, 
                    currency: currency, 
                    message: textMessage 
                }); 
            } else { 
                const fallbackMatch = raw.match(/^(.+?)\s*-\s*([\d\s\.,]+)\s*([A-Za-zА-Яа-я₽$€]+)\s*(.*)$/); 
                if (fallbackMatch) { 
                    handleIncomingDonation({ 
                        username: fallbackMatch[1].trim(), 
                        amount: parseFloat(fallbackMatch[2].replace(/\s/g, '').replace(',', '.')) || 0, 
                        currency: fallbackMatch[3].trim(), 
                        message: fallbackMatch[4].trim() 
                    }); 
                } 
            } 
        } 
    }); 

    daWorkerWindow.on('closed', () => { 
        daConnected = false; 
        if (mainWindow) mainWindow.webContents.send('da-status', false); 
    }); 
} 

function handleIncomingDonation(payload) { 
    if (!payload || !payload.amount) return; 

    // Анти-дубликатор: не сверяем текст, чтобы урезанная копия без текста не считалась новым донатом 
    const isDuplicate = donations.some(d =>  
        d.username === payload.username &&  
        d.amount === payload.amount &&  
        (Date.now() - d.timestamp) < 8000 
    ); 
    if (isDuplicate) return; 

    console.log(`УСПЕШНО ДОБАВЛЕН ДОНАТ -> От: ${payload.username} | Сумма: ${payload.amount} ${payload.currency} | Текст: ${payload.message}`); 

    const newDonation = { 
        id: Date.now() + Math.floor(Math.random() * 1000), 
        username: payload.username, 
        amount: payload.amount, 
        currency: payload.currency, 
        message: payload.message, 
        status: 'new', 
        is_fake: false, 
        timestamp: Date.now() 
    }; 

    donations.push(newDonation); 
    saveDb(); 

    if (mainWindow) { 
        mainWindow.webContents.send('new-donation', newDonation); 
    } 
} 

// 4. ГЛАВНОЕ ОКНО 
function createWindow () { 
    mainWindow = new BrowserWindow({ 
        width: 1440, 
        height: 900, 
        backgroundColor: '#09090b', 
        webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true } 
    }); 
    mainWindow.loadFile('index.html'); 
} 

app.whenReady().then(() => { 
    createWindow(); 

    ipcMain.handle('get-donations', () => donations); 
    ipcMain.handle('update-status', (e, { id, status }) => { 
        const idx = donations.findIndex(d => d.id === id); 
        if (idx !== -1) { donations[idx].status = status; saveDb(); } 
        return donations; 
    }); 
    ipcMain.handle('mark-all-read', () => {
        donations.forEach(d => { if (d.status !== 'read') d.status = 'read'; });
        saveDb();
        return donations;
    });
    ipcMain.handle('clear-all-data', () => {
        donations = [];
        currentObsDonation = null;
        saveDb();
        return donations;
    });
    ipcMain.handle('send-to-obs', (e, id) => { 
        const donation = donations.find(d => d.id === id); 
        if (donation) currentObsDonation = donation; 
        return true; 
    }); 

    // Добавлена отправка события в главное окно, чтобы фейк мгновенно появлялся в очереди
    ipcMain.handle('add-fake', (e, data) => { 
        const item = { 
            id: Date.now() + Math.floor(Math.random() * 1000), 
            username: (data.username || 'Тестер').trim(), 
            amount: Number(data.amount) || 250, 
            currency: data.currency || 'RUB', 
            message: (data.message || '').trim(), 
            status: 'new', 
            is_fake: true, 
            timestamp: Date.now() 
        }; 
        donations.push(item); 
        saveDb(); 
        if (mainWindow) {
            mainWindow.webContents.send('new-donation', item);
        }
        return donations; 
    }); 

    ipcMain.handle('import-db', (e, importedData) => { 
        donations = importedData; saveDb(); return donations; 
    }); 
    ipcMain.handle('connect-da', (e, token) => { 
        connectToDonationAlerts(token); 
        return true; 
    }); 
    ipcMain.handle('get-da-status', () => daConnected); 
}); 

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); }); 

