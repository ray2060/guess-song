const DOM = {};

function initDOM() {
    DOM.homeContainer = document.getElementById('home-container');
    DOM.gameContainer = document.getElementById('game-container');
    DOM.settlementContainer = document.getElementById('settlement-container');
    
    DOM.questionName = document.getElementById('question-name');
    DOM.questionDesc = document.getElementById('question-desc');
    DOM.searchInput = document.getElementById('search-input');
    DOM.clearBtn = document.getElementById('clear-btn');
    DOM.resultsList = document.getElementById('results-list');
    DOM.resultsCount = document.getElementById('results-count');
    DOM.resultsSection = document.getElementById('results-section');
    
    DOM.answerSection = document.getElementById('answer-section');
    DOM.answerName = document.getElementById('answer-name');
    DOM.answerArtist = document.getElementById('answer-artist');
    DOM.illustration = document.getElementById('illustration');
    DOM.otherAnswers = document.getElementById('other-answers');
    DOM.otherAnswersList = document.getElementById('other-answers-list');
    DOM.songDetails = document.getElementById('song-details');
    
    DOM.giveupSection = document.getElementById('giveup-section');
    DOM.giveupAnswers = document.getElementById('giveup-answers');
    
    DOM.giveupBtn = document.getElementById('giveup-btn');
    DOM.nextBtn = document.getElementById('next-btn');
    DOM.backBtn = document.getElementById('back-btn');
    DOM.restartBtn = document.getElementById('restart-btn');
    DOM.homeBtn = document.getElementById('home-btn');
    
    DOM.statTime = document.getElementById('stat-time');
    DOM.statLives = document.getElementById('stat-lives');
    DOM.statProgress = document.getElementById('stat-progress');
    DOM.statCombo = document.getElementById('stat-combo');
    DOM.statScore = document.getElementById('stat-score');
    
    DOM.settlementStatus = document.getElementById('settlement-status');
    DOM.settlementMode = document.getElementById('settlement-mode');
    DOM.settlementCorrect = document.getElementById('settlement-correct');
    DOM.settlementWrong = document.getElementById('settlement-wrong');
    DOM.settlementMaxcombo = document.getElementById('settlement-maxcombo');
    DOM.settlementTime = document.getElementById('settlement-time');
    DOM.settlementTimeBox = document.getElementById('settlement-time-box');
    DOM.settlementRating = document.getElementById('settlement-rating');
    DOM.ratingImage = document.getElementById('rating-image');
    DOM.ratingScore = document.getElementById('rating-score');
    
    DOM.countdownOverlay = document.getElementById('countdown-overlay');
    DOM.countdownNumber = document.getElementById('countdown-number');
}
