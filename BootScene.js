/* ============================================================
   BOOTSCENE.JS
   Generates all game textures programmatically. No external
   assets required — works on GitHub Pages out of the box.
   ============================================================ */

class BootScene extends Phaser.Scene {
  constructor(){ super({key:'BootScene'}); }

  create(){
    var g = this.make.graphics({x:0, y:0, add:false});

    // --- TILES ---
    g.fillStyle(0x4A7C59);
    g.fillRect(0,0,32,32);
    g.fillStyle(0x528C64);
    g.fillRect(2,2,4,4); g.fillRect(20,18,3,3); g.fillRect(12,24,4,3);
    g.generateTexture('grass',32,32);
    g.clear();

    g.fillStyle(0xC4A77D);
    g.fillRect(0,0,32,32);
    g.generateTexture('dirt',32,32);
    g.clear();

    g.fillStyle(0x2B7A93);
    g.fillRect(0,0,32,32);
    g.fillStyle(0x3A8FA8);
    g.fillRect(4,4,8,6); g.fillRect(18,16,10,8);
    g.generateTexture('water',32,32);
    g.clear();

    g.fillStyle(0x5C4033);
    g.fillRect(0,0,32,32);
    g.fillStyle(0x6B4E3D);
    g.fillRect(2,2,28,2); g.fillRect(2,10,28,2); g.fillRect(2,18,28,2); g.fillRect(2,26,28,2);
    g.generateTexture('tilled',32,32);
    g.clear();

    // --- PLAYER ---
    g.fillStyle(0x8B4513);
    g.fillRect(8,12,16,14);
    g.fillStyle(0xD4A574);
    g.fillCircle(16,10,6);
    g.fillStyle(0x228B22);
    g.fillRect(8,14,16,8);
    g.generateTexture('player',32,32);
    g.clear();

    // --- NPCs ---
    var npcColors = [0xFF6B9D,0x808080,0x4169E1,0x228B22,0x8B4513,0x9932CC,0x2F4F4F,0xFFB6C1,0x556B2F];
    npcColors.forEach(function(col, i){
      g.fillStyle(0x8B4513);
      g.fillRect(8,12,16,14);
      g.fillStyle(0xD4A574);
      g.fillCircle(16,10,6);
      g.fillStyle(col);
      g.fillRect(8,14,16,8);
      g.generateTexture('npc'+i,32,32);
      g.clear();
    });

    // --- BUILDINGS ---
    // Hall
    g.fillStyle(0x8B4513);
    g.fillRect(0,0,128,96);
    g.fillStyle(0x5C3317);
    g.fillRect(48,64,32,32);
    g.fillStyle(0xD4AF37);
    g.fillRect(8,8,20,20); g.fillRect(100,8,20,20);
    g.generateTexture('bld_hall',128,96);
    g.clear();

    // Church
    g.fillStyle(0xD4AF37);
    g.fillRect(0,24,128,72);
    g.fillStyle(0x8B4513);
    g.fillTriangle(64,0,0,24,128,24);
    g.fillStyle(0x2F1810);
    g.fillRect(52,64,24,32);
    g.generateTexture('bld_church',128,96);
    g.clear();

    // School
    g.fillStyle(0xCD853F);
    g.fillRect(0,0,128,96);
    g.fillStyle(0x8B4513);
    g.fillRect(48,64,32,32);
    g.fillStyle(0x87CEEB);
    g.fillRect(8,8,20,20); g.fillRect(100,8,20,20);
    g.generateTexture('bld_school',128,96);
    g.clear();

    // Market
    g.fillStyle(0xE9A63B);
    g.fillRect(0,0,160,128);
    g.fillStyle(0x8B4513);
    g.fillRect(20,20,40,40); g.fillRect(100,20,40,40); g.fillRect(60,80,40,30);
    g.generateTexture('bld_market',160,128);
    g.clear();

    // Healer
    g.fillStyle(0xC23B4B);
    g.fillRect(0,0,96,96);
    g.fillStyle(0x8B4513);
    g.fillRect(32,64,32,32);
    g.generateTexture('bld_healer',96,96);
    g.clear();

    // House
    g.fillStyle(0xA0522D);
    g.fillRect(0,0,64,64);
    g.fillStyle(0x8B4513);
    g.fillRect(20,32,24,32);
    g.generateTexture('house',64,64);
    g.clear();

    // --- CROP STAGES ---
    g.fillStyle(0x5C4033);
    g.fillRect(0,0,32,32);
    g.fillStyle(0x8B7355);
    g.fillRect(14,20,4,8);
    g.generateTexture('crop0',32,32);
    g.clear();

    g.fillStyle(0x5C4033);
    g.fillRect(0,0,32,32);
    g.fillStyle(0x7CFC00);
    g.fillRect(14,18,4,10);
    g.fillEllipse(16,16,8,6);
    g.generateTexture('crop1',32,32);
    g.clear();

    g.fillStyle(0x5C4033);
    g.fillRect(0,0,32,32);
    g.fillStyle(0x32CD32);
    g.fillRect(12,10,8,18);
    g.fillEllipse(16,10,14,10);
    g.generateTexture('crop2',32,32);
    g.clear();

    g.fillStyle(0x5C4033);
    g.fillRect(0,0,32,32);
    g.fillStyle(0x228B22);
    g.fillRect(10,6,12,22);
    g.fillEllipse(16,8,18,14);
    g.fillStyle(0xFFD700);
    g.fillCircle(12,10,3); g.fillCircle(20,10,3); g.fillCircle(16,14,3);
    g.generateTexture('crop3',32,32);
    g.clear();

    // --- TREE ---
    g.fillStyle(0x8B4513);
    g.fillRect(12,20,8,12);
    g.fillStyle(0x228B22);
    g.fillCircle(16,14,14);
    g.generateTexture('tree',32,32);
    g.clear();

    // --- PARTICLES ---
    g.fillStyle(0x87CEEB);
    g.fillRect(0,0,2,8);
    g.generateTexture('rain',2,8);
    g.clear();

    g.fillStyle(0x888888);
    g.fillRect(0,0,6,2);
    g.generateTexture('wind',6,2);
    g.clear();

    // --- UI ---
    g.fillStyle(0x1a1a1a);
    g.fillRect(0,0,600,120);
    g.lineStyle(2,0xD4AF37);
    g.strokeRect(0,0,600,120);
    g.generateTexture('dlg_bg',600,120);
    g.clear();

    g.fillStyle(0x1a1a1a);
    g.fillRect(0,0,280,40);
    g.lineStyle(1,0x4A7C59);
    g.strokeRect(0,0,280,40);
    g.generateTexture('notify_bg',280,40);
    g.clear();

    g.fillStyle(0x000033);
    g.fillRect(0,0,32,32);
    g.generateTexture('night',32,32);
    g.clear();

    g.fillStyle(0xFFAA00);
    g.fillRect(0,0,32,32);
    g.generateTexture('heat',32,32);
    g.clear();

    console.log('All textures generated');
    this.scene.start('TitleScene');
  }
}
