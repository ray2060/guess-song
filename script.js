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
let gameScore = 0;
let gameMaxCombo = 0;
let gameCurrentCombo = 0;
let gameStartTimeMs = 0;

const GAME_CONFIG = {
    race: {
        totalQuestions: 10,
        penalties: { ez: 3, hd: 5, in: 15, at: 40 }
    },
    endless: {
        lives: { ez: 8, hd: 4, in: 2, at: 1 }
    }
};

const AUDIO_MANAGER = {
    volumes: {
        default: 0.12,
        bgLoop: 0.05,
        settlement: 0.05,
        startGame: 0.07
    },
    currentBgm: null,
    tap7: null,
    
    init: function() {
        this.tap7 = new Audio('assets/music/Tap7.mp3');
        this.tap7.volume = this.volumes.startGame;
    },
    
    playBgm: function(filename, volumeKey = 'default') {
        if (this.currentBgm) {
            this.currentBgm.pause();
            this.currentBgm = null;
        }
        
        const audio = new Audio(`assets/music/${filename}.mp3`);
        audio.volume = this.volumes[volumeKey] || this.volumes.default;
        audio.loop = true;
        audio.play().catch(() => {});
        
        this.currentBgm = audio;
    },
    
    playTap7: function() {
        if (this.tap7) {
            this.tap7.currentTime = 0;
            this.tap7.play().catch(() => {});
        }
    },
    
    stopBgm: function() {
        if (this.currentBgm) {
            this.currentBgm.pause();
            this.currentBgm = null;
        }
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
    resultsSection: document.getElementById('results-section'),
    
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
    statCombo: document.getElementById('stat-combo'),
    statScore: document.getElementById('stat-score'),
    
    settlementStatus: document.getElementById('settlement-status'),
    settlementCorrect: document.getElementById('settlement-correct'),
    settlementWrong: document.getElementById('settlement-wrong'),
    settlementMaxcombo: document.getElementById('settlement-maxcombo'),
    settlementTime: document.getElementById('settlement-time'),
    settlementTimeBox: document.getElementById('settlement-time-box'),
    settlementRating: document.getElementById('settlement-rating'),
    ratingImage: document.getElementById('rating-image'),
    ratingScore: document.getElementById('rating-score')
};

let gameState = {
    correct: 0,
    wrong: 0
};

let gameAnswerScore = 0;
let questionStartTime = 0;

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
        showHome();
    } catch (error) {
        console.error('Failed to load data:', error);
        showHome();
    }
}

function showHome() {
    if (DOM.homeContainer) DOM.homeContainer.style.display = 'block';
    if (DOM.gameContainer) DOM.gameContainer.style.display = 'none';
    if (DOM.settlementContainer) DOM.settlementContainer.style.display = 'none';
    stopTimer();
    AUDIO_MANAGER.playBgm('ChapterSelect', 'default');
    
    if (DOM.homeContainer) {
        DOM.homeContainer.querySelectorAll('.mode-btn').forEach(btn => {
            const mode = btn.dataset.mode;
            const difficulty = btn.dataset.difficulty;
            const infoSpan = btn.querySelector('.mode-btn-info');
            
            if (infoSpan) {
                if (mode === 'race') {
                    const penalty = GAME_CONFIG.race.penalties[difficulty];
                    infoSpan.textContent = `罚时 ${penalty}s`;
                } else if (mode === 'endless') {
                    const lives = GAME_CONFIG.endless.lives[difficulty];
                    infoSpan.textContent = `生命 ${lives}`;
                }
            }
        });
    }
}

function showGame() {
    if (DOM.homeContainer) DOM.homeContainer.style.display = 'none';
    if (DOM.gameContainer) DOM.gameContainer.style.display = 'block';
    if (DOM.settlementContainer) DOM.settlementContainer.style.display = 'none';
    AUDIO_MANAGER.playBgm('BG_Loop', 'bgLoop');
}

function showSettlement(status) {
    if (DOM.homeContainer) DOM.homeContainer.style.display = 'none';
    if (DOM.gameContainer) DOM.gameContainer.style.display = 'none';
    if (DOM.settlementContainer) DOM.settlementContainer.style.display = 'block';
    
    if (DOM.settlementStatus) DOM.settlementStatus.textContent = status;
    if (DOM.settlementCorrect) DOM.settlementCorrect.textContent = gameState.correct;
    if (DOM.settlementWrong) DOM.settlementWrong.textContent = gameState.wrong;
    if (DOM.settlementMaxcombo) DOM.settlementMaxcombo.textContent = gameMaxCombo;
    
    const levelIndex = { ez: 0, hd: 1, in: 2, at: 3 }[gameDifficulty] || 0;
    AUDIO_MANAGER.playBgm(`LevelOver${levelIndex}`, 'settlement');
    
    if (gameMode === 'race') {
        if (DOM.settlementTimeBox) DOM.settlementTimeBox.style.display = 'block';
        if (DOM.settlementTime) DOM.settlementTime.textContent = formatTime(gameTime);
    } else {
        if (DOM.settlementTimeBox) DOM.settlementTimeBox.style.display = 'none';
    }
    
    if (gameMode === 'practice') {
        if (DOM.settlementRating) DOM.settlementRating.style.display = 'none';
    } else {
        if (DOM.settlementRating) DOM.settlementRating.style.display = 'flex';
        
        let finalScore = gameScore;
        let rating = calculateRating(finalScore);
        
        if (DOM.ratingScore) DOM.ratingScore.textContent = formatScore(finalScore);
        if (DOM.ratingImage) DOM.ratingImage.src = `assets/texture/${rating}.webp`;
    }
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
}

function formatScore(score) {
    return score.toString().padStart(7, '0');
}

function calculateRating(score) {
    if (score >= 1000000) return 'Phi';
    if (gameMode === 'race' && gameMaxCombo === 10) return 'FC';
    if (score < 700000) return 'F';
    if (score < 820000) return 'C';
    if (score < 880000) return 'B';
    if (score < 920000) return 'A';
    if (score < 960000) return 'S';
    return 'V';
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
    gameScore = 0;
    gameAnswerScore = 0;
    gameMaxCombo = 0;
    gameCurrentCombo = 0;
    gameStartTimeMs = Date.now();
    questionStartTime = Date.now();
    recentQuestions = [];
    
    if (mode === 'endless') {
        gameLives = GAME_CONFIG.endless.lives[difficulty];
    }
    
    if (mode === 'race') {
        gamePenalty = GAME_CONFIG.race.penalties[difficulty];
    }
    
    AUDIO_MANAGER.playTap7();
    
    updateGameStats();
    showGame();
    startNewRound();
}

function updateGameStats() {
    if (gameMode === 'race') {
        if (DOM.statTime) DOM.statTime.style.display = 'inline';
        if (DOM.statLives) DOM.statLives.style.display = 'none';
        if (DOM.statProgress) {
            DOM.statProgress.style.display = 'inline';
            DOM.statProgress.textContent = `进度: ${gameProgress}/${GAME_CONFIG.race.totalQuestions}`;
        }
        if (DOM.statCombo) {
            DOM.statCombo.style.display = 'inline';
            DOM.statCombo.textContent = `连击: ${gameCurrentCombo}`;
        }
        if (DOM.statScore) {
            DOM.statScore.style.display = 'inline';
            DOM.statScore.textContent = `分数: ${formatScore(gameScore)}`;
        }
    } else if (gameMode === 'endless') {
        if (DOM.statTime) DOM.statTime.style.display = 'none';
        if (DOM.statLives) {
            DOM.statLives.style.display = 'inline';
            DOM.statLives.textContent = `❤️: ${gameLives}`;
        }
        if (DOM.statProgress) DOM.statProgress.style.display = 'none';
        if (DOM.statCombo) {
            DOM.statCombo.style.display = 'inline';
            DOM.statCombo.textContent = `连击: ${gameCurrentCombo}`;
        }
        if (DOM.statScore) {
            DOM.statScore.style.display = 'inline';
            DOM.statScore.textContent = `分数: ${formatScore(gameScore)}`;
        }
    } else {
        if (DOM.statTime) DOM.statTime.style.display = 'none';
        if (DOM.statLives) DOM.statLives.style.display = 'none';
        if (DOM.statProgress) DOM.statProgress.style.display = 'none';
        if (DOM.statCombo) DOM.statCombo.style.display = 'none';
        if (DOM.statScore) DOM.statScore.style.display = 'none';
    }
}

function generateQuestion() {
    const difficulty = gameDifficulty;
    const levelConfig = questionConfig.difficulty_levels?.[difficulty];
    if (!levelConfig) return null;
    
    const questionTypes = levelConfig.question_types || [];
    const compoundTypes = levelConfig.compound_question_types || [];
    const compoundRate = levelConfig.compound_question_rate || 0;
    
    let question = null;
    let attempts = 0;
    const maxAttempts = 200;
    
    while (!question && attempts < maxAttempts) {
        attempts++;
        
        const useCompound = Math.random() < compoundRate && compoundTypes.length > 0;
        
        if (useCompound) {
            const totalCompoundWeight = compoundTypes.reduce((sum, t) => sum + (t.weight || 1), 0);
            let random = Math.random() * totalCompoundWeight;
            let selectedCompound = compoundTypes[0];
            
            for (const ct of compoundTypes) {
                random -= (ct.weight || 1);
                if (random <= 0) {
                    selectedCompound = ct;
                    break;
                }
            }
            
            question = generateCompoundQuestion(selectedCompound.types);
        } else {
            const totalWeight = questionTypes.reduce((sum, t) => sum + (t.weight || 1), 0);
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
        }
        
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

function generateCompoundQuestion(types) {
    let attempts = 0;
    const maxAttempts = 100;
    
    while (attempts < maxAttempts) {
        attempts++;
        const subQuestions = [];
        
        for (const type of types) {
            const q = generateQuestionByType(type);
            if (!q) break;
            subQuestions.push(q);
        }
        
        if (subQuestions.length !== types.length) continue;
        
        const matchingSongs = songs.filter(song => {
            return subQuestions.every(q => q.validate(song));
        });
        
        if (matchingSongs.length > 0) {
            const ids = subQuestions.map(q => q.id).join('+');
            const names = subQuestions.map(q => q.name).join('，且');
            const descriptions = subQuestions.map(q => q.description).join('，且');
            
            return {
                id: `compound-${ids}`,
                name: names,
                description: descriptions,
                type: 'compound',
                subTypes: subQuestions.map(q => q.type),
                validate: (song) => {
                    return subQuestions.every(q => q.validate(song));
                }
            };
        }
    }
    
    return null;
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
        
        case 'difficulty-another-int-wide':
            return generateDifficultyQuestion('another', 'int', [13, 14, 15, 16, 17]);
        
        case 'difficulty-insane-int-wide':
            return generateDifficultyQuestion('insane', 'int', [7, 8, 9, 10, 11, 12, 13, 14, 15, 16]);
        
        case 'firstLetter':
            return generateFirstLetterQuestion();
        
        case 'updateYear':
            return generateUpdateYearQuestion();
        
        case 'charter-in':
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
        if (diff === undefined) return false;
        if (mode === 'int') {
            return diff >= min && diff < max;
        } else {
            return parseFloat(diff.toFixed(1)) === targetValue;
        }
    });
    
    if (matchingSongs.length === 0) return null;
    
    const questionId = `${info.label}-${targetValue}`;
    
    if (mode === 'int') {
        return {
            id: questionId,
            name: `${info.label} 难度等级为 ${targetValue}`,
            description: `找出${info.label}难度等级为${targetValue}的歌曲`,
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
                return diff !== undefined && parseFloat(diff.toFixed(1)) === targetValue;
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
        id: `charter-in-${charter}`,
        name: `IN谱师包含 ${charter}`,
        description: `找出IN难度谱师包含${charter}的歌曲`,
        type: 'charter-in',
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
    if (gameMode === 'race' && gameProgress >= GAME_CONFIG.race.totalQuestions) {
        showSettlement('完成');
        return;
    }
    
    questionStartTime = Date.now();
    
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
    
    if (DOM.questionName) DOM.questionName.textContent = currentQuestion.name;
    if (DOM.questionDesc) DOM.questionDesc.textContent = currentQuestion.description;
    
    if (DOM.searchInput) {
        DOM.searchInput.value = '';
        DOM.searchInput.style.display = 'block';
    }
    if (DOM.clearBtn) DOM.clearBtn.style.display = 'none';
    if (DOM.resultsList) DOM.resultsList.style.display = 'block';
    if (DOM.resultsCount) DOM.resultsCount.style.display = 'block';
    if (DOM.resultsSection) DOM.resultsSection.style.display = 'block';
    
    if (DOM.answerSection) DOM.answerSection.style.display = 'none';
    if (DOM.otherAnswers) DOM.otherAnswers.style.display = 'none';
    if (DOM.giveupSection) DOM.giveupSection.style.display = 'none';
    if (DOM.giveupBtn) DOM.giveupBtn.style.display = (gameMode === 'endless' || gameMode === 'race') ? 'none' : 'block';
    if (DOM.nextBtn) DOM.nextBtn.style.display = 'none';
    
    if (gameMode === 'race') {
        startTimer();
    }
    
    renderResults(songs);
}

function renderResults(filteredSongs) {
    if (DOM.resultsCount) DOM.resultsCount.textContent = filteredSongs.length;
    
    if (!DOM.resultsList) return;
    
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
        } else if (status && !isCorrect && currentQuestion.type === 'charter-in') {
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
    
    gameCurrentCombo++;
    gameMaxCombo = Math.max(gameMaxCombo, gameCurrentCombo);
    
    if (gameMode === 'race') {
        stopTimer();
        
        const baseScore = 85000;
        const questionTime = (Date.now() - questionStartTime) / 1000;
        const timePenalty = Math.floor(Math.max(0, questionTime) * 500);
        gameAnswerScore = Math.floor(gameAnswerScore + baseScore - timePenalty);
        gameScore = Math.floor(gameAnswerScore + gameMaxCombo * 20000);
    } else if (gameMode === 'endless') {
        const baseScore = 40000;
        const questionTime = (Date.now() - questionStartTime) / 1000;
        const timePenalty = Math.min(Math.floor(questionTime * 1500), 15000);
        gameAnswerScore = Math.floor(gameAnswerScore + baseScore - timePenalty);
        gameScore = Math.floor(gameAnswerScore + gameMaxCombo * 8000);
    }
    
    gameScore = Math.max(0, Math.min(gameScore, 1000000));
    
    if (DOM.searchInput) DOM.searchInput.style.display = 'none';
    if (DOM.clearBtn) DOM.clearBtn.style.display = 'none';
    if (DOM.resultsList) DOM.resultsList.style.display = 'none';
    if (DOM.resultsCount) DOM.resultsCount.style.display = 'none';
    if (DOM.resultsSection) DOM.resultsSection.style.display = 'none';
    
    if (DOM.answerName) DOM.answerName.textContent = song.name;
    if (DOM.answerArtist) DOM.answerArtist.textContent = song.artist;
    if (DOM.illustration) DOM.illustration.src = `assets/illustrations/${song.id}.webp`;
    
    const otherCorrectAnswers = songs.filter(s => 
        s.id !== song.id && currentQuestion.validate(s)
    );
    
    const defaultShow = questionConfig.display?.default_show_answers || 5;
    
    if (otherCorrectAnswers.length > 0) {
        renderAnswerList('other-answers-list', otherCorrectAnswers, defaultShow, true);
        if (DOM.otherAnswers) DOM.otherAnswers.style.display = 'block';
    } else {
        if (DOM.otherAnswers) DOM.otherAnswers.style.display = 'none';
    }
    
    const difficulty = song.difficulty || {};
    const charts = song.charts || {};
    const qType = currentQuestion?.type || '';
    
    function isHighlighted(type, content) {
        let questionTypes = [qType];
        if (qType === 'compound' && currentQuestion?.subTypes) {
            questionTypes = currentQuestion.subTypes;
        }
        
        for (const t of questionTypes) {
            if (t === 'firstLetter') continue;
            if (t === 'updateYear' && type === 'info' && content.startsWith('更新:')) return true;
            if (t === 'bpm' && type === 'info' && content.startsWith('BPM:')) return true;
            if ((t === 'duration' || t === 'duration-at') && type === 'info' && content.startsWith('时长:')) return true;
            if (t === 'charter-in' && type === 'charter' && content.startsWith('IN谱师:')) return true;
            if (t === 'charter-at' && type === 'charter' && content.startsWith('AT谱师:')) return true;
            if (t.startsWith('difficulty') || qType === 'difficulty') {
                if (type !== 'difficulty') continue;
                const diffType = currentQuestion?.diffType || '';
                const diffMap = { 'easy': 'EZ', 'hard': 'HD', 'insane': 'IN', 'another': 'AT' };
                for (const [key, label] of Object.entries(diffMap)) {
                    if ((t.includes(key) || diffType === key) && content.startsWith(label)) return true;
                }
            }
        }
        
        return false;
    }
    
    const diffLine = [];
    if (difficulty.easy !== undefined) diffLine.push({ text: `EZ Lv.${difficulty.easy.toFixed(1)}`, highlighted: isHighlighted('difficulty', `EZ Lv.${difficulty.easy.toFixed(1)}`) });
    if (difficulty.hard !== undefined) diffLine.push({ text: `HD Lv.${difficulty.hard.toFixed(1)}`, highlighted: isHighlighted('difficulty', `HD Lv.${difficulty.hard.toFixed(1)}`) });
    if (difficulty.insane !== undefined) diffLine.push({ text: `IN Lv.${difficulty.insane.toFixed(1)}`, highlighted: isHighlighted('difficulty', `IN Lv.${difficulty.insane.toFixed(1)}`) });
    if (difficulty.another !== undefined) diffLine.push({ text: `AT Lv.${difficulty.another.toFixed(1)}`, highlighted: isHighlighted('difficulty', `AT Lv.${difficulty.another.toFixed(1)}`) });
    
    const infoLine = [];
    if (song.update_date) infoLine.push({ text: `更新: ${song.update_date}`, highlighted: isHighlighted('info', `更新: ${song.update_date}`) });
    if (song.version) infoLine.push({ text: `版本: ${song.version}`, highlighted: isHighlighted('info', `版本: ${song.version}`) });
    if (song.bpm) infoLine.push({ text: `BPM: ${song.bpm}`, highlighted: isHighlighted('info', `BPM: ${song.bpm}`) });
    if (song.duration) infoLine.push({ text: `时长: ${formatDuration(song.duration)}`, highlighted: isHighlighted('info', `时长: ${formatDuration(song.duration)}`) });
    
    const charterLine = [];
    if (charts.EZ?.charter?.length > 0) charterLine.push({ text: `EZ谱师: ${charts.EZ.charter.join(' & ')}`, highlighted: isHighlighted('charter', `EZ谱师: ${charts.EZ.charter.join(' & ')}`) });
    if (charts.HD?.charter?.length > 0) charterLine.push({ text: `HD谱师: ${charts.HD.charter.join(' & ')}`, highlighted: isHighlighted('charter', `HD谱师: ${charts.HD.charter.join(' & ')}`) });
    if (charts.IN?.charter?.length > 0) charterLine.push({ text: `IN谱师: ${charts.IN.charter.join(' & ')}`, highlighted: isHighlighted('charter', `IN谱师: ${charts.IN.charter.join(' & ')}`) });
    if (charts.AT?.charter?.length > 0) charterLine.push({ text: `AT谱师: ${charts.AT.charter.join(' & ')}`, highlighted: isHighlighted('charter', `AT谱师: ${charts.AT.charter.join(' & ')}`) });
    
    let html = '';
    if (diffLine.length > 0) html += `<div class="detail-row">${diffLine.map(d => `<span class="detail-tag${d.highlighted ? ' highlighted' : ''}">${escapeHtml(d.text)}</span>`).join('')}</div>`;
    if (infoLine.length > 0) html += `<div class="detail-row">${infoLine.map(d => `<span class="detail-tag${d.highlighted ? ' highlighted' : ''}">${escapeHtml(d.text)}</span>`).join('')}</div>`;
    if (charterLine.length > 0) html += `<div class="detail-row">${charterLine.map(d => `<span class="detail-tag${d.highlighted ? ' highlighted' : ''}">${escapeHtml(d.text)}</span>`).join('')}</div>`;
    
    if (DOM.songDetails) DOM.songDetails.innerHTML = html;
    
    if (DOM.answerSection) DOM.answerSection.style.display = 'block';
    if (DOM.giveupBtn) DOM.giveupBtn.style.display = 'none';
    if (DOM.nextBtn) DOM.nextBtn.style.display = 'block';
    
    updateGameStats();
    
    if (DOM.answerSection) {
        setTimeout(() => {
            DOM.answerSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 100);
    }
    
    if (gameMode === 'race' && gameProgress >= GAME_CONFIG.race.totalQuestions) {
        setTimeout(() => {
            showSettlement('完成');
        }, 1500);
        if (DOM.nextBtn) DOM.nextBtn.style.display = 'none';
    }
}

function handleWrongAnswer() {
    gameState.wrong++;
    gameCurrentCombo = 0;
    
    if (gameMode === 'race') {
        stopTimer();
        gameTime += gamePenalty;
        startTimer();
    } else if (gameMode === 'endless') {
        gameLives--;
        if (gameLives <= 0) {
            const correctAnswers = songs.filter(song => currentQuestion.validate(song));
            const defaultShow = questionConfig.display?.default_show_answers || 5;
            
            renderAnswerList('giveup-answers', correctAnswers, defaultShow, false);
            
            if (DOM.giveupBtn) {
                DOM.giveupBtn.textContent = '结算';
                DOM.giveupBtn.style.display = 'block';
                DOM.giveupBtn.onclick = () => showSettlement('生命值耗尽');
            }
            
            if (DOM.giveupSection) DOM.giveupSection.style.display = 'block';
            if (DOM.nextBtn) DOM.nextBtn.style.display = 'none';
            
            if (DOM.giveupSection) {
                setTimeout(() => {
                    DOM.giveupSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }, 100);
            }
            
            return;
        }
    }
    
    updateGameStats();
}

function renderAnswerList(containerId, answerList, defaultShow, isOtherAnswers) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    let isExpanded = false;
    
    function getAnswerDetail(song) {
        const qType = currentQuestion?.type || '';
        
        if (qType === 'compound') {
            return '';
        }
        
        if (qType === 'firstLetter') {
            return '';
        }
        
        if (qType === 'bpm') {
            return song.bpm || '-';
        }
        
        if (qType === 'duration' || qType === 'duration-at') {
            return song.duration ? formatDuration(song.duration) : '-';
        }
        
        if (qType === 'updateYear') {
            return song.update_date || '-';
        }
        
        if (qType === 'charter-in') {
            const charters = song.charts?.IN?.charter;
            return charters && charters.length > 0 ? charters.join(' & ') : '-';
        }
        
        if (qType === 'charter-at') {
            const charters = song.charts?.AT?.charter;
            return charters && charters.length > 0 ? charters.join(' & ') : '-';
        }
        
        if (qType.startsWith('difficulty') || qType === 'difficulty') {
            const diff = song.difficulty || {};
            const diffType = currentQuestion?.diffType || '';
            const diffMap = {
                'easy': { label: 'EZ', value: diff.easy },
                'hard': { label: 'HD', value: diff.hard },
                'insane': { label: 'IN', value: diff.insane },
                'another': { label: 'AT', value: diff.another }
            };
            
            for (const [key, data] of Object.entries(diffMap)) {
                if (qType.includes(key) || diffType === key) {
                    return data.value !== undefined ? `${data.label} ${data.value.toFixed(1)}` : '-';
                }
            }
            
            return '-';
        }
        
        return '-';
    }
    
    function generateSongTooltip(song) {
        const difficulty = song.difficulty || {};
        const charts = song.charts || {};
        
        const lines = [];
        
        const diffLine = [];
        if (difficulty.easy !== undefined) diffLine.push(`EZ Lv.${difficulty.easy.toFixed(1)}`);
        if (difficulty.hard !== undefined) diffLine.push(`HD Lv.${difficulty.hard.toFixed(1)}`);
        if (difficulty.insane !== undefined) diffLine.push(`IN Lv.${difficulty.insane.toFixed(1)}`);
        if (difficulty.another !== undefined) diffLine.push(`AT Lv.${difficulty.another.toFixed(1)}`);
        if (diffLine.length > 0) lines.push(diffLine.join(' / '));
        
        const infoLine = [];
        if (song.update_date) infoLine.push(`更新: ${song.update_date}`);
        if (song.version) infoLine.push(`版本: ${song.version}`);
        if (song.bpm) infoLine.push(`BPM: ${song.bpm}`);
        if (song.duration) infoLine.push(`时长: ${formatDuration(song.duration)}`);
        if (infoLine.length > 0) lines.push(infoLine.join(' / '));
        
        const charterLine = [];
        if (charts.EZ?.charter?.length > 0) charterLine.push(`EZ: ${charts.EZ.charter.join(' & ')}`);
        if (charts.HD?.charter?.length > 0) charterLine.push(`HD: ${charts.HD.charter.join(' & ')}`);
        if (charts.IN?.charter?.length > 0) charterLine.push(`IN: ${charts.IN.charter.join(' & ')}`);
        if (charts.AT?.charter?.length > 0) charterLine.push(`AT: ${charts.AT.charter.join(' & ')}`);
        if (charterLine.length > 0) lines.push(charterLine.join(' / '));
        
        return lines.join('\n');
    }
    
    function render() {
        const displayAnswers = isExpanded ? answerList : answerList.slice(0, defaultShow);
        let html;
        
        if (isOtherAnswers) {
            html = displayAnswers.map(s => `
                <div class="other-answer-item tooltip-parent" data-tooltip="${escapeHtml(generateSongTooltip(s))}">
                    <div class="answer-info-content">
                        <div class="other-answer-name">${escapeHtml(s.name)}</div>
                        <div class="other-answer-artist">${escapeHtml(s.artist)}</div>
                    </div>
                    <span class="answer-detail">${escapeHtml(getAnswerDetail(s))}</span>
                </div>
            `).join('');
        } else {
            html = displayAnswers.map(s => `
                <div class="giveup-answer tooltip-parent" data-tooltip="${escapeHtml(generateSongTooltip(s))}">
                    <div class="answer-info-content">
                        <div class="giveup-answer-name">${escapeHtml(s.name)}</div>
                        <div class="giveup-answer-artist">${escapeHtml(s.artist)}</div>
                    </div>
                    <span class="answer-detail">${escapeHtml(getAnswerDetail(s))}</span>
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
    
    if (DOM.searchInput) DOM.searchInput.style.display = 'none';
    if (DOM.clearBtn) DOM.clearBtn.style.display = 'none';
    if (DOM.resultsList) DOM.resultsList.style.display = 'none';
    if (DOM.resultsCount) DOM.resultsCount.style.display = 'none';
    if (DOM.resultsSection) DOM.resultsSection.style.display = 'none';
    
    const correctAnswers = songs.filter(song => currentQuestion.validate(song));
    const defaultShow = questionConfig.display?.default_show_answers || 5;
    
    renderAnswerList('giveup-answers', correctAnswers, defaultShow, false);
    
    if (DOM.giveupSection) DOM.giveupSection.style.display = 'block';
    if (DOM.giveupBtn) DOM.giveupBtn.style.display = 'none';
    if (DOM.nextBtn) DOM.nextBtn.style.display = 'block';
    
    if (DOM.giveupSection) {
        setTimeout(() => {
            DOM.giveupSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 100);
    }
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
    
    if (DOM.clearBtn) DOM.clearBtn.style.display = currentSearch ? 'block' : 'none';
    
    const filtered = filterSongs(currentSearch);
    renderResults(filtered);
}

function clearSearch() {
    if (DOM.searchInput) DOM.searchInput.value = '';
    if (DOM.clearBtn) DOM.clearBtn.style.display = 'none';
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
AUDIO_MANAGER.init();
