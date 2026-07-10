let songs = [];
let questions = [];
let currentQuestion = null;
let currentSearch = '';
let answeredSongs = new Set();

let gameMode = null;
let gameDifficulty = null;
let gameStartTime = 0;
let gameTime = 0;
let gameTimer = null;
let gameProgress = 0;
let gameLives = 0;
let gamePenalty = 0;

const GAME_CONFIG = {
    race: {
        totalQuestions: 10,
        penalties: { ez: 3, hd: 5, in: 20 }
    },
    endless: {
        lives: { ez: 10, hd: 5, in: 3, at: 1 }
    }
};

const DOM = {
    homeContainer: document.getElementById('home-container'),
    gameContainer: document.getElementById('game-container'),
    settlementContainer: document.getElementById('settlement-container'),
    
    questionName: document.getElementById('question-name'),
    questionDesc: document.getElementById('question-desc'),
    searchInput: document.getElementById('search-input'),
    clearBtn: document.getElementById('clear-btn'),
    resultsList: document.getElementById('results-list'),
    resultsCount: document.getElementById('results-count'),
    
    answerSection: document.getElementById('answer-section'),
    answerName: document.getElementById('answer-name'),
    answerArtist: document.getElementById('answer-artist'),
    illustration: document.getElementById('illustration'),
    otherAnswers: document.getElementById('other-answers'),
    otherAnswersList: document.getElementById('other-answers-list'),
    
    giveupSection: document.getElementById('giveup-section'),
    giveupAnswers: document.getElementById('giveup-answers'),
    
    giveupBtn: document.getElementById('giveup-btn'),
    nextBtn: document.getElementById('next-btn'),
    backBtn: document.getElementById('back-btn'),
    restartBtn: document.getElementById('restart-btn'),
    homeBtn: document.getElementById('home-btn'),
    
    statTime: document.getElementById('stat-time'),
    statLives: document.getElementById('stat-lives'),
    statProgress: document.getElementById('stat-progress'),
    
    settlementStatus: document.getElementById('settlement-status'),
    settlementCorrect: document.getElementById('settlement-correct'),
    settlementWrong: document.getElementById('settlement-wrong'),
    settlementTime: document.getElementById('settlement-time'),
    settlementTimeBox: document.getElementById('settlement-time-box')
};

let gameState = {
    correct: 0,
    wrong: 0
};

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

async function loadData() {
    try {
        const [songsRes, questionsRes] = await Promise.all([
            fetch('data/songs.json'),
            fetch('data/questions.json')
        ]);
        
        songs = await songsRes.json();
        questions = await questionsRes.json();
    } catch (error) {
        console.error('Failed to load data:', error);
    }
}

function showHome() {
    DOM.homeContainer.style.display = 'block';
    DOM.gameContainer.style.display = 'none';
    DOM.settlementContainer.style.display = 'none';
    stopTimer();
}

function showGame() {
    DOM.homeContainer.style.display = 'none';
    DOM.gameContainer.style.display = 'block';
    DOM.settlementContainer.style.display = 'none';
}

function showSettlement(status) {
    DOM.homeContainer.style.display = 'none';
    DOM.gameContainer.style.display = 'none';
    DOM.settlementContainer.style.display = 'block';
    
    DOM.settlementStatus.textContent = status;
    DOM.settlementCorrect.textContent = gameState.correct;
    DOM.settlementWrong.textContent = gameState.wrong;
    
    if (gameMode === 'race') {
        DOM.settlementTimeBox.style.display = 'block';
        DOM.settlementTime.textContent = formatTime(gameTime);
    } else {
        DOM.settlementTimeBox.style.display = 'none';
    }
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
}

function startTimer() {
    stopTimer();
    const startTime = Date.now();
    const baseTime = gameTime;
    gameTimer = setInterval(() => {
        gameTime = baseTime + (Date.now() - startTime) / 1000;
        DOM.statTime.textContent = `时间: ${formatTime(gameTime)}`;
    }, 10);
}

function stopTimer() {
    if (gameTimer) {
        clearInterval(gameTimer);
        gameTimer = null;
    }
}

function initGame(mode, difficulty) {
    gameMode = mode;
    gameDifficulty = difficulty;
    gameState = { correct: 0, wrong: 0 };
    gameProgress = 0;
    gameTime = 0;
    
    if (mode === 'endless') {
        gameLives = GAME_CONFIG.endless.lives[difficulty];
    }
    
    if (mode === 'race') {
        gamePenalty = GAME_CONFIG.race.penalties[difficulty];
    }
    
    updateGameStats();
    showGame();
    startNewRound();
}

function updateGameStats() {
    if (gameMode === 'race') {
        DOM.statTime.style.display = 'inline';
        DOM.statLives.style.display = 'none';
        DOM.statProgress.style.display = 'inline';
        DOM.statProgress.textContent = `进度: ${gameProgress}/${GAME_CONFIG.race.totalQuestions}`;
    } else if (gameMode === 'endless') {
        DOM.statTime.style.display = 'none';
        DOM.statLives.style.display = 'inline';
        DOM.statProgress.style.display = 'none';
        DOM.statLives.textContent = `❤️: ${gameLives}`;
    } else {
        DOM.statTime.style.display = 'none';
        DOM.statLives.style.display = 'none';
        DOM.statProgress.style.display = 'none';
    }
}

function startNewRound() {
    currentQuestion = questions[Math.floor(Math.random() * questions.length)];
    currentSearch = '';
    answeredSongs.clear();
    
    DOM.questionName.textContent = currentQuestion.name;
    DOM.questionDesc.textContent = currentQuestion.description;
    
    DOM.searchInput.value = '';
    DOM.clearBtn.style.display = 'none';
    
    DOM.answerSection.style.display = 'none';
    DOM.otherAnswers.style.display = 'none';
    DOM.giveupSection.style.display = 'none';
    DOM.giveupBtn.style.display = (gameMode === 'endless' || gameMode === 'race') ? 'none' : 'block';
    DOM.nextBtn.style.display = 'none';
    
    if (gameMode === 'race') {
        startTimer();
    }
    
    renderResults(songs);
}

function renderResults(filteredSongs) {
    DOM.resultsCount.textContent = filteredSongs.length;
    
    if (filteredSongs.length === 0) {
        DOM.resultsList.innerHTML = '<div class="empty">没有找到匹配的歌曲</div>';
        return;
    }
    
    if (filteredSongs.length > 3) {
        DOM.resultsList.innerHTML = `<div class="empty">搜索结果过多（${filteredSongs.length}首），请输入更精确的关键词</div>`;
        return;
    }
    
    const isCandidateMode = currentSearch.trim() !== '';
    
    DOM.resultsList.innerHTML = (isCandidateMode ? '<div class="candidates-label">备选歌曲：</div>' : '') + filteredSongs.map(song => {
        const status = answeredSongs.has(song.id);
        const isCorrect = status && song.attributes.includes(currentQuestion.id);
        const statusClass = isCorrect ? 'correct' : (status ? 'wrong' : '');
        
        let statusIcon = isCorrect ? '✓' : '';
        if (status && !isCorrect && currentQuestion.id.startsWith('difficulty-')) {
            const diff = song.difficulty || {};
            const typeMatch = currentQuestion.id.match(/difficulty-(easy|hard|insane|another)/);
            if (typeMatch) {
                const type = typeMatch[1];
                const displayMap = {
                    'easy': `EZ Lv.${diff.easy?.toFixed(1)}`,
                    'hard': `HD Lv.${diff.hard?.toFixed(1)}`,
                    'insane': `IN Lv.${diff.insane?.toFixed(1)}`,
                    'another': diff.another !== undefined ? `AT Lv.${diff.another.toFixed(1)}` : '✗'
                };
                statusIcon = displayMap[type] || '✗';
            }
        } else if (status && !isCorrect) {
            statusIcon = '✗';
        }
        
        return `
            <div class="song-item ${statusClass}" data-id="${song.id}">
                <div class="song-info">
                    <div class="song-name">${escapeHtml(song.name)}</div>
                    <div class="song-artist">${escapeHtml(song.artist)}</div>
                </div>
                <span class="song-status">${statusIcon}</span>
            </div>
        `;
    }).join('');
    
    document.querySelectorAll('.song-item').forEach(item => {
        item.addEventListener('click', () => handleSongClick(item));
    });
}

function handleSongClick(item) {
    if (answeredSongs.has(item.dataset.id)) return;
    
    const song = songs.find(s => s.id === item.dataset.id);
    if (!song) return;
    
    answeredSongs.add(song.id);
    
    if (song.attributes.includes(currentQuestion.id)) {
        handleCorrectAnswer(song);
    } else {
        handleWrongAnswer();
    }
    
    renderResults(filterSongs(currentSearch));
}

function handleCorrectAnswer(song) {
    gameState.correct++;
    gameProgress++;
    
    if (gameMode === 'race') {
        stopTimer();
    }
    
    DOM.answerName.textContent = song.name;
    DOM.answerArtist.textContent = song.artist;
    DOM.illustration.src = `assets/illustrations/${song.id}.webp`;
    
    const otherCorrectAnswers = songs.filter(s => 
        s.attributes.includes(currentQuestion.id) && s.id !== song.id
    );
    
    if (otherCorrectAnswers.length > 0) {
        const displayAnswers = otherCorrectAnswers.slice(0, 4);
        DOM.otherAnswersList.innerHTML = displayAnswers.map(s => `
            <div class="other-answer-item">
                <span class="other-answer-name">${escapeHtml(s.name)}</span>
                <span class="other-answer-artist">${escapeHtml(s.artist)}</span>
            </div>
        `).join('');
        DOM.otherAnswers.style.display = 'block';
    } else {
        DOM.otherAnswers.style.display = 'none';
    }
    
    DOM.answerSection.style.display = 'block';
    DOM.giveupBtn.style.display = 'none';
    DOM.nextBtn.style.display = 'block';
    
    updateGameStats();
    
    setTimeout(() => {
        DOM.answerSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);
    
    if (gameMode === 'race' && gameProgress >= GAME_CONFIG.race.totalQuestions) {
        setTimeout(() => {
            showSettlement('完成');
        }, 1500);
        DOM.nextBtn.style.display = 'none';
    }
}

function handleWrongAnswer() {
    gameState.wrong++;
    
    if (gameMode === 'race') {
        gameTime += gamePenalty;
        gameStartTime -= gamePenalty * 1000;
    } else if (gameMode === 'endless') {
        gameLives--;
        if (gameLives <= 0) {
            setTimeout(() => {
                showSettlement('生命值耗尽');
            }, 500);
            return;
        }
    }
    
    updateGameStats();
}

function handleGiveUp() {
    if (gameMode === 'race') {
        showSettlement('中途退出');
        return;
    }
    
    const correctAnswers = songs.filter(song => 
        song.attributes.includes(currentQuestion.id)
    );
    
    const displayAnswers = correctAnswers.slice(0, 5);
    
    DOM.giveupAnswers.innerHTML = displayAnswers.map(song => `
        <div class="giveup-answer">
            <span class="giveup-answer-name">${escapeHtml(song.name)}</span>
            <span class="giveup-answer-artist">${escapeHtml(song.artist)}</span>
        </div>
    `).join('');
    
    DOM.giveupSection.style.display = 'block';
    DOM.giveupBtn.style.display = 'none';
    DOM.nextBtn.style.display = 'block';
    
    setTimeout(() => {
        DOM.giveupSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);
}

function handleBack() {
    if (gameMode === 'practice') {
        showSettlement('练习完成');
    } else {
        showSettlement('中途退出');
    }
}

function handleRestart() {
    if (gameMode && gameDifficulty) {
        initGame(gameMode, gameDifficulty);
    }
}

function filterSongs(query) {
    if (!query.trim()) return songs;
    
    const lowerQuery = query.toLowerCase();
    return songs.filter(song => {
        const nameMatch = song.name.toLowerCase().includes(lowerQuery);
        const aliasMatch = song.aliases.some(alias => 
            alias.toLowerCase().includes(lowerQuery)
        );
        return nameMatch || aliasMatch;
    });
}

function handleSearch(e) {
    currentSearch = e.target.value;
    
    DOM.clearBtn.style.display = currentSearch ? 'block' : 'none';
    
    const filtered = filterSongs(currentSearch);
    renderResults(filtered);
}

function clearSearch() {
    DOM.searchInput.value = '';
    DOM.clearBtn.style.display = 'none';
    currentSearch = '';
    renderResults(songs);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const mode = btn.dataset.mode;
        const difficulty = btn.dataset.difficulty || 'ez';
        initGame(mode, difficulty);
    });
});

DOM.searchInput.addEventListener('input', debounce(handleSearch, 200));
DOM.clearBtn.addEventListener('click', clearSearch);
DOM.giveupBtn.addEventListener('click', handleGiveUp);
DOM.nextBtn.addEventListener('click', startNewRound);
DOM.backBtn.addEventListener('click', handleBack);
DOM.restartBtn.addEventListener('click', handleRestart);
DOM.homeBtn.addEventListener('click', showHome);

DOM.searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        clearSearch();
        DOM.searchInput.blur();
    }
});

loadData();
showHome();
