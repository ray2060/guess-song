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

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}