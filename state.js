/* ============================================================
   STATE.JS — RPG Edition v2
   Game state, villagers, yearly simulation, save/load.
   ============================================================ */

var GameState = {
  region: 'river',
  village: 'Free Village',
  year: 1838,
  day: 1,
  dayTime: 0.3,

  population: 60,
  food: 120,
  water: 100,
  treasury: 20,
  health: 70,
  morale: 62,
  literacy: 10,
  land: 18,
  cultureScore: 10,
  soilQuality: 75,
  selectedCrop: 'plantain',
  governance: null,
  tradeBoost: 0,
  foodSecureStreak: 0,

  villagers: [],
  deceased: [],
  log: [],

  weather: 'clear',
  weatherTimer: 0,
  stormThisYear: false,

  buildings: {school:false, church:false, market:false},

  // RPG-specific
  playerX: 0,
  playerY: 0,
  farmPlots: [],

  init: function(regionKey, villageName){
    var r = REGIONS[regionKey];
    this.region = regionKey;
    this.village = villageName || 'Free Village';
    this.year = 1838;
    this.day = 1;
    this.dayTime = 0.3;
    this.population = 60;
    this.food = 120;
    this.water = 100;
    this.treasury = r.startTreasury;
    this.health = 70;
    this.morale = 62;
    this.literacy = 10;
    this.land = r.startLand;
    this.cultureScore = 10;
    this.soilQuality = 75;
    this.selectedCrop = DEFAULT_CROP[regionKey] || 'yam';
    this.governance = null;
    this.tradeBoost = 0;
    this.foodSecureStreak = 0;
    this.weather = 'clear';
    this.weatherTimer = 0;
    this.stormThisYear = false;
    this.buildings = {school:false, church:false, market:false};
    this.playerX = 24 * TILE_SIZE + TILE_SIZE/2;
    this.playerY = 18 * TILE_SIZE + TILE_SIZE/2;
    this.farmPlots = JSON.parse(JSON.stringify(FARM_PLOTS));
    this.deceased = [];
    this.log = [];

    this.villagers = FOUNDING_NPCS.map(function(t){
      return {
        id: t.id, name: t.name, gender: t.gender, age: t.age,
        role: t.role, homeX: t.homeX, homeY: t.homeY,
        x: t.homeX * TILE_SIZE + TILE_SIZE/2,
        y: t.homeY * TILE_SIZE + TILE_SIZE/2,
        color: t.color, dialogue: t.dialogue,
        alive: true, sick: null, sickDays: 0,
        partner: null, lastBirth: 0,
        targetX: null, targetY: null, moveTimer: 0,
        occupation: t.role === 'child' ? 'Child' :
                    t.role === 'healer' ? 'Healer' :
                    t.role === 'carpenter' ? 'Carpenter' :
                    t.role === 'farmer' ? 'Farmer' :
                    t.role === 'trader' ? 'Market Trader' :
                    t.role === 'fisher' ? 'Fisher' :
                    t.role === 'elder' ? 'Elder' : 'Villager'
      };
    });

    var grace = this.villagers.find(function(v){ return v.id === 'v4'; });
    var thomas = this.villagers.find(function(v){ return v.id === 'v5'; });
    if(grace && thomas){ grace.partner = thomas.id; thomas.partner = grace.id; }
  },

  save: function(){
    var data = JSON.stringify({
      region: this.region,
      village: this.village,
      year: this.year,
      day: this.day,
      dayTime: this.dayTime,
      population: this.population,
      food: this.food,
      water: this.water,
      treasury: this.treasury,
      health: this.health,
      morale: this.morale,
      literacy: this.literacy,
      land: this.land,
      cultureScore: this.cultureScore,
      soilQuality: this.soilQuality,
      selectedCrop: this.selectedCrop,
      governance: this.governance,
      tradeBoost: this.tradeBoost,
      foodSecureStreak: this.foodSecureStreak,
      weather: this.weather,
      weatherTimer: this.weatherTimer,
      stormThisYear: this.stormThisYear,
      buildings: this.buildings,
      playerX: this.playerX,
      playerY: this.playerY,
      farmPlots: this.farmPlots,
      deceased: this.deceased,
      log: this.log,
      villagers: this.villagers.map(function(v){
        return {
          id: v.id, name: v.name, gender: v.gender, age: v.age,
          role: v.role, alive: v.alive, sick: v.sick, sickDays: v.sickDays,
          partner: v.partner, lastBirth: v.lastBirth, occupation: v.occupation,
          homeX: v.homeX, homeY: v.homeY, color: v.color, dialogue: v.dialogue
        };
      })
    });
    localStorage.setItem('freeVillageRPG_save', data);
  },

  load: function(){
    var data = localStorage.getItem('freeVillageRPG_save');
    if(!data) return false;
    try{
      var parsed = JSON.parse(data);
      this.region = parsed.region;
      this.village = parsed.village;
      this.year = parsed.year;
      this.day = parsed.day;
      this.dayTime = parsed.dayTime;
      this.population = parsed.population;
      this.food = parsed.food;
      this.water = parsed.water;
      this.treasury = parsed.treasury;
      this.health = parsed.health;
      this.morale = parsed.morale;
      this.literacy = parsed.literacy;
      this.land = parsed.land;
      this.cultureScore = parsed.cultureScore;
      this.soilQuality = parsed.soilQuality;
      this.selectedCrop = parsed.selectedCrop;
      this.governance = parsed.governance;
      this.tradeBoost = parsed.tradeBoost;
      this.foodSecureStreak = parsed.foodSecureStreak;
      this.weather = parsed.weather;
      this.weatherTimer = parsed.weatherTimer;
      this.stormThisYear = parsed.stormThisYear;
      this.buildings = parsed.buildings;
      this.playerX = parsed.playerX;
      this.playerY = parsed.playerY;
      this.farmPlots = parsed.farmPlots;
      this.deceased = parsed.deceased;
      this.log = parsed.log;

      // Restore villagers with runtime properties
      this.villagers = parsed.villagers.map(function(v){
        return {
          id: v.id, name: v.name, gender: v.gender, age: v.age,
          role: v.role, homeX: v.homeX, homeY: v.homeY,
          x: v.homeX * TILE_SIZE + TILE_SIZE/2,
          y: v.homeY * TILE_SIZE + TILE_SIZE/2,
          color: v.color, dialogue: v.dialogue,
          alive: v.alive, sick: v.sick, sickDays: v.sickDays,
          partner: v.partner, lastBirth: v.lastBirth,
          targetX: null, targetY: null, moveTimer: 0,
          occupation: v.occupation
        };
      });
      return true;
    }catch(e){ return false; }
  },

  hasSave: function(){
    return !!localStorage.getItem('freeVillageRPG_save');
  },

  clearSave: function(){
    localStorage.removeItem('freeVillageRPG_save');
  },

  // Year-end simulation
  resolveYear: function(){
    var yr = this.year;
    var region = REGIONS[this.region];

    var weatherMult = 0.85 + Math.random() * 0.3;
    var crop = CROPS[this.selectedCrop];
    var compat = this.cropCompat();
    var soilFactor = 0.7 + (this.soilQuality / 100) * 0.45;

    var farmWorkers = Math.floor(this.population * 0.25);
    var waterWorkers = Math.floor(this.population * 0.15);
    var marketWorkers = Math.floor(this.population * 0.1);
    var schoolWorkers = Math.floor(this.population * 0.08);
    var healthWorkers = Math.floor(this.population * 0.05);

    var farmYield = farmWorkers * 7 * compat * crop.value * soilFactor * weatherMult;
    var waterYield = waterWorkers * 6 * region.waterMod * weatherMult;
    var consumptionFood = this.population * 1.5;
    var consumptionWater = this.population * 1.1;

    this.food += farmYield - consumptionFood;
    this.water += waterYield - consumptionWater;

    var tradeIncome = marketWorkers * 2.5 * region.tradeMod * (1 + this.tradeBoost);
    var upkeep = this.population * 0.15;
    this.treasury += tradeIncome - upkeep;
    this.treasury = clamp(this.treasury, -100, 9999);

    var litBonus = this.governance === 'council' ? 1 : 0;
    this.literacy = clamp(this.literacy + schoolWorkers * 0.5 + litBonus, 0, 100);

    var healthTarget = clamp(55 + healthWorkers * 3 + (this.food >= 0 ? 5 : -12) + (this.water >= 0 ? 5 : -12), 0, 100);
    this.health = clamp(this.health + (healthTarget - this.health) * 0.18, 0, 100);

    var moraleTarget = clamp(52 + (this.food >= 0 ? 5 : -10) + (this.water >= 0 ? 4 : -8) + (this.treasury >= 0 ? 3 : -6), 0, 100);
    if(this.governance === 'headman') moraleTarget += 2;
    this.morale = clamp(this.morale + (moraleTarget - this.morale) * 0.18, 0, 100);

    var deficit = false;
    if(this.food < 0 || this.water < 0 || this.health < 32){
      deficit = true;
      this.population = Math.max(8, Math.round(this.population * 0.975));
    } else if(this.health > 55 && this.morale > 50){
      this.population = Math.round(this.population * 1.012);
    }

    if(this.food < 0) this.food = 0;
    if(this.water < 0) this.water = 0;
    this.food = Math.min(this.food, 650);
    this.water = Math.min(this.water, 650);
    this.foodSecureStreak = deficit ? 0 : this.foodSecureStreak + 1;

    // Soil quality
    var cropChanged = this.farmPlots.some(function(p){ return p.crop && p.crop !== this.selectedCrop; }, this);
    if(!cropChanged && this.farmPlots.some(function(p){ return p.crop; })){
      this.soilQuality = clamp(this.soilQuality - 2, 20, 100);
    } else {
      this.soilQuality = clamp(this.soilQuality + 3, 20, 100);
    }

    // Disease check
    if(this.health < 45 && Math.random() < 0.3){
      this.spreadDisease();
    }

    // Villager aging & events
    this.ageVillagers(yr);

    // Building flags
    if(this.literacy >= 25) this.buildings.school = true;
    if(this.cultureScore >= 25) this.buildings.church = true;
    if(this.treasury >= 50) this.buildings.market = true;

    // Gradual land clearing
    if(this.population > 50 && Math.random() < 0.3){
      this.land = clamp(this.land + 1, 0, 100);
    }

    this.log.push({year:yr, title:'Year ' + yr,
      text:'Population: ' + this.population + ', Food: ' + Math.round(this.food) + ', Treasury: ' + Math.round(this.treasury)});

    return {farmYield: farmYield, weatherMult: weatherMult, deficit: deficit};
  },

  cropCompat: function(){
    var crop = CROPS[this.selectedCrop];
    var region = REGIONS[this.region];
    var rank = {low:0, medium:1, high:2};
    var score = 1.0 - Math.abs(rank[region.rainfall] - rank[crop.water]) * 0.18;
    score += crop.soil.some(function(tag){ return region.soilTags.indexOf(tag) !== -1; }) ? 0.18 : -0.12;
    return clamp(score, 0.55, 1.35);
  },

  spreadDisease: function(){
    var disease = DISEASES[Math.floor(Math.random() * DISEASES.length)];
    var alive = this.villagers.filter(function(v){ return v.alive && !v.sick; });
    if(alive.length === 0) return;
    var victim = alive[Math.floor(Math.random() * alive.length)];
    victim.sick = disease.name;
    victim.sickDays = disease.duration;
    this.log.push({year:this.year, title:'Outbreak', text:victim.name + ' has fallen ill with ' + disease.name + '.'});
  },

  ageVillagers: function(yr){
    var self = this;
    this.villagers.forEach(function(v){
      if(!v.alive) return;
      v.age++;

      // Disease progression
      if(v.sick){
        v.sickDays--;
        var disease = DISEASES.find(function(d){ return d.name === v.sick; });
        if(disease && Math.random() < disease.mortality){
          v.alive = false;
          self.population = Math.max(8, self.population - 1);
          self.deceased.unshift({name:v.name, year:yr, note:v.name + ' died of ' + v.sick + '.'});
          self.morale = clamp(self.morale - 4, 0, 100);
        }
        if(v.sickDays <= 0) v.sick = null;
      }

      // Natural death
      var base = v.age < 13 ? 0.006 : v.age < 18 ? 0.004 : v.age < 60 ? 0.006 : 0.035;
      var mult = 1;
      if(self.health < 45) mult *= 2.2;
      if(self.health < 28) mult *= 2.5;
      if(Math.random() < base * mult){
        v.alive = false;
        self.population = Math.max(8, self.population - 1);
        self.deceased.unshift({name:v.name, year:yr, note:v.name + ' passed away at age ' + v.age + '.'});
        self.morale = clamp(self.morale - 4, 0, 100);
      }

      // Coming of age
      if(v.age === 18){
        v.occupation = ['Farmer','Fisher','Carpenter','Market Trader'][Math.floor(Math.random() * 4)];
      }
    });

    // Births
    var mothers = this.villagers.filter(function(v){
      return v.alive && v.gender === 'F' && v.partner && v.age >= 18 && v.age <= 45 && !v.sick;
    });
    mothers.forEach(function(m){
      if(m.lastBirth && yr - m.lastBirth < 2) return;
      if(Math.random() < 0.16 && self.food > 20){
        var boy = Math.random() < 0.5;
        var name = boy ? NAME_POOL_M[Math.floor(Math.random() * NAME_POOL_M.length)] : NAME_POOL_F[Math.floor(Math.random() * NAME_POOL_F.length)];
        var baby = {
          id: 'v' + Date.now() + '_' + Math.floor(Math.random()*1000),
          name: name, gender: boy ? 'M' : 'F', age: 0,
          role: 'child', homeX: m.homeX, homeY: m.homeY,
          x: m.homeX * TILE_SIZE + TILE_SIZE/2,
          y: m.homeY * TILE_SIZE + TILE_SIZE/2,
          color: boy ? 0x87CEEB : 0xFFB6C1,
          dialogue: '...',
          alive: true, sick: null, sickDays: 0,
          partner: null, lastBirth: 0,
          targetX: null, targetY: null, moveTimer: 0,
          occupation: 'Child'
        };
        self.villagers.push(baby);
        m.lastBirth = yr;
        self.population += 1;
        self.morale = clamp(self.morale + 2, 0, 100);
      }
    });
  },

  get scriptedEvent(){
    return SCRIPTED_EVENTS[this.year] || null;
  }
};
