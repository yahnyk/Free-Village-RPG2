/* ============================================================
   DATA.JS — RPG Edition v2
   Static content: crops, buildings, NPCs, weather, diseases,
   regions, and historical events.
   ============================================================ */

const TILE_SIZE = 32;
const MAP_WIDTH = 50;
const MAP_HEIGHT = 40;

const REGIONS = {
  cockpit: {
    name:'Cockpit Country', tag:'Limestone hills, hidden valleys',
    desc:'Rugged interior terrain that shielded Maroon communities. Hard to reach, hard to attack.',
    farmMod:0.9, waterMod:0.8, tradeMod:0.8, hurricaneMod:0.6,
    startLand:26, startTreasury:22, rainfall:'low', color:0x8B7355
  },
  coastal: {
    name:'Coastal Plain', tag:'Open trade, open sky',
    desc:'Flat land near the harbor towns. Easy to reach the market, but the first place a storm makes landfall.',
    farmMod:1.0, waterMod:1.0, tradeMod:1.3, hurricaneMod:1.35,
    startLand:16, startTreasury:28, rainfall:'medium', color:0xC2B280
  },
  mountain: {
    name:'Mountain Valley', tag:'Coffee country, cool air',
    desc:'High ground good for coffee. Steep paths make travel slow and landslides a risk.',
    farmMod:0.85, waterMod:1.1, tradeMod:1.15, hurricaneMod:0.7,
    startLand:20, startTreasury:20, rainfall:'medium', color:0x6B8E6B
  },
  river: {
    name:'River Basin', tag:'Rich soil, rising water',
    desc:'The most fertile ground on the island — but flooding is a constant test.',
    farmMod:1.3, waterMod:1.3, tradeMod:1.0, hurricaneMod:1.05,
    startLand:18, startTreasury:20, rainfall:'high', color:0x4A6741
  }
};

const CROPS = {
  yam:      {name:'Yam',      water:'medium', soil:['well-drained'],      value:1.0, growDays:4, color:0xD4A574,
              desc:'Hardy root crop. Moderate water needs.'},
  cassava:  {name:'Cassava',  water:'low',    soil:['well-drained','dry'], value:0.85, growDays:3, color:0xC4B9AC,
              desc:'Drought-tolerant. Grows fast in poor soil.'},
  plantain: {name:'Plantain', water:'high',   soil:['rich','wet'],        value:1.1, growDays:5, color:0x8FBC8F,
              desc:'Thirsty but reliable in wet ground.'},
  banana:   {name:'Banana',   water:'high',   soil:['rich','wet'],        value:1.3, growDays:6, color:0xFFE135,
              desc:'Export crop. High value, needs rich wet soil.'},
  coffee:   {name:'Coffee',   water:'medium', soil:['cool-fertile'],      value:1.4, growDays:7, color:0x8B4513,
              desc:'Highland crop. Slow but valuable.'}
};

const DEFAULT_CROP = {cockpit:'cassava', coastal:'yam', mountain:'coffee', river:'plantain'};

const BUILDINGS = {
  hall:    {name:'Village Hall',    x:24, y:18, w:4, h:3, color:0x8B4513, label:'Hall'},
  church:  {name:'Church',          x:10, y:8,  w:4, h:3, color:0xD4AF37, label:'Church'},
  school:  {name:'School',          x:36, y:8,  w:4, h:3, color:0xCD853F, label:'School'},
  market:  {name:'Market',          x:42, y:20, w:5, h:4, color:0xE9A63B, label:'Market'},
  healer:  {name:'Healer\'s Hut',   x:8,  y:30, w:3, h:3, color:0xC23B4B, label:'Healer'}
};

// 40 farm plots (8 wide × 5 tall)
const FARM_PLOTS = [];
for(let fy=0; fy<5; fy++){
  for(let fx=0; fx<8; fx++){
    FARM_PLOTS.push({x:2+fx, y:22+fy, crop:null, growth:0, plantedDay:-1});
  }
}

const FOUNDING_NPCS = [
  {id:'v1', name:'Mary',       gender:'F', age:14, role:'child',     homeX:20, homeY:15, color:0xFF6B9D,
   dialogue:'I want to learn my letters someday.'},
  {id:'v2', name:'Joseph',     gender:'M', age:62, role:'healer',    homeX:9,  homeY:31, color:0x808080,
   dialogue:'The fever grass is blooming early this year. A sign of wet weather.'},
  {id:'v3', name:'Nathaniel',  gender:'M', age:19, role:'carpenter', homeX:28, homeY:14, color:0x4169E1,
   dialogue:'I\'ll build whatever this village needs. Just give me the wood.'},
  {id:'v4', name:'Grace',      gender:'F', age:35, role:'farmer',    homeX:5,  homeY:24, color:0x228B22,
   dialogue:'The soil near the river bend is the richest I\'ve seen.'},
  {id:'v5', name:'Thomas',     gender:'M', age:38, role:'farmer',    homeX:6,  homeY:24, color:0x8B4513,
   dialogue:'Grace and I cleared this plot together. It\'s ours now.'},
  {id:'v6', name:'Phoebe',     gender:'F', age:22, role:'trader',    homeX:43, homeY:25, color:0x9932CC,
   dialogue:'Portland pays top price for banana. I know the routes.'},
  {id:'v7', name:'Samuel',     gender:'M', age:45, role:'fisher',    homeX:15, homeY:35, color:0x2F4F4F,
   dialogue:'The river gives what it wants. Some days more, some days less.'},
  {id:'v8', name:'Rebecca',    gender:'F', age:8,  role:'child',     homeX:21, homeY:16, color:0xFFB6C1,
   dialogue:'I saw a duppy in the old tree last night! ...Maybe.'},
  {id:'v9', name:'Cudjoe',     gender:'M', age:50, role:'elder',     homeX:25, homeY:12, color:0x556B2F,
   dialogue:'I walked these hills when they belonged to no planter. Remember that.'}
];

const NAME_POOL_M = ['Isaiah','Moses','Solomon','Daniel','Ezekiel','Peter','Jacob','Aaron','Cephas','Toby','Elias','Reuben'];
const NAME_POOL_F = ['Hannah','Charity','Patience','Nancy','Dorcas','Susannah','Priscilla','Abigail','Cassandra','Amelia','Sarah','Winnifred'];

const DISEASES = [
  {name:'Fever',    spreadRate:0.02, mortality:0.005, duration:5},
  {name:'Cholera',  spreadRate:0.08, mortality:0.02,  duration:8},
  {name:'Dysentery',spreadRate:0.04, mortality:0.01,  duration:6}
];

const WEATHER_TYPES = {
  clear:    {name:'Clear',    cropMod:1.0,  healthMod:0},
  rain:     {name:'Rain',     cropMod:1.15, healthMod:0},
  drought:  {name:'Drought',  cropMod:0.6,  healthMod:-2},
  hurricane:{name:'Hurricane',cropMod:0.2,  healthMod:-10}
};

const SCRIPTED_EVENTS = {
1838:{title:'Founding', text:'Emancipation is declared. Your people have left the estate and claimed free land. The first year is about survival.'},
1840:{title:'Governance', text:'The village must choose how to govern itself. Visit the Village Hall to decide.'},
1844:{title:'Surveying', text:'New land laws threaten unregistered plots. A clerk waits at the Village Hall with a geometry problem.'},
1850:{title:'Cholera', text:'Cholera reaches the parish. Joseph the healer needs help at his hut.'},
1856:{title:'Hurricane', text:'The barometer drops. Seek shelter or reinforce the village.'},
1860:{title:'Literacy', text:'Newspapers circulate. The schoolteacher wants to start evening classes.'},
1865:{title:'Morant Bay', text:'Paul Bogle\'s rebellion shakes the island. The village must choose a side.'},
1870:{title:'Banana Boom', text:'Steamships want banana. Phoebe has a math problem about shipment sizes.'},
1875:{title:'Railway', text:'Surveyors are measuring for a rail spur. Visit the Village Hall.'},
1880:{title:'Education Reform', text:'Colonial matching funds for a proper schoolhouse. Talk to the teacher at school.'},
1886:{title:'Second Storm', text:'Another hurricane season. The pressure is falling fast.'},
1890:{title:'Jonkonnu', text:'December brings the masked dancers. The village square calls for celebration.'},
1895:{title:'Boundary Dispute', text:'A neighboring estate challenges your western border. Legal help is needed.'},
1900:{title:'Turn of the Century', text:'Sixty-two years. The village has endured. What legacy will you leave?'}
};

function clamp(v,min,max){return Math.max(min,Math.min(max,v));}
function fmt(n){return Math.round(n*10)/10;}
