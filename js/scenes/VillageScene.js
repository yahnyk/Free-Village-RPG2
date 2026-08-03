/* ============================================================
   VILLAGESCENE.JS
   Main RPG scene: walking, farming, NPCs, weather, buildings.
   ============================================================ */

class VillageScene extends Phaser.Scene {
  constructor(){ super({key:'VillageScene'}); }

  init(data){
    this.continued = data.continued || false;
  }

  create(){
    if(this.continued){
      GameState.load();
    } else {
      // Already initialized by TitleScene
    }

    this.mapW = MAP_WIDTH * TILE_SIZE;
    this.mapH = MAP_HEIGHT * TILE_SIZE;
    this.physics.world.setBounds(0, 0, this.mapW, this.mapH);

    // Ground layer
    this.groundGroup = this.add.group();
    this.buildingGroup = this.physics.add.staticGroup();
    this.treeGroup = this.physics.add.staticGroup();
    this.farmSprites = {};

    this.generateMap();

    // Player
    this.player = this.physics.add.sprite(GameState.playerX, GameState.playerY, 'player');
    this.player.setCollideWorldBounds(true);
    this.player.setDepth(10);
    this.player.body.setSize(20, 20);

    // NPCs
    this.npcSprites = {};
    var self = this;
    GameState.villagers.forEach(function(v, i){
      if(!v.alive) return;
      var spr = self.physics.add.sprite(v.x, v.y, 'npc' + (i % 9));
      spr.setCollideWorldBounds(true);
      spr.setDepth(9);
      spr.body.setSize(20, 20);
      spr.setData('villager', v);
      self.npcSprites[v.id] = spr;
      if(v.sick) spr.setTint(0xFF6666);
    });

    // Camera
    this.cameras.main.setBounds(0, 0, this.mapW, this.mapH);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setZoom(1.2);

    // Controls
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D
    });
    this.eKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);

    // Collisions
    this.physics.add.collider(this.player, this.buildingGroup);
    this.physics.add.collider(this.player, this.treeGroup);
    Object.values(this.npcSprites).forEach(function(spr){
      self.physics.add.collider(self.player, spr);
      self.physics.add.collider(spr, self.buildingGroup);
      self.physics.add.collider(spr, self.treeGroup);
    });

    // Weather emitters (created once, toggled via on/off)
    this.rainEmitter = null;
    this.windEmitter = null;
    this.setupWeather();

    // Overlays
    this.nightOverlay = this.add.tileSprite(0, 0, this.mapW, this.mapH, 'night');
    this.nightOverlay.setAlpha(0).setDepth(50).setScrollFactor(1);

    this.heatOverlay = this.add.tileSprite(0, 0, this.mapW, this.mapH, 'heat');
    this.heatOverlay.setAlpha(0).setDepth(51).setScrollFactor(1);
    this.heatOverlay.setBlendMode(Phaser.BlendModes.MULTIPLY);

    // UI Scene
    this.scene.launch('UIScene');
    this.ui = this.scene.get('UIScene');

    // Interaction prompt
    this.promptText = this.add.text(0, 0, '[E] Interact', {
      fontSize:'12px', fontFamily:'Georgia', color:'#FFD700', backgroundColor:'#00000088'
    }).setOrigin(0.5).setDepth(200).setVisible(false);

    this.yearEndActive = false;
    this.nearby = null;

    // Welcome
    if(!this.continued){
      this.notify('Welcome to ' + GameState.village + ' — Year 1838');
    } else {
      this.notify('Continued — Year ' + GameState.year);
    }

    // Scripted event
    if(GameState.scriptedEvent){
      var ev = GameState.scriptedEvent;
      setTimeout(function(){ self.showEvent(ev); }, 800);
    }
  }

  setupWeather(){
    // Rain particles — create emitter but start stopped
    var rainConfig = {
      x: {min: 0, max: this.mapW},
      y: -10,
      lifespan: 1200,
      speedY: {min: 300, max: 500},
      scale: {min: 0.5, max: 1},
      quantity: 2,
      frequency: 50,
      blendMode: 'ADD',
      on: false
    };
    this.rainEmitter = this.add.particles(0, 0, 'rain', rainConfig);
    this.rainEmitter.setDepth(100);

    // Wind particles
    var windConfig = {
      x: -10,
      y: {min: 0, max: this.mapH},
      lifespan: 800,
      speedX: {min: 400, max: 700},
      speedY: {min: -50, max: 50},
      scale: {min: 0.5, max: 1},
      quantity: 3,
      frequency: 30,
      blendMode: 'NORMAL',
      on: false
    };
    this.windEmitter = this.add.particles(0, 0, 'wind', windConfig);
    this.windEmitter.setDepth(100);

    this.applyWeatherVisuals();
  }

  generateMap(){
    var map = [];
    for(var y = 0; y < MAP_HEIGHT; y++){
      map[y] = [];
      for(var x = 0; x < MAP_WIDTH; x++){
        var tile = 'grass';
        if(y >= 35) tile = 'water';
        else if((x >= 20 && x <= 28 && y >= 15 && y <= 25) ||
                (x >= 8 && x <= 14 && y >= 6 && y <= 12) ||
                (x >= 34 && x <= 40 && y >= 6 && y <= 12) ||
                (x >= 40 && x <= 48 && y >= 18 && y <= 25) ||
                (x >= 2 && x <= 10 && y >= 20 && y <= 28) ||
                (y === 18 && x >= 2 && x <= 48) ||
                (x === 24 && y >= 8 && y <= 35)){
          tile = 'dirt';
        }
        else if(x >= 2 && x <= 9 && y >= 22 && y <= 26){
          tile = 'tilled';
        }
        map[y][x] = tile;

        var spr = this.add.sprite(x * TILE_SIZE + 16, y * TILE_SIZE + 16, tile);
        spr.setDepth(0);
        this.groundGroup.add(spr);
      }
    }

    // Buildings
    var self = this;
    Object.keys(BUILDINGS).forEach(function(key){
      var b = BUILDINGS[key];
      var spr = self.physics.add.sprite(
        b.x * TILE_SIZE + b.w * TILE_SIZE / 2,
        b.y * TILE_SIZE + b.h * TILE_SIZE / 2,
        'bld_' + key
      );
      spr.body.setImmovable(true);
      spr.body.setSize(b.w * TILE_SIZE - 8, b.h * TILE_SIZE - 8);
      spr.setDepth(5);
      spr.setData('building', b);
      self.buildingGroup.add(spr);
    });

    // Houses
    var houses = [[18,14],[22,14],[26,14],[20,12],[24,12],[14,30],[16,32],[30,30],[32,32],[38,30]];
    houses.forEach(function(pos){
      var spr = self.physics.add.sprite(pos[0]*TILE_SIZE+32, pos[1]*TILE_SIZE+32, 'house');
      spr.body.setImmovable(true);
      spr.body.setSize(56, 56);
      spr.setDepth(5);
      self.buildingGroup.add(spr);
    });

    // Trees
    for(var i = 0; i < 40; i++){
      var tx = Phaser.Math.Between(0, MAP_WIDTH-1);
      var ty = Phaser.Math.Between(0, MAP_HEIGHT-1);
      if(map[ty] && map[ty][tx] === 'grass'){
        var spr = self.physics.add.sprite(tx*TILE_SIZE+16, ty*TILE_SIZE+16, 'tree');
        spr.body.setImmovable(true);
        spr.body.setSize(20, 20);
        spr.setDepth(4);
        self.treeGroup.add(spr);
      }
    }

    // Farm sprites
    GameState.farmPlots.forEach(function(plot, idx){
      if(plot.crop){
        var stage = Math.min(3, Math.floor(plot.growth * 4));
        var spr = self.add.sprite(plot.x*TILE_SIZE+16, plot.y*TILE_SIZE+16, 'crop'+stage);
        spr.setDepth(3);
        self.farmSprites[idx] = spr;
      }
    });
  }

  update(time, delta){
    if(this.yearEndActive) return;

    // Time passage
    GameState.dayTime += delta / 20000;
    if(GameState.dayTime >= 1){
      GameState.dayTime = 0;
      GameState.day++;
      this.onNewDay();
    }

    // Day/night
    var nightAlpha = 0;
    if(GameState.dayTime < 0.2) nightAlpha = 1 - GameState.dayTime/0.2;
    else if(GameState.dayTime > 0.8) nightAlpha = (GameState.dayTime - 0.8)/0.2;
    this.nightOverlay.setAlpha(nightAlpha * 0.6);

    // Weather position update (follow camera)
    this.updateWeatherPosition();

    // Player movement
    var speed = 120;
    this.player.body.setVelocity(0);
    if(this.cursors.left.isDown || this.wasd.left.isDown) this.player.body.setVelocityX(-speed);
    else if(this.cursors.right.isDown || this.wasd.right.isDown) this.player.body.setVelocityX(speed);
    if(this.cursors.up.isDown || this.wasd.up.isDown) this.player.body.setVelocityY(-speed);
    else if(this.cursors.down.isDown || this.wasd.down.isDown) this.player.body.setVelocityY(speed);

    GameState.playerX = this.player.x;
    GameState.playerY = this.player.y;

    // NPCs
    this.updateNPCs(delta);

    // Interaction
    this.checkInteraction();

    // E key
    if(Phaser.Input.Keyboard.JustDown(this.eKey)){
      this.tryInteract();
    }
  }

  updateWeatherPosition(){
    var cam = this.cameras.main;
    if(this.rainEmitter && GameState.weather === 'rain'){
      this.rainEmitter.setPosition(cam.scrollX, cam.scrollY - 10);
    }
    if(this.windEmitter && GameState.weather === 'hurricane'){
      this.windEmitter.setPosition(cam.scrollX - 10, cam.scrollY);
    }
  }

  onNewDay(){
    var self = this;
    // Crop growth
    GameState.farmPlots.forEach(function(plot, idx){
      if(plot.crop){
        var crop = CROPS[plot.crop];
        var weatherMod = WEATHER_TYPES[GameState.weather].cropMod;
        plot.growth += (1 / crop.growDays) * weatherMod;
        if(self.farmSprites[idx]){
          var stage = Math.min(3, Math.floor(plot.growth * 4));
          self.farmSprites[idx].setTexture('crop' + stage);
        }
      }
    });

    // Weather change
    GameState.weatherTimer++;
    if(GameState.weatherTimer > 3 + Math.random() * 5){
      this.rollWeather();
      GameState.weatherTimer = 0;
    }

    // Disease
    this.updateDisease();

    // Auto-save
    if(GameState.day % 5 === 0){
      GameState.save();
    }
  }

  rollWeather(){
    var region = REGIONS[GameState.region];
    var roll = Math.random();
    var newWeather = 'clear';

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
    // Reset all
    if(this.rainEmitter) this.rainEmitter.stop();
    if(this.windEmitter) this.windEmitter.stop();
    this.heatOverlay.setAlpha(0);

    var w = GameState.weather;
    if(w === 'rain' && this.rainEmitter){
      this.rainEmitter.start();
    } else if(w === 'hurricane' && this.windEmitter){
      this.windEmitter.start();
    }

    if(w === 'drought'){
      this.heatOverlay.setAlpha(0.3);
    }
  }

  updateNPCs(delta){
    var isDay = GameState.dayTime > 0.2 && GameState.dayTime < 0.8;
    var self = this;

    GameState.villagers.forEach(function(v, i){
      if(!v.alive){
        if(self.npcSprites[v.id]){
          self.npcSprites[v.id].destroy();
          delete self.npcSprites[v.id];
        }
        return;
      }

      var spr = self.npcSprites[v.id];
      if(!spr) return;

      if(v.sick){
        var homeX = v.homeX * TILE_SIZE + TILE_SIZE/2;
        var homeY = v.homeY * TILE_SIZE + TILE_SIZE/2;
        spr.x += (homeX - spr.x) * 0.05;
        spr.y += (homeY - spr.y) * 0.05;
        return;
      }

      v.moveTimer -= delta;
      if(v.moveTimer <= 0){
        v.moveTimer = 2000 + Math.random() * 3000;
        if(isDay){
          var angle = Math.random() * Math.PI * 2;
          var dist = 50 + Math.random() * 100;
          v.targetX = clamp(spr.x + Math.cos(angle)*dist, 50, self.mapW-50);
          v.targetY = clamp(spr.y + Math.sin(angle)*dist, 50, self.mapH-50);
        } else {
          v.targetX = v.homeX * TILE_SIZE + TILE_SIZE/2;
          v.targetY = v.homeY * TILE_SIZE + TILE_SIZE/2;
        }
      }

      if(v.targetX !== null){
        var dx = v.targetX - spr.x;
        var dy = v.targetY - spr.y;
        var dist = Math.sqrt(dx*dx + dy*dy);
        if(dist > 5){
          var spd = 30;
          spr.body.setVelocity((dx/dist)*spd, (dy/dist)*spd);
        } else {
          spr.body.setVelocity(0);
          v.targetX = null;
          v.targetY = null;
        }
      }

      v.x = spr.x;
      v.y = spr.y;
    });
  }

  updateDisease(){
    var self = this;
    var sick = GameState.villagers.filter(function(v){ return v.alive && v.sick; });
    var healthy = GameState.villagers.filter(function(v){ return v.alive && !v.sick; });

    sick.forEach(function(v){
      var disease = DISEASES.find(function(d){ return d.name === v.sick; });
      if(!disease) return;

      healthy.forEach(function(h){
        var dx = v.x - h.x;
        var dy = v.y - h.y;
        var dist = Math.sqrt(dx*dx + dy*dy);
        if(dist < 80 && Math.random() < disease.spreadRate){
          h.sick = v.sick;
          h.sickDays = disease.duration;
          if(self.npcSprites[h.id]) self.npcSprites[h.id].setTint(0xFF6666);
          self.notify(h.name + ' has caught ' + v.sick + '!');
        }
      });

      v.sickDays--;
      if(v.sickDays <= 0){
        v.sick = null;
        if(self.npcSprites[v.id]) self.npcSprites[v.id].clearTint();
      }
    });
  }

  checkInteraction(){
    var near = null;
    var nearDist = 60;
    var self = this;

    Object.values(this.npcSprites).forEach(function(spr){
      var d = Phaser.Math.Distance.Between(self.player.x, self.player.y, spr.x, spr.y);
      if(d < nearDist){
        nearDist = d;
        near = {type:'npc', target:spr};
      }
    });

    this.buildingGroup.getChildren().forEach(function(bld){
      var d = Phaser.Math.Distance.Between(self.player.x, self.player.y, bld.x, bld.y);
      if(d < nearDist + 20){
        nearDist = d;
        near = {type:'building', target:bld};
      }
    });

    GameState.farmPlots.forEach(function(plot, idx){
      var px = plot.x * TILE_SIZE + 16;
      var py = plot.y * TILE_SIZE + 16;
      var d = Phaser.Math.Distance.Between(self.player.x, self.player.y, px, py);
      if(d < 50){
        near = {type:'farm', plot:plot, idx:idx};
      }
    });

    this.nearby = near;

    if(near){
      this.promptText.setPosition(this.player.x, this.player.y - 30);
      var label = '[E] Interact';
      if(near.type === 'farm'){
        if(!near.plot.crop) label = '[E] Plant ' + CROPS[GameState.selectedCrop].name;
        else if(near.plot.growth >= 1) label = '[E] Harvest';
        else label = '[E] Check crop (' + Math.floor(near.plot.growth*100) + '%)';
      } else if(near.type === 'building'){
        var b = near.target.getData('building');
        if(b) label = '[E] Enter ' + b.name;
      } else if(near.type === 'npc'){
        var v = near.target.getData('villager');
        if(v) label = '[E] Talk to ' + v.name;
      }
      this.promptText.setText(label);
      this.promptText.setVisible(true);
    } else {
      this.promptText.setVisible(false);
    }
  }

  tryInteract(){
    if(!this.nearby) return;
    var near = this.nearby;

    if(near.type === 'npc'){
      var v = near.target.getData('villager');
      if(v) this.talkToNPC(v);
    }
    else if(near.type === 'building'){
      var b = near.target.getData('building');
      if(b) this.enterBuilding(b);
    }
    else if(near.type === 'farm'){
      this.interactFarm(near.plot, near.idx);
    }
  }

  talkToNPC(villager){
    var text = villager.dialogue;
    if(villager.sick) text = '*cough* I\'m not well... ' + text;
    if(villager.age > 60) text = 'At my age, ' + text.toLowerCase();

    var self = this;
    this.ui.showDialogue(villager.name, text, function(){
      if(villager.role === 'healer' && GameState.year === 1850){
        self.ui.showDialogue(villager.name,
          'Cholera is in the parish. We must boil all water and keep the sick apart. Will you help?',
          function(){ GameState.health = clamp(GameState.health+10,0,100); self.notify('Health measures enacted!'); }
        );
      }
      else if(villager.role === 'trader' && GameState.year === 1870){
        self.ui.showDialogue(villager.name,
          'Six acres at ninety bunches each, two shillings a bunch. That\'s 1,080 shillings if we size it right.',
          function(){ GameState.treasury += 15; self.notify('Trade knowledge gained! +15s'); }
        );
      }
    });
  }

  enterBuilding(bld){
    var self = this;
    if(bld.label === 'Hall'){
      this.ui.showDialogue('Village Hall',
        'The council meets here. You may hold court, settle disputes, or end the year and resolve the harvest.',
        function(){
          self.ui.showChoice('What would you like to do?', [
            {label:'End the Year ('+GameState.year+')', action:function(){ self.triggerYearEnd(); }},
            {label:'Change Primary Crop', action:function(){ self.showCropMenu(); }},
            {label:'Leave', action:function(){}}
          ]);
        }
      );
    }
    else if(bld.label === 'Church'){
      this.ui.showDialogue('Church',
        'The congregation gathers for worship. Morale rises in hard times when faith is strong.',
        function(){ GameState.morale = clamp(GameState.morale+3,0,100); self.notify('Morale +3'); }
      );
    }
    else if(bld.label === 'School'){
      this.ui.showDialogue('School',
        'Children learn their letters here. Literacy grows slowly, but it changes everything.',
        function(){ GameState.literacy = clamp(GameState.literacy+2,0,100); self.notify('Literacy +2'); }
      );
    }
    else if(bld.label === 'Market'){
      this.ui.showDialogue('Market',
        'Traders from neighboring parishes gather here. Sell surplus food for shillings.',
        function(){
          if(GameState.food >= 20){
            GameState.food -= 20;
            var gain = 8 + Math.floor(Math.random()*12);
            GameState.treasury += gain;
            self.notify('Sold surplus for ' + gain + ' shillings');
          } else {
            self.notify('Not enough food to sell (need 20)');
          }
        }
      );
    }
    else if(bld.label === 'Healer'){
      this.ui.showDialogue('Healer\'s Hut',
        'Joseph tends the sick with fever grass and moringa. The herbs ease suffering, though they cannot cure everything.',
        function(){
          var sick = GameState.villagers.find(function(v){ return v.alive && v.sick; });
          if(sick){
            sick.sick = null;
            sick.sickDays = 0;
            if(self.npcSprites[sick.id]) self.npcSprites[sick.id].clearTint();
            self.notify(sick.name + ' has been treated!');
          } else {
            self.notify('No one is sick right now.');
          }
        }
      );
    }
  }

  interactFarm(plot, idx){
    if(!plot.crop){
      plot.crop = GameState.selectedCrop;
      plot.growth = 0;
      plot.plantedDay = GameState.day;
      var spr = this.add.sprite(plot.x*TILE_SIZE+16, plot.y*TILE_SIZE+16, 'crop0');
      spr.setDepth(3);
      this.farmSprites[idx] = spr;
      this.notify('Planted ' + CROPS[GameState.selectedCrop].name);
    }
    else if(plot.growth >= 1){
      var crop = CROPS[plot.crop];
      var yieldAmt = Math.floor(5 * crop.value * (GameState.soilQuality/100));
      GameState.food += yieldAmt;
      if(this.farmSprites[idx]){
        this.farmSprites[idx].destroy();
        delete this.farmSprites[idx];
      }
      plot.crop = null;
      plot.growth = 0;
      this.notify('Harvested ' + yieldAmt + ' food!');
    }
    else {
      var pct = Math.floor(plot.growth * 100);
      this.notify('Growing... ' + pct + '% (weather affects speed)');
    }
  }

  showCropMenu(){
    var self = this;
    var choices = Object.keys(CROPS).map(function(key){
      var c = CROPS[key];
      return {
        label: c.name + (key === GameState.selectedCrop ? ' (current)' : ''),
        action: function(){ GameState.selectedCrop = key; self.notify('Primary crop: ' + c.name); }
      };
    });
    choices.push({label:'Cancel', action:function(){}});
    this.ui.showChoice('Select primary crop for next season:', choices);
  }

  triggerYearEnd(){
    this.yearEndActive = true;
    this.player.body.setVelocity(0);

    var result = GameState.resolveYear();

    var summary = 'Year ' + GameState.year + ' has ended.\n\n';
    summary += 'Harvest: ' + Math.round(result.farmYield) + ' food\n';
    summary += 'Population: ' + GameState.population + '\n';
    summary += 'Treasury: ' + Math.round(GameState.treasury) + 's\n';
    summary += 'Health: ' + Math.round(GameState.health) + '\n';
    summary += 'Morale: ' + Math.round(GameState.morale) + '\n';
    if(result.deficit) summary += '\n⚠ The village went hungry this year.';

    var self = this;
    this.ui.showDialogue('Year End — ' + GameState.village, summary, function(){
      GameState.year++;
      GameState.day = 1;
      GameState.dayTime = 0.3;

      if(GameState.year > 1900){
        self.showEndGame();
      } else if(GameState.population <= 8){
        self.showGameOver();
      } else {
        if(GameState.scriptedEvent){
          self.showEvent(GameState.scriptedEvent);
        }
        self.yearEndActive = false;
        self.notify('Year ' + GameState.year + ' begins');
      }
    });

    GameState.save();
  }

  showEvent(ev){
    this.yearEndActive = true;
    var self = this;
    this.ui.showDialogue(ev.title + ' (' + GameState.year + ')', ev.text, function(){
      self.yearEndActive = false;
    });
  }

  showEndGame(){
    var alive = GameState.villagers.filter(function(v){ return v.alive; });
    var checks = [
      {label:'Literacy above 70%', pass: GameState.literacy >= 70},
      {label:'Food security (12+ years)', pass: GameState.foodSecureStreak >= 12},
      {label:'Land ownership (40%+)', pass: GameState.land >= 40},
      {label:'Positive treasury', pass: GameState.treasury > 0},
      {label:'Health above 60', pass: GameState.health >= 60},
      {label:'Culture preserved', pass: GameState.cultureScore >= 40}
    ];
    var passed = checks.filter(function(c){ return c.pass; }).length;
    var victory = passed >= 4;

    var text = victory
      ? 'The village stands as a genuine success — built generation by generation.'
      : 'The village survived, though not every goal was reached.';
    text += '\n\n' + passed + ' of 6 goals achieved.\n\n';
    text += 'Survivors: ' + alive.map(function(v){ return v.name; }).join(', ');

    var self = this;
    this.ui.showDialogue('1900 — The Century Turns', text, function(){
      self.ui.showChoice('Play again?', [
        {label:'New Village', action:function(){ GameState.clearSave(); location.reload(); }},
        {label:'Keep Exploring', action:function(){ self.yearEndActive = false; }}
      ]);
    });
  }

  showGameOver(){
    var self = this;
    this.ui.showDialogue('The Village Could Not Go On',
      'Population fell too low to sustain the settlement. Sometimes the land, weather, or wrong choices are simply too much.\n\nEvery village that fails teaches the next one something.',
      function(){
        self.ui.showChoice('Try again?', [
          {label:'Found a New Village', action:function(){ GameState.clearSave(); location.reload(); }}
        ]);
      }
    );
  }

  notify(text){
    this.ui.showNotification(text);
  }
}
