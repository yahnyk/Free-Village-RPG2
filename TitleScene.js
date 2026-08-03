/* ============================================================
   TITLESCENE.JS
   Title screen with region selection and save detection.
   ============================================================ */

class TitleScene extends Phaser.Scene {
  constructor(){ super({key:'TitleScene'}); }

  create(){
    var w = this.cameras.main.width;
    var h = this.cameras.main.height;
    var self = this;

    // Background
    this.add.rectangle(w/2, h/2, w, h, 0x0a1f1a);

    // Title
    this.add.text(w/2, 80, 'Free Village', {
      fontSize:'48px', fontFamily:'Georgia', color:'#E9A63B', fontStyle:'bold'
    }).setOrigin(0.5);

    this.add.text(w/2, 140, 'A Historical RPG  ·  1838–1900', {
      fontSize:'16px', fontFamily:'Georgia', color:'#aaa'
    }).setOrigin(0.5);

    this.add.text(w/2, 180, 'Post-emancipation Jamaica. Lead your village through sixty-two years.', {
      fontSize:'13px', fontFamily:'Georgia', color:'#888'
    }).setOrigin(0.5);

    // Continue button (if save exists)
    if(GameState.hasSave()){
      var continueBtn = this.add.text(w/2, 240, '▶ Continue Your Village', {
        fontSize:'18px', fontFamily:'Georgia', color:'#4F8F4C', backgroundColor:'#1a331a'
      }).setOrigin(0.5).setPadding(12,8).setInteractive({useHandCursor:true});

      continueBtn.on('pointerover', function(){ continueBtn.setStyle({color:'#fff'}); });
      continueBtn.on('pointerout', function(){ continueBtn.setStyle({color:'#4F8F4C'}); });
      continueBtn.on('pointerdown', function(){
        self.scene.start('VillageScene', {continued:true});
      });
    }

    // New Game section
    this.add.text(w/2, 300, '—  Start a New Village  —', {
      fontSize:'14px', fontFamily:'Georgia', color:'#666'
    }).setOrigin(0.5);

    // Region cards
    var regions = Object.keys(REGIONS);
    var cardW = 180;
    var startX = w/2 - (regions.length * cardW)/2 + cardW/2;

    this.selectedRegion = null;
    this.regionButtons = [];

    regions.forEach(function(key, i){
      var r = REGIONS[key];
      var x = startX + i * (cardW + 20);
      var y = 380;

      var bg = self.add.rectangle(x, y, cardW, 140, 0x1a2a1a).setStrokeStyle(1, 0x444);
      var title = self.add.text(x, y-50, r.name, {fontSize:'14px', fontFamily:'Georgia', color:'#E9A63B', fontStyle:'bold'}).setOrigin(0.5);
      var tag = self.add.text(x, y-30, r.tag, {fontSize:'10px', fontFamily:'Georgia', color:'#888'}).setOrigin(0.5);
      var desc = self.add.text(x, y+10, r.desc, {fontSize:'10px', fontFamily:'Georgia', color:'#aaa', wordWrap:{width:cardW-20}}).setOrigin(0.5);
      var stats = self.add.text(x, y+55, 'Farm×'+r.farmMod+'  Water×'+r.waterMod+'  Storm×'+r.hurricaneMod, {
        fontSize:'9px', fontFamily:'monospace', color:'#666'
      }).setOrigin(0.5);

      var hit = self.add.rectangle(x, y, cardW, 140, 0x000000, 0).setInteractive({useHandCursor:true});

      hit.on('pointerover', function(){
        if(self.selectedRegion !== key) bg.setStrokeStyle(2, 0x888);
      });
      hit.on('pointerout', function(){
        if(self.selectedRegion !== key) bg.setStrokeStyle(1, 0x444);
      });
      hit.on('pointerdown', function(){
        self.selectRegion(key, bg);
      });

      self.regionButtons.push({key:key, bg:bg});
    });

    // Village name input (simulated with text)
    this.add.text(w/2, 490, 'Name your village:', {fontSize:'13px', fontFamily:'Georgia', color:'#aaa'}).setOrigin(0.5);

    this.nameText = this.add.text(w/2, 520, 'Free Village', {
      fontSize:'16px', fontFamily:'Georgia', color:'#fff', backgroundColor:'#222'
    }).setOrigin(0.5).setPadding(8,4);

    // Instructions for name
    this.add.text(w/2, 555, 'Click a region above, then click here to start', {
      fontSize:'11px', fontFamily:'Georgia', color:'#666'
    }).setOrigin(0.5);

    // Start button
    this.startBtn = this.add.text(w/2, 590, 'Found the Village', {
      fontSize:'16px', fontFamily:'Georgia', color:'#444', backgroundColor:'#222'
    }).setOrigin(0.5).setPadding(10,6);

    this.nameText.setInteractive({useHandCursor:true});
    this.nameText.on('pointerdown', function(){
      if(!self.selectedRegion){
        self.showToast('Select a region first!');
        return;
      }
      var name = prompt('Name your village:', 'Free Village');
      if(name && name.trim()){
        self.nameText.setText(name.trim());
        self.startGame(name.trim());
      }
    });
  }

  selectRegion(key, bg){
    this.selectedRegion = key;
    this.regionButtons.forEach(function(b){
      b.bg.setStrokeStyle(1, b.key === key ? 0xE9A63B : 0x444);
      if(b.key === key) b.bg.setFillStyle(0x2a3a2a);
      else b.bg.setFillStyle(0x1a2a1a);
    });
    this.startBtn.setStyle({color:'#4F8F4C', backgroundColor:'#1a331a'});
  }

  startGame(name){
    GameState.clearSave();
    GameState.init(this.selectedRegion, name);
    this.scene.start('VillageScene', {continued:false});
  }

  showToast(msg){
    var toast = this.add.text(this.cameras.main.width/2, 620, msg, {
      fontSize:'12px', fontFamily:'Georgia', color:'#C23B4B', backgroundColor:'#331111'
    }).setOrigin(0.5).setPadding(6,4);

    this.tweens.add({
      targets: toast, alpha: 0, delay: 1500, duration: 500,
      onComplete: function(){ toast.destroy(); }
    });
  }
}
