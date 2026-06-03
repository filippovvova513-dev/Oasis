// cart-utils.js - Единая система корзины для всех страниц

// ========== ФУНКЦИИ КОРЗИНЫ ==========

function updateCartCount() {
    try {
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        let cartKey = 'cartItems'; // По умолчанию для гостей
        
        // Если пользователь авторизован
        if (currentUser && currentUser.username) {
            cartKey = `cartItems_${currentUser.username}`;
            
            // ПЕРВОЕ ИСПОЛЬЗОВАНИЕ: Переносим гостевую корзину в пользовательскую
            if (!localStorage.getItem(`cartMigrated_${currentUser.username}`)) {
                const guestCart = JSON.parse(localStorage.getItem('cartItems')) || [];
                if (guestCart.length > 0) {
                    const userCart = JSON.parse(localStorage.getItem(cartKey)) || [];
                    const mergedCart = [...userCart];
                    
                    // Сливаем корзины
                    guestCart.forEach(guestItem => {
                        const existingItem = mergedCart.find(item => item.id === guestItem.id);
                        if (existingItem) {
                            existingItem.quantity = (existingItem.quantity || 1) + (guestItem.quantity || 1);
                        } else {
                            mergedCart.push(guestItem);
                        }
                    });
                    
                    localStorage.setItem(cartKey, JSON.stringify(mergedCart));
                    localStorage.removeItem('cartItems');
                    localStorage.setItem(`cartMigrated_${currentUser.username}`, 'true');
                }
            }
        }
        
        // Получаем корзину
        let cartItems = JSON.parse(localStorage.getItem(cartKey)) || [];
        
        // Если корзина пуста, проверяем общую (для гостей)
        if (cartItems.length === 0 && !currentUser) {
            cartItems = JSON.parse(localStorage.getItem('cartItems')) || [];
        }
        
        // Считаем общее количество
        const totalCount = cartItems.reduce((sum, item) => sum + (item.quantity || 1), 0);
        
        // Обновляем ВСЕ элементы счетчика на странице
        document.querySelectorAll('.cart-count').forEach(element => {
            element.textContent = totalCount;
            if (totalCount > 0) {
                element.classList.add('has-items');
                element.style.display = 'flex';
            } else {
                element.classList.remove('has-items');
                element.style.display = 'none';
            }
        });
        
        return totalCount;
    } catch (error) {
        console.error('Ошибка при обновлении счетчика корзины:', error);
        return 0;
    }
}

function addToCart(product) {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    let cartKey = 'cartItems'; // Для гостей
    
    // Для зарегистрированных пользователей
    if (currentUser && currentUser.username) {
        cartKey = `cartItems_${currentUser.username}`;
    }
    
    // Получаем текущую корзину
    let cartItems = JSON.parse(localStorage.getItem(cartKey)) || [];
    
    // Проверяем, есть ли уже такой товар
    const existingItem = cartItems.find(item => item.id === product.id);
    
    if (existingItem) {
        existingItem.quantity = (existingItem.quantity || 1) + 1;
    } else {
        cartItems.push({
            id: product.id,
            title: product.title,
            price: product.price,
            image: product.image,
            author: product.author || product.genre || 'Не указан',
            quantity: 1
        });
    }
    
    // Сохраняем корзину
    localStorage.setItem(cartKey, JSON.stringify(cartItems));
    
    // Обновляем счетчик
    updateCartCount();
    
    // Показываем уведомление
    showNotification(`"${product.title}" добавлен в корзину!`, 'success');
    
    // Для гостей - напоминание о регистрации
    if (!currentUser) {
        setTimeout(() => {
            if (!localStorage.getItem('guestCartHintShown')) {
                showNotification('Для оформления заказа потребуется авторизация', 'info');
                localStorage.setItem('guestCartHintShown', 'true');
            }
        }, 500);
    }
}

function getCartItems() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    let cartKey = 'cartItems'; // Для гостей
    
    if (currentUser && currentUser.username) {
        cartKey = `cartItems_${currentUser.username}`;
    }
    
    const cartItems = JSON.parse(localStorage.getItem(cartKey)) || [];
    
    // Для гостей проверяем старую корзину
    if (cartItems.length === 0 && !currentUser) {
        return JSON.parse(localStorage.getItem('cartItems')) || [];
    }
    
    return cartItems;
}

function clearCart() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    let cartKey = 'cartItems'; // Для гостей
    
    if (currentUser && currentUser.username) {
        cartKey = `cartItems_${currentUser.username}`;
    }
    
    localStorage.setItem(cartKey, JSON.stringify([]));
    updateCartCount();
}

// ========== ФУНКЦИИ УВЕДОМЛЕНИЙ ==========

function showNotification(message, type = 'success') {
    // Удаляем старые уведомления
    document.querySelectorAll('.notification').forEach(n => n.remove());
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <span>${message}</span>
        <button onclick="this.parentElement.remove()">×</button>
    `;
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#10b981' : '#3b82f6'};
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        display: flex;
        align-items: center;
        gap: 10px;
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 3000);
}

// ========== ФУНКЦИИ ПОЛЬЗОВАТЕЛЯ ==========

function updateUserSection() {
    const userSections = document.querySelectorAll('#userSection');
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    
    userSections.forEach(userSection => {
        if (currentUser && currentUser.name && !currentUser.isAdmin) {
            // Обычный пользователь
            const userAvatar = currentUser.name.charAt(0).toUpperCase();
            userSection.innerHTML = `
                <div class="user-info">
                    <div class="user-avatar">${userAvatar}</div>
                    <div class="user-name">${currentUser.name}</div>
                    <button class="logout-btn" onclick="logout()">Выйти</button>
                </div>
            `;
        } else if (currentUser && currentUser.isAdmin) {
            // Администратор
            userSection.innerHTML = `
                <div class="user-info">
                    <div class="user-avatar">A</div>
                    <div class="user-name">Администратор</div>
                    <button class="logout-btn" onclick="logout()">Выйти</button>
                </div>
            `;
        } else {
            // Гость
            userSection.innerHTML = `
                <button class="login-btn" onclick="window.location.href='index.html'">
                    👤 Войти
                </button>
            `;
        }
    });
}

function logout() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    
    if (currentUser && currentUser.isAdmin) {
        // Для админа дополнительно закрываем панель
        localStorage.removeItem('adminLoggedIn');
    }
    
    localStorage.removeItem('currentUser');
    updateUserSection();
    updateCartCount();
    showNotification('Вы вышли из аккаунта', 'info');
    
    // Перенаправляем на главную
    setTimeout(() => {
        window.location.href = 'index.html';
    }, 1000);
}

// ========== ИНИЦИАЛИЗАЦИЯ ==========

function initCartSystem() {
    // Инициализируем корзину если её нет
    if (!localStorage.getItem('cartItems')) {
        localStorage.setItem('cartItems', JSON.stringify([]));
    }
    
    // Обновляем интерфейс
    updateCartCount();
    updateUserSection();
    
    // Слушаем изменения в localStorage (для синхронизации между вкладками)
    window.addEventListener('storage', function(e) {
        if (e.key === 'cartItems' || e.key === 'currentUser' || e.key?.startsWith('cartItems_')) {
            updateCartCount();
            updateUserSection();
        }
    });
    
    // Добавляем стили для уведомлений если их нет
    if (!document.querySelector('style[data-cart-utils]')) {
        const style = document.createElement('style');
        style.setAttribute('data-cart-utils', 'true');
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            
            .notification {
                position: fixed;
                top: 20px;
                right: 20px;
                background: #10b981;
                color: white;
                padding: 12px 20px;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                z-index: 10000;
                display: flex;
                align-items: center;
                gap: 10px;
                animation: slideIn 0.3s ease;
            }
            
            .notification.info {
                background: #3b82f6;
            }
            
            .notification button {
                background: none;
                border: none;
                color: white;
                font-size: 18px;
                cursor: pointer;
                padding: 0;
                line-height: 1;
            }
            
            .cart-count.has-items {
                display: flex !important;
            }
        `;
        document.head.appendChild(style);
    }
}

// Автоматическая инициализация
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCartSystem);
} else {
    initCartSystem();
}