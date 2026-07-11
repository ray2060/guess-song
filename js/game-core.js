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
    
    if (DOM.gameContainer) DOM.gameContainer.style.display = 'none';
    
    let countdown = 3;
    showCountdown(countdown);
    
    const countdownInterval = setInterval(() => {
        countdown--;
        if (countdown > 0) {
            showCountdown(countdown);
        } else {
            clearInterval(countdownInterval);
            if (DOM.countdownOverlay) DOM.countdownOverlay.style.display = 'none';
            if (DOM.gameContainer) DOM.gameContainer.style.display = 'block';
            AUDIO_MANAGER.playBgm('BG_Loop', 'bgLoop');
            startNewRound();
        }
    }, 1000);
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
            return generateDifficultyQuestion('insane', 'int', [10, 11, 12, 13, 14, 15, 16]);
        
        case 'difficulty-insane-decimal-low':
            return generateDifficultyQuestion('insane', 'decimal', [16.0, 16.6]);
        
        case 'difficulty-insane-decimal':
            return generateDifficultyQuestion('insane', 'decimal', [15.0, 16.6]);
        
        case 'difficulty-insane-decimal-wide':
            return generateDifficultyQuestion('insane', 'decimal', [7.0, 16.6]);
        
        case 'difficulty-another-int':
            return generateDifficultyQuestion('another', 'int', [14, 15, 16, 17]);
        
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
