// ========== user-data.js - Управление данными пользователей ==========

// ТЕКУЩИЙ ПОЛЬЗОВАТЕЛЬ
let currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;

// ========== ПОЛУЧЕНИЕ КЛЮЧА ДЛЯ ХРАНИЛИЩА ==========
function getUserStorageKey(baseKey) {
    if (!currentUser) return `${baseKey}_guest`;
    return `${baseKey}_user_${currentUser.id}`;
}

// ========== КОРЗИНА (индивидуальная для каждого пользователя) ==========
function getCart() {
    const key = getUserStorageKey('cart');
    return JSON.parse(localStorage.getItem(key)) || [];
}

function saveCart(cart) {
    const key = getUserStorageKey('cart');
    localStorage.setItem(key, JSON.stringify(cart));
}

function addToCart(book) {
    const cart = getCart();
    const existing = cart.find(item => item.id === book.id);
    
    if (existing) {
        existing.quantity += 1;
    } else {
        cart.push({
            id: book.id,
            title: book.title,
            price: book.price,
            image: book.image,
            author: book.author,
            quantity: 1
        });
    }
    
    saveCart(cart);
    updateCartCount();
    return cart;
}

function removeFromCart(bookId) {
    let cart = getCart();
    cart = cart.filter(item => item.id !== bookId);
    saveCart(cart);
    updateCartCount();
    return cart;
}

function updateQuantity(bookId, quantity) {
    const cart = getCart();
    const item = cart.find(item => item.id === bookId);
    if (item) {
        if (quantity <= 0) {
            return removeFromCart(bookId);
        }
        item.quantity = quantity;
        saveCart(cart);
    }
    updateCartCount();
    return cart;
}

function clearCart() {
    const key = getUserStorageKey('cart');
    localStorage.removeItem(key);
    updateCartCount();
}

function updateCartCount() {
    const cart = getCart();
    const total = cart.reduce((sum, item) => sum + item.quantity, 0);
    const cartCountEl = document.getElementById('cart-count');
    if (cartCountEl) {
        cartCountEl.textContent = total;
        cartCountEl.style.display = total === 0 ? 'none' : 'flex';
    }
}

// ========== ЗАКАЗЫ (индивидуальные для каждого пользователя) ==========
function getUserOrders() {
    if (!currentUser || currentUser.isAdmin) return [];
    const key = `orders_user_${currentUser.id}`;
    return JSON.parse(localStorage.getItem(key)) || [];
}

function saveUserOrders(orders) {
    if (!currentUser || currentUser.isAdmin) return;
    const key = `orders_user_${currentUser.id}`;
    localStorage.setItem(key, JSON.stringify(orders));
}

function addOrder(orderData) {
    if (!currentUser || currentUser.isAdmin) {
        alert('Авторизуйтесь для оформления заказа!');
        return null;
    }
    
    const orders = getUserOrders();
    const newOrder = {
        id: orders.length > 0 ? Math.max(...orders.map(o => o.id)) + 1 : 1,
        userId: currentUser.id,
        userName: currentUser.name,
        date: new Date().toISOString(),
        status: 'completed',
        ...orderData
    };
    
    orders.unshift(newOrder);
    saveUserOrders(orders);
    
    // Обновляем глобальную статистику
    updateGlobalStatistics(orderData.items);
    
    // Очищаем корзину после заказа
    clearCart();
    
    return newOrder;
}

// ========== ГЛОБАЛЬНАЯ СТАТИСТИКА (общая для админа) ==========
function getGlobalStatistics() {
    return JSON.parse(localStorage.getItem('global_book_statistics')) || [];
}

function updateGlobalStatistics(items) {
    let stats = getGlobalStatistics();
    
    items.forEach(item => {
        let stat = stats.find(s => s.bookId === item.id);
        if (!stat) {
            stat = {
                bookId: item.id,
                bookTitle: item.title,
                author: item.author || 'Неизвестен',
                sold: 0,
                revenue: 0
            };
            stats.push(stat);
        }
        stat.sold += item.quantity;
        stat.revenue += item.price * item.quantity;
    });
    
    localStorage.setItem('global_book_statistics', JSON.stringify(stats));
}

// ========== АВТОРИЗАЦИЯ ==========
function userLogin() {
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value.trim();
    const errorEl = document.getElementById('loginError');
    const successEl = document.getElementById('loginSuccess');
    
    // Сохраняем гостевую корзину
    const guestCart = getCart();
    localStorage.setItem('cart_guest_backup', JSON.stringify(guestCart));
    
    // Проверка администратора
    const ADMIN_CREDENTIALS = { login: "8355Vova", password: "Adf220906" };
    if (username === ADMIN_CREDENTIALS.login && password === ADMIN_CREDENTIALS.password) {
        currentUser = { id: 0, name: "Администратор", username: ADMIN_CREDENTIALS.login, isAdmin: true };
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        
        // Загружаем корзину администратора
        const adminCart = getCart();
        saveCart(adminCart);
        
        successEl.textContent = 'Вход как администратор!';
        successEl.style.display = 'block';
        errorEl.style.display = 'none';
        updateAuthButtons();
        updateCartCount();
        setTimeout(() => closeAuthModal(), 1000);
        return;
    }
    
    // Проверка обычного пользователя
    const users = JSON.parse(localStorage.getItem('registeredUsers')) || [];
    const user = users.find(u => u.username === username && u.password === password);
    
    if (user) {
        currentUser = user;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        
        // Объединяем гостевую корзину с корзиной пользователя
        const userCart = getCart();
        const mergedCart = [...userCart];
        guestCart.forEach(guestItem => {
            const existing = mergedCart.find(item => item.id === guestItem.id);
            if (existing) {
                existing.quantity += guestItem.quantity;
            } else {
                mergedCart.push(guestItem);
            }
        });
        saveCart(mergedCart);
        localStorage.removeItem('cart_guest_backup');
        
        successEl.textContent = 'Вход выполнен!';
        successEl.style.display = 'block';
        errorEl.style.display = 'none';
        updateAuthButtons();
        updateCartCount();
        setTimeout(() => closeAuthModal(), 1000);
    } else {
        errorEl.textContent = 'Неверный логин или пароль';
        errorEl.style.display = 'block';
        successEl.style.display = 'none';
    }
}

function userLogout() {
    // Сохраняем корзину пользователя
    if (currentUser && !currentUser.isAdmin) {
        const userCart = getCart();
        localStorage.setItem(`cart_user_${currentUser.id}`, JSON.stringify(userCart));
    }
    
    currentUser = null;
    localStorage.removeItem('currentUser');
    
    // Загружаем гостевую корзину
    const guestCart = JSON.parse(localStorage.getItem('cart_guest_backup')) || [];
    saveCart(guestCart);
    localStorage.removeItem('cart_guest_backup');
    
    updateAuthButtons();
    updateCartCount();
    showNotification('Вы вышли из аккаунта', 'info');
}

function userRegister() {
    const name = document.getElementById('regName').value.trim();
    const username = document.getElementById('regUsername').value.trim();
    const password = document.getElementById('regPassword').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const phone = document.getElementById('regPhone').value.trim();
    const errorEl = document.getElementById('regError');
    const successEl = document.getElementById('regSuccess');
    
    if (!name || !username || !password || !email) {
        errorEl.textContent = 'Заполните все поля!';
        errorEl.style.display = 'block';
        return;
    }
    if (password.length < 6) {
        errorEl.textContent = 'Пароль минимум 6 символов';
        errorEl.style.display = 'block';
        return;
    }
    
    let users = JSON.parse(localStorage.getItem('registeredUsers')) || [];
    if (users.some(u => u.username === username)) {
        errorEl.textContent = 'Логин уже существует';
        errorEl.style.display = 'block';
        return;
    }
    
    const newUser = {
        id: users.length + 1,
        name,
        username,
        password,
        email,
        phone: phone || 'Не указан',
        registrationDate: new Date().toISOString().split('T')[0],
        isAdmin: false
    };
    users.push(newUser);
    localStorage.setItem('registeredUsers', JSON.stringify(users));
    
    // Автоматический вход
    currentUser = newUser;
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    
    // Создаем пустую корзину для нового пользователя
    saveCart([]);
    
    successEl.style.display = 'block';
    errorEl.style.display = 'none';
    updateAuthButtons();
    updateCartCount();
    setTimeout(() => closeAuthModal(), 1500);
}

// ========== ОТОБРАЖЕНИЕ ПРОФИЛЯ И ЗАКАЗОВ ==========
function showUserProfile() {
    if (!currentUser || currentUser.isAdmin) return;
    
    const orders = getUserOrders();
    const totalSpent = orders.reduce((sum, o) => sum + o.total, 0);
    
    const content = document.getElementById('profileContent');
    content.innerHTML = `
        <div>
            <div><strong>👤 Имя:</strong> ${currentUser.name}</div>
            <div><strong>📧 Email:</strong> ${currentUser.email}</div>
            <div><strong>📱 Телефон:</strong> ${currentUser.phone}</div>
            <div><strong>📦 Заказов:</strong> ${orders.length}</div>
            <div><strong>💰 Потрачено:</strong> ${totalSpent} руб</div>
            <button onclick="closeProfile()" style="margin-top:20px; padding:10px; background:#8B4513; color:white; border:none; border-radius:8px; cursor:pointer;">Закрыть</button>
        </div>
    `;
    document.getElementById('profileModal').style.display = 'flex';
}

function showUserOrders() {
    if (!currentUser || currentUser.isAdmin) return;
    
    const orders = getUserOrders();
    const content = document.getElementById('userOrdersContent');
    
    if (orders.length === 0) {
        content.innerHTML = `
            <div style="text-align:center; padding:40px;">
                <p>📭 У вас пока нет ни одного заказа.</p>
                <p>Перейдите в <a href="index.html" onclick="closeUserOrders()">каталог книг</a>, чтобы сделать первый заказ!</p>
            </div>
        `;
    } else {
        let html = '<table style="width:100%; border-collapse:collapse;">';
        html += '<thead><tr style="background:rgba(139,69,19,0.1);"><th style="padding:12px;">№</th><th style="padding:12px;">Книги</th><th style="padding:12px;">Сумма</th><th style="padding:12px;">Дата</th></tr></thead><tbody>';
        
        orders.forEach(order => {
            const booksList = order.items.map(item => `${item.title} (${item.quantity} шт)`).join('<br>');
            html += `<tr><td style="padding:12px; border-bottom:1px solid #eee;">#${order.id}</td>
                    <td style="padding:12px; border-bottom:1px solid #eee;">${booksList}</td>
                    <td style="padding:12px; border-bottom:1px solid #eee;">${order.total} руб</td>
                    <td style="padding:12px; border-bottom:1px solid #eee;">${new Date(order.date).toLocaleDateString()}</td></tr>`;
        });
        
        html += '</tbody></table><div style="text-align:center; margin-top:20px;"><button onclick="closeUserOrders()" style="padding:12px 30px; background:#8B4513; color:white; border:none; border-radius:8px; cursor:pointer;">Закрыть</button></div>';
        content.innerHTML = html;
    }
    
    document.getElementById('userOrdersModal').style.display = 'flex';
}

function closeProfile() {
    document.getElementById('profileModal').style.display = 'none';
}

function closeUserOrders() {
    document.getElementById('userOrdersModal').style.display = 'none';
}

function closeAuthModal() {
    document.getElementById('authModal').style.display = 'none';
}

function showAuthModal(type) {
    document.getElementById('authModal').style.display = 'flex';
    switchAuthTab(type);
}

function switchAuthTab(tab) {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const tabs = document.querySelectorAll('.auth-tab');
    
    if (tab === 'login') {
        tabs[0].classList.add('active');
        tabs[1].classList.remove('active');
        loginForm.style.display = 'block';
        registerForm.style.display = 'none';
    } else {
        tabs[1].classList.add('active');
        tabs[0].classList.remove('active');
        loginForm.style.display = 'none';
        registerForm.style.display = 'block';
    }
}

function updateAuthButtons() {
    const authDiv = document.getElementById('authButtons');
    const adminBtn = document.getElementById('adminPanelBtn');
    
    if (currentUser) {
        authDiv.innerHTML = `
            <div class="user-menu">
                <div class="user-info" onclick="showUserProfile()">
                    <div class="user-avatar">${currentUser.name.charAt(0)}</div>
                    <span class="user-name">${currentUser.name}</span>
                </div>
                <div class="user-actions">
                    <button class="user-action-btn" onclick="showUserOrders()">Мои заказы</button>
                    <button class="logout-btn" onclick="userLogout()">Выйти</button>
                </div>
            </div>
        `;
        if (currentUser.isAdmin) {
            adminBtn.classList.add('visible');
        } else {
            adminBtn.classList.remove('visible');
        }
    } else {
        authDiv.innerHTML = `
            <button class="login-btn" onclick="showAuthModal('login')">Войти</button>
            <button class="register-btn" onclick="showAuthModal('register')">Регистрация</button>
        `;
        adminBtn.classList.remove('visible');
    }
}

function showNotification(msg, type) {
    const n = document.createElement('div');
    n.style.cssText = `position:fixed; top:20px; right:20px; background:${type === 'success' ? '#228B22' : '#FF8C00'}; color:white; padding:15px 20px; border-radius:12px; z-index:3000; animation:slideIn 0.3s ease;`;
    n.innerHTML = msg;
    document.body.appendChild(n);
    setTimeout(() => n.remove(), 3000);
}

// ========== ИНИЦИАЛИЗАЦИЯ ==========
function initUserData() {
    // Создаем тестового пользователя если нет
    if (!localStorage.getItem('registeredUsers')) {
        localStorage.setItem('registeredUsers', JSON.stringify([
            {
                id: 1,
                name: "Тестовый Пользователь",
                username: "test",
                password: "test123",
                email: "test@test.com",
                phone: "+7(900)000-00-00",
                registrationDate: "2024-01-01",
                isAdmin: false
            }
        ]));
    }
    
    // Создаем глобальную статистику если нет
    if (!localStorage.getItem('global_book_statistics')) {
        localStorage.setItem('global_book_statistics', JSON.stringify([]));
    }
    
    // Обновляем интерфейс
    updateAuthButtons();
    updateCartCount();
}

// Запускаем при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    initUserData();
});
