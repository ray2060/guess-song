function initApp() {
    initDOM();
    
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
}

document.addEventListener('DOMContentLoaded', initApp);