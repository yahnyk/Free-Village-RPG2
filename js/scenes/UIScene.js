/* ============================================================
   UISCENE.JS
   Persistent UI overlay: resource bars, dialogue, notifications,
   and choice menus. Runs on top of VillageScene.
   ============================================================ */

class UIScene extends Phaser.Scene {
  constructor(){ super({key:'UIScene', active:false}); }

  create(){
    this.width = this.cameras.main.width;
    this.height = this.cameras.main.height;

    // --- RESOURCE BAR (top) ---
    const barY = 10;
    const barH = 28;
    this.add.rectangle(this.width/2, barY+barH/2, this.width-20, barH, 0x1a1a1a).setAlpha(0.9).setScrollFactor(0);

    this.yearText = this.add.text(15, barY+4, '1838', {fontSize:'14px', fontFamily:'Georgia', color:'#E9A63B'}).setScrollFactor(0);
    this.dayText = this.add.text(60, barY+4, 'Day 1', {fontSize:'12px', fontFamily:'Georgia', color:'#aaa'}).setScrollFactor(0);

    this.popText = this.add.text(120, barY+4, 'Pop: 60', {fontSize:'12px', fontFamily:'Georgia', color:'#fff'}).setScrollFactor(0);
    this.foodText = this.add.text(190, barY+4, 'Food: 120', {fontSize:'12px', fontFamily:'Georgia', color:'#4F8F4C'}).setScrollFactor(0);
    this.waterText = this.add.text(270, barY+4, 'Water: 100', {fontSize:'12px', fontFamily:'Georgia', color:'#2B7A93'}).setScrollFactor(0);
    this.coinText = this.add.text(360, barY+4, '£20', {fontSize:'12px', fontFamily:'Georgia', color:'#E9A63B'}).setScrollFactor(0);
    this.healthText = this.add.text(420, barY+4, 'Health: 70', {fontSize:'12px', fontFamily:'Georgia', color:'#C23B4B'}).setScrollFactor(0);
    this.moraleText = this.add.text(510, barY+4, 'Morale: 62', {fontSize:'12px', fontFamily:'Georgia', color:'#8A6A3E'}).setScrollFactor(0);

    // Weather icon
    this.weatherText = this.add.text(this.width-80, barY+4, '☀ Clear', {fontSize:'12px', fontFamily:'Georgia', color:'#87CEEB'}).setScrollFactor(0);

    // --- DIALOGUE BOX ---
    this.dlgContainer = this.add.container(this.width/2, this.height-80);
    this.dlgContainer.setScrollFactor(0);
    this.dlgContainer.setDepth(1000);
    this.dlgContainer.setVisible(false);

    this.dlgBg = this.add.image(0, 0, 'dlg_bg').setScrollFactor(0);
    this.dlgName = this.add.text(-280, -45, '', {fontSize:'14px', fontFamily:'Georgia', color:'#E9A63B', fontStyle:'bold'}).setScrollFactor(0);
    this.dlgText = this.add.text(-280, -25, '', {fontSize:'13px', fontFamily:'Georgia', color:'#eee', wordWrap:{width:560}}).setScrollFactor(0);
    this.dlgHint = this.add.text(200, 40, '[SPACE] Continue', {fontSize:'11px', fontFamily:'Georgia', color:'#888'}).setScrollFactor(0);

    this.dlgContainer.add([this.dlgBg, this.dlgName, this.dlgText, this.dlgHint]);

    // --- CHOICE MENU ---
    this.choiceContainer = this.add.container(this.width/2, this.height/2);
    this.choiceContainer.setScrollFactor(0);
    this.choiceContainer.setDepth(1001);
    this.choiceContainer.setVisible(false);
    this.choiceButtons = [];

    // --- NOTIFICATIONS ---
    this.notifContainer = this.add.container(this.width-150, 60);
    this.notifContainer.setScrollFactor(0);
    this.notifContainer.setDepth(999);
    this.notifications = [];

    // --- CONTROLS ---
    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.dlgCallback = null;
    this.inDialogue = false;
    this.inChoice = false;
  }

  update(){
    // Update resource display
    this.yearText.setText(''+GameState.year);
    this.dayText.setText('Day '+GameState.day);
    this.popText.setText('Pop: '+GameState.population);
    this.foodText.setText('Food: '+Math.round(GameState.food));
    this.waterText.setText('Water: '+Math.round(GameState.water));
    this.coinText.setText('£'+Math.round(GameState.treasury));
    this.healthText.setText('Health: '+Math.round(GameState.health));
    this.moraleText.setText('Morale: '+Math.round(GameState.morale));

    const w = WEATHER_TYPES[GameState.weather];
    const wIcon = GameState.weather==='clear'?'☀':GameState.weather==='rain'?'🌧':GameState.weather==='drought'?'☀':'🌪';
    this.weatherText.setText(wIcon+' '+w.name);

    // Space to advance dialogue
    if(this.inDialogue && Phaser.Input.Keyboard.JustDown(this.spaceKey)){
      this.closeDialogue();
    }
  }

  showDialogue(name, text, onComplete){
    this.inDialogue = true;
    this.dlgContainer.setVisible(true);
    this.dlgName.setText(name);
    this.dlgText.setText(text);
    this.dlgCallback = onComplete || null;
    this.dlgHint.setVisible(true);
  }

  closeDialogue(){
    this.dlgContainer.setVisible(false);
    this.inDialogue = false;
    if(this.dlgCallback){
      const cb = this.dlgCallback;
      this.dlgCallback = null;
      cb();
    }
  }

  showChoice(prompt, choices){
    this.inChoice = true;
    this.choiceContainer.setVisible(true);
    this.choiceContainer.removeAll(true);
    this.choiceButtons = [];

    // Prompt text
    const promptText = this.add.text(0, -30 - choices.length*25, prompt, {
      fontSize:'14px', fontFamily:'Georgia', color:'#fff', fontStyle:'bold'
    }).setOrigin(0.5).setScrollFactor(0);
    this.choiceContainer.add(promptText);

    // Background
    const bgH = 40 + choices.length * 35;
    const bg = this.add.rectangle(0, 0, 400, bgH, 0x1a1a1a).setStrokeStyle(2, 0xD4AF37).setScrollFactor(0);
    this.choiceContainer.add(bg);
    this.choiceContainer.sendToBack(bg);

    choices.forEach((choice, i) => {
      const y = -bgH/2 + 35 + i*35;
      const btn = this.add.text(0, y, choice.label, {
        fontSize:'13px', fontFamily:'Georgia', color:'#E9A63B', backgroundColor:'#333'
      }).setOrigin(0.5).setPadding(8,4).setScrollFactor(0).setInteractive({useHandCursor:true});

      btn.on('pointerover', ()=> btn.setStyle({color:'#fff', backgroundColor:'#555'}));
      btn.on('pointerout', ()=> btn.setStyle({color:'#E9A63B', backgroundColor:'#333'}));
      btn.on('pointerdown', ()=>{
        this.hideChoice();
        if(choice.action) choice.action();
      });

      this.choiceButtons.push(btn);
      this.choiceContainer.add(btn);
    });
  }

  hideChoice(){
    this.choiceContainer.setVisible(false);
    this.inChoice = false;
  }

  showNotification(text){
    const notif = this.add.text(0, this.notifications.length * 45, text, {
      fontSize:'12px', fontFamily:'Georgia', color:'#fff', backgroundColor:'#000000CC'
    }).setPadding(6,4).setScrollFactor(0);

    this.notifContainer.add(notif);
    this.notifications.push(notif);

    // Fade out after 3 seconds
    this.tweens.add({
      targets: notif,
      alpha: 0,
      delay: 2500,
      duration: 500,
      onComplete: ()=>{
        notif.destroy();
        this.notifications = this.notifications.filter(n => n !== notif);
        // Reposition remaining
        this.notifications.forEach((n,i)=>{ n.y = i*45; });
      }
    });
  }
}
