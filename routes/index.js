const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Game = require('../models/Game');
const Progress = require('../models/Progress');
const dns = require('dns').promises;

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '7d'
    });
};

const verifyEmailDomain = async (email) => {
    const domain = email.split('@')[1];
    try {
        await dns.resolveMx(domain);
        return true;
    } catch {
        return false;
    }
};

const protect = async (req, res, next) => {
    try {
        if (req.session.user && req.session.user.id) {
            const user = await User.findById(req.session.user.id).select('-password');
            
            if (!user || !user.active) {
                req.session.destroy();
                return res.redirect('/login?error=session_expired');
            }
            
            req.user = user;
            req.session.user = {
                id: user._id.toString(),
                name: user.name,
                email: user.email,
                role: user.role
            };
            
            return next();
        }

        const token = req.cookies.token;
        if (!token) {
            return res.redirect('/login');
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'recaatinga-jwt-secret');
        const user = await User.findById(decoded.id).select('-password');

        if (!user || !user.active) {
            res.clearCookie('token');
            return res.redirect('/login');
        }

        req.user = user;
        req.session.user = {
            id: user._id.toString(),
            name: user.name,
            email: user.email,
            role: user.role
        };

        next();
    } catch (error) {
        console.error('Erro na autenticação:', error);
        res.clearCookie('token');
        req.session.destroy();
        return res.redirect('/login');
    }
};

const isAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        return next();
    }
    return res.status(403).json({ success: false, message: 'Acesso negado' });
};

const isLoggedIn = (req, res, next) => {
    if (req.session.user) return res.redirect('/');
    next();
};

router.get('/', (req, res) => {
    res.render('index', { title: 'ReCaatinga - Preservando a Caatinga' });
});

router.get('/login', isLoggedIn, (req, res) => {
    res.render('login', { title: 'Login - ReCaatinga' });
});

router.get('/dashboard', protect, async (req, res) => {
    try {
        const progress = await Progress.find({ userId: req.user._id }).populate('gameId');
        res.render('dashboard', { 
            title: 'Dashboard - ReCaatinga', 
            user: req.user,
            progress: progress 
        });
    } catch (error) {
        console.error('Erro ao carregar dashboard:', error);
        res.redirect('/');
    }
});

// Listagem de jogos
router.get('/games', protect, async (req, res) => {
    try {
        const games = await Game.find({ active: true }).sort({ createdAt: -1 });
        res.render('games', { title: 'Jogos - ReCaatinga', games });
    } catch (error) {
        console.error('Erro ao carregar jogos:', error);
        res.render('games', { title: 'Jogos - ReCaatinga', games: [] });
    }
});

// Jogar um jogo específico
router.get('/games/:slug', protect, async (req, res) => {
    try {
        const game = await Game.findOne({ slug: req.params.slug, active: true });
        if (!game) {
            req.flash('error', 'Jogo não encontrado');
            return res.redirect('/games');
        }
        
        const progress = await Progress.findOne({ 
            userId: req.user._id, 
            gameId: game._id 
        });
        
        res.render('game-play', { 
            title: `${game.title} - ReCaatinga`, 
            game, 
            progress 
        });
    } catch (error) {
        console.error('Erro ao carregar jogo:', error);
        res.redirect('/games');
    }
});

// Salvar progresso do jogo
router.post('/api/games/:gameId/progress', protect, async (req, res) => {
    try {
        const { levelId, score } = req.body;
        const game = await Game.findById(req.params.gameId);
        
        if (!game) {
            return res.status(404).json({ success: false, message: 'Jogo não encontrado' });
        }

        let progress = await Progress.findOne({
            userId: req.user._id,
            gameId: game._id
        });

        if (!progress) {
            progress = new Progress({
                userId: req.user._id,
                gameId: game._id
            });
        }

        const levelExists = progress.completedLevels.some(
            level => level.levelId.toString() === levelId
        );

        if (!levelExists) {
            progress.completedLevels.push({
                levelId,
                score,
                completedAt: Date.now()
            });
            progress.totalScore += score;
            progress.currentLevel = progress.completedLevels.length + 1;
        }

        progress.lastPlayed = Date.now();
        await progress.save();

        await User.findByIdAndUpdate(req.user._id, {
            $inc: { totalPoints: score }
        });

        res.json({ success: true, progress });
    } catch (error) {
        console.error('Erro ao salvar progresso:', error);
        res.status(500).json({ success: false, message: 'Erro ao salvar progresso' });
    }
});

router.get('/admin/access', protect, (req, res) => {
    res.render('admin-access', { title: 'Acesso Administrativo' });
});

router.post('/admin/verify', protect, async (req, res) => {
    try {
        const { token } = req.body;
        
        if (!token || token !== process.env.ADMIN_TOKEN) {
            return res.status(403).json({ success: false, message: 'Token inválido' });
        }

        await User.findByIdAndUpdate(req.user._id, { role: 'admin' });
        
        req.session.user.role = 'admin';
        
        res.json({ success: true, message: 'Acesso administrativo concedido' });
    } catch (error) {
        console.error('Erro ao verificar token admin:', error);
        res.status(500).json({ success: false, message: 'Erro ao processar solicitação' });
    }
});

router.get('/admin', protect, isAdmin, async (req, res) => {
    try {
        const stats = {
            users: await User.countDocuments(),
            games: await Game.countDocuments(),
            activePlayers: await Progress.countDocuments()
        };
        res.render('admin', { title: 'Painel Administrativo', stats });
    } catch (error) {
        console.error('Erro ao carregar admin:', error);
        res.redirect('/');
    }
});

router.get('/admin/users', protect, isAdmin, async (req, res) => {
    try {
        const users = await User.find().select('-password').sort({ createdAt: -1 });
        res.json({ success: true, users });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Erro ao carregar usuários' });
    }
});

router.patch('/admin/users/:id/toggle', protect, isAdmin, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ success: false, message: 'Usuário não encontrado' });
        
        user.active = !user.active;
        await user.save();
        
        res.json({ success: true, user });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Erro ao atualizar usuário' });
    }
});

router.delete('/admin/users/:id', protect, isAdmin, async (req, res) => {
    try {
        await User.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Usuário removido' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Erro ao remover usuário' });
    }
});

// CRUD de Jogos
router.post('/admin/games', protect, isAdmin, async (req, res) => {
    try {
        const game = await Game.create(req.body);
        res.status(201).json({ success: true, game });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

router.get('/admin/games', protect, isAdmin, async (req, res) => {
    try {
        const games = await Game.find().sort({ createdAt: -1 });
        res.json({ success: true, games });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Erro ao carregar jogos' });
    }
});

router.get('/admin/games/:id', protect, isAdmin, async (req, res) => {
    try {
        const game = await Game.findById(req.params.id);
        if (!game) {
            return res.status(404).json({ success: false, message: 'Jogo não encontrado' });
        }
        res.json({ success: true, game });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Erro ao carregar jogo' });
    }
});

router.put('/admin/games/:id', protect, isAdmin, async (req, res) => {
    try {
        const game = await Game.findByIdAndUpdate(req.params.id, req.body, { 
            new: true,
            runValidators: true 
        });
        
        if (!game) {
            return res.status(404).json({ success: false, message: 'Jogo não encontrado' });
        }
        
        res.json({ success: true, game });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

router.delete('/admin/games/:id', protect, isAdmin, async (req, res) => {
    try {
        await Game.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Jogo removido' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Erro ao remover jogo' });
    }
});

// CRUD de Fases (Levels)
router.post('/admin/games/:gameId/levels', protect, isAdmin, async (req, res) => {
    try {
        const game = await Game.findById(req.params.gameId);
        if (!game) {
            return res.status(404).json({ success: false, message: 'Jogo não encontrado' });
        }

        game.levels.push(req.body);
        await game.save();

        res.status(201).json({ success: true, game });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

router.put('/admin/games/:gameId/levels/:levelId', protect, isAdmin, async (req, res) => {
    try {
        const game = await Game.findById(req.params.gameId);
        if (!game) {
            return res.status(404).json({ success: false, message: 'Jogo não encontrado' });
        }

        const level = game.levels.id(req.params.levelId);
        if (!level) {
            return res.status(404).json({ success: false, message: 'Fase não encontrada' });
        }

        Object.assign(level, req.body);
        await game.save();

        res.json({ success: true, game });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

router.delete('/admin/games/:gameId/levels/:levelId', protect, isAdmin, async (req, res) => {
    try {
        const game = await Game.findById(req.params.gameId);
        if (!game) {
            return res.status(404).json({ success: false, message: 'Jogo não encontrado' });
        }

        game.levels.id(req.params.levelId).remove();
        await game.save();

        res.json({ success: true, message: 'Fase removida', game });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Erro ao remover fase' });
    }
});

// Autenticação
router.post('/api/auth/register', [
    body('name').trim().isLength({ min: 3 }).withMessage('Nome deve ter no mínimo 3 caracteres'),
    body('email').isEmail().normalizeEmail().withMessage('E-mail inválido'),
    body('password').isLength({ min: 6 }).withMessage('Senha deve ter no mínimo 6 caracteres')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ 
            success: false, 
            message: errors.array()[0].msg 
        });
    }

    const { name, email, password } = req.body;

    const isValidDomain = await verifyEmailDomain(email);
    if (!isValidDomain) {
        return res.status(400).json({ 
            success: false, 
            message: 'Domínio de e-mail inválido' 
        });
    }

    try {
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ success: false, message: 'E-mail já cadastrado' });
        }

        user = await User.create({ name, email, password });
        const token = generateToken(user._id);

        res.cookie('token', token, {
            httpOnly: true,
            maxAge: 7 * 24 * 60 * 60 * 1000,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax'
        });

        req.session.user = { 
            id: user._id.toString(), 
            name: user.name, 
            email: user.email, 
            role: user.role 
        };

        res.status(201).json({
            success: true,
            message: 'Cadastro realizado com sucesso!',
            user: { id: user._id, name: user.name, email: user.email }
        });
    } catch (error) {
        console.error('Erro ao registrar:', error);
        res.status(500).json({ success: false, message: 'Erro ao cadastrar usuário' });
    }
});

router.post('/api/auth/login', [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: 'Dados inválidos' });
    }

    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user || !user.active) {
            return res.status(401).json({ success: false, message: 'E-mail ou senha incorretos' });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'E-mail ou senha incorretos' });
        }

        user.lastLogin = Date.now();
        await user.save();

        const token = generateToken(user._id);

        res.cookie('token', token, {
            httpOnly: true,
            maxAge: 7 * 24 * 60 * 60 * 1000,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax'
        });

        req.session.user = { 
            id: user._id.toString(), 
            name: user.name, 
            email: user.email, 
            role: user.role 
        };

        res.status(200).json({
            success: true,
            message: 'Login realizado com sucesso!',
            user: { id: user._id, name: user.name, email: user.email, role: user.role }
        });
    } catch (error) {
        console.error('Erro ao fazer login:', error);
        res.status(500).json({ success: false, message: 'Erro ao fazer login' });
    }
});

router.post('/api/auth/logout', (req, res) => {
    res.clearCookie('token');
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Erro ao fazer logout' });
        }
        res.status(200).json({ success: true, message: 'Logout realizado com sucesso' });
    });
});

module.exports = router;