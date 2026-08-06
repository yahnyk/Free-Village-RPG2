/* ============================================================
   STATE.JS — RPG Edition
   Game state, villagers, yearly simulation, save/load.
   ============================================================ */

let GameState = {
  region: 'river',
  village: 'Free Village',
  year: 1838,
  day: 1,
  dayTime: 0, // 0-1, 0=dawn, 0.5=noon, 1=dusk

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
  playerX: 24*TILE_SIZE + TILE_SIZE/2,
  playerY: 18*TILE_SIZE + TILE_SIZE/2,
  farmPlots: JSON.parse(JSON.stringify(FARM_PLOTS)),

  init: function(regionKey, villageName){
    const r = REGIONS[regionKey];
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
    this.playerX = 24*TILE_SIZE + TILE_SIZE/2;
    this.playerY = 18*TILE_SIZE + TILE_SIZE/2;
    this.farmPlots = JSON.parse(JSON.stringify(FARM_PLOTS));
    this.deceased = [];
    this.log = [];

    // Init villagers from templates
    this.villagers = FOUNDING_NPCS.map(t => ({
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
    }));

    // Set Grace & Thomas as partners
    const grace = this.villagers.find(v => v.id === 'v4');
    const thomas = this.villagers.find(v => v.id === 'v5');
    if(grace && thomas){ grace.partner = thomas.id; thomas.partner = grace.id; }
  },

  save: function(){
    const data = JSON.stringify(this, function(key, value){
      if(key === 'villagers'){
        // Persist core data including home position so load can restore correctly
        return value.map(v => ({
          id:v.id, name:v.name, gender:v.gender, age:v.age,
          role:v.role, homeX:v.homeX, homeY:v.homeY,
          alive:v.alive, sick:v.sick, sickDays:v.sickDays,
          partner:v.partner, lastBirth:v.lastBirth, occupation:v.occupation,
          color:v.color, dialogue:v.dialogue
        }));
      }
      return value;
    });
    localStorage.setItem('freeVillageRPG_save', data);
  },

  load: function(){
    const data = localStorage.getItem('freeVillageRPG_save');
    if(!data) return false;
    try{
      const parsed = JSON.parse(data);
      Object.assign(this, parsed);
      // Restore villager runtime data
      this.villagers = parsed.villagers.map(v => {
        const template = FOUNDING_NPCS.find(t => t.id === v.id);
        const homeX = v.homeX != null ? v.homeX : (template ? template.homeX : 24);
        const homeY = v.homeY != null ? v.homeY : (template ? template.homeY : 18);
        return Object.assign({}, template || {}, v, {
          homeX, homeY,
          x: homeX * TILE_SIZE + TILE_SIZE/2,
          y: homeY * TILE_SIZE + TILE_SIZE/2,
          color: v.color != null ? v.color : (template ? template.color : 0x888888),
          dialogue: v.dialogue || (template ? template.dialogue : '...'),
          targetX: null, targetY: null, moveTimer: 0
        });
      });
      // Ensure farmPlots exist
      if(!this.farmPlots || !Array.isArray(this.farmPlots)){
        this.farmPlots = JSON.parse(JSON.stringify(FARM_PLOTS));
      }
      return true;
    }catch(e){
      console.error('Load failed', e);
      return false;
    }
  },

  hasSave: function(){
    return !!localStorage.getItem('freeVillageRPG_save');
  },

  clearSave: function(){
    localStorage.removeItem('freeVillageRPG_save');
  },

  // Year-end simulation (adapted from original)
  resolveYear: function(){
    const yr = this.year;
    const region = REGIONS[this.region];

    // Weather roll
    const weatherMult = 0.85 + Math.random()*0.3;
    const crop = CROPS[this.selectedCrop];
    const compat = this.cropCompat();
    const soilFactor = 0.7 + (this.soilQuality/100)*0.45;

    // Count farm workers from population allocation
    const farmWorkers = Math.floor(this.population * 0.25);
    const waterWorkers = Math.floor(this.population * 0.15);
    const marketWorkers = Math.floor(this.population * 0.1);
    const schoolWorkers = Math.floor(this.population * 0.08);
    const healthWorkers = Math.floor(this.population * 0.05);

    const farmYield = farmWorkers * 7 * compat * crop.value * soilFactor * weatherMult;
    const waterYield = waterWorkers * 6 * region.waterMod * weatherMult;
    const consumptionFood = this.population * 1.5;
    const consumptionWater = this.population * 1.1;

    this.food += farmYield - consumptionFood;
    this.water += waterYield - consumptionWater;

    const tradeIncome = marketWorkers * 2.5 * region.tradeMod * (1+this.tradeBoost);
    const upkeep = this.population * 0.15;
    this.treasury += tradeIncome - upkeep;
    this.treasury = clamp(this.treasury, -100, 9999);

    this.literacy = clamp(this.literacy + schoolWorkers*0.5 + (this.governance==='council'?1:0), 0, 100);

    const healthTarget = clamp(55 + healthWorkers*3 + (this.food>=0?5:-12) + (this.water>=0?5:-12), 0, 100);
    this.health = clamp(this.health + (healthTarget-this.health)*0.18, 0, 100);

    const moraleTarget = clamp(52 + (this.food>=0?5:-10) + (this.water>=0?4:-8) + (this.treasury>=0?3:-6), 0, 100);
    this.morale = clamp(this.morale + (moraleTarget-this.morale)*0.18, 0, 100);

    let deficit = false;
    if(this.food<0 || this.water<0 || this.health<32){
      deficit = true;
      this.population = Math.max(8, Math.round(this.population*0.975));
    } else if(this.health>55 && this.morale>50){
      this.population = Math.round(this.population*1.012);
    }

    if(this.food<0) this.food = 0;
    if(this.water<0) this.water = 0;
    this.food = Math.min(this.food, 650);
    this.water = Math.min(this.water, 650);
    this.foodSecureStreak = deficit ? 0 : this.foodSecureStreak+1;

    // Soil quality
    const cropChanged = this.farmPlots.some(p => p.crop && p.crop !== this.selectedCrop);
    if(!cropChanged && this.farmPlots.some(p => p.crop)){
      this.soilQuality = clamp(this.soilQuality-2, 20, 100);
    } else {
      this.soilQuality = clamp(this.soilQuality+3, 20, 100);
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

    // Land clearing (gradual)
    if(this.population > 50 && Math.random() < 0.3){
      this.land = clamp(this.land + 1, 0, 100);
    }

    this.log.push({year:yr, title:'Year '+yr, text:'Population: '+this.population+', Food: '+Math.round(this.food)+', Treasury: '+Math.round(this.treasury)});

    return {farmYield, weatherMult, deficit};
  },

  cropCompat: function(){
    const crop = CROPS[this.selectedCrop];
    const region = REGIONS[this.region];
    const rank = {low:0, medium:1, high:2};
    let score = 1.0 - Math.abs(rank[region.rainfall]-rank[crop.water])*0.18;
    score += crop.soil.some(tag=>region.soilTags.includes(tag)) ? 0.18 : -0.12;
    return clamp(score, 0.55, 1.35);
  },

  spreadDisease: function(){
    const disease = DISEASES[Math.floor(Math.random()*DISEASES.length)];
    const alive = this.villagers.filter(v => v.alive && !v.sick);
    if(alive.length === 0) return;
    const victim = alive[Math.floor(Math.random()*alive.length)];
    victim.sick = disease.name;
    victim.sickDays = disease.duration;
    this.log.push({year:this.year, title:'Outbreak', text:victim.name+' has fallen ill with '+disease.name+'.'});
  },

  ageVillagers: function(yr){
    this.villagers.forEach(v => {
      if(!v.alive) return;
      v.age++;

      // Disease progression
      if(v.sick){
        v.sickDays--;
        const disease = DISEASES.find(d => d.name === v.sick);
        if(disease && Math.random() < disease.mortality){
          v.alive = false;
          this.population = Math.max(8, this.population-1);
          this.deceased.unshift({name:v.name, year:yr, note:v.name+' died of '+v.sick+'.'});
          this.morale = clamp(this.morale-4, 0, 100);
        }
        if(v.sickDays <= 0) v.sick = null;
      }

      // Natural death
      let base = v.age<13 ? 0.006 : v.age<18 ? 0.004 : v.age<60 ? 0.006 : 0.035;
      let mult = 1;
      if(this.health < 45) mult *= 2.2;
      if(this.health < 28) mult *= 2.5;
      if(Math.random() < base*mult){
        v.alive = false;
        this.population = Math.max(8, this.population-1);
        this.deceased.unshift({name:v.name, year:yr, note:v.name+' passed away at age '+v.age+'.'});
        this.morale = clamp(this.morale-4, 0, 100);
      }

      // Coming of age
      if(v.age === 18){
        v.occupation = ['Farmer','Fisher','Carpenter','Market Trader'][Math.floor(Math.random()*4)];
      }
    });

    // Births
    const mothers = this.villagers.filter(v => v.alive && v.gender==='F' && v.partner && v.age>=18 && v.age<=45 && !v.sick);
    mothers.forEach(m => {
      if(m.lastBirth && yr - m.lastBirth < 2) return;
      if(Math.random() < 0.16 && this.food > 20){
        const boy = Math.random() < 0.5;
        const name = boy ? NAME_POOL_M[Math.floor(Math.random()*NAME_POOL_M.length)] : NAME_POOL_F[Math.floor(Math.random()*NAME_POOL_F.length)];
        const baby = {
          id:'v'+Date.now()+Math.random(), name, gender:boy?'M':'F', age:0,
          role:'child', homeX:m.homeX, homeY:m.homeY,
          x:m.homeX*TILE_SIZE+TILE_SIZE/2, y:m.homeY*TILE_SIZE+TILE_SIZE/2,
          color: boy?0x87CEEB:0xFFB6C1, dialogue:'...',
          alive:true, sick:null, sickDays:0, partner:null, lastBirth:0,
          targetX:null, targetY:null, moveTimer:0, occupation:'Child'
        };
        this.villagers.push(baby);
        m.lastBirth = yr;
        this.population += 1;
        this.morale = clamp(this.morale+2, 0, 100);
      }
    });
  },

  get scriptedEvent(){
    return SCRIPTED_EVENTS[this.year] || null;
  }
};
