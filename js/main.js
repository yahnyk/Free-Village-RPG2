/* ============================================================
   MAIN.JS
   Phaser game configuration and bootstrap.
   ============================================================ */

var config = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: 960,
  height: 640,
  backgroundColor: '#0a1f1a',
  pixelArt: false,
  physics: {
    default: 'arcade',
    arcade: {
      gravity: {y: 0},
      debug: false
    }
  },
  scene: [BootScene, TitleScene, VillageScene, UIScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  }
};

var game = new Phaser.Game(config);
