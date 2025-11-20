let currentGameId = null;
let questionCount = 0;

document.addEventListener('DOMContentLoaded', () => {
    setupNavigation();
    loadUsers();
    loadGames();
    loadGameSelect();
});

function setupNavigation() {
    const navItems = document.querySelectorAll('.admin-nav-item[data-section]');
    
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            const section = item.dataset.section;
            if (!section) return;
            
            e.preventDefault();
            
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
            
            document.querySelectorAll('.admin-section').forEach(sec => {
                sec.classList.remove('active');
            });
            
            const sectionEl = document.getElementById(`${section}-section`);
            if (sectionEl) {
                sectionEl.classList.add('active');
            }
            
            const titles = {
                dashboard: 'Dashboard',
                users: 'Gerenciar Usuários',
                games: 'Gerenciar Jogos',
                levels: 'Gerenciar Fases'
            };
            
            const titleEl = document.getElementById('sectionTitle');
            if (titleEl) {
                titleEl.textContent = titles[section] || 'Admin';
            }
        });
    });
}

async function loadUsers() {
    try {
        const response = await fetch('/admin/users');
        const data = await response.json();
        
        if (data.success) {
            const tbody = document.getElementById('usersTableBody');
            if (!tbody) return;
            
            tbody.innerHTML = data.users.map(user => `
                <tr>
                    <td>${user.name}</td>
                    <td>${user.email}</td>
                    <td>${new Date(user.createdAt).toLocaleDateString('pt-BR')}</td>
                    <td>${user.totalPoints || 0}</td>
                    <td>
                        <span class="status-badge ${user.active ? 'status-active' : 'status-inactive'}">
                            ${user.active ? 'Ativo' : 'Inativo'}
                        </span>
                    </td>
                    <td>
                        <button class="action-btn btn-toggle" onclick="toggleUser('${user._id}')">
                            ${user.active ? 'Desativar' : 'Ativar'}
                        </button>
                        <button class="action-btn btn-delete" onclick="deleteUser('${user._id}')">Excluir</button>
                    </td>
                </tr>
            `).join('');
        }
    } catch (error) {
        console.error('Erro ao carregar usuários:', error);
    }
}

async function toggleUser(userId) {
    if (!confirm('Deseja alterar o status deste usuário?')) return;
    
    try {
        const response = await fetch(`/admin/users/${userId}/toggle`, {
            method: 'PATCH'
        });
        
        if (response.ok) {
            loadUsers();
        }
    } catch (error) {
        console.error('Erro ao alterar usuário:', error);
    }
}

async function deleteUser(userId) {
    if (!confirm('Tem certeza que deseja excluir este usuário? Esta ação não pode ser desfeita.')) return;
    
    try {
        const response = await fetch(`/admin/users/${userId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            loadUsers();
        }
    } catch (error) {
        console.error('Erro ao excluir usuário:', error);
    }
}

async function loadGames() {
    try {
        const response = await fetch('/admin/games');
        const data = await response.json();
        
        if (data.success) {
            const container = document.getElementById('gamesContainer');
            if (!container) return;
            
            container.innerHTML = data.games.map(game => `
                <div class="game-card">
                    <img src="${game.coverImage || '/img/default-game.jpg'}" alt="${game.title}" class="game-card-img">
                    <div class="game-card-body">
                        <h3 class="game-card-title">${game.title}</h3>
                        <span class="game-card-type">${game.gameType}</span>
                        <p>${game.description || 'Sem descrição'}</p>
                        <p><strong>Slug:</strong> ${game.slug}</p>
                        <p><strong>Fases:</strong> ${game.levels?.length || 0}</p>
                        <div class="game-card-actions">
                            <button class="action-btn btn-edit" onclick="editGame('${game._id}')">Editar</button>
                            <button class="action-btn btn-delete" onclick="deleteGame('${game._id}')">Excluir</button>
                        </div>
                    </div>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Erro ao carregar jogos:', error);
    }
}

function openGameModal(gameId = null) {
    const modal = document.getElementById('gameModal');
    if (!modal) return;
    
    const form = document.getElementById('gameForm');
    if (form) form.reset();
    
    document.getElementById('gameId').value = '';
    document.getElementById('gameModalTitle').textContent = 'Novo Jogo';
    
    modal.classList.add('active');
}

function closeGameModal() {
    const modal = document.getElementById('gameModal');
    if (modal) {
        modal.classList.remove('active');
        const form = document.getElementById('gameForm');
        if (form) form.reset();
        document.getElementById('gameId').value = '';
    }
}

async function editGame(gameId) {
    try {
        const response = await fetch(`/admin/games/${gameId}`);
        const data = await response.json();
        
        if (data.success) {
            const game = data.game;
            
            document.getElementById('gameId').value = game._id;
            document.getElementById('gameTitle').value = game.title;
            document.getElementById('gameSlug').value = game.slug;
            document.getElementById('gameDescription').value = game.description || '';
            document.getElementById('gameType').value = game.gameType;
            document.getElementById('gameCover').value = game.coverImage || '';
            
            document.getElementById('gameModalTitle').textContent = 'Editar Jogo';
            
            const modal = document.getElementById('gameModal');
            if (modal) modal.classList.add('active');
        }
    } catch (error) {
        console.error('Erro ao carregar jogo:', error);
        alert('Erro ao carregar dados do jogo');
    }
}

const gameForm = document.getElementById('gameForm');
if (gameForm) {
    gameForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const gameData = {
            title: document.getElementById('gameTitle').value,
            slug: document.getElementById('gameSlug').value,
            description: document.getElementById('gameDescription').value,
            gameType: document.getElementById('gameType').value,
            coverImage: document.getElementById('gameCover').value
        };
        
        const gameId = document.getElementById('gameId').value;
        const url = gameId ? `/admin/games/${gameId}` : '/admin/games';
        const method = gameId ? 'PUT' : 'POST';
        
        try {
            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(gameData)
            });
            
            const result = await response.json();
            
            if (response.ok && result.success) {
                closeGameModal();
                loadGames();
                loadGameSelect();
                alert(gameId ? 'Jogo atualizado com sucesso!' : 'Jogo criado com sucesso!');
            } else {
                alert(result.message || 'Erro ao salvar jogo');
            }
        } catch (error) {
            console.error('Erro ao salvar jogo:', error);
            alert('Erro ao salvar jogo. Tente novamente.');
        }
    });
}

async function deleteGame(gameId) {
    if (!confirm('Tem certeza que deseja excluir este jogo? Todas as fases serão removidas.')) return;
    
    try {
        const response = await fetch(`/admin/games/${gameId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            loadGames();
            loadGameSelect();
            alert('Jogo excluído com sucesso!');
        }
    } catch (error) {
        console.error('Erro ao excluir jogo:', error);
    }
}

async function loadGameSelect() {
    try {
        const response = await fetch('/admin/games');
        const data = await response.json();
        
        if (data.success) {
            const select = document.getElementById('gameSelect');
            if (!select) return;
            
            select.innerHTML = '<option value="">Selecione um jogo</option>' +
                data.games.map(game => `<option value="${game._id}">${game.title}</option>`).join('');
            
            select.addEventListener('change', (e) => {
                currentGameId = e.target.value;
                if (currentGameId) {
                    loadLevels(currentGameId);
                } else {
                    const container = document.getElementById('levelsContainer');
                    if (container) container.innerHTML = '';
                }
            });
        }
    } catch (error) {
        console.error('Erro ao carregar jogos:', error);
    }
}

async function loadLevels(gameId) {
    try {
        const response = await fetch(`/admin/games/${gameId}`);
        const data = await response.json();
        
        if (data.success) {
            const game = data.game;
            const container = document.getElementById('levelsContainer');
            if (!container) return;
            
            if (!game.levels || game.levels.length === 0) {
                container.innerHTML = '<p style="text-align: center; padding: 2rem; color: var(--cor-texto);">Nenhuma fase cadastrada para este jogo</p>';
                return;
            }
            
            container.innerHTML = game.levels.map(level => `
                <div class="level-card">
                    <div class="level-number">${level.levelNumber}</div>
                    <div class="level-info">
                        <h4>${level.title}</h4>
                        <p>${level.description || 'Sem descrição'}</p>
                        <small>Perguntas: ${level.questions?.length || 0} | Pontuação mínima: ${level.minScore || 0}</small>
                    </div>
                    <div class="game-card-actions">
                        <button class="action-btn btn-edit" onclick="editLevel('${gameId}', '${level._id}')">Editar</button>
                        <button class="action-btn btn-delete" onclick="deleteLevel('${gameId}', '${level._id}')">Excluir</button>
                    </div>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Erro ao carregar fases:', error);
    }
}

function openLevelModal(levelId = null) {
    if (!currentGameId) {
        alert('Selecione um jogo primeiro');
        return;
    }
    
    const modal = document.getElementById('levelModal');
    if (!modal) return;
    
    modal.classList.add('active');
    questionCount = 0;
    
    const container = document.getElementById('questionsContainer');
    if (container) container.innerHTML = '';
    
    const form = document.getElementById('levelForm');
    if (form) form.reset();
    
    document.getElementById('levelGameId').value = currentGameId;
    document.getElementById('levelId').value = '';
    document.getElementById('levelModalTitle').textContent = 'Nova Fase';
}

function closeLevelModal() {
    const modal = document.getElementById('levelModal');
    if (modal) {
        modal.classList.remove('active');
        const form = document.getElementById('levelForm');
        if (form) form.reset();
    }
}

async function editLevel(gameId, levelId) {
    try {
        const response = await fetch(`/admin/games/${gameId}`);
        const data = await response.json();
        
        if (data.success) {
            const level = data.game.levels.find(l => l._id.toString() === levelId);
            if (!level) {
                alert('Fase não encontrada');
                return;
            }
            
            currentGameId = gameId;
            document.getElementById('levelGameId').value = gameId;
            document.getElementById('levelId').value = level._id;
            document.getElementById('levelNumber').value = level.levelNumber;
            document.getElementById('levelTitle').value = level.title;
            document.getElementById('levelDescription').value = level.description || '';
            document.getElementById('levelVideo').value = level.videoUrl;
            document.getElementById('levelThumbnail').value = level.thumbnail || '';
            document.getElementById('levelMinScore').value = level.minScore || 0;
            
            const container = document.getElementById('questionsContainer');
            if (container) {
                container.innerHTML = '';
                questionCount = 0;
                
                if (level.questions && level.questions.length > 0) {
                    level.questions.forEach((q, index) => {
                        questionCount++;
                        const questionHtml = createQuestionHTML(questionCount, q);
                        container.insertAdjacentHTML('beforeend', questionHtml);
                    });
                }
            }
            
            document.getElementById('levelModalTitle').textContent = 'Editar Fase';
            
            const modal = document.getElementById('levelModal');
            if (modal) modal.classList.add('active');
        }
    } catch (error) {
        console.error('Erro ao carregar fase:', error);
        alert('Erro ao carregar dados da fase');
    }
}

function createQuestionHTML(id, questionData = null) {
    return `
        <div class="question-item" id="question-${id}">
            <div class="question-header">
                <h4>Pergunta ${id}</h4>
                <button type="button" class="btn-remove-question" onclick="removeQuestion(${id})">Remover</button>
            </div>
            <div class="form-group">
                <label>Pergunta</label>
                <input type="text" name="question-${id}-text" value="${questionData?.question || ''}" required>
            </div>
            <div class="form-group">
                <label>Opção 1</label>
                <input type="text" name="question-${id}-option-0" value="${questionData?.options?.[0] || ''}" required>
            </div>
            <div class="form-group">
                <label>Opção 2</label>
                <input type="text" name="question-${id}-option-1" value="${questionData?.options?.[1] || ''}" required>
            </div>
            <div class="form-group">
                <label>Opção 3</label>
                <input type="text" name="question-${id}-option-2" value="${questionData?.options?.[2] || ''}" required>
            </div>
            <div class="form-group">
                <label>Opção 4</label>
                <input type="text" name="question-${id}-option-3" value="${questionData?.options?.[3] || ''}" required>
            </div>
            <div class="form-group">
                <label>Resposta Correta (0-3)</label>
                <input type="number" name="question-${id}-correct" value="${questionData?.correctAnswer ?? ''}" min="0" max="3" required>
            </div>
            <div class="form-group">
                <label>Pontos</label>
                <input type="number" name="question-${id}-points" value="${questionData?.points || 10}" min="1" required>
            </div>
        </div>
    `;
}

async function deleteLevel(gameId, levelId) {
    if (!confirm('Tem certeza que deseja excluir esta fase?')) return;
    
    try {
        const response = await fetch(`/admin/games/${gameId}/levels/${levelId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            loadLevels(gameId);
            alert('Fase excluída com sucesso!');
        }
    } catch (error) {
        console.error('Erro ao excluir fase:', error);
        alert('Erro ao excluir fase');
    }
}

function addQuestion() {
    questionCount++;
    const container = document.getElementById('questionsContainer');
    if (!container) return;
    
    const questionHtml = createQuestionHTML(questionCount);
    container.insertAdjacentHTML('beforeend', questionHtml);
}

function removeQuestion(id) {
    const questionEl = document.getElementById(`question-${id}`);
    if (questionEl) questionEl.remove();
}

const levelForm = document.getElementById('levelForm');
if (levelForm) {
    levelForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const questions = [];
        
        for (let i = 1; i <= questionCount; i++) {
            const questionEl = document.getElementById(`question-${i}`);
            if (!questionEl) continue;
            
            questions.push({
                question: formData.get(`question-${i}-text`),
                options: [
                    formData.get(`question-${i}-option-0`),
                    formData.get(`question-${i}-option-1`),
                    formData.get(`question-${i}-option-2`),
                    formData.get(`question-${i}-option-3`)
                ],
                correctAnswer: parseInt(formData.get(`question-${i}-correct`)),
                points: parseInt(formData.get(`question-${i}-points`))
            });
        }
        
        if (questions.length === 0) {
            alert('Adicione pelo menos uma pergunta');
            return;
        }
        
        const levelData = {
            levelNumber: parseInt(document.getElementById('levelNumber').value),
            title: document.getElementById('levelTitle').value,
            description: document.getElementById('levelDescription').value,
            videoUrl: document.getElementById('levelVideo').value,
            thumbnail: document.getElementById('levelThumbnail').value,
            minScore: parseInt(document.getElementById('levelMinScore').value),
            questions: questions
        };
        
        const gameId = document.getElementById('levelGameId').value;
        const levelId = document.getElementById('levelId').value;
        
        const url = levelId 
            ? `/admin/games/${gameId}/levels/${levelId}`
            : `/admin/games/${gameId}/levels`;
        const method = levelId ? 'PUT' : 'POST';
        
        try {
            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(levelData)
            });
            
            const result = await response.json();
            
            if (response.ok && result.success) {
                closeLevelModal();
                loadLevels(gameId);
                alert(levelId ? 'Fase atualizada com sucesso!' : 'Fase criada com sucesso!');
            } else {
                alert(result.message || 'Erro ao salvar fase');
            }
        } catch (error) {
            console.error('Erro ao salvar fase:', error);
            alert('Erro ao salvar fase. Tente novamente.');
        }
    });
}