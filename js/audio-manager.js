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