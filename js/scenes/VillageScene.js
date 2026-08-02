/* ============================================================
   VILLAGESCENE.JS
   The main RPG scene: walking, farming, talking, weather,
   day/night, and year-end resolution.
   ============================================================ */

class VillageScene extends Phaser.Scene {
  constructor(){ super({key:'VillageScene'}); }

  init(data){
    this.continued = data.continued || false;
  }

  create(){
    // Init or load state
    if(this.continued){
      GameState.load();
    } else {
      GameState.init('river','Free Village');
    }

    this.mapWidth = MAP_WIDTH * TILE_SIZE;
    this.mapHeight = MAP_HEIGHT * TILE_SIZE;

    // --- WORLD BOUNDS ---
    this.physics.world.setBounds(0, 0, this.mapWidth, this.mapHeight);

    // --- GROUND LAYER ---
    this.ground = this.add.group();
    this.buildings = this.add.group();
    this.trees = this.add.group();
    this.farmSprites = {};

    this.generateMap();

    // --- PLAYER ---
    this.player = this.physics.add.sprite(GameState.playerX, GameState.playerY, 'player');
    this.player.setCollideWorldBounds(true);
    this.player.setDepth(10);
    this.player.body.setSize(20, 20);

    // --- NPCs ---
    this.npcSprites = {};
    GameState.villagers.forEach((v, i) => {
      if(!v.alive) return;
      const sprite = this.physics.add.sprite(v.x, v.y, 'npc' + (i % 9));
      sprite.setCollideWorldBounds(true);
      sprite.setDepth(9);
      sprite.body.setSize(20, 20);
      sprite.setData('villager', v);
      this.npcSprites[v.id] = sprite;

      // If sick, tint red
      if(v.sick) sprite.setTint(0xFF6666);
    });

    // --- CAMERA ---
    this.cameras.main.setBounds(0, 0, this.mapWidth, this.mapHeight);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setZoom(1.2);

    // --- CONTROLS ---
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D
    });
    this.eKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    // --- COLLISIONS ---
    this.physics.add.collider(this.player, this.buildings);
    this.physics.add.collider(this.player, this.trees);
    Object.values(this.npcSprites).forEach(spr => {
      this.physics.add.collider(this.player, spr);
      this.physics.add.collider(spr, this.buildings);
      this.physics.add.collider(spr, this.trees);
    });

    // --- WEATHER ---
    this.weatherParticles = this.add.particles(0, 0, 'rain', {
      x: {min: 0, max: this.mapWidth},
      y: -10,
      lifespan: 1200,
      speedY: {min: 300, max: 500},
      scale: {min: 0.5, max: 1},
      quantity: 0,
      blendMode: 'ADD'
    });
    this.weatherParticles.setDepth(100);

    this.windParticles = this.add.particles(0, 0, 'wind', {
      x: -10,
      y: {min: 0, max: this.mapHeight},
      lifespan: 800,
      speedX: {min: 400, max: 700},
      speedY: {min: -50, max: 50},
      scale: {min: 0.5, max: 1},
      quantity: 0,
      blendMode: 'NORMAL'
    });
    this.windParticles.setDepth(100);

    // --- OVERLAYS ---
    this.nightOverlay = this.add.tileSprite(0, 0, this.mapWidth, this.mapHeight, 'night');
    this.nightOverlay.setAlpha(0);
    this.nightOverlay.setDepth(50);
    this.nightOverlay.setScrollFactor(1);

    this.heatOverlay = this.add.tileSprite(0, 0, this.mapWidth, this.mapHeight, 'heat');
    this.heatOverlay.setAlpha(0);
    this.heatOverlay.setDepth(51);
    this.heatOverlay.setScrollFactor(1);
    this.heatOverlay.setBlendMode(Phaser.BlendModes.MULTIPLY);

    // --- UI SCENE ---
    this.scene.launch('UIScene');
    this.uiScene = this.scene.get('UIScene');

    // --- NOTIFICATIONS ---
    this.notifications = [];

    // --- INTERACTION PROMPT ---
    this.promptText = this.add.text(0, 0, '[E] Interact', {
      fontSize:'12px', fontFamily:'Georgia', color:'#FFD700', backgroundColor:'#00000088'
    }).setOrigin(0.5).setDepth(200).setVisible(false);

    // --- YEAR END OVERLAY ---
    this.yearEndActive = false;

    // Welcome notification
    if(!this.continued){
      this.notify('Welcome to '+GameState.village+' — Year 1838');
    } else {
      this.notify('Continued — Year '+GameState.year);
    }

    // Scripted event check
    if(GameState.scriptedEvent){
      setTimeout(() => this.showEvent(GameState.scriptedEvent), 1000);
    }
  }

  generateMap(){
    // Simple procedural village layout
    const map = [];
    for(let y=0; y<MAP_HEIGHT; y++){
      map[y] = [];
      for(let x=0; x<MAP_WIDTH; x++){
        let tile = 'grass';
        // River at bottom
        if(y >= 35) tile = 'water';
        // Path network
        else if((x>=20 && x<=28 && y>=15 && y<=25) || // central square
                (x>=8 && x<=14 && y>=6 && y<=12) || // church area
                (x>=34 && x<=40 && y>=6 && y<=12) || // school area
                (x>=40 && x<=48 && y>=18 && y<=25) || // market area
                (x>=2 && x<=10 && y>=20 && y<=28) || // farm area
                (y===18 && x>=2 && x<=48) || // main road
                (x===24 && y>=8 && y<=35)) { // north-south road
          tile = 'dirt';
        }
        // Farm plots
        else if(x>=2 && x<=9 && y>=22 && y<=26){
          tile = 'tilled';
        }
        map[y][x] = tile;

        const spr = this.add.sprite(x*TILE_SIZE+16, y*TILE_SIZE+16, tile);
        spr.setDepth(0);
        this.ground.add(spr);
      }
    }

    // Buildings (as physics sprites for collision)
    Object.entries(BUILDINGS).forEach(([key,b]) => {
      const spr = this.physics.add.sprite(
        b.x*TILE_SIZE + b.w*TILE_SIZE/2,
        b.y*TILE_SIZE + b.h*TILE_SIZE/2,
        'bld_'+key
      );
      spr.body.setImmovable(true);
      spr.body.setSize(b.w*TILE_SIZE-8, b.h*TILE_SIZE-8);
      spr.setDepth(5);
      spr.setData('building', b);
      this.buildings.add(spr);
    });

    // Houses scattered around
    const housePositions = [
      [18,14],[22,14],[26,14],[20,12],[24,12],
      [14,30],[16,32],[30,30],[32,32],[38,30]
    ];
    housePositions.forEach(([hx,hy]) => {
      const spr = this.physics.add.sprite(hx*TILE_SIZE+32, hy*TILE_SIZE+32, 'house');
      spr.body.setImmovable(true);
      spr.body.setSize(56, 56);
      spr.setDepth(5);
      this.buildings.add(spr);
    });

    // Trees
    for(let i=0; i<40; i++){
      const tx = Phaser.Math.Between(0, MAP_WIDTH-1);
      const ty = Phaser.Math.Between(0, MAP_HEIGHT-1);
      if(map[ty][tx] === 'grass'){
        const spr = this.physics.add.sprite(tx*TILE_SIZE+16, ty*TILE_SIZE+16, 'tree');
        spr.body.setImmovable(true);
        spr.body.setSize(20, 20);
        spr.setDepth(4);
        this.trees.add(spr);
      }
    }

    // Farm plot sprites
    GameState.farmPlots.forEach((plot, idx) => {
      if(plot.crop){
        const stage = Math.min(3, Math.floor(plot.growth * 4));
        const spr = this.add.sprite(plot.x*TILE_SIZE+16, plot.y*TILE_SIZE+16, 'crop'+stage);
        spr.setDepth(3);
        this.farmSprites[idx] = spr;
      }
    });
  }

  update(time, delta){
    if(this.yearEndActive) return;

    // --- TIME PASSAGE ---
    GameState.dayTime += delta / 20000; // 20 seconds = full day
    if(GameState.dayTime >= 1){
      GameState.dayTime = 0;
      GameState.day++;
      this.onNewDay();
    }

    // --- DAY/NIGHT ---
    let nightAlpha = 0;
    if(GameState.dayTime < 0.2) nightAlpha = 1 - GameState.dayTime/0.2;
    else if(GameState.dayTime > 0.8) nightAlpha = (GameState.dayTime-0.8)/0.2;
    this.nightOverlay.setAlpha(nightAlpha * 0.6);

    // --- WEATHER UPDATE ---
    this.updateWeather(delta);

    // --- PLAYER MOVEMENT ---
    const speed = 120;
    this.player.body.setVelocity(0);

    if(this.cursors.left.isDown || this.wasd.left.isDown) this.player.body.setVelocityX(-speed);
    else if(this.cursors.right.isDown || this.wasd.right.isDown) this.player.body.setVelocityX(speed);

    if(this.cursors.up.isDown || this.wasd.up.isDown) this.player.body.setVelocityY(-speed);
    else if(this.cursors.down.isDown || this.wasd.down.isDown) this.player.body.setVelocityY(speed);

    // Save player pos
    GameState.playerX = this.player.x;
    GameState.playerY = this.player.y;

    // --- NPC AI ---
    this.updateNPCs(delta);

    // --- INTERACTION CHECK ---
    this.checkInteraction();

    // --- E KEY ---
    if(Phaser.Input.Keyboard.JustDown(this.eKey)){
      this.tryInteract();
    }
  }

  onNewDay(){
    // Crop growth
    GameState.farmPlots.forEach((plot, idx) => {
      if(plot.crop){
        const crop = CROPS[plot.crop];
        const weatherMod = WEATHER_TYPES[GameState.weather].cropMod;
        plot.growth += (1 / crop.growDays) * weatherMod;

        // Update sprite
        if(this.farmSprites[idx]){
          const stage = Math.min(3, Math.floor(plot.growth * 4));
          this.farmSprites[idx].setTexture('crop'+stage);
        }
      }
    });

    // Weather change
    GameState.weatherTimer++;
    if(GameState.weatherTimer > 3 + Math.random()*5){
      this.rollWeather();
      GameState.weatherTimer = 0;
    }

    // Disease spread among NPCs
    this.updateDisease();

    // Auto-save every few days
    if(GameState.day % 5 === 0){
      GameState.save();
    }
  }

  rollWeather(){
    const region = REGIONS[GameState.region];
    const roll = Math.random();
    let newWeather = 'clear';

    if(roll < 0.15 * region.hurricaneMod){
      newWeather = 'hurricane';
      GameState.stormThisYear = true;
      this.notify('HURRICANE! Seek shelter!');
    } else if(roll < 0.35){
      newWeather = 'rain';
    } else if(roll < 0.45 && region.rainfall !== 'high'){
      newWeather = 'drought';
      this.notify('Drought settles over the land...');
    }

    GameState.weather = newWeather;
    this.applyWeatherVisuals();
  }

  applyWeatherVisuals(){
    const w = WEATHER_TYPES[GameState.weather];

    // Reset
    this.weatherParticles.stop();
    this.windParticles.stop();
    this.heatOverlay.setAlpha(0);

    if(w.particle === 'rain'){
      this.weatherParticles.setConfig({
        x: {min: this.cameras.main.scrollX, max: this.cameras.main.scrollX + this.cameras.main.width},
        y: this.cameras.main.scrollY - 10,
        lifespan: 1200,
        speedY: {min: 300, max: 500},
        scale: {min: 0.5, max: 1},
        quantity: 50,
        blendMode: 'ADD'
      });
      this.weatherParticles.start();
    } else if(w.particle === 'wind'){
      this.windParticles.setConfig({
        x: this.cameras.main.scrollX - 10,
        y: {min: this.cameras.main.scrollY, max: this.cameras.main.scrollY + this.cameras.main.height},
        lifespan: 800,
        speedX: {min: 400, max: 700},
        speedY: {min: -50, max: 50},
        scale: {min: 0.5, max: 1},
        quantity: 80,
        blendMode: 'NORMAL'
      });
      this.windParticles.start();
    }

    if(GameState.weather === 'drought'){
      this.heatOverlay.setAlpha(0.3);
    }
  }

  updateWeather(delta){
    // Keep particles following camera
    if(GameState.weather === 'rain'){
      this.weatherParticles.setConfig({
        x: {min: this.cameras.main.scrollX, max: this.cameras.main.scrollX + this.cameras.main.width}
      });
    } else if(GameState.weather === 'hurricane'){
      this.windParticles.setConfig({
        y: {min: this.cameras.main.scrollY, max: this.cameras.main.scrollY + this.cameras.main.height}
      });
    }
  }

  updateNPCs(delta){
    const isDay = GameState.dayTime > 0.2 && GameState.dayTime < 0.8;

    GameState.villagers.forEach((v, i) => {
      if(!v.alive){
        if(this.npcSprites[v.id]){
          this.npcSprites[v.id].destroy();
          delete this.npcSprites[v.id];
        }
        return;
      }

      const spr = this.npcSprites[v.id];
      if(!spr) return;

      // Sick NPCs stay home
      if(v.sick){
        const homeX = v.homeX * TILE_SIZE + TILE_SIZE/2;
        const homeY = v.homeY * TILE_SIZE + TILE_SIZE/2;
        spr.x += (homeX - spr.x) * 0.05;
        spr.y += (homeY - spr.y) * 0.05;
        return;
      }

      v.moveTimer -= delta;
      if(v.moveTimer <= 0){
        v.moveTimer = 2000 + Math.random() * 3000;

        if(isDay){
          // Wander
          const angle = Math.random() * Math.PI * 2;
          const dist = 50 + Math.random() * 100;
          v.targetX = clamp(spr.x + Math.cos(angle)*dist, 50, this.mapWidth-50);
          v.targetY = clamp(spr.y + Math.sin(angle)*dist, 50, this.mapHeight-50);
        } else {
          // Go home
          v.targetX = v.homeX * TILE_SIZE + TILE_SIZE/2;
          v.targetY = v.homeY * TILE_SIZE + TILE_SIZE/2;
        }
      }

      if(v.targetX !== null){
        const dx = v.targetX - spr.x;
        const dy = v.targetY - spr.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if(dist > 5){
          const spd = 30;
          spr.body.setVelocity((dx/dist)*spd, (dy/dist)*spd);
        } else {
          spr.body.setVelocity(0);
          v.targetX = null;
          v.targetY = null;
        }
      }

      // Update state position
      v.x = spr.x;
      v.y = spr.y;
    });
  }

  updateDisease(){
    const sick = GameState.villagers.filter(v => v.alive && v.sick);
    const healthy = GameState.villagers.filter(v => v.alive && !v.sick);

    sick.forEach(v => {
      const disease = DISEASES.find(d => d.name === v.sick);
      if(!disease) return;

      // Spread to nearby healthy
      healthy.forEach(h => {
        const dx = v.x - h.x;
        const dy = v.y - h.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if(dist < 80 && Math.random() < disease.spreadRate){
          h.sick = v.sick;
          h.sickDays = disease.duration;
          if(this.npcSprites[h.id]) this.npcSprites[h.id].setTint(0xFF6666);
          this.notify(h.name+' has caught '+v.sick+'!');
        }
      });

      v.sickDays--;
      if(v.sickDays <= 0){
        v.sick = null;
        if(this.npcSprites[v.id]) this.npcSprites[v.id].clearTint();
      }
    });
  }

  checkInteraction(){
    let near = null;
    let nearDist = 60;

    // Check NPCs
    Object.values(this.npcSprites).forEach(spr => {
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, spr.x, spr.y);
      if(d < nearDist){
        nearDist = d;
        near = {type:'npc', target:spr};
      }
    });

    // Check buildings
    this.buildings.getChildren().forEach(bld => {
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, bld.x, bld.y);
      if(d < nearDist + 20){
        nearDist = d;
        near = {type:'building', target:bld};
      }
    });

    // Check farm plots
    GameState.farmPlots.forEach((plot, idx) => {
      const px = plot.x * TILE_SIZE + 16;
      const py = plot.y * TILE_SIZE + 16;
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, px, py);
      if(d < 50){
        near = {type:'farm', plot:plot, idx:idx};
      }
    });

    this.nearby = near;

    if(near){
      this.promptText.setPosition(this.player.x, this.player.y - 30);
      let label = '[E] Interact';
      if(near.type === 'farm'){
        if(!near.plot.crop) label = '[E] Plant '+GameState.selectedCrop;
        else if(near.plot.growth >= 1) label = '[E] Harvest';
        else label = '[E] Check crop';
      } else if(near.type === 'building'){
        const b = near.target.getData('building');
        if(b) label = '[E] Enter '+b.name;
      } else if(near.type === 'npc'){
        const v = near.target.getData('villager');
        if(v) label = '[E] Talk to '+v.name;
      }
      this.promptText.setText(label);
      this.promptText.setVisible(true);
    } else {
      this.promptText.setVisible(false);
    }
  }

  tryInteract(){
    if(!this.nearby) return;

    const near = this.nearby;

    if(near.type === 'npc'){
      const v = near.target.getData('villager');
      if(v) this.talkToNPC(v);
    }
    else if(near.type === 'building'){
      const b = near.target.getData('building');
      if(b) this.enterBuilding(b);
    }
    else if(near.type === 'farm'){
      this.interactFarm(near.plot, near.idx);
    }
  }

  talkToNPC(villager){
    let text = villager.dialogue;
    if(villager.sick) text = '*cough* I\'m not well... ' + text;
    if(villager.age > 60) text = 'At my age, ' + text.toLowerCase();

    this.uiScene.showDialogue(villager.name, text, () => {
      // Optional: quest-like interactions based on year
      if(villager.role === 'healer' && GameState.year === 1850){
        this.uiScene.showDialogue(villager.name, 
          'Cholera is in the parish. We must boil all water and keep the sick apart. Will you help?', 
          () => { GameState.health = clamp(GameState.health+10,0,100); this.notify('Health measures enacted!'); }
        );
      }
      else if(villager.role === 'trader' && GameState.year === 1870){
        this.uiScene.showDialogue(villager.name,
          'Six acres at ninety bunches each, two shillings a bunch. That\'s 1,080 shillings if we size it right.',
          () => { GameState.treasury += 15; this.notify('Trade knowledge gained! +15s'); }
        );
      }
    });
  }

  enterBuilding(bld){
    if(bld.label === 'Hall'){
      this.uiScene.showDialogue('Village Hall', 
        'The council meets here. You may hold court, settle disputes, or end the year and resolve the harvest.',
        () => {
          this.uiScene.showChoice('What would you like to do?', [
            {label:'End the Year ('+GameState.year+')', action:()=>this.triggerYearEnd()},
            {label:'Change Primary Crop', action:()=>this.showCropMenu()},
            {label:'Leave', action:()=>{}}
          ]);
        }
      );
    }
    else if(bld.label === 'Church'){
      this.uiScene.showDialogue('Church', 
        'The congregation gathers for worship. Morale rises in hard times when faith is strong.',
        () => { GameState.morale = clamp(GameState.morale+3,0,100); this.notify('Morale +3'); }
      );
    }
    else if(bld.label === 'School'){
      this.uiScene.showDialogue('School', 
        'Children learn their letters here. Literacy grows slowly, but it changes everything.',
        () => { GameState.literacy = clamp(GameState.literacy+2,0,100); this.notify('Literacy +2'); }
      );
    }
    else if(bld.label === 'Market'){
      this.uiScene.showDialogue('Market', 
        'Traders from neighboring parishes gather here. Sell surplus food for shillings.',
        () => {
          if(GameState.food >= 20){
            GameState.food -= 20;
            const gain = 8 + Math.floor(Math.random()*12);
            GameState.treasury += gain;
            this.notify('Sold surplus for '+gain+' shillings');
          } else {
            this.notify('Not enough food to sell (need 20)');
          }
        }
      );
    }
    else if(bld.label === 'Healer'){
      this.uiScene.showDialogue('Healer\'s Hut', 
        'Joseph tends the sick with fever grass and moringa. The herbs ease suffering, though they cannot cure everything.',
        () => {
          // Cure one sick villager
          const sick = GameState.villagers.find(v => v.alive && v.sick);
          if(sick){
            sick.sick = null;
            sick.sickDays = 0;
            if(this.npcSprites[sick.id]) this.npcSprites[sick.id].clearTint();
            this.notify(sick.name+' has been treated!');
          } else {
            this.notify('No one is sick right now.');
          }
        }
      );
    }
  }

  interactFarm(plot, idx){
    if(!plot.crop){
      // Plant
      plot.crop = GameState.selectedCrop;
      plot.growth = 0;
      plot.plantedDay = GameState.day;

      const spr = this.add.sprite(plot.x*TILE_SIZE+16, plot.y*TILE_SIZE+16, 'crop0');
      spr.setDepth(3);
      this.farmSprites[idx] = spr;
      this.notify('Planted '+CROPS[GameState.selectedCrop].name);
    }
    else if(plot.growth >= 1){
      // Harvest
      const crop = CROPS[plot.crop];
      const yieldAmt = Math.floor(5 * crop.value * (GameState.soilQuality/100));
      GameState.food += yieldAmt;

      this.farmSprites[idx].destroy();
      delete this.farmSprites[idx];
      plot.crop = null;
      plot.growth = 0;

      this.notify('Harvested '+yieldAmt+' food!');
    }
    else {
      // Check status
      const pct = Math.floor(plot.growth * 100);
      this.notify('Growing... '+pct+'% (needs rain in dry weather)');
    }
  }

  showCropMenu(){
    const choices = Object.entries(CROPS).map(([key,c]) => ({
      label: c.name + (key===GameState.selectedCrop?' (current)':''),
      action:()=>{ GameState.selectedCrop = key; this.notify('Primary crop: '+c.name); }
    }));
    choices.push({label:'Cancel', action:()=>{}});
    this.uiScene.showChoice('Select primary crop for next season:', choices);
  }

  triggerYearEnd(){
    this.yearEndActive = true;
    this.player.body.setVelocity(0);

    // Resolve the year
    const result = GameState.resolveYear();

    // Show summary
    let summary = 'Year '+GameState.year+' has ended.\n\n';
    summary += 'Harvest: '+Math.round(result.farmYield)+' food\n';
    summary += 'Population: '+GameState.population+'\n';
    summary += 'Treasury: '+Math.round(GameState.treasury)+'s\n';
    summary += 'Health: '+Math.round(GameState.health)+'\n';
    summary += 'Morale: '+Math.round(GameState.morale)+'\n';
    if(result.deficit) summary += '\n⚠ The village went hungry this year.';

    this.uiScene.showDialogue('Year End — '+GameState.village, summary, () => {
      GameState.year++;
      GameState.day = 1;
      GameState.dayTime = 0.3;

      if(GameState.year > 1900){
        this.showEndGame();
      } else {
        // Check for game over
        if(GameState.population <= 8){
          this.showGameOver();
        } else {
          // Check scripted event
          if(GameState.scriptedEvent){
            this.showEvent(GameState.scriptedEvent);
          }
          this.yearEndActive = false;
          this.notify('Year '+GameState.year+' begins');
        }
      }
    });

    GameState.save();
  }

  showEvent(ev){
    this.yearEndActive = true;
    this.uiScene.showDialogue(ev.title + ' ('+GameState.year+')', ev.text, () => {
      this.yearEndActive = false;
    });
  }

  showEndGame(){
    const alive = GameState.villagers.filter(v => v.alive);
    const checks = [
      {label:'Literacy above 70%', pass: GameState.literacy>=70},
      {label:'Food security (12+ years)', pass: GameState.foodSecureStreak>=12},
      {label:'Land ownership (40%+)', pass: GameState.land>=40},
      {label:'Positive treasury', pass: GameState.treasury>0},
      {label:'Health above 60', pass: GameState.health>=60},
      {label:'Culture preserved', pass: GameState.cultureScore>=40}
    ];
    const passed = checks.filter(c=>c.pass).length;
    const victory = passed >= 4;

    let text = victory 
      ? 'The village stands as a genuine success — built generation by generation.'
      : 'The village survived, though not every goal was reached.';
    text += '\n\n'+passed+' of 6 goals achieved.\n\n';
    text += 'Survivors: '+alive.map(v=>v.name).join(', ');

    this.uiScene.showDialogue('1900 — The Century Turns', text, () => {
      this.uiScene.showChoice('Play again?', [
        {label:'New Village', action:()=>{ GameState.clearSave(); location.reload(); }},
        {label:'Keep Exploring', action:()=>{ this.yearEndActive = false; }}
      ]);
    });
  }

  showGameOver(){
    this.uiScene.showDialogue('The Village Could Not Go On', 
      'Population fell too low to sustain the settlement. Sometimes the land, weather, or wrong choices are simply too much.\n\nEvery village that fails teaches the next one something.',
      () => {
        this.uiScene.showChoice('Try again?', [
          {label:'Found a New Village', action:()=>{ GameState.clearSave(); location.reload(); }}
        ]);
      }
    );
  }

  notify(text){
    this.uiScene.showNotification(text);
  }
}
