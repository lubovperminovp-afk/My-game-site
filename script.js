// =====================================================
// ОБЩИЕ УТИЛИТЫ
// =====================================================
function waitForFirebase(callback) {
    if (window.firebaseReady && window.db) {
        callback();
    } else {
        setTimeout(function() { waitForFirebase(callback); }, 100);
    }
}

// =====================================================
// АВТОРИЗАЦИЯ
// =====================================================
document.addEventListener('DOMContentLoaded', function() {
    const loginBtn = document.getElementById('login-btn');
    const modal = document.getElementById('auth-modal');
    const closeBtn = document.getElementById('modal-close');
    const tabs = document.querySelectorAll('.auth-tab');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const logoutBtn = document.getElementById('logout-btn');

    if (loginBtn && modal) loginBtn.addEventListener('click', () => modal.style.display = 'flex');
    if (closeBtn && modal) closeBtn.addEventListener('click', () => modal.style.display = 'none');
    if (modal) modal.addEventListener('click', (e) => { if (e.target === modal) modal.style.display = 'none'; });

    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            tabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            const target = this.dataset.tab;
            if (target === 'login') {
                loginForm.classList.add('active');
                registerForm.classList.remove('active');
            } else {
                registerForm.classList.add('active');
                loginForm.classList.remove('active');
            }
        });
    });

    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const email = document.getElementById('login-email').value.trim();
            const password = document.getElementById('login-password').value;
            try {
                const { signInWithEmailAndPassword } = await import(
                    'https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js'
                );
                await signInWithEmailAndPassword(window.auth, email, password);
                modal.style.display = 'none';
            } catch (error) {
                alert('Ошибка входа: ' + error.message);
            }
        });
    }

    if (registerForm) {
        registerForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const name = document.getElementById('register-name').value.trim();
            const email = document.getElementById('register-email').value.trim();
            const password = document.getElementById('register-password').value;
            try {
                const { createUserWithEmailAndPassword, updateProfile } = await import(
                    'https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js'
                );
                const cred = await createUserWithEmailAndPassword(window.auth, email, password);
                await updateProfile(cred.user, { displayName: name });
                modal.style.display = 'none';
            } catch (error) {
                alert('Ошибка регистрации: ' + error.message);
            }
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', async function() {
            const { signOut } = await import(
                'https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js'
            );
            await signOut(window.auth);
        });
    }

    waitForFirebase(async function() {
        const { onAuthStateChanged } = await import(
            'https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js'
        );
        onAuthStateChanged(window.auth, function(user) {
            const userMenu = document.getElementById('user-menu');
            const loginBtn = document.getElementById('login-btn');
            const nameEl = document.getElementById('user-display-name');
            if (user) {
                if (userMenu) userMenu.style.display = 'flex';
                if (loginBtn) loginBtn.style.display = 'none';
                if (nameEl) nameEl.textContent = user.displayName || user.email.split('@')[0];
            } else {
                if (userMenu) userMenu.style.display = 'none';
                if (loginBtn) loginBtn.style.display = 'inline-block';
            }
        });
    });
});

// =====================================================
// ЛИДЕРБОРД
// =====================================================
document.addEventListener('DOMContentLoaded', function() {
    const scoreForm = document.getElementById('score-form');
    const filterSelect = document.getElementById('leaderboard-game-filter');

    if (scoreForm) {
        scoreForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const name = document.getElementById('player-name').value.trim();
            const score = parseInt(document.getElementById('player-score').value);
            const game = document.getElementById('game-title').value;
            if (!name || isNaN(score) || !game) return;
            try {
                const { collection, addDoc } = await import(
                    'https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js'
                );
                await addDoc(collection(window.db, 'scores'), {
                    playerName: name, score, game, createdAt: new Date()
                });
                scoreForm.reset();
                loadLeaderboard();
            } catch (error) { alert('Ошибка: ' + error.message); }
        });
    }

    if (filterSelect) filterSelect.addEventListener('change', loadLeaderboard);

    waitForFirebase(loadLeaderboard);
});

async function loadLeaderboard() {
    const tbody = document.getElementById('leaderboard-body');
    if (!tbody) return;
    try {
        const { collection, getDocs, query, orderBy } = await import(
            'https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js'
        );
        const q = query(collection(window.db, 'scores'), orderBy('score', 'desc'));
        const snapshot = await getDocs(q);
        const filter = document.getElementById('leaderboard-game-filter')?.value || '';
        let scores = [];
        snapshot.forEach(doc => scores.push(doc.data()));
        if (filter) scores = scores.filter(s => s.game === filter);
        if (scores.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Нет рекордов</td></tr>';
            return;
        }
        tbody.innerHTML = scores.map((s, i) => `
            <tr><td>${i + 1}</td><td>${s.playerName}</td><td>${s.score}</td><td>${s.game}</td></tr>
        `).join('');
    } catch (error) {
        console.error('Ошибка лидерборда:', error);
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:red;">Ошибка: ${error.message}</td></tr>`;
    }
}

// =====================================================
// ЛАБОРАТОРНАЯ №11: Поиск и фильтрация
// =====================================================
let allGames = [];

async function loadAllGames() {
    // ✅ Лабораторная №12: показываем skeleton-заглушки
    showSkeletons(3);

    try {
        const { collection, getDocs } = await import(
            'https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js'
        );
        const querySnapshot = await getDocs(collection(window.db, 'games'));
        allGames = [];
        querySnapshot.forEach(function(doc) {
            allGames.push({ id: doc.id, ...doc.data() });
        });
        console.log('📦 Загружено игр:', allGames.length);
        applyFilters();
    } catch (error) {
        console.error('❌ Ошибка загрузки:', error);
    }
}

function applyFilters() {
    const searchText = (document.getElementById('search-input')?.value || '').toLowerCase().trim();
    const genre = document.getElementById('genre-filter')?.value || '';
    const minRating = parseFloat(document.getElementById('rating-filter')?.value) || 0;
    const sortBy = document.getElementById('sort-filter')?.value || 'default';

    let filtered = [...allGames];

    if (searchText) {
        filtered = filtered.filter(g =>
            (g.title || '').toLowerCase().includes(searchText) ||
            (g.genre || '').toLowerCase().includes(searchText)
        );
    }
    if (genre) filtered = filtered.filter(g => g.genre === genre);
    if (minRating > 0) filtered = filtered.filter(g => (parseFloat(g.rating) || 0) >= minRating);

    switch (sortBy) {
        case 'rating-desc': filtered.sort((a, b) => (parseFloat(b.rating) || 0) - (parseFloat(a.rating) || 0)); break;
        case 'rating-asc':  filtered.sort((a, b) => (parseFloat(a.rating) || 0) - (parseFloat(b.rating) || 0)); break;
        case 'title-asc':   filtered.sort((a, b) => (a.title || '').localeCompare(b.title || '', 'ru')); break;
        case 'title-desc':  filtered.sort((a, b) => (b.title || '').localeCompare(a.title || '', 'ru')); break;
    }

    renderFilteredGames(filtered);

    const counter = document.getElementById('results-count');
    if (counter) counter.textContent = 'Найдено: ' + filtered.length;
}

function renderFilteredGames(games) {
    const container = document.getElementById('games-container');
    if (!container) return;

    if (games.length === 0) {
        container.innerHTML = '<p style="text-align:center; grid-column: 1 / -1;">😕 Игры не найдены</p>';
        return;
    }

    container.innerHTML = games.map(function(game) {
        return `
            <div class="game-card">
                <img src="${game.imageUrl || 'https://via.placeholder.com/280x150'}"
                     alt="${game.title}" class="game-image">
                <div class="game-info">
                    <h3 class="game-title">${game.title}</h3>
                    <p class="game-genre">${game.genre}</p>
                    <p class="game-rating">⭐ ${game.rating}</p>
                </div>
            </div>
        `;
    }).join('');
}

document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('search-input')?.addEventListener('input', applyFilters);
    document.getElementById('genre-filter')?.addEventListener('change', applyFilters);
    document.getElementById('rating-filter')?.addEventListener('input', applyFilters);
    document.getElementById('sort-filter')?.addEventListener('change', applyFilters);

    document.getElementById('reset-filters')?.addEventListener('click', function() {
        document.getElementById('search-input').value = '';
        document.getElementById('genre-filter').value = '';
        document.getElementById('rating-filter').value = '';
        document.getElementById('sort-filter').value = 'default';
        applyFilters();
    });

    waitForFirebase(loadAllGames);
});

// =====================================================
// ЛАБОРАТОРНАЯ №12: Skeleton screens (самостоятельная)
// =====================================================
function showSkeletons(count = 3) {
    const container = document.getElementById('games-container');
    if (!container) return;

    container.innerHTML = '';
    for (let i = 0; i < count; i++) {
        const skeleton = document.createElement('div');
        skeleton.className = 'skeleton-card';
        skeleton.innerHTML = `
            <div class="skeleton skeleton-image"></div>
            <div class="skeleton skeleton-title"></div>
            <div class="skeleton skeleton-text"></div>
            <div class="skeleton skeleton-text"></div>
        `;
        container.appendChild(skeleton);
    }
}

// =====================================================
// ЛАБОРАТОРНАЯ №12: Бургер-меню
// =====================================================
document.addEventListener('DOMContentLoaded', function() {
    const burgerToggle = document.getElementById('burger-toggle');
    const navItems = document.querySelectorAll('.main-nav a, .main-nav button');

    navItems.forEach(function(item) {
        item.addEventListener('click', function() {
            if (burgerToggle) burgerToggle.checked = false;
        });
    });
});