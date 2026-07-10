let songs = [];
let questionConfig = {};
let currentQuestion = null;
let currentSearch = '';
let answeredSongs = new Set();
let recentQuestions = [];

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
        penalties: { ez: 3, hd: 5, in: 15, at: 40 }
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
    songDetails: document.getElementById('song-details'),
    
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
        questionConfig = await questionsRes.json();
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

function formatDuration(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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
    recentQuestions = [];
    
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

function generateQuestion() {
    const difficulty = gameDifficulty;
    const levelConfig = questionConfig.difficulty_levels?.[difficulty];
    if (!levelConfig) return null;
    
    const questionTypes = levelConfig.question_types || [];
    const totalWeight = questionTypes.reduce((sum, t) => sum + (t.weight || 1), 0);
    
    let question = null;
    let attempts = 0;
    const maxAttempts = 200;
    
    while (!question && attempts < maxAttempts) {
        attempts++;
        
        let random = Math.random() * totalWeight;
        let selectedType = questionTypes[0]?.type;
        
        for (const qt of questionTypes) {
            random -= (qt.weight || 1);
            if (random <= 0) {
                selectedType = qt.type;
                break;
            }
        }
        
        question = generateQuestionByType(selectedType);
        
        if (question) {
            const qId = question.id;
            const isDuplicate = recentQuestions.some(q => q.id === qId);
            if (isDuplicate) {
                question = null;
            }
        }
    }
    
    if (!question) {
        question = {
            id: 'fallback',
            name: '题目生成失败',
            description: '请点击下一题',
            type: 'fallback',
            validate: () => true
        };
    }
    
    return question;
}

function generateQuestionByType(type) {
    switch (type) {
        case 'difficulty-easy-int':
            return generateDifficultyQuestion('easy', 'int', [8]);
        
        case 'difficulty-easy-decimal':
            return generateDifficultyQuestion('easy', 'decimal', [0.0, 9.9]);
        
        case 'difficulty-hard-int':
            return generateDifficultyQuestion('hard', 'int', [13]);
        
        case 'difficulty-hard-decimal':
            return generateDifficultyQuestion('hard', 'decimal', [0.0, 14.9]);
        
        case 'difficulty-insane-int':
            return generateDifficultyQuestion('insane', 'int', [10, 11, 12, 13, 14, 15]);
        
        case 'difficulty-insane-decimal-low':
            return generateDifficultyQuestion('insane', 'decimal', [16.0, 16.6]);
        
        case 'difficulty-insane-decimal':
            return generateDifficultyQuestion('insane', 'decimal', [15.0, 16.6]);
        
        case 'difficulty-insane-decimal-wide':
            return generateDifficultyQuestion('insane', 'decimal', [7.0, 16.6]);
        
        case 'difficulty-another-int':
            return generateDifficultyQuestion('another', 'int', [15, 16, 17]);
        
        case 'difficulty-another-decimal-low':
            return generateDifficultyQuestion('another', 'decimal', [17.0, 17.6]);
        
        case 'difficulty-another-decimal':
            return generateDifficultyQuestion('another', 'decimal', [16.6, 17.6]);
        
        case 'difficulty-another-decimal-wide':
            return generateDifficultyQuestion('another', 'decimal', [13.6, 17.6]);
        
        case 'firstLetter':
            return generateFirstLetterQuestion();
        
        case 'updateYear':
            return generateUpdateYearQuestion();
        
        case 'charter':
            return generateCharterQuestion();
        
        case 'charter-at':
            return generateAtCharterQuestion();
        
        case 'duration':
            return generateDurationQuestion(0.30, 0.50);
        
        case 'duration-at':
            return generateDurationQuestion(0.15, 0.25);
        
        case 'bpm':
            return generateBpmQuestion(0.25, 0.40);
        
        default:
            return null;
    }
}

function generateDifficultyQuestion(diffType, mode, range) {
    const diffMap = {
        'easy': { label: 'EZ', key: 'easy' },
        'hard': { label: 'HD', key: 'hard' },
        'insane': { label: 'IN', key: 'insane' },
        'another': { label: 'AT', key: 'another' }
    };
    
    const info = diffMap[diffType];
    if (!info) return null;
    
    let targetValue;
    let min, max;
    
    if (mode === 'int') {
        targetValue = range[Math.floor(Math.random() * range.length)];
        min = targetValue;
        max = targetValue + 1;
    } else {
        min = range[0];
        max = range[1];
        targetValue = parseFloat((Math.random() * (max - min) + min).toFixed(1));
        min = targetValue;
        max = Math.min(targetValue + 0.1, range[1]);
    }
    
    const matchingSongs = songs.filter(s => {
        const diff = s.difficulty?.[info.key];
        return diff !== undefined && diff >= min && diff < max;
    });
    
    if (matchingSongs.length === 0) return null;
    
    const questionId = `${info.label}-${targetValue}`;
    
    if (mode === 'int') {
        return {
            id: questionId,
            name: `${info.label} 难度定数为 ${targetValue}`,
            description: `找出${info.label}难度定数为${targetValue}的歌曲`,
            type: 'difficulty',
            diffType: diffType,
            targetValue: targetValue,
            validate: (song) => {
                const diff = song.difficulty?.[info.key];
                return diff !== undefined && diff >= min && diff < max;
            }
        };
    } else {
        return {
            id: questionId,
            name: `${info.label} 难度定数为 ${targetValue.toFixed(1)}`,
            description: `找出${info.label}难度定数为${targetValue.toFixed(1)}的歌曲`,
            type: 'difficulty',
            diffType: diffType,
            targetValue: targetValue,
            validate: (song) => {
                const diff = song.difficulty?.[info.key];
                return diff !== undefined && diff >= min && diff < max;
            }
        };
    }

}

function generateFirstLetterQuestion() {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXY';
    const letter = letters[Math.floor(Math.random() * letters.length)];
    
    const matchingSongs = songs.filter(s => {
        const firstChar = s.name.charAt(0).toUpperCase();
        return firstChar === letter;
    });
    
    if (matchingSongs.length === 0) return null;
    
    return {
        id: `firstLetter-${letter}`,
        name: `首字母为 ${letter}`,
        description: `找出首字母为${letter}的歌曲`,
        type: 'firstLetter',
        letter: letter,
        validate: (song) => {
            return song.name.charAt(0).toUpperCase() === letter;
        }
    };
}

function generateUpdateYearQuestion() {
    const years = [...new Set(songs.map(s => {
        const date = s.update_date;
        if (date && date.includes('/')) {
            return date.split('/')[0];
        }
        return null;
    }).filter(y => y))];
    
    if (years.length === 0) return null;
    
    const year = years[Math.floor(Math.random() * years.length)];
    
    const matchingSongs = songs.filter(s => {
        return s.update_date && s.update_date.startsWith(year);
    });
    
    if (matchingSongs.length === 0) return null;
    
    return {
        id: `updateYear-${year}`,
        name: `${year}年更新的歌曲`,
        description: `找出${year}年更新的歌曲`,
        type: 'updateYear',
        year: year,
        validate: (song) => {
            return song.update_date && song.update_date.startsWith(year);
        }
    };
}

function generateCharterQuestion() {
    const minSongs = questionConfig.difficulty_levels?.[gameDifficulty]?.charter_min_songs || 1;
    const charterCounts = {};
    songs.forEach(s => {
        if (s.charts?.IN?.charter) {
            s.charts.IN.charter.forEach(c => {
                charterCounts[c] = (charterCounts[c] || 0) + 1;
            });
        }
    });
    
    const charters = Object.keys(charterCounts).filter(c => charterCounts[c] >= minSongs);
    if (charters.length === 0) return null;
    
    const charter = charters[Math.floor(Math.random() * charters.length)];
    
    const matchingSongs = songs.filter(s => {
        const charters = s.charts?.IN?.charter;
        return charters && charters.includes(charter);
    });
    
    if (matchingSongs.length === 0) return null;
    
    return {
        id: `charter-${charter}`,
        name: `IN谱师包含 ${charter}`,
        description: `找出IN难度谱师包含${charter}的歌曲`,
        type: 'charter',
        charter: charter,
        validate: (song) => {
            const charters = song.charts?.IN?.charter;
            return charters && charters.includes(charter);
        }
    };
}

function generateAtCharterQuestion() {
    const minSongs = questionConfig.difficulty_levels?.[gameDifficulty]?.charter_min_songs || 1;
    const charterCounts = {};
    songs.forEach(s => {
        if (s.charts?.AT?.charter) {
            s.charts.AT.charter.forEach(c => {
                charterCounts[c] = (charterCounts[c] || 0) + 1;
            });
        }
    });
    
    const charters = Object.keys(charterCounts).filter(c => charterCounts[c] >= minSongs);
    if (charters.length === 0) return null;
    
    const charter = charters[Math.floor(Math.random() * charters.length)];
    
    const matchingSongs = songs.filter(s => {
        const charters = s.charts?.AT?.charter;
        return charters && charters.includes(charter);
    });
    
    if (matchingSongs.length === 0) return null;
    
    return {
        id: `charter-at-${charter}`,
        name: `AT谱师包含 ${charter}`,
        description: `找出AT难度谱师包含${charter}的歌曲`,
        type: 'charter-at',
        charter: charter,
        validate: (song) => {
            const charters = song.charts?.AT?.charter;
            return charters && charters.includes(charter);
        }
    };
}

function generateDurationQuestion(minRatio, maxRatio) {
    const durations = songs.map(s => s.duration).filter(d => d && typeof d === 'number');
    if (durations.length === 0) return null;
    
    const minDur = Math.min(...durations);
    const maxDur = Math.max(...durations);
    
    const targetCount = Math.floor(durations.length * (Math.random() * (maxRatio - minRatio) + minRatio));
    const count = Math.max(1, Math.min(targetCount, durations.length - 1));
    
    const sorted = [...durations].sort((a, b) => a - b);
    const startIdx = Math.floor(Math.random() * (sorted.length - count));
    const rangeMin = sorted[startIdx];
    const rangeMax = sorted[startIdx + count - 1] + 1;
    
    const matchingSongs = songs.filter(s => {
        const dur = s.duration;
        return dur && typeof dur === 'number' && dur >= rangeMin && dur < rangeMax;
    });
    
    if (matchingSongs.length === 0) return null;
    
    return {
        id: `duration-${rangeMin}-${rangeMax}`,
        name: `时长在 ${formatDuration(rangeMin)} ~ ${formatDuration(rangeMax)}`,
        description: `找出时长在${formatDuration(rangeMin)}到${formatDuration(rangeMax)}之间的歌曲`,
        type: 'duration',
        rangeMin: rangeMin,
        rangeMax: rangeMax,
        validate: (song) => {
            const dur = song.duration;
            return dur && typeof dur === 'number' && dur >= rangeMin && dur < rangeMax;
        }
    };
}

function getBpmValue(bpm) {
    if (typeof bpm === 'number') return bpm;
    if (typeof bpm === 'string' && bpm.includes('~')) {
        const parts = bpm.split('~');
        return parseFloat(parts[0]);
    }
    return null;
}

function generateBpmQuestion(minRatio, maxRatio) {
    const bpmValues = songs.map(s => getBpmValue(s.bpm)).filter(b => b !== null);
    if (bpmValues.length === 0) return null;
    
    const minBpm = Math.floor(Math.min(...bpmValues));
    const maxBpm = Math.ceil(Math.max(...bpmValues));
    
    const targetCount = Math.floor(bpmValues.length * (Math.random() * (maxRatio - minRatio) + minRatio));
    const count = Math.max(1, Math.min(targetCount, bpmValues.length - 1));
    
    const sorted = [...bpmValues].sort((a, b) => a - b);
    const startIdx = Math.floor(Math.random() * (sorted.length - count));
    const rangeMin = Math.floor(sorted[startIdx]);
    const rangeMax = Math.ceil(sorted[startIdx + count - 1]) + 1;
    
    const matchingSongs = songs.filter(s => {
        const bpm = getBpmValue(s.bpm);
        return bpm !== null && bpm >= rangeMin && bpm < rangeMax;
    });
    
    if (matchingSongs.length === 0) return null;
    
    return {
        id: `bpm-${rangeMin}-${rangeMax}`,
        name: `BPM在 ${rangeMin} ~ ${rangeMax}`,
        description: `找出BPM在${rangeMin}到${rangeMax}之间的歌曲`,
        type: 'bpm',
        rangeMin: rangeMin,
        rangeMax: rangeMax,
        validate: (song) => {
            const bpm = getBpmValue(song.bpm);
            return bpm !== null && bpm >= rangeMin && bpm < rangeMax;
        }
    };
}

function startNewRound() {
    currentQuestion = generateQuestion();
    recentQuestions.push(currentQuestion);
    
    if (gameMode === 'endless') {
        if (recentQuestions.length > 100) {
            recentQuestions.shift();
        }
    } else if (gameMode === 'race') {
        if (recentQuestions.length > GAME_CONFIG.race.totalQuestions) {
            recentQuestions.shift();
        }
    }
    
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
        const isCorrect = status && currentQuestion.validate(song);
        const statusClass = isCorrect ? 'correct' : (status ? 'wrong' : '');
        
        let statusIcon = isCorrect ? '✓' : '';
        if (status && !isCorrect && currentQuestion.type === 'difficulty') {
            const diff = song.difficulty || {};
            const diffMap = {
                'easy': `EZ Lv.${diff.easy?.toFixed(1)}`,
                'hard': `HD Lv.${diff.hard?.toFixed(1)}`,
                'insane': `IN Lv.${diff.insane?.toFixed(1)}`,
                'another': diff.another !== undefined ? `AT Lv.${diff.another.toFixed(1)}` : '✗'
            };
            statusIcon = diffMap[currentQuestion.diffType] || '✗';
        } else if (status && !isCorrect && currentQuestion.type === 'updateYear') {
            const year = song.update_date ? song.update_date.split('/')[0] : '未知';
            statusIcon = `${year}年`;
        } else if (status && !isCorrect && currentQuestion.type === 'duration') {
            const dur = song.duration;
            statusIcon = dur ? formatDuration(dur) : '未知';
        } else if (status && !isCorrect && currentQuestion.type === 'bpm') {
            const bpm = song.bpm;
            statusIcon = bpm ? bpm : '未知';
        } else if (status && !isCorrect && currentQuestion.type === 'charter') {
            const charters = song.charts?.IN?.charter;
            statusIcon = charters && charters.length > 0 ? charters.join(' & ') : '✗';
        } else if (status && !isCorrect && currentQuestion.type === 'charter-at') {
            const charters = song.charts?.AT?.charter;
            statusIcon = charters && charters.length > 0 ? charters.join(' & ') : '✗';
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
    
    DOM.resultsList.querySelectorAll('.song-item').forEach(item => {
        item.addEventListener('click', () => handleSongClick(item));
    });
}

function handleSongClick(item) {
    if (answeredSongs.has(item.dataset.id)) return;
    
    const song = songs.find(s => s.id === item.dataset.id);
    if (!song) return;
    
    answeredSongs.add(song.id);
    
    if (currentQuestion.validate(song)) {
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
        s.id !== song.id && currentQuestion.validate(s)
    );
    
    const defaultShow = questionConfig.display?.default_show_answers || 5;
    
    if (otherCorrectAnswers.length > 0) {
        renderAnswerList('other-answers-list', otherCorrectAnswers, defaultShow, true);
        DOM.otherAnswers.style.display = 'block';
    } else {
        DOM.otherAnswers.style.display = 'none';
    }
    
    const difficulty = song.difficulty || {};
    const charts = song.charts || {};
    let songDetails = [];
    
    if (difficulty.easy !== undefined) songDetails.push(`EZ Lv.${difficulty.easy.toFixed(1)}`);
    if (difficulty.hard !== undefined) songDetails.push(`HD Lv.${difficulty.hard.toFixed(1)}`);
    if (difficulty.insane !== undefined) songDetails.push(`IN Lv.${difficulty.insane.toFixed(1)}`);
    if (difficulty.another !== undefined) songDetails.push(`AT Lv.${difficulty.another.toFixed(1)}`);
    
    if (song.update_date) songDetails.push(`更新: ${song.update_date}`);
    if (song.version) songDetails.push(`版本: ${song.version}`);
    if (song.bpm) songDetails.push(`BPM: ${song.bpm}`);
    if (song.duration) songDetails.push(`时长: ${formatDuration(song.duration)}`);
    
    const charters = [];
    ['EZ', 'HD', 'IN', 'AT'].forEach(diff => {
        if (charts[diff]?.charter) {
            charters.push(`${diff}: ${charts[diff].charter.join(' & ')}`);
        }
    });
    if (charters.length > 0) songDetails.push(`谱师: ${charters.join(', ')}`);
    
    DOM.songDetails.innerHTML = songDetails.map(d => `<span class="detail-tag">${escapeHtml(d)}</span>`).join('');
    
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

function renderAnswerList(containerId, answerList, defaultShow, isOtherAnswers) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    let isExpanded = false;
    
    function render() {
        const displayAnswers = isExpanded ? answerList : answerList.slice(0, defaultShow);
        let html;
        
        if (isOtherAnswers) {
            html = displayAnswers.map(s => `
                <div class="other-answer-item">
                    <span class="other-answer-name">${escapeHtml(s.name)}</span>
                    <span class="other-answer-artist">${escapeHtml(s.artist)}</span>
                </div>
            `).join('');
        } else {
            html = displayAnswers.map(s => `
                <div class="giveup-answer">
                    <span class="giveup-answer-name">${escapeHtml(s.name)}</span>
                    <span class="giveup-answer-artist">${escapeHtml(s.artist)}</span>
                </div>
            `).join('');
        }
        
        if (answerList.length > defaultShow) {
            html += `
                <div class="toggle-more-btn" id="toggle-more-${containerId}">
                    ${isExpanded ? '收起' : `展开（共${answerList.length}首）`}
                </div>
            `;
        }
        
        container.innerHTML = html;
        
        const toggleBtn = document.getElementById(`toggle-more-${containerId}`);
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                isExpanded = !isExpanded;
                render();
            });
        }
    }
    
    render();
}

function handleGiveUp() {
    if (gameMode === 'race') {
        showSettlement('中途退出');
        return;
    }
    
    const correctAnswers = songs.filter(song => currentQuestion.validate(song));
    const defaultShow = questionConfig.display?.default_show_answers || 5;
    
    renderAnswerList('giveup-answers', correctAnswers, defaultShow, false);
    
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

DOM.homeContainer.querySelectorAll('.mode-btn').forEach(btn => {
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
