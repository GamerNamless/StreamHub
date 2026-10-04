let donations = [];
let currentDonationId = null;
let historyStack = [];
let currentFilter = 'all';
let currentChartType = 'doughnut';
let myChart = null;

let settings = {
    autoObs: localStorage.getItem('autoObs') === 'true',
    accentColor: localStorage.getItem('accentColor') || '#a855f7',
    blacklist: localStorage.getItem('blacklist') || '',
    daToken: localStorage.getItem('daToken') || '',
    feePercent: localStorage.getItem('feePercent') || '7'
};

// UI настройки
document.getElementById('queue-auto-obs').checked = settings.autoObs;
document.getElementById('setting-color').value = settings.accentColor;
document.getElementById('setting-blacklist').value = settings.blacklist;
document.getElementById('da-token').value = settings.daToken;
document.getElementById('report-fee-percent').value = settings.feePercent;
document.documentElement.style.setProperty('--accent', settings.accentColor);

document.getElementById('report-fee-percent').addEventListener('input', (e) => {
    settings.feePercent = e.target.value;
    localStorage.setItem('feePercent', settings.feePercent);
});

if (settings.daToken) {
    window.api.connectDa(settings.daToken);
}

window.api.onDaStatus((isConnected) => {
    const badge = document.getElementById('da-status-badge');
    if (isConnected) {
        badge.className = 'flex items-center gap-2 mb-6 px-3 py-2 rounded-lg bg-emerald-950/40 border border-emerald-800 text-xs text-emerald-300 font-bold';
        badge.innerHTML = '<span class="w-2 h-2 rounded-full bg-emerald-500"></span><span>DA: Подключено</span>';
    } else {
        badge.className = 'flex items-center gap-2 mb-6 px-3 py-2 rounded-lg bg-red-950/40 border border-red-800 text-xs text-red-300 font-bold';
        badge.innerHTML = '<span class="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span><span>DA: Отключено</span>';
    }
});

function formatTime(timestamp) {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function formatFullDateTime(timestamp) {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleString();
}

window.api.onNewDonation(async (newDonation) => {
    if (!donations.some(d => d.id === newDonation.id)) {
        donations.push(newDonation);
    }
    renderList();
    if (!currentDonationId) selectDonation(newDonation.id, false);
    if (settings.autoObs) {
        await window.api.sendToObs(newDonation.id);
    }
    updateAnalytics();
    renderLeaderboard();
});

document.getElementById('queue-auto-obs').addEventListener('change', (e) => {
    settings.autoObs = e.target.checked;
    localStorage.setItem('autoObs', settings.autoObs);
});
document.getElementById('setting-color').addEventListener('input', (e) => {
    settings.accentColor = e.target.value;
    localStorage.setItem('accentColor', settings.accentColor);
    document.documentElement.style.setProperty('--accent', settings.accentColor);
});
document.getElementById('setting-blacklist').addEventListener('change', (e) => {
    settings.blacklist = e.target.value;
    localStorage.setItem('blacklist', settings.blacklist);
});
document.getElementById('btn-save-da').addEventListener('click', () => {
    settings.daToken = document.getElementById('da-token').value.trim();
    localStorage.setItem('daToken', settings.daToken);
    window.api.connectDa(settings.daToken);
});

document.getElementById('btn-mark-all-read').addEventListener('click', async () => {
    const unreadCount = donations.filter(d => d.status !== 'read').length;
    if (unreadCount === 0) {
        alert('Все сообщения уже прочитаны.');
        return;
    }

    const confirmRead = confirm(`Отметить все сообщения (${unreadCount} шт.) как прочитанные?`);
    if (confirmRead) {
        donations = await window.api.markAllRead();
        renderList();
        if (currentDonationId) {
            const cur = donations.find(d => d.id === currentDonationId);
            if (cur) selectDonation(cur.id, false);
        }
    }
});

document.getElementById('btn-clear-database').addEventListener('click', async () => {
    const firstCheck = confirm('⚠️ ВНИМАНИЕ: Вы действительно хотите полностью очистить историю сообщений и сбросить всю аналитику?');
    if (!firstCheck) return;

    const secondCheck = confirm('ПОСЛЕДНЕЕ ПРЕДУПРЕЖДЕНИЕ: Все донаты будут безвозвратно удалены из базы. Продолжить сброс?');
    if (!secondCheck) return;

    donations = await window.api.clearAllData();
    currentDonationId = null;
    historyStack = [];

    document.getElementById('current-donation').classList.add('hidden');
    document.getElementById('empty-state').classList.remove('hidden');

    renderList();
    updateAnalytics();
    renderLeaderboard();
    alert('База данных и аналитика успешно сброшены.');
});

// Навигация
const tabs = ['queue', 'analytics', 'leaderboard', 'fake', 'data', 'settings'];
tabs.forEach(tab => {
    document.getElementById(`tab-${tab}`).onclick = () => {
        tabs.forEach(t => {
            document.getElementById(`tab-${t}`).classList.remove('active');
            document.getElementById(`view-${t}`).classList.add('hidden');
        });
        document.getElementById(`tab-${tab}`).classList.add('active');
        document.getElementById(`view-${tab}`).classList.remove('hidden');
        if (tab === 'analytics') updateAnalytics();
        if (tab === 'leaderboard') renderLeaderboard();
    };
});

['all', 'unread', 'postponed'].forEach(f => {
    document.getElementById(`filter-${f}`).onclick = () => {
        currentFilter = f;
        ['all', 'unread', 'postponed'].forEach(x => {
            const btn = document.getElementById(`filter-${x}`);
            btn.className = (x === f) ? 'flex-1 py-1 bg-gray-800 rounded text-white font-semibold' : 'flex-1 py-1 bg-transparent hover:bg-gray-800/50 rounded text-gray-400 font-semibold';
        });
        renderList();
    };
});

function checkBlacklist(text) {
    if (!settings.blacklist || !text) return false;
    const words = settings.blacklist.split(',').map(w => w.trim().toLowerCase()).filter(w => w.length > 0);
    const lower = text.toLowerCase();
    return words.some(w => lower.includes(w));
}

async function loadData() {
    donations = await window.api.getDonations();
    renderList();
    if (!currentDonationId && donations.length > 0) {
        const first = donations.find(d => d.status === 'new') || donations[0];
        selectDonation(first.id, false);
    }
}

function renderList() {
    const list = document.getElementById('queue-list');
    list.innerHTML = '';
    
    const statusPriority = { new: 1, postponed: 2, read: 3 };
    let filtered = [...donations].sort((a, b) => {
        const pA = statusPriority[a.status] || 1;
        const pB = statusPriority[b.status] || 1;
        if (pA !== pB) return pA - pB;
        return (b.timestamp || 0) - (a.timestamp || 0);
    });

    if (currentFilter === 'unread') filtered = filtered.filter(d => d.status === 'new');
    if (currentFilter === 'postponed') filtered = filtered.filter(d => d.status === 'postponed');

    document.getElementById('queue-counter').innerText = donations.filter(d => d.status === 'new').length;

    filtered.forEach(d => {
        const isRead = d.status === 'read';
        const isPostponed = d.status === 'postponed';
        const isSelected = d.id === currentDonationId;
        const hasWarning = checkBlacklist(d.message);
        const timeStr = formatTime(d.timestamp);

        let statusIcon = '🔵';
        if (isRead) statusIcon = '✓';
        if (isPostponed) statusIcon = '🕒';

        const item = document.createElement('div');
        item.className = `p-3 rounded-lg border transition cursor-pointer relative group ${
            isSelected ? 'border-[var(--accent)] bg-purple-950/20' : 'border-gray-800 bg-[#141417] hover:border-gray-700'
        } ${isRead ? 'opacity-40 hover:opacity-80' : 'opacity-100'}`;
        
        item.onclick = (e) => {
            if (e.target.closest('.revert-btn')) return;
            selectDonation(d.id, true);
        };

        item.innerHTML = `
            <div class="flex items-center justify-between font-bold text-sm mb-1">
                <span class="flex items-center gap-1.5 truncate">
                    <span class="text-xs">${statusIcon}</span>
                    <span class="truncate">${d.username}</span>
                    ${d.is_fake ? '<span class="text-[10px] text-red-400 font-normal">[Т]</span>' : ''}
                    ${hasWarning ? '<span class="text-[10px] text-amber-400">⚠</span>' : ''}
                </span>
                <span class="text-emerald-400 font-mono text-xs whitespace-nowrap ml-2">${d.amount} ₽</span>
            </div>
            <div class="flex items-center justify-between text-xs text-gray-400">
                <span class="truncate mr-2">${d.message || 'Без текста'}</span>
                <span class="text-[11px] text-gray-500 font-mono shrink-0">${timeStr}</span>
            </div>
            
            ${isRead || isPostponed ? `
                <button title="Вернуть в новые" class="revert-btn absolute right-2 bottom-2 text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition">
                    ↺ В новые
                </button>
            ` : ''}
        `;

        if (isRead || isPostponed) {
            const revertBtn = item.querySelector('.revert-btn');
            if (revertBtn) {
                revertBtn.onclick = async (e) => {
                    e.stopPropagation();
                    donations = await window.api.updateStatus(d.id, 'new');
                    renderList();
                    if (currentDonationId === d.id) selectDonation(d.id, false);
                };
            }
        }

        list.appendChild(item);
    });
}

function selectDonation(id, pushHistory = true) {
    const d = donations.find(x => x.id === id);
    if (!d) return;

    if (pushHistory && currentDonationId && currentDonationId !== id) {
        historyStack.push(currentDonationId);
    }
    currentDonationId = id;

    document.getElementById('current-donation').classList.remove('hidden');
    document.getElementById('empty-state').classList.add('hidden');

    document.getElementById('cd-time').innerText = formatFullDateTime(d.timestamp);
    document.getElementById('cd-username').innerText = d.username;
    document.getElementById('cd-amount').innerText = `${d.amount} ${d.currency}`;
    document.getElementById('cd-message').innerText = d.message || '—';

    const statusBadge = document.getElementById('cd-status-badge');
    if (d.status === 'read') {
        statusBadge.innerText = 'ПРОЧИТАНО ✓';
        statusBadge.className = 'text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full bg-gray-800 text-gray-400 border border-gray-700';
    } else if (d.status === 'postponed') {
        statusBadge.innerText = 'ОТЛОЖЕНО 🕒';
        statusBadge.className = 'text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full bg-amber-900/60 text-amber-300 border border-amber-600';
    } else {
        statusBadge.innerText = 'НОВОЕ';
        statusBadge.className = 'text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full bg-blue-900/60 text-blue-400 border border-blue-700';
    }

    const fakeBadge = document.getElementById('cd-fake-badge');
    if (d.is_fake) fakeBadge.classList.remove('hidden'); else fakeBadge.classList.add('hidden');

    const warnBadge = document.getElementById('cd-warn-badge');
    const hasWarn = checkBlacklist(d.message);
    if (hasWarn) warnBadge.classList.remove('hidden'); else warnBadge.classList.add('hidden');

    renderList();
}

async function goNext() {
    if (!currentDonationId) return;
    donations = await window.api.updateStatus(currentDonationId, 'read');
    
    const next = donations.find(x => x.status === 'new' && x.id !== currentDonationId);
    if (next) selectDonation(next.id, true);
    else {
        const postponed = donations.find(x => x.status === 'postponed' && x.id !== currentDonationId);
        if (postponed) selectDonation(postponed.id, true);
        else renderList();
    }
}

function goPrev() {
    if (historyStack.length > 0) {
        const prevId = historyStack.pop();
        selectDonation(prevId, false);
    }
}

async function postponeCurrent() {
    if (!currentDonationId) return;
    donations = await window.api.updateStatus(currentDonationId, 'postponed');
    const next = donations.find(x => x.status === 'new' && x.id !== currentDonationId);
    if (next) selectDonation(next.id, true);
    else renderList();
}

document.getElementById('btn-next').onclick = goNext;
document.getElementById('btn-prev').onclick = goPrev;
document.getElementById('btn-postpone').onclick = postponeCurrent;

document.getElementById('btn-reset-read').onclick = async () => {
    if (!currentDonationId) return;
    donations = await window.api.updateStatus(currentDonationId, 'new');
    selectDonation(currentDonationId, false);
};

document.getElementById('btn-obs').onclick = async () => {
    if (!currentDonationId) return;
    await window.api.sendToObs(currentDonationId);
    const b = document.getElementById('btn-obs');
    b.innerText = '✅ Отправлено';
    setTimeout(() => b.innerText = '▶ В OBS', 1500);
};

window.addEventListener('keydown', (e) => {
    const active = document.activeElement;
    if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) return;

    if (e.code === 'Space' || e.code === 'ArrowRight') {
        e.preventDefault();
        goNext();
    } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        goPrev();
    } else if (e.code === 'Escape') {
        closeEasterEgg();
    }
});

// КНОПКА ОТПРАВКИ ТЕСТОВОГО ДОНАТА (С ПРИНУДИТЕЛЬНЫМ ВЫВОДОМ)
document.getElementById('btn-send-fake').onclick = async () => {
    try {
        const nameVal = document.getElementById('fake-name').value.trim() || 'Тестер';
        const amountVal = parseFloat(document.getElementById('fake-amount').value) || 250;
        const msgVal = document.getElementById('fake-msg').value.trim();

        const data = {
            username: nameVal,
            amount: amountVal,
            currency: 'RUB',
            message: msgVal
        };

        // Сохраняем в базе
        donations = await window.api.addFake(data);
        document.getElementById('fake-msg').value = '';

        const newDonation = donations[donations.length - 1];
        
        // Отправляем в оверлей OBS для визуального теста
        await window.api.sendToObs(newDonation.id);

        // Переходим в очередь и фокусируемся на нем
        document.getElementById('tab-queue').click();
        renderList();
        selectDonation(newDonation.id, true);
        updateAnalytics();
        renderLeaderboard();
    } catch(err) {
        console.error(err);
        alert('Ошибка добавления доната: ' + err.message);
    }
};

// Выбор диаграммы
['doughnut', 'bar', 'line'].forEach(type => {
    document.getElementById(`chart-type-${type}`).addEventListener('click', () => {
        currentChartType = type;
        ['doughnut', 'bar', 'line'].forEach(t => {
            const b = document.getElementById(`chart-type-${t}`);
            if (t === type) {
                b.className = 'py-1 px-3 text-xs font-bold rounded bg-purple-600 text-white transition';
            } else {
                b.className = 'py-1 px-3 text-xs font-bold rounded text-gray-400 hover:text-white transition';
            }
        });
        updateAnalytics();
    });
});

// Календарь
const periodSelect = document.getElementById('analytics-period');
const customContainer = document.getElementById('custom-date-container');
const dateFromInput = document.getElementById('date-from');
const dateToInput = document.getElementById('date-to');

[dateFromInput, dateToInput].forEach(input => {
    input.addEventListener('click', () => {
        try { if (typeof input.showPicker === 'function') input.showPicker(); } catch(e) {}
    });
    input.addEventListener('change', updateAnalytics);
});

periodSelect.addEventListener('change', () => {
    if (periodSelect.value === 'custom') {
        customContainer.classList.remove('hidden');
        customContainer.classList.add('flex');
        const todayStr = new Date().toISOString().split('T')[0];
        if (!dateToInput.value) dateToInput.value = todayStr;
        if (!dateFromInput.value) dateFromInput.value = todayStr;
    } else {
        customContainer.classList.add('hidden');
        customContainer.classList.remove('flex');
    }
    updateAnalytics();
});

document.getElementById('btn-reset-dates').addEventListener('click', () => {
    dateFromInput.value = '';
    dateToInput.value = '';
    updateAnalytics();
});

function getFilteredDonations() {
    const period = periodSelect.value;
    const now = Date.now();
    let filtered = donations.filter(d => !d.is_fake);

    if (period === '14' || period === '30') {
        const msInDay = 24 * 60 * 60 * 1000;
        const days = parseInt(period);
        filtered = filtered.filter(d => {
            const t = d.timestamp || 0;
            return (now - t) <= (days * msInDay);
        });
    } else if (period === 'custom') {
        const fromStr = dateFromInput.value;
        const toStr = dateToInput.value;

        let fromTime = 0;
        let toTime = Infinity;

        if (fromStr) {
            const [y, m, d] = fromStr.split('-').map(Number);
            fromTime = new Date(y, m - 1, d, 0, 0, 0, 0).getTime();
        }
        if (toStr) {
            const [y, m, d] = toStr.split('-').map(Number);
            toTime = new Date(y, m - 1, d, 23, 59, 59, 999).getTime();
        }

        filtered = filtered.filter(d => {
            const t = d.timestamp || now;
            return t >= fromTime && t <= toTime;
        });
    }
    return filtered;
}

function updateAnalytics() {
    const filtered = getFilteredDonations();

    const total = filtered.reduce((sum, d) => sum + Number(d.amount), 0);
    const count = filtered.length;
    const avg = count > 0 ? Math.round(total / count) : 0;
    
    document.getElementById('stat-total').innerText = `${total} ₽`;
    document.getElementById('stat-count').innerText = count;
    document.getElementById('stat-avg').innerText = `${avg} ₽`;

    const users = {};
    filtered.forEach(d => { users[d.username] = (users[d.username] || 0) + Number(d.amount); });
    const sorted = Object.entries(users).sort((a, b) => b[1] - a[1]).slice(0, 6);
    
    const labels = sorted.length ? sorted.map(u => u[0]) : ['Нет данных'];
    const data = sorted.length ? sorted.map(u => u[1]) : [0];

    if (myChart) myChart.destroy();
    const ctx = document.getElementById('myChart').getContext('2d');

    const colors = ['#a855f7', '#ec4899', '#3b82f6', '#10b981', '#f59e0b', '#6366f1'];

    let chartConfig = {
        type: currentChartType,
        data: {
            labels: labels,
            datasets: [{
                label: 'Сумма поддержки (₽)',
                data: data,
                backgroundColor: currentChartType === 'line' ? 'rgba(168, 85, 247, 0.2)' : colors,
                borderColor: currentChartType === 'line' ? '#a855f7' : undefined,
                borderWidth: currentChartType === 'line' ? 2 : 0,
                fill: currentChartType === 'line',
                tension: 0.35,
                pointBackgroundColor: '#a855f7',
                pointRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: currentChartType === 'doughnut' ? 'bottom' : 'top',
                    labels: { color: '#f8fafc', font: { size: 11 } }
                }
            },
            scales: currentChartType !== 'doughnut' ? {
                x: { ticks: { color: '#9ca3af' }, grid: { color: '#27272a' } },
                y: { ticks: { color: '#9ca3af' }, grid: { color: '#27272a' } }
            } : undefined,
            cutout: currentChartType === 'doughnut' ? '70%' : undefined
        }
    };

    myChart = new Chart(ctx, chartConfig);
}

// Лидерборд
const limitInput = document.getElementById('leaderboard-limit');
limitInput.addEventListener('input', renderLeaderboard);

function renderLeaderboard() {
    const tbody = document.getElementById('leaderboard-tbody');
    tbody.innerHTML = '';

    const limit = Math.max(1, parseInt(limitInput.value) || 10);
    const validDonations = donations.filter(d => !d.is_fake);

    const userStats = {};
    validDonations.forEach(d => {
        if (!userStats[d.username]) {
            userStats[d.username] = { total: 0, count: 0 };
        }
        userStats[d.username].total += Number(d.amount);
        userStats[d.username].count += 1;
    });

    const sortedUsers = Object.entries(userStats)
        .sort((a, b) => b[1].total - a[1].total)
        .slice(0, limit);

    if (sortedUsers.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="py-8 text-center text-gray-500 font-bold">Нет данных о донатах</td></tr>`;
        return;
    }

    sortedUsers.forEach(([username, stat], index) => {
        const rank = index + 1;
        let rankBadge = `<span class="text-gray-400 font-mono font-bold">${rank}</span>`;
        if (rank === 1) rankBadge = `<span class="text-xl">🥇</span>`;
        if (rank === 2) rankBadge = `<span class="text-xl">🥈</span>`;
        if (rank === 3) rankBadge = `<span class="text-xl">🥉</span>`;

        const avg = Math.round(stat.total / stat.count);

        const tr = document.createElement('tr');
        tr.className = 'hover:bg-white/5 transition';
        tr.innerHTML = `
            <td class="py-3 px-4 text-center font-bold">${rankBadge}</td>
            <td class="py-3 px-4 font-bold text-white">${username}</td>
            <td class="py-3 px-4 text-center font-mono text-gray-400">${stat.count} шт.</td>
            <td class="py-3 px-4 text-center font-mono text-gray-400">${avg} ₽</td>
            <td class="py-3 px-4 text-right font-mono font-extrabold text-emerald-400 text-base">${stat.total} ₽</td>
        `;
        tbody.appendChild(tr);
    });
}

// Пасхалка (3 клика)
const trigger = document.getElementById('easter-egg-trigger');
const modal = document.getElementById('easter-egg-modal');
const card = document.getElementById('easter-card');
const closeBtn = document.getElementById('btn-close-easter');

let clickCount = 0;
let clickTimer = null;

trigger.addEventListener('click', () => {
    clickCount++;
    clearTimeout(clickTimer);
    if (clickCount >= 3) {
        openEasterEgg();
        clickCount = 0;
    } else {
        clickTimer = setTimeout(() => { clickCount = 0; }, 1500);
    }
});

function openEasterEgg() {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    setTimeout(() => {
        card.classList.remove('scale-95');
        card.classList.add('scale-100');
    }, 10);
}

function closeEasterEgg() {
    card.classList.remove('scale-100');
    card.classList.add('scale-95');
    setTimeout(() => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }, 150);
}

closeBtn.addEventListener('click', closeEasterEgg);
modal.addEventListener('click', (e) => {
    if (e.target === modal) closeEasterEgg();
});

document.getElementById('link-yt').addEventListener('click', () => {
    window.api.openExternal('https://www.youtube.com/@GamerNamless');
});
document.getElementById('link-tg').addEventListener('click', () => {
    window.api.openExternal('https://t.me/GamerNamless');
});

document.getElementById('btn-export-json').onclick = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(donations, null, 2));
    const a = document.createElement('a'); a.href = dataStr; a.download = "streamhub_backup.json";
    document.body.appendChild(a); a.click(); a.remove();
};

document.getElementById('file-import-json').addEventListener('change', function(e) {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const imported = JSON.parse(e.target.result);
            donations = await window.api.importDb(imported);
            alert('База загружена!'); 
            loadData();
            updateAnalytics();
            renderLeaderboard();
        } catch(err) { alert('Ошибка чтения файла'); }
    };
    reader.readAsText(file);
});

// Генерация отчета
document.getElementById('btn-export-html').onclick = () => {
    const includeFakes = document.getElementById('report-include-fakes').checked;
    const reportData = includeFakes ? donations : donations.filter(d => !d.is_fake);
    
    const feeRate = parseFloat(document.getElementById('report-fee-percent').value) || 0;
    const totalGross = reportData.reduce((sum, d) => sum + Number(d.amount), 0);
    const feeAmount = Math.round((totalGross * (feeRate / 100)) * 100) / 100;
    const totalNet = Math.round((totalGross - feeAmount) * 100) / 100;
    
    const htmlContent = `
    <!DOCTYPE html>
    <html lang="ru"><head><meta charset="UTF-8"><title>Финансовый отчет StreamHub</title>
    <script src="https://cdn.tailwindcss.com"></script>
    </head><body class="bg-gray-950 text-white p-10 font-sans antialiased">
        <div class="max-w-3xl mx-auto bg-gray-900 p-8 rounded-2xl border border-gray-800 shadow-2xl">
            <div class="flex items-center justify-between mb-2">
                <h1 class="text-3xl font-black" style="color: ${settings.accentColor}">Итоги Стрима</h1>
                <span class="text-xs bg-gray-800 text-gray-400 font-mono px-3 py-1 rounded-full border border-gray-700">StreamHub Core</span>
            </div>
            <p class="text-xs text-gray-500 mb-6 font-mono">${new Date().toLocaleString()}</p>
            
            <div class="grid grid-cols-3 gap-4 mb-6">
                <div class="bg-black/50 p-4 rounded-xl border border-gray-800">
                    <div class="text-[11px] text-gray-400 uppercase font-bold tracking-wider mb-1">Собрано всего (Грязными)</div>
                    <div class="text-2xl font-extrabold text-white font-mono">${totalGross} ₽</div>
                </div>
                <div class="bg-black/50 p-4 rounded-xl border border-red-950/60 bg-red-950/10">
                    <div class="text-[11px] text-red-400 uppercase font-bold tracking-wider mb-1">Комиссия (${feeRate}%)</div>
                    <div class="text-2xl font-extrabold text-red-400 font-mono">- ${feeAmount} ₽</div>
                </div>
                <div class="bg-black/50 p-4 rounded-xl border border-emerald-800/80 bg-emerald-950/20">
                    <div class="text-[11px] text-emerald-400 uppercase font-bold tracking-wider mb-1">Чистая выплата (На руки)</div>
                    <div class="text-2xl font-black text-emerald-400 font-mono">${totalNet} ₽</div>
                </div>
            </div>

            <div class="bg-black/30 p-4 rounded-xl border border-gray-800 mb-6 flex justify-between items-center text-xs text-gray-400 font-mono">
                <span>Всего донатов в отчете: <b class="text-white">${reportData.length} шт.</b></span>
                <span>Средний донат: <b class="text-white">${reportData.length > 0 ? Math.round(totalGross / reportData.length) : 0} ₽</b></span>
            </div>

            <h2 class="text-lg font-bold mb-3 flex items-center gap-2">
                <span>История сообщений</span>
                <span class="text-xs text-gray-500 font-normal">(${reportData.length})</span>
            </h2>
            <div class="space-y-2">
                ${reportData.length === 0 ? '<p class="text-gray-500 text-sm py-4 text-center">Нет данных для отображения</p>' : 
                reportData.map(d => `<div class="bg-black/30 p-3 rounded-lg flex items-center justify-between border border-gray-800/60">
                    <div class="text-sm">
                        <b>${d.username}:</b> <span class="text-gray-300">${d.message || '<i class="text-gray-600">Без текста</i>'}</span> 
                        ${d.is_fake ? '<span class="text-red-400 text-xs ml-1">[ФЕЙК]</span>' : ''}
                        <div class="text-[11px] text-gray-500 font-mono mt-0.5">${new Date(d.timestamp).toLocaleString()}</div>
                    </div>
                    <span class="font-mono text-sm font-bold ml-4 shrink-0" style="color: ${settings.accentColor}">${d.amount} ₽</span>
                </div>`).join('')}
            </div>
            
            <div class="mt-8 pt-4 border-t border-gray-800 flex justify-between items-center text-[11px] text-gray-600 font-mono">
                <span>Разработано: GamerNamless</span>
                <span>StreamHub</span>
            </div>
        </div>
    </body></html>`;
    
    const dataStr = "data:text/html;charset=utf-8," + encodeURIComponent(htmlContent);
    const a = document.createElement('a'); a.href = dataStr; a.download = `Report_${new Date().toISOString().slice(0,10)}.html`;
    document.body.appendChild(a); a.click(); a.remove();
};

loadData();
