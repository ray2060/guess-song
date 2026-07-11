const GAME_CONFIG = {
    race: {
        totalQuestions: 10,
        penalties: { ez: 3, hd: 5, in: 20, at: 60 },
        baseScore: 85000,
        timePenaltyPerSec: 500,
        comboMultiplier: 20000
    },
    endless: {
        lives: { ez: 8, hd: 4, in: 2, at: 1 },
        baseScore: 40000,
        timePenaltyPerSec: 1000,
        maxTimePenalty: 25000,
        comboMultiplier: 8000
    }
};

const RATING_THRESHOLDS = {
    F: 0,
    C: 700000,
    B: 820000,
    A: 880000,
    S: 920000,
    V: 960000,
    Phi: 1000000
};
