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
        
        const baseScore = GAME_CONFIG.race.baseScore;
        const questionTime = (Date.now() - questionStartTime) / 1000;
        const timePenalty = Math.floor(Math.max(0, questionTime) * GAME_CONFIG.race.timePenaltyPerSec);
        gameAnswerScore = Math.floor(gameAnswerScore + baseScore - timePenalty);
        gameScore = Math.floor(gameAnswerScore + gameMaxCombo * GAME_CONFIG.race.comboMultiplier);
    } else if (gameMode === 'endless') {
        const baseScore = GAME_CONFIG.endless.baseScore;
        const questionTime = (Date.now() - questionStartTime) / 1000;
        const timePenalty = Math.min(Math.floor(questionTime * GAME_CONFIG.endless.timePenaltyPerSec), GAME_CONFIG.endless.maxTimePenalty);
        gameAnswerScore = Math.floor(gameAnswerScore + baseScore - timePenalty);
        gameScore = Math.floor(gameAnswerScore + gameMaxCombo * GAME_CONFIG.endless.comboMultiplier);
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
    
    const exactMatches = songs.filter(song => {
        const nameExact = song.name.toLowerCase() === lowerQuery;
        const aliasExact = song.aliases.some(alias => 
            alias.toLowerCase() === lowerQuery
        );
        return nameExact || aliasExact;
    });
    
    if (exactMatches.length > 0) {
        return exactMatches;
    }
    
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