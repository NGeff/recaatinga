function switchTab(tab) {
    const tabs = document.querySelectorAll('.tab');
    const forms = document.querySelectorAll('.form-content');

    tabs.forEach(t => t.classList.remove('active'));
    forms.forEach(f => f.classList.remove('active'));

    if (tab === 'login') {
        tabs[0].classList.add('active');
        document.getElementById('loginForm').classList.add('active');
    } else {
        tabs[1].classList.add('active');
        document.getElementById('registerForm').classList.add('active');
    }

    hideAllErrors();
}

function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    if (input) {
        input.type = input.type === 'password' ? 'text' : 'password';
    }
}

function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function showError(elementId, message = null) {
    const errorEl = document.getElementById(elementId);
    if (errorEl) {
        if (message) errorEl.textContent = message;
        errorEl.classList.add('show');
    }
}

function hideError(elementId) {
    const errorEl = document.getElementById(elementId);
    if (errorEl) errorEl.classList.remove('show');
}

function hideAllErrors() {
    document.querySelectorAll('.error-message').forEach(error => error.classList.remove('show'));
}

async function handleLogin(event) {
    event.preventDefault();
    hideAllErrors();

    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    if (!validateEmail(email)) {
        showError('loginEmailError', 'E-mail inválido');
        return;
    }

    if (password.length < 6) {
        showError('loginPasswordError', 'Senha deve ter no mínimo 6 caracteres');
        return;
    }

    const btnLogin = document.getElementById('btnLogin');
    btnLogin.disabled = true;
    btnLogin.textContent = 'Entrando...';

    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (!response.ok) {
            if (response.status === 401) {
                showError('loginPasswordError', 'E-mail ou senha incorretos');
            } else {
                showError('loginEmailError', data.message || 'Erro ao fazer login');
            }
            return;
        }

        window.location.href = '/';
    } catch (error) {
        console.error('Erro:', error);
        showError('loginEmailError', 'Erro ao conectar com o servidor');
    } finally {
        btnLogin.disabled = false;
        btnLogin.textContent = 'Entrar';
    }
}

async function handleRegister(event) {
    event.preventDefault();
    hideAllErrors();

    const name = document.getElementById('registerName').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const password = document.getElementById('registerPassword').value;
    const passwordConfirm = document.getElementById('registerPasswordConfirm').value;

    let hasError = false;

    if (name.length < 3) {
        showError('registerNameError', 'Nome deve ter no mínimo 3 caracteres');
        hasError = true;
    }

    if (!validateEmail(email)) {
        showError('registerEmailError', 'E-mail inválido');
        hasError = true;
    }

    if (password.length < 6) {
        showError('registerPasswordError', 'Senha deve ter no mínimo 6 caracteres');
        hasError = true;
    }

    if (password !== passwordConfirm) {
        showError('registerPasswordConfirmError', 'As senhas não coincidem');
        hasError = true;
    }

    if (hasError) return;

    const btnRegister = document.getElementById('btnRegister');
    btnRegister.disabled = true;
    btnRegister.textContent = 'Cadastrando...';

    try {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password })
        });

        const data = await response.json();

        if (!response.ok) {
            if (response.status === 400 && data.message.includes('cadastrado')) {
                showError('registerEmailError', 'E-mail já cadastrado');
            } else {
                showError('registerEmailError', data.message || 'Erro ao cadastrar');
            }
            return;
        }

        window.location.href = '/';
    } catch (error) {
        console.error('Erro:', error);
        showError('registerEmailError', 'Erro ao conectar com o servidor');
    } finally {
        btnRegister.disabled = false;
        btnRegister.textContent = 'Cadastrar';
    }
}

async function logout() {
    if (!confirm('Deseja realmente sair?')) return;

    try {
        const response = await fetch('/api/auth/logout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        if (response.ok) {
            window.location.href = '/';
        }
    } catch (error) {
        console.error('Erro ao fazer logout:', error);
        alert('Erro ao fazer logout. Tente novamente.');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const alerts = document.querySelectorAll('.alert');
    alerts.forEach(alert => {
        setTimeout(() => {
            alert.style.opacity = '0';
            setTimeout(() => alert.style.display = 'none', 300);
        }, 5000);
    });

    const links = document.querySelectorAll('a[href^="#"]');
    links.forEach(link => {
        link.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href === '#' || href === '') return;

            const target = document.querySelector(href);
            if (target) {
                e.preventDefault();
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });

    let lastScroll = 0;
    const header = document.querySelector('header');

    if (header) {
        window.addEventListener('scroll', () => {
            const currentScroll = window.pageYOffset;

            if (currentScroll <= 0) {
                header.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.1)';
                header.style.transform = 'translateY(0)';
                return;
            }

            if (currentScroll > lastScroll && currentScroll > 100) {
                header.style.transform = 'translateY(-100%)';
            } else {
                header.style.transform = 'translateY(0)';
                header.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.3)';
            }

            lastScroll = currentScroll;
        });
    }
});