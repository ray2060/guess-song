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