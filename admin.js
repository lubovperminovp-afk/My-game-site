// =====================================================
// ЛАБОРАТОРНАЯ №10: Административная панель
// =====================================================

// ⚠️ ЗАМЕНИ НА СВОЙ EMAIL!
const ADMIN_EMAIL = 'admin@mail.ru';

// =====================================================
// ПРОВЕРКА ДОСТУПА
// =====================================================
document.addEventListener('DOMContentLoaded', function() {
    waitForAuthForAdmin();
    initAdminModal();
});

function waitForAuthForAdmin() {
    if (window.firebaseReady && window.auth) {
        checkAdminAccess();
    } else {
        setTimeout(waitForAuthForAdmin, 100);
    }
}

async function checkAdminAccess() {
    const { onAuthStateChanged, signOut } = await import(
        'https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js'
    );

    onAuthStateChanged(window.auth, function(user) {
        const adminContent = document.getElementById('admin-content');
        const accessDenied = document.getElementById('access-denied');

        if (user && user.email === ADMIN_EMAIL) {
            console.log('✅ Доступ к админ-панели разрешён');
            adminContent.style.display = 'block';
            accessDenied.style.display = 'none';
            document.getElementById('admin-email').textContent = user.email;

            loadStats();
            loadAdminGames();

            const userMenu = document.getElementById('user-menu');
            const loginBtn = document.getElementById('login-btn');
            if (userMenu) userMenu.style.display = 'flex';
            if (loginBtn) loginBtn.style.display = 'none';
            const nameEl = document.getElementById('user-display-name');
            if (nameEl) nameEl.textContent = user.displayName || user.email.split('@')[0];

        } else {
            console.log('⛔ Доступ запрещён');
            adminContent.style.display = 'none';
            accessDenied.style.display = 'block';
        }
    });

    // Кнопка выхода (внизу админки)
    const adminLogoutBtn = document.getElementById('admin-logout');
    if (adminLogoutBtn) {
        adminLogoutBtn.addEventListener('click', async function() {
            await signOut(window.auth);
            window.location.href = 'index.html';
        });
    }

    // Кнопка выхода (в шапке)
    const headerLogoutBtn = document.getElementById('logout-btn');
    if (headerLogoutBtn) {
        headerLogoutBtn.addEventListener('click', async function() {
            await signOut(window.auth);
            window.location.href = 'index.html';
        });
    }
}

// =====================================================
// МОДАЛЬНОЕ ОКНО ВХОДА (для админки)
// =====================================================
function initAdminModal() {
    const loginBtn = document.getElementById('login-btn');
    const modal = document.getElementById('auth-modal');
    const closeBtn = document.getElementById('modal-close');
    const loginForm = document.getElementById('login-form');

    if (loginBtn && modal) {
        loginBtn.addEventListener('click', function() {
            modal.style.display = 'flex';
        });
    }

    if (closeBtn && modal) {
        closeBtn.addEventListener('click', function() {
            modal.style.display = 'none';
        });
    }

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
                console.log('✅ Вход выполнен');
                modal.style.display = 'none';
            } catch (error) {
                console.error('❌ Ошибка входа:', error);
                alert('Ошибка входа: ' + error.message);
            }
        });
    }
}

// =====================================================
// СТАТИСТИКА
// =====================================================
async function loadStats() {
    try {
        const { collection, getDocs } = await import(
            'https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js'
        );

        const gamesSnapshot = await getDocs(collection(window.db, 'games'));
        const gamesCount = gamesSnapshot.size;

        let totalRating = 0;
        gamesSnapshot.forEach(function(doc) {
            totalRating += parseFloat(doc.data().rating) || 0;
        });
        const avgRating = gamesCount > 0 ? (totalRating / gamesCount).toFixed(1) : 0;

        const scoresSnapshot = await getDocs(collection(window.db, 'scores'));

        document.getElementById('stat-games').textContent = gamesCount;
        document.getElementById('stat-scores').textContent = scoresSnapshot.size;
        document.getElementById('stat-avg').textContent = avgRating;

        console.log('📊 Статистика загружена');

    } catch (error) {
        console.error('❌ Ошибка статистики:', error);
    }
}

// =====================================================
// ТАБЛИЦА ИГР
// =====================================================
async function loadAdminGames() {
    const tbody = document.getElementById('admin-games-body');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">Загрузка...</td></tr>';

    try {
        const { collection, getDocs } = await import(
            'https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js'
        );

        const querySnapshot = await getDocs(collection(window.db, 'games'));

        tbody.innerHTML = '';

        if (querySnapshot.size === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">Нет игр</td></tr>';
            return;
        }

        querySnapshot.forEach(function(doc) {
            const game = doc.data();
            const tr = document.createElement('tr');

            tr.innerHTML = `
                <td><code>${doc.id.substring(0, 8)}...</code></td>
                <td>${game.title}</td>
                <td>${game.genre}</td>
                <td>⭐ ${game.rating}</td>
                <td>
                    <div class="admin-actions-cell">
                        <button class="mini-btn edit" data-id="${doc.id}">✏️</button>
                        <button class="mini-btn delete" data-id="${doc.id}">🗑</button>
                    </div>
                </td>
            `;

            tbody.appendChild(tr);
        });

        attachAdminHandlers();
        console.log('✅ Загружено игр:', querySnapshot.size);

    } catch (error) {
        console.error('❌ Ошибка:', error);
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: red;">Ошибка: ${error.message}</td></tr>`;
    }
}

// =====================================================
// ОБРАБОТЧИКИ КНОПОК
// =====================================================
function attachAdminHandlers() {

    document.querySelectorAll('.mini-btn.delete').forEach(function(btn) {
        btn.addEventListener('click', async function() {
            const id = btn.getAttribute('data-id');
            if (!confirm('Удалить эту игру?')) return;

            try {
                const { doc, deleteDoc } = await import(
                    'https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js'
                );
                await deleteDoc(doc(window.db, 'games', id));
                console.log('✅ Игра удалена');
                loadAdminGames();
                loadStats();
            } catch (error) {
                console.error('❌ Ошибка:', error);
                alert('Ошибка: ' + error.message);
            }
        });
    });

    document.querySelectorAll('.mini-btn.edit').forEach(function(btn) {
        btn.addEventListener('click', async function() {
            const id = btn.getAttribute('data-id');
            const row = btn.closest('tr');
            const currentTitle = row.cells[1].textContent;

            const newTitle = prompt('Новое название', currentTitle);
            if (newTitle === null) return;

            try {
                const { doc, updateDoc } = await import(
                    'https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js'
                );
                await updateDoc(doc(window.db, 'games', id), {
                    title: newTitle.trim()
                });
                console.log('✅ Игра обновлена');
                loadAdminGames();
            } catch (error) {
                console.error('❌ Ошибка:', error);
                alert('Ошибка: ' + error.message);
            }
        });
    });
}

// =====================================================
// ЭКСПОРТ В CSV
// =====================================================
document.addEventListener('DOMContentLoaded', function() {
    const exportBtn = document.getElementById('export-csv');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportToCSV);
    }

    const refreshBtn = document.getElementById('refresh-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function() {
            loadAdminGames();
            loadStats();
        });
    }
});

async function exportToCSV() {
    try {
        const { collection, getDocs } = await import(
            'https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js'
        );

        const querySnapshot = await getDocs(collection(window.db, 'games'));

        let csv = 'ID;Название;Жанр;Рейтинг;Картинка\n';

        querySnapshot.forEach(function(doc) {
            const game = doc.data();
            const title = (game.title || '').replace(/;/g, ',');
            const genre = (game.genre || '').replace(/;/g, ',');
            const imageUrl = (game.imageUrl || '').replace(/;/g, ',');

            csv += `"${doc.id}";"${title}";"${genre}";"${game.rating}";"${imageUrl}"\n`;
        });

        const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'games_' + new Date().toISOString().slice(0, 10) + '.csv';
        link.click();

        console.log('✅ Экспорт завершён');

    } catch (error) {
        console.error('❌ Ошибка экспорта:', error);
        alert('Ошибка экспорта: ' + error.message);
    }
}

// =====================================================
// ДОБАВЛЕНИЕ ИГР
// =====================================================
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('add-game-form');

    if (form) {
        console.log('📝 Форма добавления найдена в админке');

        form.addEventListener('submit', async function(event) {
            event.preventDefault();

            const title = document.getElementById('title').value.trim();
            const genre = document.getElementById('genre').value.trim();
            const rating = parseFloat(document.getElementById('rating').value);
            const imageUrl = document.getElementById('imageUrl').value.trim();

            if (!title || !genre || isNaN(rating)) {
                alert('⚠️ Заполните все обязательные поля!');
                return;
            }

            try {
                const { collection, addDoc } = await import(
                    'https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js'
                );

                await addDoc(collection(window.db, 'games'), {
                    title: title,
                    genre: genre,
                    rating: rating,
                    imageUrl: imageUrl || 'https://via.placeholder.com/280x150'
                });

                console.log('✅ Игра добавлена!');
                alert('✅ Игра успешно добавлена!');
                form.reset();

                loadAdminGames();
                loadStats();

            } catch (error) {
                console.error('❌ Ошибка:', error);
                alert('Ошибка при добавлении: ' + error.message);
            }
        });
    }
});