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
    if (DOM.countdownOverlay) DOM.countdownOverlay.style.display = 'none';
}

function showCountdown(count) {
    if (DOM.countdownOverlay) DOM.countdownOverlay.style.display = 'flex';
    if (DOM.countdownNumber) {
        DOM.countdownNumber.textContent = count;
        DOM.countdownNumber.style.animation = 'none';
        DOM.countdownNumber.offsetHeight;
        DOM.countdownNumber.style.animation = 'countdown-pop 1s ease-out forwards';
    }
}

function showSettlement(status) {
    if (DOM.homeContainer) DOM.homeContainer.style.display = 'none';
    if (DOM.gameContainer) DOM.gameContainer.style.display = 'none';
    if (DOM.settlementContainer) DOM.settlementContainer.style.display = 'block';
    
    if (DOM.settlementStatus) DOM.settlementStatus.textContent = status;
    
    const modeNames = { race: '竞速模式', endless: '无尽模式', practice: '练习模式' };
    const diffNames = { ez: 'EZ', hd: 'HD', in: 'IN', at: 'AT' };
    if (DOM.settlementMode) DOM.settlementMode.textContent = `${modeNames[gameMode] || gameMode} ${diffNames[gameDifficulty] || gameDifficulty}`;
    
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