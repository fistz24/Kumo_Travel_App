import { useState, useEffect, useRef, useCallback } from "react";
import * as XLSX from "xlsx";
import {
  MapPin, Calendar, Hotel, Train, Home, Upload, ChevronDown,
  Check, AlertCircle, Copy, Search, X, Edit3, Plane, Bus, Car,
  Footprints, Ship, Globe, Settings, Utensils, Plus, Trash2,
  Camera, ArrowLeft, Star
} from "lucide-react";

// ─── PALETTES ────────────────────────────────────────────────────────────────
const PALETTES = {
  sakura:    { primary:"#C97B84", primaryLight:"#F2DDE1", accent:"#D4A0A7", bg:"#FAF7F8", surface:"#FFFFFF", border:"#EDE5E7", text:"#2D2426", muted:"#9A8F92", name:"Sakura" },
  wisteria:  { primary:"#7B6FA0", primaryLight:"#E8E3F5", accent:"#A99BC8", bg:"#F8F7FB", surface:"#FFFFFF", border:"#E5E0F0", text:"#241E35", muted:"#8078A0", name:"Wisteria" },
  matcha:    { primary:"#6B8F71", primaryLight:"#DFF0E1", accent:"#95B89B", bg:"#F6FAF7", surface:"#FFFFFF", border:"#D8EDD9", text:"#1E2E21", muted:"#6B836E", name:"Matcha" },
  persimmon: { primary:"#C46E3A", primaryLight:"#F5E5D9", accent:"#D4966E", bg:"#FAF6F3", surface:"#FFFFFF", border:"#EDE0D5", text:"#2D1E12", muted:"#9A7A5A", name:"Persimmon" },
};

const TRANSPORT_META = {
  flight: { Icon:Plane,      label:"Flight",  colors:["#E3EDF5","#2A567A"] },
  train:  { Icon:Train,      label:"Train",   colors:["#DFF0E1","#3A6B42"] },
  bus:    { Icon:Bus,        label:"Bus",     colors:["#FFF3DC","#8A6200"] },
  car:    { Icon:Car,        label:"Car",     colors:["#EEE8F8","#5B4C8A"] },
  walk:   { Icon:Footprints, label:"Walk",    colors:["#F0F5E3","#4A6A20"] },
  boat:   { Icon:Ship,       label:"Boat",    colors:["#E3EEF5","#2A4C7A"] },
  other:  { Icon:Globe,      label:"Other",   colors:["#F1EFEF","#5A5A5A"] },
};

const BOOK_STATUS = {
  confirmed:       { bg:"#DFF0E1", text:"#3A6B42", label:"Confirmed" },
  pending:         { bg:"#FFF3DC", text:"#8A6200", label:"Pending" },
  "needs booking": { bg:"#FDE8E8", text:"#9B2020", label:"Needs Booking" },
};

const REST_STATUS = {
  wishlist: { bg:"#EEE8F8", text:"#5B4C8A", label:"Wishlist" },
  chosen:   { bg:"#DFF0E1", text:"#3A6B42", label:"Chosen" },
  visited:  { bg:"#E3EDF5", text:"#2A567A", label:"Visited" },
  skipped:  { bg:"#F1EFEF", text:"#6A6060", label:"Skipped" },
};

const MOOD_OPTIONS = [
  { emoji:"😍", label:"Amazing" }, { emoji:"😊", label:"Great" },
  { emoji:"😐", label:"Okay" },    { emoji:"😴", label:"Tiring" },
  { emoji:"🌧️", label:"Rough" },
];
const WEATHER_OPTIONS = [
  { emoji:"☀️", label:"Sunny" }, { emoji:"⛅", label:"Cloudy" },
  { emoji:"🌧️", label:"Rainy" }, { emoji:"❄️", label:"Cold" },
  { emoji:"🌤️", label:"Warm" },
];

// ─── CITY COLOR — deterministic hash so same city = same color always ────────
const COLOR_POOL = ["#C97B84","#7B6FA0","#6B8F71","#C46E3A","#5B8DAE","#8A7B5C","#9A6B8A","#6B8A9A","#A07060","#607090"];
function cityColor(city) {
  if (!city) return "#AAA";
  let h = 0;
  for (let i = 0; i < city.length; i++) h = city.charCodeAt(i) + ((h << 5) - h);
  return COLOR_POOL[Math.abs(h) % COLOR_POOL.length];
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const fmtDate = (s) => { if (!s) return "—"; try { return new Date(s+"T00:00:00").toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"}); } catch { return s; }};
const fmtDateShort = (s) => { if (!s) return "—"; try { return new Date(s+"T00:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric"}); } catch { return s; }};
const nightsBetween = (a,b) => { try { return Math.max(0,Math.round((new Date(b)-new Date(a))/86400000)); } catch { return 0; }};
const daysUntil = (s) => { try { return Math.round((new Date(s+"T00:00:00")-new Date(new Date().toDateString()))/86400000); } catch { return 0; }};
const isToday = (s) => { try { return new Date(s+"T00:00:00").toDateString()===new Date().toDateString(); } catch { return false; }};
const isPast  = (s) => { try { return new Date(s+"T00:00:00")<new Date(new Date().toDateString()); } catch { return false; }};
const uid = () => Math.random().toString(36).slice(2,9);

// ─── EXCEL IMPORT — robust flexible column matcher ────────────────────────────
function parseExcelSheets(sheets) {
  console.log("[Kumo] Sheets found:", Object.keys(sheets));
  Object.entries(sheets).forEach(([n,rows]) => { if(rows.length>0) console.log(`[Kumo] "${n}" cols:`, Object.keys(rows[0])); });

  const findSheet = (kws) => {
    const k = Object.keys(sheets).find(n => kws.some(kw => n.toLowerCase().replace(/[\s_-]/g,"").includes(kw)));
    if (k) { console.log(`[Kumo] Matched "${k}" for`, kws); return sheets[k]; }
    return [];
  };
  // Match a field value from a row given candidate keyword fragments
  const mf = (row, cands) => {
    for (const c of cands) {
      const k = Object.keys(row).find(k => k.toLowerCase().replace(/[\s_-]/g,"").includes(c.replace(/[\s_-]/g,"")));
      if (k !== undefined && row[k] !== null && row[k] !== undefined && String(row[k]).trim() !== "" && String(row[k]).trim() !== "0") {
        return String(row[k]).trim();
      }
    }
    return "";
  };

  const itinRaw  = findSheet(["itinerar","schedule","dayplan","tripday","plan"]);
  const restRaw  = findSheet(["restaurant","dining","food","eatery","cafe","places"]);
  const hotelRaw = findSheet(["hotel","accommodation","stay","lodge","resort"]);

  console.log(`[Kumo] Rows — itin:${itinRaw.length} rest:${restRaw.length} hotel:${hotelRaw.length}`);

  const itinerary = itinRaw.map((r,i) => ({
    id: uid(),
    date:            mf(r,["date","traveldate","tripdate","day"]),
    dayNum:          parseInt(mf(r,["daynum","daynumber","day#","dayno","#"])) || i+1,
    city:            mf(r,["city","destination","location","place","town"]),
    activities:      mf(r,["activit","plan","description","program","todo","schedule","itinerary","detail"]),
    transport:       (mf(r,["transporttype","modeof","travelmode","transport","mode","method","vehicle","travelby","by"]) || "other").toLowerCase(),
    transportDetail: mf(r,["transportdetail","transportinfo","flightno","trainno","busno","bookingdetail","routedetail","detail","route","info","reference"]),
    bookingStatus:   (mf(r,["bookingstatus","status","booked","confirmation","confirmed"]) || "pending").toLowerCase(),
    notes:           mf(r,["note","notes","remark","comment","memo","additional","extra"]),
  }));

  const restaurants = restRaw.map((r) => ({
    id: uid(),
    city:                mf(r,["city","location","town","destination"]),
    name:                mf(r,["restaurantname","name","placename","restaurant","title"]),
    cuisine:             mf(r,["cuisinetype","cuisine","type","foodtype","category","kind"]),
    price:               mf(r,["pricerange","price","cost","budget","pricing","range"]),
    mustTry:             mf(r,["musttry","mustorder","musteat","recommended","signature","bestdish","specialty","dish","recommend"]),
    area:                mf(r,["area","district","neighborhood","zone","address","location","region"]),
    reservationRequired: mf(r,["reservationrequired","reservation","reserve","booking","prereserve","bookingneeded"]) || "No",
    notes:               mf(r,["note","notes","openinghours","hours","info","remark","comment","tip","additional"]),
    status:              "wishlist",
  }));

  const hotels = hotelRaw.map((r) => ({
    id: uid(),
    city:         mf(r,["city","location","destination","town"]),
    name:         mf(r,["hotelname","propertyname","hotel","name","accommodation","property"]),
    checkIn:      mf(r,["checkin","checkindate","checkinday","arrivaldate","arrival","checkindatetime","from","start","startdate"]),
    checkOut:     mf(r,["checkout","checkoutdate","checkoutday","departuredate","departure","checkoutdatetime","to","end","enddate"]),
    confirmation: mf(r,["confirmationno","confirmationcode","confirmation","bookingref","bookingcode","bookingid","reference","reservationno","reservationcode","code","id","ref"]),
    address:      mf(r,["address","fulladdress","streetaddress","location","street"]),
    phone:        mf(r,["phone","phoneno","telephone","tel","mobile","contact","contactno"]),
    notes:        mf(r,["note","notes","remark","comment","specialrequest","preference","info"]),
  }));

  const dates = itinerary.map(d=>d.date).filter(Boolean).sort();
  return {
    id: uid(), tripName:"My Imported Trip",
    startDate: dates[0]||"", endDate: dates[dates.length-1]||"",
    itinerary, restaurants, hotels, memories:[],
    route:{ stops:[], travelMode:"walking" },
  };
}

// ─── EMPTY TRIP ───────────────────────────────────────────────────────────────
const emptyTrip = (name="New Trip") => ({
  id:uid(), tripName:name, startDate:"", endDate:"",
  itinerary:[], restaurants:[], hotels:[], memories:[],
  route:{ stops:[], travelMode:"walking" },
});

// ─── DEMO TRIP ────────────────────────────────────────────────────────────────
const DEMO_TRIP = {
  id:"demo1", tripName:"Japan Autumn 2026", startDate:"2026-10-15", endDate:"2026-10-30",
  route:{ stops:[], travelMode:"walking" },
  memories:[
    { id:"m1", date:"2026-10-16", city:"Tokyo", title:"Senso-ji at dawn", mood:"😍", weather:"☀️", description:"Arrived before the crowds — incense, lanterns, total magic.", foodReview:"Melonpan from the stall outside was perfect.", rating:5, photos:[], tags:["temple","morning","tokyo"] },
    { id:"m2", date:"2026-10-19", city:"Kyoto", title:"Fushimi Inari full hike", mood:"😊", weather:"🌤️", description:"Made it all the way to the top. Legs were done but completely worth it.", foodReview:"Kitsune udon at the bottom — best post-hike meal ever.", rating:5, photos:[], tags:["hike","shrine","torii","kyoto"] },
  ],
  itinerary:[
    {id:"d1",date:"2026-10-15",dayNum:1,city:"Tokyo",activities:"Arrive Narita, check in, explore Shinjuku at night",transport:"flight",transportDetail:"JL 712 Jakarta→Tokyo",bookingStatus:"confirmed",notes:"Early check-in requested"},
    {id:"d2",date:"2026-10-16",dayNum:2,city:"Tokyo",activities:"Tsukiji market, Senso-ji, Ueno Park, Akihabara",transport:"walk",transportDetail:"Tokyo Metro day pass",bookingStatus:"confirmed",notes:""},
    {id:"d3",date:"2026-10-17",dayNum:3,city:"Tokyo",activities:"Harajuku, Meiji Shrine, Shibuya crossing, Roppongi",transport:"walk",transportDetail:"",bookingStatus:"confirmed",notes:"TeamLab tickets pre-booked"},
    {id:"d4",date:"2026-10-18",dayNum:4,city:"Hakone",activities:"Open Air Museum, Mt Fuji views, onsen ryokan",transport:"train",transportDetail:"Romancecar from Shinjuku 08:30",bookingStatus:"confirmed",notes:"Hakone Free Pass"},
    {id:"d5",date:"2026-10-19",dayNum:5,city:"Kyoto",activities:"Arrive Kyoto, Nishiki Market, Gion walk at dusk",transport:"train",transportDetail:"Shinkansen Kodama — Odawara→Kyoto 11:20",bookingStatus:"confirmed",notes:""},
    {id:"d6",date:"2026-10-20",dayNum:6,city:"Kyoto",activities:"Arashiyama bamboo grove, Fushimi Inari sunset",transport:"bus",transportDetail:"City Bus pass",bookingStatus:"confirmed",notes:"Start early!"},
    {id:"d7",date:"2026-10-21",dayNum:7,city:"Kyoto",activities:"Kinkaku-ji, Nijo Castle, Philosopher's Path",transport:"car",transportDetail:"Rental from hotel",bookingStatus:"confirmed",notes:"Tea ceremony 14:00"},
    {id:"d8",date:"2026-10-22",dayNum:8,city:"Osaka",activities:"Arrive Osaka, Dotonbori food crawl, Shinsaibashi",transport:"train",transportDetail:"JR Kyoto–Osaka 10:47",bookingStatus:"confirmed",notes:""},
    {id:"d9",date:"2026-10-23",dayNum:9,city:"Osaka",activities:"Osaka Castle, Kuromon Market, Shinsekai",transport:"walk",transportDetail:"Osaka 1-Day Pass",bookingStatus:"confirmed",notes:""},
    {id:"d10",date:"2026-10-24",dayNum:10,city:"Osaka",activities:"Universal Studios Japan full day",transport:"train",transportDetail:"JR Yumesaki Line to USJ",bookingStatus:"confirmed",notes:"Express pass booked"},
    {id:"d11",date:"2026-10-25",dayNum:11,city:"Hiroshima",activities:"Peace Memorial Museum, Atomic Bomb Dome, Miyajima",transport:"train",transportDetail:"Shinkansen Nozomi — Osaka→Hiroshima 09:05",bookingStatus:"pending",notes:""},
    {id:"d12",date:"2026-10-26",dayNum:12,city:"Hiroshima",activities:"Hiroshima Castle, Shukkeien Garden, okonomiyaki dinner",transport:"walk",transportDetail:"Hiroden tram pass",bookingStatus:"confirmed",notes:""},
    {id:"d13",date:"2026-10-27",dayNum:13,city:"Tokyo",activities:"Return Tokyo — Shibuya Sky, Hamarikyu Gardens",transport:"train",transportDetail:"Shinkansen Nozomi — Hiroshima→Tokyo 10:15",bookingStatus:"needs booking",notes:"⚠️ Book return Shinkansen!"},
    {id:"d14",date:"2026-10-28",dayNum:14,city:"Tokyo",activities:"Odaiba, TeamLab Planets, Tokyo Tower, Ginza shopping",transport:"walk",transportDetail:"Yurikamome Line",bookingStatus:"confirmed",notes:""},
    {id:"d15",date:"2026-10-29",dayNum:15,city:"Tokyo",activities:"Free morning, Tsukiji market, depart for airport",transport:"flight",transportDetail:"JL 723 Tokyo→Jakarta 16:30",bookingStatus:"confirmed",notes:"Airport transfer 12:00"},
  ],
  restaurants:[
    {id:"r1",city:"Tokyo",name:"Ichiran Ramen Shibuya",cuisine:"Ramen",price:"¥¥",mustTry:"Tonkotsu ramen",area:"Shibuya",reservationRequired:"No",notes:"Solo booth experience, open 24h",status:"wishlist"},
    {id:"r2",city:"Tokyo",name:"Afuri Ramen Harajuku",cuisine:"Ramen",price:"¥¥",mustTry:"Yuzu Shio Ramen",area:"Harajuku",reservationRequired:"No",notes:"Yuzu-based broth, lighter style",status:"chosen"},
    {id:"r3",city:"Tokyo",name:"Gonpachi Nishi-Azabu",cuisine:"Izakaya",price:"¥¥¥",mustTry:"Soba and yakitori",area:"Nishi-Azabu",reservationRequired:"Recommended",notes:"Kill Bill restaurant",status:"wishlist"},
    {id:"r4",city:"Kyoto",name:"Nishiki Warai",cuisine:"Kaiseki",price:"¥¥¥¥",mustTry:"Seasonal kaiseki",area:"Nishiki Market",reservationRequired:"Yes",notes:"Traditional 7-course kaiseki",status:"chosen"},
    {id:"r5",city:"Kyoto",name:"Café de 505",cuisine:"Café",price:"¥",mustTry:"Matcha parfait",area:"Gion",reservationRequired:"No",notes:"Adorable matcha café",status:"chosen"},
    {id:"r6",city:"Osaka",name:"Takoyaki Doraku Wanaka",cuisine:"Street Food",price:"¥",mustTry:"Takoyaki 8-piece",area:"Shinsaibashi",reservationRequired:"No",notes:"Best takoyaki in Osaka",status:"chosen"},
    {id:"r7",city:"Osaka",name:"Kani Doraku",cuisine:"Seafood",price:"¥¥¥",mustTry:"Snow crab course",area:"Dotonbori",reservationRequired:"Recommended",notes:"Iconic giant crab sign",status:"wishlist"},
    {id:"r8",city:"Hiroshima",name:"Okonomimura",cuisine:"Okonomiyaki",price:"¥¥",mustTry:"Hiroshima-style okonomiyaki",area:"Naka-ku",reservationRequired:"No",notes:"Multi-floor building",status:"chosen"},
  ],
  hotels:[
    {id:"h1",city:"Tokyo",name:"The Prince Park Tower Tokyo",checkIn:"2026-10-15",checkOut:"2026-10-18",confirmation:"TKY-2026-88321",address:"4-8-1 Shibakoen, Minato-ku, Tokyo",phone:"+81-3-5400-1111",notes:"Tokyo Tower views"},
    {id:"h2",city:"Hakone",name:"Gora Kadan Ryokan",checkIn:"2026-10-18",checkOut:"2026-10-19",confirmation:"HKN-2026-44109",address:"1300 Gora, Hakone-machi",phone:"+81-460-82-3331",notes:"Private onsen, dinner 19:00"},
    {id:"h3",city:"Kyoto",name:"The Ritz-Carlton Kyoto",checkIn:"2026-10-19",checkOut:"2026-10-22",confirmation:"KYT-2026-55723",address:"Kamogawa Nijo-Ohashi, Kyoto",phone:"+81-75-746-5555",notes:"River view room"},
    {id:"h4",city:"Osaka",name:"Cross Hotel Osaka",checkIn:"2026-10-22",checkOut:"2026-10-25",confirmation:"OSK-2026-78234",address:"2-5-15 Shinsaibashisuji, Osaka",phone:"+81-6-6213-8281",notes:"Walking distance to Dotonbori"},
    {id:"h5",city:"Hiroshima",name:"Sheraton Grand Hiroshima",checkIn:"2026-10-25",checkOut:"2026-10-27",confirmation:"HRS-2026-32156",address:"12-9 Kyobashicho, Hiroshima",phone:"+81-82-262-7111",notes:"Connected to station"},
    {id:"h6",city:"Tokyo",name:"Andaz Tokyo Toranomon Hills",checkIn:"2026-10-27",checkOut:"2026-10-29",confirmation:"TKY-2026-91047",address:"1-23-4 Toranomon, Tokyo",phone:"+81-3-6830-1234",notes:"Rooftop bar — must visit!"},
  ],
};

// ─── SHARED COMPONENTS ───────────────────────────────────────────────────────

// ══════════════════════════════════════════════════════════════
// SHARED COMPONENTS
// ══════════════════════════════════════════════════════════════
function TransBadge({ type }) {
  const m = TRANSPORT_META[type] || TRANSPORT_META.other;
  return <span style={{display:"inline-flex",alignItems:"center",gap:4,background:m.colors[0],color:m.colors[1],fontSize:11,fontWeight:700,padding:"3px 9px",borderRadius:99}}><m.Icon size={11}/>{m.label}</span>;
}

function Inp({ label, value, onChange, type="text", placeholder="", multi, rows=2, opts, sx={} }) {
  const base = {width:"100%",border:"1px solid #EDE5E7",borderRadius:10,padding:"9px 11px",fontSize:13,fontFamily:"inherit",outline:"none",boxSizing:"border-box",color:"#2D2426",background:"#FAF8F9"};
  return (
    <div style={{marginBottom:12,...sx}}>
      {label&&<label style={{fontSize:11,fontWeight:700,color:"#9A8F92",display:"block",marginBottom:5,textTransform:"uppercase",letterSpacing:"0.05em"}}>{label}</label>}
      {multi?<textarea value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} rows={rows} style={{...base,resize:"vertical"}}/>
      :opts?<select value={value} onChange={e=>onChange(e.target.value)} style={base}>{opts.map(o=><option key={o.v||o} value={o.v||o}>{o.l||o}</option>)}</select>
      :<input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} style={base}/>}
    </div>
  );
}

function Confirm({ message, onOk, onNo }) {
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
      <div style={{background:"#fff",borderRadius:20,padding:28,maxWidth:320,width:"100%",boxShadow:"0 20px 60px rgba(0,0,0,0.2)"}}>
        <p style={{fontSize:15,fontWeight:600,color:"#2D2426",margin:"0 0 20px",lineHeight:1.5}}>{message}</p>
        <div style={{display:"flex",gap:10}}>
          <button onClick={onNo} style={{flex:1,background:"#F5F0F2",color:"#9A8F92",border:"none",borderRadius:10,padding:"11px 0",fontSize:13,fontWeight:700,cursor:"pointer"}}>Cancel</button>
          <button onClick={onOk} style={{flex:1,background:"#E05C5C",color:"#fff",border:"none",borderRadius:10,padding:"11px 0",fontSize:13,fontWeight:700,cursor:"pointer"}}>Confirm</button>
        </div>
      </div>
    </div>
  );
}

function CityDialog({ onOk, onNo, palette }) {
  const [v,setV]=useState("");
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
      <div style={{background:"#fff",borderRadius:20,padding:28,maxWidth:320,width:"100%",boxShadow:"0 20px 60px rgba(0,0,0,0.2)"}}>
        <h3 style={{fontSize:16,fontWeight:700,color:"#2D2426",margin:"0 0 14px"}}>Add New City</h3>
        <input autoFocus value={v} onChange={e=>setV(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&v.trim())onOk(v.trim());if(e.key==="Escape")onNo();}} placeholder="e.g. Paris, Bali, New York…" style={{width:"100%",border:"1px solid #EDE5E7",borderRadius:10,padding:"10px 12px",fontSize:14,fontFamily:"inherit",outline:"none",boxSizing:"border-box",color:"#2D2426",marginBottom:16}}/>
        <div style={{display:"flex",gap:10}}>
          <button onClick={onNo} style={{flex:1,background:"#F5F0F2",color:"#9A8F92",border:"none",borderRadius:10,padding:"11px 0",fontSize:13,fontWeight:700,cursor:"pointer"}}>Cancel</button>
          <button onClick={()=>{if(v.trim())onOk(v.trim());}} disabled={!v.trim()} style={{flex:1,background:v.trim()?palette.primary:"#D0C8CA",color:"#fff",border:"none",borderRadius:10,padding:"11px 0",fontSize:13,fontWeight:700,cursor:v.trim()?"pointer":"not-allowed"}}>Add</button>
        </div>
      </div>
    </div>
  );
}

// ── Cuisine autocomplete ──────────────────────────────────────
const CUISINE_LIST = ["American","Bakery","BBQ","Brunch","Burger","Café","Chinese","Cocktail Bar","Dim Sum","Ethiopian","Filipino","Fine Dining","French","Fusion","Greek","Hot Pot","Indian","Indonesian","Izakaya","Italian","Japanese","Kaiseki","Korean","Latin","Malaysian","Mediterranean","Mexican","Middle Eastern","Noodles","Okonomiyaki","Omakase","Pasta","Persian","Pizza","Ramen","Seafood","Shabu-shabu","Soba","Spanish","Sri Lankan","Steak","Street Food","Sushi","Tapas","Thai","Turkish","Udon","Vegan","Vietnamese","Wine Bar","Yakitori"];

function CuisineInput({ value, onChange, palette }) {
  const [open,setOpen]=useState(false);
  const [q,setQ]=useState(value||"");
  const ref=useRef();
  useEffect(()=>{setQ(value||"");},[value]);
  const filtered = q.length>0 ? CUISINE_LIST.filter(c=>c.toLowerCase().includes(q.toLowerCase())).slice(0,7) : CUISINE_LIST.slice(0,7);
  const pick=(v)=>{setQ(v);onChange(v);setOpen(false);};
  useEffect(()=>{const fn=(e)=>{if(ref.current&&!ref.current.contains(e.target))setOpen(false);};document.addEventListener("mousedown",fn);return()=>document.removeEventListener("mousedown",fn);},[]);
  return (
    <div ref={ref} style={{position:"relative",marginBottom:12}}>
      <label style={{fontSize:11,fontWeight:700,color:"#9A8F92",display:"block",marginBottom:5,textTransform:"uppercase",letterSpacing:"0.05em"}}>Cuisine</label>
      <input value={q} onChange={e=>{setQ(e.target.value);onChange(e.target.value);setOpen(true);}} onFocus={()=>setOpen(true)} placeholder="Type or pick — e.g. Ramen…"
        style={{width:"100%",border:"1px solid #EDE5E7",borderRadius:10,padding:"9px 11px",fontSize:13,fontFamily:"inherit",outline:"none",boxSizing:"border-box",color:"#2D2426",background:"#FAF8F9"}}/>
      {open&&filtered.length>0&&(
        <div style={{position:"absolute",top:"calc(100% + 2px)",left:0,right:0,background:"#fff",border:"1px solid #EDE5E7",borderRadius:10,boxShadow:"0 8px 28px rgba(0,0,0,0.13)",zIndex:600,overflow:"hidden"}}>
          {filtered.map(c=><div key={c} onMouseDown={()=>pick(c)} style={{padding:"10px 14px",fontSize:13,cursor:"pointer",color:"#2D2426",borderBottom:"1px solid #F8F4F5"}} onMouseEnter={e=>e.currentTarget.style.background="#FAF7F8"} onMouseLeave={e=>e.currentTarget.style.background="#fff"}>{c}</div>)}
        </div>
      )}
    </div>
  );
}

// ── Media/file upload (images + PDFs) ─────────────────────────
function MediaUpload({ files, onAdd, onRemove, label="Attachments", palette, accept="image/*,.pdf" }) {
  const ref=useRef();
  const read=(file)=>new Promise(res=>{const r=new FileReader();r.onload=e=>res({name:file.name,type:file.type,data:e.target.result});r.readAsDataURL(file);});
  const handle=async(fl)=>{const results=await Promise.all(Array.from(fl).map(read));results.forEach(f=>onAdd(f));};
  const open=(f)=>{const a=document.createElement("a");a.href=f.data;a.download=f.name;a.click();};
  const isPDF=(f)=>f.type==="application/pdf"||f.name?.endsWith(".pdf");
  const isImg=(f)=>f.type?.startsWith("image/");
  return (
    <div style={{marginBottom:12}}>
      <label style={{fontSize:11,fontWeight:700,color:"#9A8F92",display:"block",marginBottom:8,textTransform:"uppercase",letterSpacing:"0.05em"}}>{label}</label>
      {(files||[]).length>0&&(
        <div style={{marginBottom:8}}>
          {/* Image grid */}
          {(files||[]).filter(f=>isImg(f)).length>0&&(
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6,marginBottom:6}}>
              {(files||[]).filter(f=>isImg(f)).map((f,i)=>(
                <div key={i} style={{position:"relative"}}>
                  <img src={f.data} alt="" style={{width:"100%",aspectRatio:"1",objectFit:"cover",borderRadius:8,cursor:"pointer"}} onClick={()=>open(f)}/>
                  <button onClick={()=>onRemove(files.indexOf(f))} style={{position:"absolute",top:2,right:2,background:"rgba(0,0,0,0.65)",color:"#fff",border:"none",borderRadius:"50%",width:18,height:18,cursor:"pointer",fontSize:10,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
                </div>
              ))}
            </div>
          )}
          {/* Doc list */}
          {(files||[]).filter(f=>!isImg(f)).map((f,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:8,background:"#FAF8F9",borderRadius:10,padding:"8px 12px",border:"1px solid #EDE5E7",marginBottom:5}}>
              <span style={{fontSize:16}}>{isPDF(f)?"📄":"📎"}</span>
              <span style={{flex:1,fontSize:12,fontWeight:600,color:"#2D2426",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{f.name}</span>
              <button onClick={()=>open(f)} style={{background:"#E3EDF5",color:"#2A567A",border:"none",borderRadius:7,padding:"4px 10px",fontSize:11,fontWeight:700,cursor:"pointer"}}>View</button>
              <button onClick={()=>onRemove(files.indexOf(f))} style={{background:"#FDE8E8",color:"#9B2020",border:"none",borderRadius:7,padding:"4px 8px",fontSize:11,cursor:"pointer"}}>✕</button>
            </div>
          ))}
        </div>
      )}
      <button onClick={()=>ref.current.click()} style={{display:"flex",alignItems:"center",gap:6,background:"#F5F0F2",color:"#9A8F92",border:"1px dashed #D0C8CA",borderRadius:10,padding:"9px 14px",fontSize:12,fontWeight:700,cursor:"pointer"}}>
        <Camera size={13}/>Add photos or docs
      </button>
      <input ref={ref} type="file" accept={accept} multiple style={{display:"none"}} onChange={e=>handle(e.target.files)}/>
    </div>
  );
}

// ── Star rating ───────────────────────────────────────────────
function StarRating({ value, onChange, size=20 }) {
  const [hover,setHover]=useState(0);
  return (
    <div style={{display:"flex",gap:2}}>
      {[1,2,3,4,5].map(n=>(
        <button key={n} onClick={()=>onChange(n)} onMouseEnter={()=>setHover(n)} onMouseLeave={()=>setHover(0)}
          style={{fontSize:size,background:"none",border:"none",cursor:"pointer",lineHeight:1,padding:"0 1px",transition:"transform 0.1s",transform:(hover>=n||(!hover&&value>=n))?"scale(1.1)":"scale(1)"}}>
          {(hover>=n||(!hover&&value>=n))?"⭐":"☆"}
        </button>
      ))}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// BOARDING PASS DESIGN ELEMENTS
// ══════════════════════════════════════════════════════════════
function BoardingPassCard({ children, palette, accent, style={} }) {
  return (
    <div style={{background:"#fff",borderRadius:20,overflow:"hidden",boxShadow:"0 2px 16px rgba(0,0,0,0.07)",position:"relative",...style}}>
      {/* Top color strip */}
      <div style={{height:4,background:`linear-gradient(90deg,${palette.primary},${palette.accent})`}}/>
      {/* Perforation line */}
      <div style={{position:"absolute",left:0,right:0,top:44,height:1,background:"repeating-linear-gradient(90deg,#EDE5E7 0px,#EDE5E7 6px,transparent 6px,transparent 12px)"}}/>
      <div style={{paddingTop:2}}>{children}</div>
    </div>
  );
}

// Stamp-style badge for cities
function CityStamp({ city, small }) {
  const c = cityColor(city);
  const sz = small ? 44 : 56;
  return (
    <div style={{width:sz,height:sz,borderRadius:"50%",border:`2px dashed ${c}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,background:c+"12",flexDirection:"column"}}>
      <span style={{fontSize:small?8:9,fontWeight:800,color:c,textTransform:"uppercase",letterSpacing:"0.04em",textAlign:"center",lineHeight:1.2,padding:"0 2px"}}>{city?.slice(0,6)}</span>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// HOME VIEW — boarding pass style
// ══════════════════════════════════════════════════════════════
function HomeView({ trip, palette, setView }) {
  const du=daysUntil(trip.startDate);
  const totalDays=nightsBetween(trip.startDate,trip.endDate)+1;
  const cities=[...new Set(trip.itinerary.map(d=>d.city).filter(Boolean))];
  const nb=trip.itinerary.filter(d=>d.bookingStatus==="needs booking");
  const today=trip.itinerary.find(d=>isToday(d.date));
  const next=trip.itinerary.find(d=>!isPast(d.date)&&!isToday(d.date));
  const hl=today||next;
  const activeHotel=trip.hotels.find(h=>new Date(h.checkIn+"T00:00:00")<=new Date()&&new Date(h.checkOut+"T00:00:00")>=new Date());
  const lastMemory=(trip.memories||[]).slice(-1)[0];

  return (
    <div style={{padding:"20px 16px 40px"}}>
      {/* Trip name */}
      <div style={{marginBottom:20}}>
        <p style={{fontSize:11,fontWeight:800,color:palette.primary,textTransform:"uppercase",letterSpacing:"0.12em",margin:"0 0 4px"}}>My Trip</p>
        <h1 style={{fontFamily:"'Playfair Display',Georgia,serif",fontSize:26,fontWeight:700,color:palette.text,margin:0,letterSpacing:"-0.02em"}}>{trip.tripName}</h1>
      </div>

      {/* BOARDING PASS HERO */}
      <div style={{background:`linear-gradient(135deg,${palette.primary} 0%,${palette.accent} 100%)`,borderRadius:20,padding:"22px 22px 0",marginBottom:16,overflow:"hidden",position:"relative",boxShadow:`0 8px 32px ${palette.primary}44`}}>
        {/* Decorative circles */}
        <div style={{position:"absolute",right:-40,top:-40,width:150,height:150,borderRadius:"50%",background:"rgba(255,255,255,0.1)"}}/>
        <div style={{position:"absolute",left:-20,bottom:-20,width:100,height:100,borderRadius:"50%",background:"rgba(255,255,255,0.07)"}}/>
        {/* From → To */}
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14,position:"relative"}}>
          <div style={{flex:1}}>
            <p style={{fontSize:10,opacity:0.75,margin:"0 0 2px",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em",color:"#fff"}}>Departs</p>
            <p style={{fontSize:22,fontWeight:800,color:"#fff",margin:0,fontFamily:"'Playfair Display',serif"}}>{cities[0]||"—"}</p>
          </div>
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
            <Plane size={18} color="rgba(255,255,255,0.8)" style={{transform:"rotate(90deg)"}}/>
            <div style={{height:1,width:40,background:"rgba(255,255,255,0.4)"}}/>
          </div>
          <div style={{flex:1,textAlign:"right"}}>
            <p style={{fontSize:10,opacity:0.75,margin:"0 0 2px",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em",color:"#fff"}}>Arrives</p>
            <p style={{fontSize:22,fontWeight:800,color:"#fff",margin:0,fontFamily:"'Playfair Display',serif"}}>{cities[cities.length-1]||"—"}</p>
          </div>
        </div>
        {/* Dates row */}
        <div style={{display:"flex",gap:20,marginBottom:14,position:"relative"}}>
          <div><p style={{fontSize:10,opacity:0.7,margin:"0 0 1px",color:"#fff",fontWeight:600}}>DATE</p><p style={{fontSize:13,fontWeight:700,color:"#fff",margin:0}}>{fmtDateShort(trip.startDate)}</p></div>
          <div><p style={{fontSize:10,opacity:0.7,margin:"0 0 1px",color:"#fff",fontWeight:600}}>DURATION</p><p style={{fontSize:13,fontWeight:700,color:"#fff",margin:0}}>{totalDays} days</p></div>
          <div><p style={{fontSize:10,opacity:0.7,margin:"0 0 1px",color:"#fff",fontWeight:600}}>CITIES</p><p style={{fontSize:13,fontWeight:700,color:"#fff",margin:0}}>{cities.length}</p></div>
        </div>
        {/* Tear line */}
        <div style={{margin:"0 -22px",height:0,borderTop:"2px dashed rgba(255,255,255,0.25)",position:"relative"}}>
          <div style={{position:"absolute",left:-10,top:-9,width:18,height:18,borderRadius:"50%",background:palette.bg}}/>
          <div style={{position:"absolute",right:-10,top:-9,width:18,height:18,borderRadius:"50%",background:palette.bg}}/>
        </div>
        {/* Bottom stub */}
        <div style={{padding:"12px 0 16px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          {du>0&&<><div><p style={{fontSize:10,opacity:0.7,color:"#fff",fontWeight:700,margin:"0 0 1px",textTransform:"uppercase",letterSpacing:"0.06em"}}>Boarding in</p><p style={{fontSize:24,fontWeight:800,color:"#fff",margin:0,lineHeight:1}}>{du} <span style={{fontSize:14}}>days</span></p></div></>}
          {du===0&&<p style={{fontSize:16,fontWeight:800,color:"#fff",margin:0}}>🎉 Today's the day!</p>}
          {du<0&&<div><p style={{fontSize:10,opacity:0.7,color:"#fff",fontWeight:700,margin:"0 0 1px",textTransform:"uppercase",letterSpacing:"0.06em"}}>In progress</p><p style={{fontSize:20,fontWeight:800,color:"#fff",margin:0}}>Day {Math.abs(du)+1}/{totalDays}</p></div>}
          <div style={{display:"flex",gap:6}}>
            {cities.slice(0,3).map(c=><CityStamp key={c} city={c} small/>)}
            {cities.length>3&&<div style={{width:44,height:44,borderRadius:"50%",border:"2px dashed rgba(255,255,255,0.4)",display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{fontSize:10,color:"rgba(255,255,255,0.8)",fontWeight:700}}>+{cities.length-3}</span></div>}
          </div>
        </div>
      </div>

      {/* Today/next — boarding pass stub style */}
      {hl&&(
        <div style={{background:"#fff",borderRadius:18,border:`1px solid ${palette.border}`,overflow:"hidden",marginBottom:14,boxShadow:"0 2px 12px rgba(0,0,0,0.05)"}}>
          <div style={{height:3,background:`linear-gradient(90deg,${palette.primary},${palette.accent})`}}/>
          <div style={{padding:"14px 16px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
              <div>
                <p style={{fontSize:10,fontWeight:800,color:palette.primary,textTransform:"uppercase",letterSpacing:"0.08em",margin:"0 0 4px"}}>{today?"Today — Day "+hl.dayNum:"Up next — Day "+hl.dayNum}</p>
                <h3 style={{fontSize:17,fontWeight:700,color:palette.text,margin:"0 0 4px",fontFamily:"'Playfair Display',serif"}}>{hl.city}</h3>
                <p style={{fontSize:12,color:palette.muted,margin:"0 0 8px",lineHeight:1.5}}>{hl.activities}</p>
                <TransBadge type={hl.transport}/>
                {hl.transportDetail&&<span style={{fontSize:11,color:palette.muted,marginLeft:8}}>{hl.transportDetail}</span>}
              </div>
              <CityStamp city={hl.city}/>
            </div>
            {activeHotel&&<div style={{marginTop:8,paddingTop:8,borderTop:`1px dashed ${palette.border}`,display:"flex",alignItems:"center",gap:8}}><Hotel size={13} color={palette.muted}/><span style={{fontSize:12,color:palette.muted}}>{activeHotel.name}</span></div>}
          </div>
        </div>
      )}

      {/* Stats row */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:14}}>
        {[["📅",totalDays,"Days"],["🏙️",cities.length,"Cities"],["🍜",trip.restaurants.filter(r=>r.name).length,"Eats"],["📸",(trip.memories||[]).length,"Memories"]].map(([icon,val,label])=>(
          <div key={label} style={{background:"#fff",borderRadius:14,border:`1px solid ${palette.border}`,padding:"10px 8px",textAlign:"center"}}>
            <div style={{fontSize:18,marginBottom:2}}>{icon}</div>
            <div style={{fontSize:20,fontWeight:800,color:palette.text,lineHeight:1}}>{val}</div>
            <div style={{fontSize:10,color:palette.muted,fontWeight:600,marginTop:2}}>{label}</div>
          </div>
        ))}
      </div>

      {/* Needs booking alert */}
      {nb.length>0&&(
        <div style={{background:"#FFF3DC",borderRadius:14,padding:"12px 16px",marginBottom:14,border:"1px solid #FFDEA0",cursor:"pointer"}} onClick={()=>setView("transport")}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}><AlertCircle size={15} color="#8A6200"/><span style={{fontSize:13,fontWeight:700,color:"#8A6200"}}>{nb.length} booking{nb.length>1?"s":""} needed</span></div>
          <p style={{fontSize:11,color:"#8A6200",margin:0,fontWeight:600}}>Tap to view →</p>
        </div>
      )}

      {/* Latest memory */}
      {lastMemory&&(
        <div style={{background:"#fff",borderRadius:16,border:`1px solid ${palette.border}`,padding:"14px 16px",cursor:"pointer"}} onClick={()=>setView("memories")}>
          <p style={{fontSize:11,fontWeight:800,color:palette.primary,textTransform:"uppercase",letterSpacing:"0.06em",margin:"0 0 8px"}}>Latest Memory</p>
          <h3 style={{fontSize:14,fontWeight:700,color:palette.text,margin:"0 0 3px"}}>{lastMemory.title}</h3>
          <p style={{fontSize:12,color:palette.muted,margin:"0 0 5px"}}>{lastMemory.city} · {fmtDate(lastMemory.date)}</p>
          <StarRating value={lastMemory.rating||0} onChange={()=>{}} size={14}/>
        </div>
      )}

      {/* City journey stamps */}
      <p style={{fontSize:11,fontWeight:800,color:palette.muted,textTransform:"uppercase",letterSpacing:"0.06em",margin:"16px 0 10px"}}>Journey</p>
      <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
        {cities.map((c,i)=>(
          <div key={c} style={{display:"flex",alignItems:"center",gap:8}}>
            {i>0&&<span style={{fontSize:12,color:palette.muted,fontWeight:700}}>→</span>}
            <div style={{display:"flex",alignItems:"center",gap:6,background:cityColor(c)+"14",border:`1.5px solid ${cityColor(c)}44`,borderRadius:10,padding:"5px 10px"}}>
              <CityStamp city={c} small/>
              <span style={{fontSize:12,fontWeight:700,color:cityColor(c)}}>{c}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// ITINERARY VIEW — with photo/doc attachments
// ══════════════════════════════════════════════════════════════
function ItineraryView({ trip, palette, onUpdate }) {
  const [expId,setExpId]=useState(null);
  const [editId,setEditId]=useState(null);
  const [ef,setEf]=useState({});
  const [showAdd,setShowAdd]=useState(false);
  const [delId,setDelId]=useState(null);
  const [nd,setNd]=useState({date:"",city:"",activities:"",transport:"train",transportDetail:"",bookingStatus:"pending",notes:"",files:[]});

  const cycleStatus=(d)=>{const c=["confirmed","pending","needs booking"];onUpdate("itinerary",trip.itinerary.map(x=>x.id===d.id?{...x,bookingStatus:c[(c.indexOf(d.bookingStatus)+1)%c.length]}:x));};
  const saveEdit=()=>{onUpdate("itinerary",trip.itinerary.map(x=>x.id===editId?{...x,...ef}:x));setEditId(null);};
  const doDelete=(id)=>{onUpdate("itinerary",trip.itinerary.filter(x=>x.id!==id));setDelId(null);setExpId(null);};
  const addDay=()=>{
    const sorted=[...trip.itinerary,{...nd,id:uid(),dayNum:0}].sort((a,b)=>a.date.localeCompare(b.date)).map((d,i)=>({...d,dayNum:i+1}));
    onUpdate("itinerary",sorted);setShowAdd(false);setNd({date:"",city:"",activities:"",transport:"train",transportDetail:"",bookingStatus:"pending",notes:"",files:[]});
  };

  return (
    <div style={{padding:"20px 16px 40px"}}>
      {delId&&<Confirm message="Delete this day?" onOk={()=>doDelete(delId)} onNo={()=>setDelId(null)}/>}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <div><h2 style={{fontFamily:"'Playfair Display',serif",fontSize:24,fontWeight:700,color:palette.text,margin:"0 0 4px"}}>Itinerary</h2><p style={{color:palette.muted,fontSize:13,margin:0}}>{trip.itinerary.length} days planned</p></div>
        <button onClick={()=>setShowAdd(v=>!v)} style={{display:"flex",alignItems:"center",gap:6,background:palette.primary,color:"#fff",border:"none",borderRadius:12,padding:"9px 16px",fontSize:13,fontWeight:700,cursor:"pointer"}}><Plus size={15}/>Add Day</button>
      </div>

      {showAdd&&(
        <div style={{background:"#fff",borderRadius:18,border:`1px solid ${palette.border}`,padding:20,marginBottom:16,boxShadow:"0 4px 20px rgba(0,0,0,0.08)"}}>
          <h3 style={{fontSize:15,fontWeight:700,color:palette.text,margin:"0 0 14px"}}>New Day</h3>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}><Inp label="Date" type="date" value={nd.date} onChange={v=>setNd(p=>({...p,date:v}))}/><Inp label="City" value={nd.city} placeholder="e.g. Paris" onChange={v=>setNd(p=>({...p,city:v}))}/></div>
          <Inp label="Activities" value={nd.activities} placeholder="What's planned?" onChange={v=>setNd(p=>({...p,activities:v}))} multi rows={2}/>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}><Inp label="Transport" value={nd.transport} onChange={v=>setNd(p=>({...p,transport:v}))} opts={Object.entries(TRANSPORT_META).map(([v,m])=>({v,l:m.label}))}/><Inp label="Status" value={nd.bookingStatus} onChange={v=>setNd(p=>({...p,bookingStatus:v}))} opts={["confirmed","pending","needs booking"]}/></div>
          <Inp label="Transport detail" value={nd.transportDetail} placeholder="Route, flight number…" onChange={v=>setNd(p=>({...p,transportDetail:v}))}/>
          <Inp label="Notes" value={nd.notes} placeholder="Anything to remember?" onChange={v=>setNd(p=>({...p,notes:v}))} multi rows={2}/>
          <MediaUpload files={nd.files||[]} onAdd={f=>setNd(p=>({...p,files:[...(p.files||[]),f]}))} onRemove={i=>setNd(p=>({...p,files:p.files.filter((_,pi)=>pi!==i)}))} label="Attachments (booking confirmation, tickets…)" palette={palette}/>
          <div style={{display:"flex",gap:8}}>
            <button onClick={addDay} disabled={!nd.date||!nd.city} style={{flex:1,background:(nd.date&&nd.city)?palette.primary:"#D0C8CA",color:"#fff",border:"none",borderRadius:10,padding:"11px 0",fontSize:13,fontWeight:700,cursor:(nd.date&&nd.city)?"pointer":"not-allowed"}}>Add Day</button>
            <button onClick={()=>setShowAdd(false)} style={{flex:1,background:"#F5F0F2",color:palette.muted,border:"none",borderRadius:10,padding:"11px 0",fontSize:13,fontWeight:600,cursor:"pointer"}}>Cancel</button>
          </div>
        </div>
      )}

      {trip.itinerary.map(d=>{
        const past=isPast(d.date),today=isToday(d.date),ss=BOOK_STATUS[d.bookingStatus]||BOOK_STATUS.pending,isExp=expId===d.id,isEd=editId===d.id;
        const hasFiles=(d.files||[]).length>0;
        return (
          <div key={d.id} style={{background:"#fff",borderRadius:18,border:`1.5px solid ${today?palette.primary+"66":palette.border}`,marginBottom:10,opacity:past&&!today?0.6:1,boxShadow:today?`0 4px 20px ${palette.primary}22`:"none",overflow:"hidden"}}>
            {today&&<div style={{background:palette.primary,height:3}}/>}
            <div style={{padding:"14px 16px",cursor:"pointer"}} onClick={()=>!isEd&&setExpId(isExp?null:d.id)}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3,flexWrap:"wrap"}}>
                    <span style={{fontSize:11,fontWeight:700,color:palette.muted}}>Day {d.dayNum}</span>
                    {today&&<span style={{fontSize:10,fontWeight:800,color:palette.primary,background:palette.primaryLight,padding:"2px 8px",borderRadius:99}}>TODAY</span>}
                    <span style={{fontSize:11,color:palette.muted}}>{fmtDate(d.date)}</span>
                    <span style={{width:7,height:7,borderRadius:"50%",background:cityColor(d.city),flexShrink:0}}/>
                    <span style={{fontSize:12,fontWeight:700,color:cityColor(d.city)}}>{d.city}</span>
                    {hasFiles&&<span style={{fontSize:10,background:"#DFF0E1",color:"#3A6B42",padding:"1px 7px",borderRadius:99,fontWeight:700}}>📎 {d.files.length}</span>}
                  </div>
                  <p style={{fontSize:13,color:palette.text,margin:"0 0 8px",fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:isExp?"normal":"nowrap"}}>{d.activities||"No activities listed"}</p>
                  <TransBadge type={d.transport}/>
                </div>
                <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:6,marginLeft:10}}>
                  <button onClick={e=>{e.stopPropagation();cycleStatus(d);}} style={{background:ss.bg,color:ss.text,border:"none",borderRadius:99,fontSize:10,fontWeight:700,padding:"4px 9px",cursor:"pointer",whiteSpace:"nowrap"}}>{ss.label}</button>
                  <ChevronDown size={14} color={palette.muted} style={{transform:isExp?"rotate(180deg)":"none",transition:"transform 0.2s"}}/>
                </div>
              </div>
            </div>
            {isExp&&(
              <div style={{padding:"0 16px 16px",borderTop:`1px solid ${palette.border}`}}>
                {isEd?(
                  <div style={{paddingTop:14}}>
                    <Inp label="Activities" value={ef.activities||""} onChange={v=>setEf(p=>({...p,activities:v}))} multi rows={3}/>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}><Inp label="Transport" value={ef.transport||"other"} onChange={v=>setEf(p=>({...p,transport:v}))} opts={Object.entries(TRANSPORT_META).map(([v,m])=>({v,l:m.label}))}/><Inp label="Status" value={ef.bookingStatus||"pending"} onChange={v=>setEf(p=>({...p,bookingStatus:v}))} opts={["confirmed","pending","needs booking"]}/></div>
                    <Inp label="Transport detail" value={ef.transportDetail||""} onChange={v=>setEf(p=>({...p,transportDetail:v}))}/>
                    <Inp label="Notes" value={ef.notes||""} onChange={v=>setEf(p=>({...p,notes:v}))} multi rows={2}/>
                    <MediaUpload files={ef.files||[]} onAdd={f=>setEf(p=>({...p,files:[...(p.files||[]),f]}))} onRemove={i=>setEf(p=>({...p,files:p.files.filter((_,pi)=>pi!==i)}))} palette={palette}/>
                    <div style={{display:"flex",gap:8}}>
                      <button onClick={saveEdit} style={{flex:1,background:palette.primary,color:"#fff",border:"none",borderRadius:10,padding:"10px 0",fontSize:13,fontWeight:700,cursor:"pointer"}}>Save</button>
                      <button onClick={()=>setEditId(null)} style={{flex:1,background:"#F5F0F2",color:palette.muted,border:"none",borderRadius:10,padding:"10px 0",fontSize:13,fontWeight:600,cursor:"pointer"}}>Cancel</button>
                    </div>
                  </div>
                ):(
                  <div style={{paddingTop:12}}>
                    {d.transportDetail&&<p style={{fontSize:12,color:palette.muted,margin:"0 0 10px"}}>{d.transportDetail}</p>}
                    {d.notes&&<div style={{background:"#FAF8F9",borderRadius:10,padding:"10px 12px",marginBottom:12}}><p style={{fontSize:11,fontWeight:700,color:palette.muted,margin:"0 0 3px"}}>NOTES</p><p style={{fontSize:12,color:palette.text,margin:0}}>{d.notes}</p></div>}
                    {hasFiles&&(
                      <div style={{marginBottom:12}}>
                        <p style={{fontSize:11,fontWeight:700,color:palette.muted,margin:"0 0 8px"}}>ATTACHMENTS</p>
                        <MediaUpload files={d.files} onAdd={f=>onUpdate("itinerary",trip.itinerary.map(x=>x.id===d.id?{...x,files:[...(x.files||[]),f]}:x))} onRemove={i=>onUpdate("itinerary",trip.itinerary.map(x=>x.id===d.id?{...x,files:x.files.filter((_,pi)=>pi!==i)}:x))} palette={palette}/>
                      </div>
                    )}
                    <div style={{display:"flex",gap:8}}>
                      <button onClick={()=>{setEditId(d.id);setEf({...d,files:d.files||[]});}} style={{display:"flex",alignItems:"center",gap:6,background:palette.primaryLight,color:palette.primary,border:"none",borderRadius:10,padding:"8px 14px",fontSize:12,fontWeight:700,cursor:"pointer"}}><Edit3 size={13}/>Edit</button>
                      <button onClick={()=>setDelId(d.id)} style={{display:"flex",alignItems:"center",gap:6,background:"#FDE8E8",color:"#9B2020",border:"none",borderRadius:10,padding:"8px 14px",fontSize:12,fontWeight:700,cursor:"pointer"}}><Trash2 size={13}/>Delete</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
      {trip.itinerary.length===0&&<div style={{textAlign:"center",padding:"60px 0",color:palette.muted}}><div style={{fontSize:40,marginBottom:12}}>📅</div><p>No days yet — tap "Add Day"!</p></div>}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// TRANSPORT VIEW
// ══════════════════════════════════════════════════════════════
function TransportView({ trip, palette, onUpdate }) {
  const legs=trip.itinerary.filter(d=>d.transport!=="walk");
  const cyc=(d)=>{const c=["confirmed","pending","needs booking"];onUpdate("itinerary",trip.itinerary.map(x=>x.id===d.id?{...x,bookingStatus:c[(c.indexOf(d.bookingStatus)+1)%c.length]}:x));};
  const nb=legs.filter(l=>l.bookingStatus==="needs booking");
  return (
    <div style={{padding:"20px 16px 40px"}}>
      <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:24,fontWeight:700,color:palette.text,margin:"0 0 4px"}}>Transport</h2>
      <p style={{color:palette.muted,fontSize:13,margin:"0 0 16px"}}>{legs.length} legs · {nb.length} need booking</p>
      {nb.length>0&&<div style={{background:"#FDE8E8",borderRadius:14,padding:"12px 16px",marginBottom:16,border:"1px solid #F5C0C0"}}><div style={{display:"flex",gap:8,alignItems:"center",marginBottom:6}}><AlertCircle size={15} color="#9B2020"/><span style={{fontSize:13,fontWeight:700,color:"#9B2020"}}>{nb.length} unbooked</span></div>{nb.map(l=><p key={l.id} style={{fontSize:12,color:"#9B2020",margin:"3px 0 0"}}>Day {l.dayNum} — {l.city}: {l.transportDetail||TRANSPORT_META[l.transport]?.label}</p>)}</div>}
      <div style={{position:"relative"}}>
        <div style={{position:"absolute",left:22,top:0,bottom:0,width:2,background:palette.primaryLight}}/>
        {legs.map(d=>{const ss=BOOK_STATUS[d.bookingStatus]||BOOK_STATUS.pending,M=TRANSPORT_META[d.transport]||TRANSPORT_META.other;return(
          <div key={d.id} style={{display:"flex",gap:12,marginBottom:12,position:"relative"}}>
            <div style={{width:44,height:44,borderRadius:"50%",background:`linear-gradient(135deg,${palette.primary},${palette.accent})`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,position:"relative",zIndex:1,boxShadow:`0 2px 10px ${palette.primary}44`}}><M.Icon size={18} color="#fff"/></div>
            <div style={{flex:1,background:"#fff",borderRadius:16,border:`1px solid ${palette.border}`,padding:"12px 14px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                <div><div style={{fontSize:11,color:palette.muted,marginBottom:3}}>Day {d.dayNum} · {fmtDate(d.date)}</div><div style={{fontSize:14,fontWeight:700,color:palette.text}}>{d.city}</div>{d.transportDetail&&<div style={{fontSize:12,color:palette.muted,marginTop:3}}>{d.transportDetail}</div>}</div>
                <button onClick={()=>cyc(d)} style={{background:ss.bg,color:ss.text,border:"none",borderRadius:99,fontSize:10,fontWeight:700,padding:"4px 9px",cursor:"pointer",flexShrink:0,marginLeft:8}}>{ss.label}</button>
              </div>
            </div>
          </div>
        );})}
      </div>
      {legs.length===0&&<div style={{textAlign:"center",padding:"60px 0",color:palette.muted}}><div style={{fontSize:40,marginBottom:12}}>🚄</div><p>No transport legs yet</p></div>}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// ROUTE PLANNER — fixed mobile layout (stacked, not side-by-side)
// ══════════════════════════════════════════════════════════════
function RoutePlannerView({ trip, palette, onUpdate }) {
  const allCities=[...new Set([...trip.itinerary.map(d=>d.city),...trip.restaurants.map(r=>r.city),...trip.hotels.map(h=>h.city)].filter(Boolean))];
  const rs=trip.route||{stops:[],travelMode:"walking"};
  const [selCity,setSelCity]=useState(allCities[0]||"");
  const [custom,setCustom]=useState("");
  const [copied,setCopied]=useState(false);

  const setStops=(stops)=>onUpdate("route",{...rs,stops});
  const setMode=(travelMode)=>onUpdate("route",{...rs,travelMode});

  const MODES=[{id:"walking",e:"🚶",l:"Walk"},{id:"transit",e:"🚇",l:"Transit"},{id:"driving",e:"🚗",l:"Drive"},{id:"bicycling",e:"🚲",l:"Bike"}];
  const TC={restaurant:{bg:"#EEE8F8",text:"#5B4C8A"},hotel:{bg:"#DFF0E1",text:"#3A6B42"},activity:{bg:"#E3EDF5",text:"#2A567A"},custom:{bg:"#FFF3DC",text:"#8A6200"}};

  const suggestions=[
    ...trip.restaurants.filter(r=>r.city===selCity&&r.name).map(r=>({id:"r-"+r.id,label:r.name,address:r.area?r.name+", "+r.area+", "+selCity:r.name+", "+selCity,type:"restaurant",e:"🍜"})),
    ...trip.hotels.filter(h=>h.city===selCity&&h.name).map(h=>({id:"h-"+h.id,label:h.name,address:h.address||h.name+", "+selCity,type:"hotel",e:"🏨"})),
    ...trip.itinerary.filter(d=>d.city===selCity).map(d=>({id:"i-"+d.id,label:`Day ${d.dayNum}: ${(d.activities||"").split(",")[0]||d.city}`,address:(d.activities||"").split(",")[0]+", "+selCity,type:"activity",e:"📍"})),
  ];

  const addStop=(item)=>{if(rs.stops.find(s=>s.id===item.id))return;setStops([...rs.stops,item]);};
  const addCustom=()=>{const t=custom.trim();if(!t)return;addStop({id:"c-"+Date.now(),label:t,address:t+", "+selCity,type:"custom",e:"📍"});setCustom("");};
  const removeStop=(id)=>setStops(rs.stops.filter(s=>s.id!==id));
  const moveStop=(i,dir)=>{const a=[...rs.stops],t=i+dir;if(t<0||t>=a.length)return;[a[i],a[t]]=[a[t],a[i]];setStops(a);};
  const mapsUrl=rs.stops.length>=2?`https://www.google.com/maps/dir/${rs.stops.map(s=>encodeURIComponent(s.address)).join("/")}?travelmode=${rs.travelMode}`:null;
  const copyUrl=()=>{if(!mapsUrl)return;navigator.clipboard.writeText(mapsUrl).catch(()=>{});setCopied(true);setTimeout(()=>setCopied(false),2000);};

  return (
    <div style={{padding:"20px 16px 40px"}}>
      <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:24,fontWeight:700,color:palette.text,margin:"0 0 4px"}}>Route Planner</h2>
      <p style={{color:palette.muted,fontSize:13,margin:"0 0 16px"}}>Build your stops · opens efficient route in Google Maps</p>

      {/* City + Mode — compact */}
      <div style={{display:"flex",gap:8,overflowX:"auto",paddingBottom:8,marginBottom:12}}>
        {allCities.map(c=><button key={c} onClick={()=>setSelCity(c)} style={{flexShrink:0,padding:"7px 14px",borderRadius:99,border:"none",fontSize:12,fontWeight:700,cursor:"pointer",background:selCity===c?palette.primary:palette.primaryLight,color:selCity===c?"#fff":palette.primary}}>{c}</button>)}
      </div>
      <div style={{display:"flex",gap:6,marginBottom:16}}>
        {MODES.map(m=><button key={m.id} onClick={()=>setMode(m.id)} style={{flex:1,padding:"8px 4px",borderRadius:12,border:`2px solid ${rs.travelMode===m.id?palette.primary:"transparent"}`,background:rs.travelMode===m.id?palette.primaryLight:"#fff",color:rs.travelMode===m.id?palette.primary:palette.muted,fontSize:10,fontWeight:700,cursor:"pointer",textAlign:"center"}}><div style={{fontSize:16,marginBottom:2}}>{m.e}</div>{m.l}</button>)}
      </div>

      {/* YOUR ROUTE — full width on mobile */}
      {rs.stops.length>0&&(
        <div style={{background:"#fff",borderRadius:16,border:`1px solid ${palette.border}`,marginBottom:14,overflow:"hidden"}}>
          <div style={{padding:"12px 14px 8px",borderBottom:`1px solid ${palette.border}`}}>
            <p style={{fontSize:11,fontWeight:800,color:palette.muted,textTransform:"uppercase",letterSpacing:"0.06em",margin:0}}>Your Route ({rs.stops.length} stops)</p>
          </div>
          {rs.stops.map((s,i)=>{const tc=TC[s.type]||TC.custom,isLast=i===rs.stops.length-1;return(
            <div key={s.id} style={{padding:"10px 14px",borderBottom:isLast?"none":`1px solid ${palette.border}`,display:"flex",alignItems:"center",gap:10}}>
              <div style={{width:26,height:26,borderRadius:"50%",background:i===0?`linear-gradient(135deg,${palette.primary},${palette.accent})`:isLast?"#2D2426":palette.primaryLight,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,color:i===0||isLast?"#fff":palette.primary,flexShrink:0}}>{String.fromCharCode(65+i)}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:13,fontWeight:700,color:palette.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{s.label}</div>
                <span style={{fontSize:10,background:tc.bg,color:tc.text,padding:"1px 7px",borderRadius:99,fontWeight:700}}>{s.type}</span>
              </div>
              <div style={{display:"flex",gap:4,flexShrink:0}}>
                <button onClick={()=>moveStop(i,-1)} disabled={i===0} style={{background:i===0?"#F5F0F2":palette.primaryLight,color:i===0?palette.muted:palette.primary,border:"none",borderRadius:6,width:24,height:24,cursor:i===0?"not-allowed":"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12}}>↑</button>
                <button onClick={()=>moveStop(i,1)} disabled={isLast} style={{background:isLast?"#F5F0F2":palette.primaryLight,color:isLast?palette.muted:palette.primary,border:"none",borderRadius:6,width:24,height:24,cursor:isLast?"not-allowed":"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12}}>↓</button>
                <button onClick={()=>removeStop(s.id)} style={{background:"#FDE8E8",color:"#9B2020",border:"none",borderRadius:6,width:24,height:24,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}><X size={11}/></button>
              </div>
            </div>
          );})}
        </div>
      )}

      {/* Open / copy buttons */}
      {rs.stops.length>=2&&(
        <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:16}}>
          <a href={mapsUrl} target="_blank" rel="noreferrer" style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,background:`linear-gradient(135deg,${palette.primary},${palette.accent})`,color:"#fff",borderRadius:14,padding:"14px 0",fontSize:14,fontWeight:700,textDecoration:"none",boxShadow:`0 4px 16px ${palette.primary}44`}}><MapPin size={16}/>Open in Google Maps</a>
          <button onClick={copyUrl} style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,background:copied?"#DFF0E1":palette.primaryLight,color:copied?"#3A6B42":palette.primary,border:"none",borderRadius:14,padding:"12px 0",fontSize:13,fontWeight:700,cursor:"pointer"}}>{copied?<Check size={15}/>:<Copy size={15}/>}{copied?"Copied!":"Copy link"}</button>
          <div style={{background:"#FFF3DC",borderRadius:12,padding:"10px 14px",border:"1px solid #FFDEA0"}}><p style={{fontSize:11,color:"#8A6200",margin:0,lineHeight:1.5}}>💡 Inside Google Maps tap <strong>Optimise route</strong> for shortest path.</p></div>
        </div>
      )}

      {/* Add stops — full width */}
      <p style={{fontSize:11,fontWeight:800,color:palette.muted,textTransform:"uppercase",letterSpacing:"0.06em",margin:"0 0 10px"}}>Add Stops</p>
      <div style={{background:"#fff",borderRadius:14,border:`1px solid ${palette.border}`,padding:"12px 14px",marginBottom:12}}>
        <div style={{display:"flex",gap:8}}>
          <input value={custom} onChange={e=>setCustom(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")addCustom();}} placeholder="Type any place name or address…"
            style={{flex:1,border:`1px solid ${palette.border}`,borderRadius:10,padding:"9px 11px",fontSize:13,fontFamily:"inherit",outline:"none",color:palette.text,background:"#FAF8F9"}}/>
          <button onClick={addCustom} disabled={!custom.trim()} style={{background:custom.trim()?palette.primary:"#D0C8CA",color:"#fff",border:"none",borderRadius:10,padding:"9px 14px",fontSize:13,fontWeight:700,cursor:custom.trim()?"pointer":"not-allowed",flexShrink:0}}><Plus size={14}/></button>
        </div>
      </div>
      {suggestions.length>0&&(
        <div style={{background:"#fff",borderRadius:14,border:`1px solid ${palette.border}`,overflow:"hidden"}}>
          <div style={{padding:"10px 14px",borderBottom:`1px solid ${palette.border}`}}><p style={{fontSize:12,fontWeight:700,color:palette.text,margin:0}}>From your trip in {selCity}</p></div>
          {suggestions.map(s=>{const already=rs.stops.find(st=>st.id===s.id),tc=TC[s.type]||TC.custom;return(
            <div key={s.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 14px",borderBottom:`1px solid ${palette.border}`}}>
              <div style={{flex:1,minWidth:0,marginRight:8}}>
                <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:2}}><span style={{fontSize:14}}>{s.e}</span><span style={{fontSize:13,fontWeight:600,color:palette.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{s.label}</span></div>
                <span style={{fontSize:10,background:tc.bg,color:tc.text,padding:"1px 7px",borderRadius:99,fontWeight:700}}>{s.type}</span>
              </div>
              <button onClick={()=>addStop(s)} disabled={!!already} style={{flexShrink:0,background:already?"#F1EFEF":palette.primaryLight,color:already?palette.muted:palette.primary,border:"none",borderRadius:8,padding:"6px 12px",fontSize:12,fontWeight:700,cursor:already?"not-allowed":"pointer"}}>{already?"✓":"+ Add"}</button>
            </div>
          );})}
        </div>
      )}
      {rs.stops.length===0&&<div style={{textAlign:"center",padding:"20px 0",color:palette.muted}}><div style={{fontSize:32,marginBottom:8}}>📍</div><p style={{fontSize:13}}>Add at least 2 stops above to generate a route</p></div>}
    </div>
  );
}
function MemoriesView({ trip, palette, onUpdate }) {
  const memories = trip.memories || [];
  const [showAdd, setShowAdd] = useState(false);
  const [viewId, setViewId] = useState(null);
  const [delId, setDelId] = useState(null);
  const [editId, setEditId] = useState(null);
  const fileRef = useRef();
  const cities = [...new Set(trip.itinerary.map(d => d.city).filter(Boolean))];

  const blank = () => ({ date:new Date().toISOString().split("T")[0], city:cities[0]||"", title:"", mood:"😍", weather:"☀️", description:"", foodReview:"", rating:5, photos:[], tags:[] });
  const [nm, setNm] = useState(blank());
  const [tagInput, setTagInput] = useState("");

  const addTag = () => { const t = tagInput.trim().toLowerCase(); if (!t || nm.tags.includes(t)) { setTagInput(""); return; } setNm(p => ({...p, tags:[...p.tags, t]})); setTagInput(""); };
  const removeTag = (tag) => setNm(p => ({...p, tags:p.tags.filter(t => t !== tag)}));

  const readPhoto = (file) => new Promise(res => { const r = new FileReader(); r.onload = e => res(e.target.result); r.readAsDataURL(file); });
  const handlePhotos = async (files) => { const res = await Promise.all(Array.from(files).slice(0,8).map(readPhoto)); setNm(p => ({...p, photos:[...p.photos, ...res].slice(0,12)})); };

  const saveMemory = () => {
    if (!nm.title.trim()) return;
    const updated = editId ? memories.map(m => m.id === editId ? {...nm, id:editId} : m) : [...memories, {...nm, id:uid()}];
    onUpdate("memories", updated);
    setShowAdd(false); setEditId(null); setNm(blank()); setTagInput("");
  };

  const doDelete = (id) => { onUpdate("memories", memories.filter(m => m.id !== id)); setDelId(null); setViewId(null); };

  const startEdit = (m) => { setNm({...m}); setEditId(m.id); setShowAdd(true); setViewId(null); };

  // ── Detail view ──
  if (viewId) {
    const m = memories.find(x => x.id === viewId);
    if (!m) { setViewId(null); return null; }
    return (
      <div style={{padding:"24px 20px 40px"}}>
        {delId && <Confirm message="Delete this memory forever?" onOk={() => doDelete(delId)} onNo={() => setDelId(null)}/>}
        <button onClick={() => setViewId(null)} style={{display:"flex",alignItems:"center",gap:6,background:"transparent",border:"none",color:palette.primary,fontSize:13,fontWeight:700,cursor:"pointer",marginBottom:18,padding:0}}>
          <ArrowLeft size={16}/>All Memories
        </button>
        <div style={{background:"#fff",borderRadius:20,border:`1px solid ${palette.border}`,overflow:"hidden",boxShadow:"0 4px 24px rgba(0,0,0,0.07)"}}>
          <div style={{background:`linear-gradient(135deg,${palette.primary},${palette.accent})`,padding:"24px 20px",color:"#fff"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <div style={{flex:1}}>
                <p style={{fontSize:12,opacity:0.85,margin:"0 0 4px"}}>{m.city} · {fmtDate(m.date)}</p>
                <h2 style={{fontFamily:"'Playfair Display',Georgia,serif",fontSize:22,fontWeight:700,margin:"0 0 12px",lineHeight:1.2}}>{m.title}</h2>
                <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                  <span style={{fontSize:24}}>{m.mood}</span>
                  <span style={{fontSize:24}}>{m.weather}</span>
                  {m.rating > 0 && <span style={{fontSize:14}}>{"⭐".repeat(m.rating)}</span>}
                </div>
              </div>
              <div style={{display:"flex",gap:8,marginLeft:12,flexShrink:0}}>
                <button onClick={() => startEdit(m)} style={{background:"rgba(255,255,255,0.2)",color:"#fff",border:"none",borderRadius:10,padding:"8px 12px",cursor:"pointer"}}><Edit3 size={14}/></button>
                <button onClick={() => setDelId(m.id)} style={{background:"rgba(255,255,255,0.2)",color:"#fff",border:"none",borderRadius:10,padding:"8px 12px",cursor:"pointer"}}><Trash2 size={14}/></button>
              </div>
            </div>
          </div>
          <div style={{padding:"20px"}}>
            {m.photos && m.photos.length > 0 && (
              <div style={{marginBottom:20}}>
                <p style={{fontSize:11,fontWeight:800,color:palette.muted,textTransform:"uppercase",letterSpacing:"0.06em",margin:"0 0 10px"}}>Photos</p>
                <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6}}>
                  {m.photos.map((ph,i) => <img key={i} src={ph} alt="" style={{width:"100%",aspectRatio:"1",objectFit:"cover",borderRadius:10}}/>)}
                </div>
              </div>
            )}
            {m.description && (
              <div style={{marginBottom:16}}>
                <p style={{fontSize:11,fontWeight:800,color:palette.muted,textTransform:"uppercase",letterSpacing:"0.06em",margin:"0 0 8px"}}>✍️ Journal</p>
                <p style={{fontSize:14,color:palette.text,lineHeight:1.75,margin:0}}>{m.description}</p>
              </div>
            )}
            {m.foodReview && (
              <div style={{marginBottom:16,background:"#FAF8F9",borderRadius:12,padding:"14px 16px"}}>
                <p style={{fontSize:11,fontWeight:800,color:palette.muted,textTransform:"uppercase",letterSpacing:"0.06em",margin:"0 0 8px"}}>🍜 Food Review</p>
                <p style={{fontSize:14,color:palette.text,lineHeight:1.65,margin:0}}>{m.foodReview}</p>
              </div>
            )}
            {m.tags && m.tags.length > 0 && (
              <div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:8}}>
                {m.tags.map(tag => <span key={tag} style={{background:palette.primaryLight,color:palette.primary,fontSize:12,fontWeight:600,padding:"3px 10px",borderRadius:99}}>#{tag}</span>)}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── List view ──
  const grouped = memories.reduce((acc, m) => { (acc[m.city] = acc[m.city] || []).push(m); return acc; }, {});

  return (
    <div style={{padding:"24px 20px 40px"}}>
      {delId && <Confirm message="Delete this memory forever?" onOk={() => doDelete(delId)} onNo={() => setDelId(null)}/>}

      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <div>
          <h2 style={{fontFamily:"'Playfair Display',Georgia,serif",fontSize:24,fontWeight:700,color:palette.text,margin:"0 0 4px"}}>Memories</h2>
          <p style={{color:palette.muted,fontSize:13,margin:0}}>{memories.length} moment{memories.length !== 1 ? "s" : ""} captured</p>
        </div>
        <button onClick={() => { setNm(blank()); setEditId(null); setShowAdd(v => !v); }} style={{display:"flex",alignItems:"center",gap:6,background:palette.primary,color:"#fff",border:"none",borderRadius:12,padding:"9px 16px",fontSize:13,fontWeight:700,cursor:"pointer"}}>
          <Plus size={15}/>Add
        </button>
      </div>

      {/* Add / Edit form */}
      {showAdd && (
        <div style={{background:"#fff",borderRadius:20,border:`1px solid ${palette.border}`,padding:20,marginBottom:20,boxShadow:"0 6px 30px rgba(0,0,0,0.08)"}}>
          <h3 style={{fontSize:16,fontWeight:700,color:palette.text,margin:"0 0 16px"}}>{editId ? "Edit Memory" : "New Memory"}</h3>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            <Inp label="Date" type="date" value={nm.date} onChange={v => setNm(p => ({...p,date:v}))}/>
            {cities.length > 0
              ? <Inp label="City" value={nm.city} opts={cities} onChange={v => setNm(p => ({...p,city:v}))}/>
              : <Inp label="City" value={nm.city} placeholder="City name" onChange={v => setNm(p => ({...p,city:v}))}/>
            }
          </div>

          <Inp label="Title / Moment" value={nm.title} placeholder="What was this moment?" onChange={v => setNm(p => ({...p,title:v}))}/>

          {/* Mood */}
          <div style={{marginBottom:12}}>
            <label style={{fontSize:11,fontWeight:700,color:"#9A8F92",display:"block",marginBottom:8,textTransform:"uppercase",letterSpacing:"0.05em"}}>Mood</label>
            <div style={{display:"flex",gap:8}}>
              {MOOD_OPTIONS.map(o => (
                <button key={o.emoji} onClick={() => setNm(p => ({...p,mood:o.emoji}))} style={{flex:1,padding:"8px 4px",borderRadius:10,border:`2px solid ${nm.mood===o.emoji?palette.primary:"transparent"}`,background:nm.mood===o.emoji?palette.primaryLight:"#FAF8F9",cursor:"pointer",textAlign:"center"}}>
                  <div style={{fontSize:20}}>{o.emoji}</div>
                  <div style={{fontSize:9,color:palette.muted,fontWeight:600,marginTop:2}}>{o.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Weather */}
          <div style={{marginBottom:12}}>
            <label style={{fontSize:11,fontWeight:700,color:"#9A8F92",display:"block",marginBottom:8,textTransform:"uppercase",letterSpacing:"0.05em"}}>Weather</label>
            <div style={{display:"flex",gap:8}}>
              {WEATHER_OPTIONS.map(o => (
                <button key={o.emoji} onClick={() => setNm(p => ({...p,weather:o.emoji}))} style={{flex:1,padding:"8px 4px",borderRadius:10,border:`2px solid ${nm.weather===o.emoji?palette.primary:"transparent"}`,background:nm.weather===o.emoji?palette.primaryLight:"#FAF8F9",cursor:"pointer",textAlign:"center"}}>
                  <div style={{fontSize:20}}>{o.emoji}</div>
                  <div style={{fontSize:9,color:palette.muted,fontWeight:600,marginTop:2}}>{o.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Rating */}
          <div style={{marginBottom:12}}>
            <label style={{fontSize:11,fontWeight:700,color:"#9A8F92",display:"block",marginBottom:8,textTransform:"uppercase",letterSpacing:"0.05em"}}>Rating</label>
            <div style={{display:"flex",gap:6}}>
              {[1,2,3,4,5].map(n => (
                <button key={n} onClick={() => setNm(p => ({...p,rating:n}))} style={{fontSize:26,background:"none",border:"none",cursor:"pointer",lineHeight:1,padding:"0 2px"}}>
                  {n <= nm.rating ? "⭐" : "☆"}
                </button>
              ))}
            </div>
          </div>

          <Inp label="Journal / Description" value={nm.description} placeholder="What happened? How did you feel? What will you always remember?" onChange={v => setNm(p => ({...p,description:v}))} multi rows={4}/>
          <Inp label="Food Review" value={nm.foodReview} placeholder="What did you eat? Was it worth it? Would you go back?" onChange={v => setNm(p => ({...p,foodReview:v}))} multi rows={3}/>

          {/* Tags */}
          <div style={{marginBottom:12}}>
            <label style={{fontSize:11,fontWeight:700,color:"#9A8F92",display:"block",marginBottom:8,textTransform:"uppercase",letterSpacing:"0.05em"}}>Tags</label>
            <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:8}}>
              {nm.tags.map(tag => (
                <span key={tag} style={{background:palette.primaryLight,color:palette.primary,fontSize:12,fontWeight:600,padding:"3px 10px",borderRadius:99,display:"flex",alignItems:"center",gap:4}}>
                  #{tag}
                  <button onClick={() => removeTag(tag)} style={{background:"none",border:"none",cursor:"pointer",padding:0,color:palette.primary,lineHeight:1,fontSize:14}}>×</button>
                </span>
              ))}
            </div>
            <div style={{display:"flex",gap:8}}>
              <input value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => { if(e.key==="Enter") addTag(); }} placeholder="Add tag (e.g. temple, sunset, food)" style={{flex:1,border:"1px solid #EDE5E7",borderRadius:10,padding:"8px 11px",fontSize:13,fontFamily:"inherit",outline:"none"}}/>
              <button onClick={addTag} style={{background:palette.primaryLight,color:palette.primary,border:"none",borderRadius:10,padding:"8px 14px",fontSize:13,fontWeight:700,cursor:"pointer"}}>Add</button>
            </div>
          </div>

          {/* Photos */}
          <div style={{marginBottom:16}}>
            <label style={{fontSize:11,fontWeight:700,color:"#9A8F92",display:"block",marginBottom:8,textTransform:"uppercase",letterSpacing:"0.05em"}}>Photos</label>
            {nm.photos.length > 0 && (
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6,marginBottom:10}}>
                {nm.photos.map((ph,i) => (
                  <div key={i} style={{position:"relative"}}>
                    <img src={ph} alt="" style={{width:"100%",aspectRatio:"1",objectFit:"cover",borderRadius:8}}/>
                    <button onClick={() => setNm(p => ({...p,photos:p.photos.filter((_,pi) => pi!==i)}))} style={{position:"absolute",top:2,right:2,background:"rgba(0,0,0,0.65)",color:"#fff",border:"none",borderRadius:"50%",width:20,height:20,cursor:"pointer",fontSize:11,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
                  </div>
                ))}
              </div>
            )}
            <button onClick={() => fileRef.current.click()} style={{display:"flex",alignItems:"center",gap:6,background:palette.primaryLight,color:palette.primary,border:"none",borderRadius:10,padding:"10px 16px",fontSize:13,fontWeight:700,cursor:"pointer"}}>
              <Camera size={15}/>Add Photos
            </button>
            <input ref={fileRef} type="file" accept="image/*" multiple style={{display:"none"}} onChange={e => handlePhotos(e.target.files)}/>
          </div>

          <div style={{display:"flex",gap:8}}>
            <button onClick={saveMemory} disabled={!nm.title.trim()} style={{flex:1,background:nm.title.trim()?palette.primary:"#D0C8CA",color:"#fff",border:"none",borderRadius:10,padding:"12px 0",fontSize:13,fontWeight:700,cursor:nm.title.trim()?"pointer":"not-allowed"}}>{editId ? "Save Changes" : "Save Memory"}</button>
            <button onClick={() => { setShowAdd(false); setEditId(null); }} style={{flex:1,background:"#F5F0F2",color:palette.muted,border:"none",borderRadius:10,padding:"12px 0",fontSize:13,fontWeight:600,cursor:"pointer"}}>Cancel</button>
          </div>
        </div>
      )}

      {memories.length === 0 && !showAdd && (
        <div style={{textAlign:"center",padding:"60px 0",color:palette.muted}}>
          <div style={{fontSize:48,marginBottom:12}}>📸</div>
          <p style={{fontSize:16,fontWeight:700,color:palette.text,margin:"0 0 6px"}}>No memories yet</p>
          <p style={{fontSize:13}}>Capture moments — photos, journal entries, food reviews & more</p>
        </div>
      )}

      {/* Grouped by city */}
      {Object.entries(grouped).map(([city, cityMems]) => (
        <div key={city} style={{marginBottom:24}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
            <span style={{width:10,height:10,borderRadius:"50%",background:cityColor(city),flexShrink:0}}/>
            <h3 style={{fontSize:14,fontWeight:800,color:palette.text,margin:0}}>{city}</h3>
            <span style={{fontSize:12,color:palette.muted}}>· {cityMems.length}</span>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",gap:10}}>
            {cityMems.map(m => (
              <div key={m.id} onClick={() => setViewId(m.id)}
                style={{background:"#fff",borderRadius:16,border:`1px solid ${palette.border}`,overflow:"hidden",cursor:"pointer",boxShadow:"0 2px 10px rgba(0,0,0,0.05)",transition:"transform 0.15s"}}
                onMouseEnter={e => e.currentTarget.style.transform="translateY(-2px)"}
                onMouseLeave={e => e.currentTarget.style.transform="none"}>
                {m.photos && m.photos.length > 0
                  ? <img src={m.photos[0]} alt="" style={{width:"100%",height:95,objectFit:"cover"}}/>
                  : <div style={{height:70,background:`linear-gradient(135deg,${palette.primaryLight},${palette.accent}33)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:28}}>{m.mood}</div>
                }
                <div style={{padding:"10px 12px"}}>
                  <p style={{fontSize:12,fontWeight:700,color:palette.text,margin:"0 0 3px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{m.title}</p>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:3}}>
                    <p style={{fontSize:11,color:palette.muted,margin:0}}>{fmtDateShort(m.date)}</p>
                    <div style={{display:"flex",gap:2}}>{m.mood&&<span style={{fontSize:12}}>{m.mood}</span>}{m.weather&&<span style={{fontSize:12}}>{m.weather}</span>}</div>
                  </div>
                  {m.rating > 0 && <p style={{fontSize:11,margin:"2px 0 0"}}>{"⭐".repeat(m.rating)}</p>}
                  {m.tags && m.tags.length > 0 && (
                    <div style={{display:"flex",gap:4,flexWrap:"wrap",marginTop:5}}>
                      {m.tags.slice(0,2).map(t => <span key={t} style={{fontSize:9,background:palette.primaryLight,color:palette.primary,padding:"1px 6px",borderRadius:99,fontWeight:700}}>#{t}</span>)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// FINANCES VIEW — Complete expense tracking system
// ══════════════════════════════════════════════════════════════

// ─── Finance constants ────────────────────────────────────────
const CURRENCIES_ALL = ["USD","IDR","JPY","EUR","GBP","AUD","SGD","MYR","THB","KRW","CNY","HKD","TWD","PHP","VND","CHF","CAD","NZD","AED","SAR","INR","BRL","MXN","ZAR"];

const DEFAULT_CATEGORIES = [
  { id:"food",          label:"Food & Drink",    emoji:"🍜", color:"#C97B84" },
  { id:"coffee",        label:"Coffee & Café",   emoji:"☕", color:"#C46E3A" },
  { id:"transport",     label:"Transport",       emoji:"🚄", color:"#5B8DAE" },
  { id:"accommodation", label:"Accommodation",   emoji:"🏨", color:"#7B6FA0" },
  { id:"attraction",    label:"Attractions",     emoji:"🎭", color:"#6B8F71" },
  { id:"shopping",      label:"Shopping",        emoji:"🛍️", color:"#D4A0A7" },
  { id:"groceries",     label:"Groceries",       emoji:"🛒", color:"#8A7B5C" },
  { id:"health",        label:"Health",          emoji:"💊", color:"#E05C5C" },
  { id:"misc",          label:"Miscellaneous",   emoji:"📦", color:"#9A8F92" },
];

const DEFAULT_WALLETS = [
  { id:"w1", name:"Cash", icon:"💵", type:"cash",   currency:"USD", balance:0, creditLimit:0, notes:"" },
  { id:"w2", name:"Credit Card", icon:"💳", type:"credit", currency:"USD", balance:0, creditLimit:2000, notes:"" },
];

const WALLET_ICONS = ["💵","💴","💶","💷","💳","🏦","📱","💰","🪙","💸","🎴","🔑"];
const WALLET_TYPES = [
  { v:"cash",   l:"Cash" },
  { v:"debit",  l:"Debit Card" },
  { v:"credit", l:"Credit Card" },
  { v:"travel", l:"Travel Card (e.g. Wise, Revolut)" },
  { v:"digital",l:"Digital Wallet (e.g. GoPay, Apple Pay)" },
];

// ─── Tiny chart component (no recharts needed) ────────────────
function MiniBar({ data, palette, height=80 }) {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div style={{ display:"flex", alignItems:"flex-end", gap:4, height, paddingTop:4 }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:3 }}>
          <div style={{ width:"100%", height: Math.max(4, Math.round((d.value/max)*height)), background:d.color||palette.primary, borderRadius:"4px 4px 0 0", transition:"height 0.3s", minHeight: d.value>0?4:0 }}/>
          <span style={{ fontSize:9, color:palette.muted, fontWeight:600, textAlign:"center", lineHeight:1.1, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", maxWidth:"100%" }}>{d.label}</span>
        </div>
      ))}
    </div>
  );
}

function DonutChart({ data, size=100, palette }) {
  if (!data || data.length === 0) return null;
  const total = data.reduce((s,d)=>s+d.value,0);
  if (total === 0) return null;
  let offset = 0;
  const r = 35, cx = 50, cy = 50, circ = 2*Math.PI*r;
  const slices = data.filter(d=>d.value>0).map(d => {
    const pct = d.value/total;
    const slice = { offset, pct, color:d.color, label:d.label, value:d.value };
    offset += pct;
    return slice;
  });
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      {slices.map((s,i) => (
        <circle key={i} r={r} cx={cx} cy={cy} fill="none" stroke={s.color} strokeWidth={18}
          strokeDasharray={`${s.pct*circ} ${circ}`}
          strokeDashoffset={-s.offset*circ}
          transform="rotate(-90 50 50)" style={{ transition:"stroke-dasharray 0.4s" }}/>
      ))}
      <circle r={22} cx={cx} cy={cy} fill="#fff"/>
    </svg>
  );
}

function SparkLine({ values, color, height=32 }) {
  if (!values || values.length < 2) return null;
  const max = Math.max(...values, 1);
  const w = 120, h = height;
  const pts = values.map((v,i) => `${(i/(values.length-1))*w},${h - (v/max)*h}`).join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ overflow:"visible" }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx={(values.length-1)/(values.length-1)*w} cy={h-(values[values.length-1]/max)*h} r={3} fill={color}/>
    </svg>
  );
}

// ─── Helpers ──────────────────────────────────────────────────
const fmtMoney = (n, currency) => {
  const num = parseFloat(n)||0;
  return `${currency||""} ${num.toLocaleString(undefined,{minimumFractionDigits:0,maximumFractionDigits:0})}`;
};
const fmtMoneyFull = (n, currency) => {
  const num = parseFloat(n)||0;
  return `${currency||""} ${num.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}`;
};

// ─── Main FinancesView ────────────────────────────────────────
function FinancesView({ trip, palette, onUpdate }) {
  const [tab, setTab]           = useState("overview");   // overview | transactions | wallets | analytics
  const [showAddExp, setShowAddExp] = useState(false);
  const [showAddWallet, setShowAddWallet] = useState(false);
  const [editExpId, setEditExpId]   = useState(null);
  const [editWalletId, setEditWalletId] = useState(null);
  const [delExpId, setDelExpId]     = useState(null);
  const [delWalletId, setDelWalletId] = useState(null);
  const [showAddCat, setShowAddCat] = useState(false);

  // Search/filter for transactions
  const [search, setSearch]         = useState("");
  const [filterCat, setFilterCat]   = useState("all");
  const [filterWallet, setFilterWallet] = useState("all");
  const [sortBy, setSortBy]         = useState("date_desc");

  // Data from trip — with defaults
  const expenses   = trip.expenses   || [];
  const wallets    = trip.wallets    || DEFAULT_WALLETS.map(w=>({...w,id:uid()}));
  const categories = trip.finCats    || DEFAULT_CATEGORIES;
  const baseCurrency = trip.baseCurrency || "USD";
  const budget     = trip.budget     || { amount:"", currency:baseCurrency };

  // Ensure wallets exist on first load
  useEffect(()=>{
    if (!(trip.wallets)) onUpdate("wallets", DEFAULT_WALLETS.map(w=>({...w,id:uid()})));
    if (!(trip.finCats)) onUpdate("finCats", DEFAULT_CATEGORIES);
  },[]);

  // ── blank forms ──
  const blankExp = () => ({
    date: new Date().toISOString().split("T")[0],
    time: new Date().toTimeString().slice(0,5),
    description:"", categoryId:"food", walletId: wallets[0]?.id||"",
    amount:"", currency: baseCurrency,
    convertedAmount:"", convertedCurrency: baseCurrency,
    location:"", notes:"", receiptData:null
  });
  const blankWallet = () => ({
    name:"", icon:"💵", type:"cash", currency: baseCurrency,
    balance:"", creditLimit:"", notes:""
  });

  const [ne, setNe] = useState(blankExp());
  const [nw, setNw] = useState(blankWallet());
  const [newCatName, setNewCatName] = useState("");
  const [newCatEmoji, setNewCatEmoji] = useState("📍");

  // ── Receipt upload ──
  const receiptRef = useRef();
  const readReceipt = (file) => new Promise(res=>{const r=new FileReader();r.onload=e=>res({name:file.name,type:file.type,data:e.target.result});r.readAsDataURL(file);});

  // ── Computed analytics ──
  const totalSpent = expenses.reduce((s,e)=>s+(parseFloat(e.convertedAmount||e.amount)||0),0);
  const budgetAmt  = parseFloat(budget.amount)||0;
  const remaining  = budgetAmt - totalSpent;
  const tripDays   = nightsBetween(trip.startDate,trip.endDate)||1;
  const expDays    = [...new Set(expenses.map(e=>e.date))].length||1;
  const dailyAvg   = totalSpent/expDays;

  // By category
  const byCat = categories.map(cat=>{
    const total = expenses.filter(e=>e.categoryId===cat.id).reduce((s,e)=>s+(parseFloat(e.convertedAmount||e.amount)||0),0);
    return {...cat, total};
  }).filter(c=>c.total>0).sort((a,b)=>b.total-a.total);

  // By wallet
  const byWallet = wallets.map(w=>{
    const txns = expenses.filter(e=>e.walletId===w.id);
    const spent = txns.reduce((s,e)=>s+(parseFloat(e.convertedAmount||e.amount)||0),0);
    return {...w, spent, txnCount:txns.length};
  });

  // Spending over time (last 14 days buckets)
  const last14 = Array.from({length:14},(_,i)=>{
    const d = new Date(); d.setDate(d.getDate()-13+i);
    return d.toISOString().split("T")[0];
  });
  const byDay = last14.map(d=>({
    label: new Date(d+"T00:00:00").toLocaleDateString("en-US",{month:"numeric",day:"numeric"}),
    value: expenses.filter(e=>e.date===d).reduce((s,e)=>s+(parseFloat(e.convertedAmount||e.amount)||0),0)
  }));

  // Filtered/sorted transactions
  const filtered = expenses
    .filter(e=>{
      if (filterCat!=="all" && e.categoryId!==filterCat) return false;
      if (filterWallet!=="all" && e.walletId!==filterWallet) return false;
      if (search && !e.description.toLowerCase().includes(search.toLowerCase()) && !(e.notes||"").toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    })
    .sort((a,b)=>{
      if (sortBy==="date_desc") return (b.date+b.time).localeCompare(a.date+a.time);
      if (sortBy==="date_asc")  return (a.date+a.time).localeCompare(b.date+b.time);
      if (sortBy==="amount_desc") return (parseFloat(b.amount)||0)-(parseFloat(a.amount)||0);
      if (sortBy==="amount_asc")  return (parseFloat(a.amount)||0)-(parseFloat(b.amount)||0);
      return 0;
    });

  // ── CRUD ──
  const saveExpense = async () => {
    if (!ne.description.trim()||!ne.amount) return;
    const exp = {
      ...ne, id:editExpId||uid(),
      amount:parseFloat(ne.amount),
      convertedAmount: parseFloat(ne.convertedAmount||ne.amount),
      convertedCurrency: ne.convertedCurrency||baseCurrency,
    };
    if (editExpId) { onUpdate("expenses",expenses.map(e=>e.id===editExpId?exp:e)); setEditExpId(null); }
    else           { onUpdate("expenses",[...expenses,exp]); }
    setShowAddExp(false); setNe(blankExp());
    // Update wallet balance for cash/debit
    const wallet = wallets.find(w=>w.id===exp.walletId);
    if (wallet && (wallet.type==="cash"||wallet.type==="debit")) {
      const oldExp = editExpId ? expenses.find(e=>e.id===editExpId) : null;
      const oldAmt = oldExp ? (parseFloat(oldExp.amount)||0) : 0;
      const newBal = (parseFloat(wallet.balance)||0) - (parseFloat(exp.amount)||0) + oldAmt;
      onUpdate("wallets", wallets.map(w=>w.id===wallet.id?{...w,balance:Math.max(0,newBal)}:w));
    }
  };

  const deleteExpense = (id) => {
    const exp = expenses.find(e=>e.id===id);
    onUpdate("expenses",expenses.filter(e=>e.id!==id));
    // Restore wallet balance
    if (exp) {
      const wallet = wallets.find(w=>w.id===exp.walletId);
      if (wallet && (wallet.type==="cash"||wallet.type==="debit")) {
        onUpdate("wallets",wallets.map(w=>w.id===wallet.id?{...w,balance:(parseFloat(w.balance)||0)+(parseFloat(exp.amount)||0)}:w));
      }
    }
    setDelExpId(null);
  };

  const saveWallet = () => {
    if (!nw.name.trim()) return;
    const w = {...nw, id:editWalletId||uid(), balance:parseFloat(nw.balance)||0, creditLimit:parseFloat(nw.creditLimit)||0};
    if (editWalletId) { onUpdate("wallets",wallets.map(x=>x.id===editWalletId?w:x)); setEditWalletId(null); }
    else              { onUpdate("wallets",[...wallets,w]); }
    setShowAddWallet(false); setNw(blankWallet());
  };

  const deleteWallet = (id) => { onUpdate("wallets",wallets.filter(w=>w.id!==id)); setDelWalletId(null); };

  const addCategory = () => {
    if (!newCatName.trim()) return;
    const cat = { id:"c_"+uid(), label:newCatName.trim(), emoji:newCatEmoji, color:palette.primary };
    onUpdate("finCats",[...categories,cat]);
    setNewCatName(""); setNewCatEmoji("📍"); setShowAddCat(false);
  };

  // ── Export ──
  const exportCSV = () => {
    const hdr = ["Date","Time","Description","Category","Wallet","Amount","Currency","Converted","Base Currency","Location","Notes"];
    const rows = expenses.map(e=>{
      const cat=categories.find(c=>c.id===e.categoryId); const w=wallets.find(w=>w.id===e.walletId);
      return [e.date,e.time||"",e.description,cat?.label||"",w?.name||"",e.amount,e.currency,e.convertedAmount||e.amount,baseCurrency,e.location||"",e.notes||""];
    });
    const csv=[hdr,...rows].map(r=>r.map(v=>`"${String(v||"").replace(/"/g,'""')}"`).join(",")).join("\n");
    const a=document.createElement("a");a.href="data:text/csv;charset=utf-8,"+encodeURIComponent(csv);a.download=`${trip.tripName}-expenses.csv`;a.click();
  };

  const exportXLSX = () => {
    const ws=XLSX.utils.json_to_sheet(expenses.map(e=>{
      const cat=categories.find(c=>c.id===e.categoryId);const w=wallets.find(w=>w.id===e.walletId);
      return {Date:e.date,Time:e.time||"",Description:e.description,Category:cat?.label||"",Wallet:w?.name||"",Amount:parseFloat(e.amount)||0,Currency:e.currency,"Converted Amount":parseFloat(e.convertedAmount||e.amount)||0,"Base Currency":baseCurrency,Location:e.location||"",Notes:e.notes||""};
    }));
    const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,"Expenses");
    const ws2=XLSX.utils.json_to_sheet(wallets.map(w=>({Name:w.name,Type:w.type,Currency:w.currency,Balance:w.balance,CreditLimit:w.creditLimit||0,Notes:w.notes||""})));
    XLSX.utils.book_append_sheet(wb,ws2,"Wallets");
    XLSX.writeFile(wb,`${trip.tripName}-finances.xlsx`);
  };

  const exportJSON = () => {
    const data={trip:trip.tripName,exportedAt:new Date().toISOString(),baseCurrency,budget,wallets:wallets.map(({receiptData,...w})=>w),categories,expenses:expenses.map(({receiptData,...e})=>e)};
    const a=document.createElement("a");a.href="data:application/json;charset=utf-8,"+encodeURIComponent(JSON.stringify(data,null,2));a.download=`${trip.tripName}-finances.json`;a.click();
  };

  // ─── Sub-sections ──────────────────────────────────────────

  const OverviewSection = () => (
    <div>
      {/* Budget progress */}
      <div style={{background:"#fff",borderRadius:18,border:`1px solid ${palette.border}`,padding:"16px 18px",marginBottom:14}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
          <div>
            <p style={{fontSize:11,fontWeight:800,color:palette.muted,textTransform:"uppercase",letterSpacing:"0.06em",margin:"0 0 4px"}}>Trip Budget</p>
            {budgetAmt>0
              ? <p style={{fontSize:22,fontWeight:800,color:palette.text,margin:0}}>{fmtMoney(budgetAmt,budget.currency)}</p>
              : <p style={{fontSize:14,color:palette.muted,margin:0}}>No budget set</p>
            }
          </div>
          <button onClick={()=>{ setTab("analytics"); }}
            style={{background:palette.primaryLight,color:palette.primary,border:"none",borderRadius:10,padding:"6px 14px",fontSize:12,fontWeight:700,cursor:"pointer"}}>Analytics →</button>
        </div>
        {/* Set budget inline */}
        <div style={{display:"flex",gap:8,marginBottom:budgetAmt>0?12:0}}>
          <input type="number" value={budget.amount||""} onChange={e=>onUpdate("budget",{...budget,amount:e.target.value})} placeholder="Set budget amount"
            style={{flex:1,border:`1px solid ${palette.border}`,borderRadius:10,padding:"8px 10px",fontSize:13,fontFamily:"inherit",outline:"none",background:"#FAF8F9",color:palette.text}}/>
          <select value={budget.currency||baseCurrency} onChange={e=>onUpdate("budget",{...budget,currency:e.target.value})}
            style={{width:80,border:`1px solid ${palette.border}`,borderRadius:10,padding:"8px 8px",fontSize:12,fontFamily:"inherit",outline:"none",background:"#FAF8F9",color:palette.text}}>
            {CURRENCIES_ALL.map(c=><option key={c}>{c}</option>)}
          </select>
        </div>
        {budgetAmt>0&&(()=>{
          const pct=Math.min(100,Math.round((totalSpent/budgetAmt)*100));
          const over=totalSpent>budgetAmt;
          return <>
            <div style={{height:10,background:"#F5F0F2",borderRadius:99,overflow:"hidden",marginBottom:8}}>
              <div style={{height:"100%",width:`${pct}%`,background:over?"#E05C5C":`linear-gradient(90deg,${palette.primary},${palette.accent})`,borderRadius:99,transition:"width 0.4s"}}/>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:12}}>
              <span style={{color:palette.muted}}>Spent: <strong style={{color:over?"#E05C5C":palette.text}}>{fmtMoney(totalSpent,budget.currency)}</strong></span>
              <span style={{color:over?"#E05C5C":palette.muted,fontWeight:700}}>{over?"Over budget!":`${pct}% used`}</span>
            </div>
          </>;
        })()}
      </div>

      {/* Stats grid */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
        {[
          ["💸","Total Spent",fmtMoney(totalSpent,baseCurrency)],
          ["📅","Daily Avg",fmtMoney(dailyAvg,baseCurrency)],
          ["💰","Remaining",budgetAmt>0?fmtMoney(Math.max(0,remaining),budget.currency):"—"],
          ["🧾","Transactions",expenses.length],
        ].map(([icon,label,val])=>(
          <div key={label} style={{background:"#fff",borderRadius:14,border:`1px solid ${palette.border}`,padding:"12px 14px"}}>
            <div style={{fontSize:20,marginBottom:3}}>{icon}</div>
            <div style={{fontSize:15,fontWeight:800,color:palette.text,lineHeight:1.2}}>{val}</div>
            <div style={{fontSize:11,color:palette.muted,fontWeight:600,marginTop:2}}>{label}</div>
          </div>
        ))}
      </div>

      {/* Top categories */}
      {byCat.length>0&&(
        <div style={{background:"#fff",borderRadius:18,border:`1px solid ${palette.border}`,padding:"14px 16px",marginBottom:14}}>
          <p style={{fontSize:11,fontWeight:800,color:palette.muted,textTransform:"uppercase",letterSpacing:"0.06em",margin:"0 0 12px"}}>Top Categories</p>
          {byCat.slice(0,5).map(cat=>{
            const pct=totalSpent>0?Math.round((cat.total/totalSpent)*100):0;
            return (
              <div key={cat.id} style={{marginBottom:10}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                  <span style={{fontSize:13,color:palette.text}}>{cat.emoji} {cat.label}</span>
                  <span style={{fontSize:13,fontWeight:700,color:palette.text}}>{fmtMoney(cat.total,baseCurrency)} <span style={{color:palette.muted,fontWeight:400}}>({pct}%)</span></span>
                </div>
                <div style={{height:6,background:"#F5F0F2",borderRadius:99,overflow:"hidden"}}>
                  <div style={{height:"100%",width:`${pct}%`,background:cat.color||palette.primary,borderRadius:99,transition:"width 0.4s"}}/>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Wallet summary */}
      <div style={{background:"#fff",borderRadius:18,border:`1px solid ${palette.border}`,padding:"14px 16px",marginBottom:14}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <p style={{fontSize:11,fontWeight:800,color:palette.muted,textTransform:"uppercase",letterSpacing:"0.06em",margin:0}}>Wallets</p>
          <button onClick={()=>setTab("wallets")} style={{background:"none",border:"none",color:palette.primary,fontSize:12,fontWeight:700,cursor:"pointer"}}>Manage →</button>
        </div>
        {wallets.map(w=>{
          const wData=byWallet.find(x=>x.id===w.id)||{spent:0,txnCount:0};
          const isCredit=w.type==="credit";
          const outstanding=isCredit?wData.spent:0;
          const availableCredit=isCredit?(parseFloat(w.creditLimit)||0)-outstanding:0;
          return (
            <div key={w.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:`1px solid ${palette.border}`}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <span style={{fontSize:22}}>{w.icon}</span>
                <div>
                  <p style={{fontSize:13,fontWeight:700,color:palette.text,margin:0}}>{w.name}</p>
                  <p style={{fontSize:11,color:palette.muted,margin:0}}>{wData.txnCount} transactions</p>
                </div>
              </div>
              <div style={{textAlign:"right"}}>
                {isCredit
                  ? <><p style={{fontSize:13,fontWeight:700,color:"#E05C5C",margin:0}}>{fmtMoney(outstanding,w.currency)} due</p><p style={{fontSize:11,color:palette.muted,margin:0}}>{fmtMoney(availableCredit,w.currency)} avail.</p></>
                  : <><p style={{fontSize:13,fontWeight:700,color:palette.text,margin:0}}>{fmtMoney(w.balance,w.currency)}</p><p style={{fontSize:11,color:palette.muted,margin:0}}>balance</p></>
                }
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent transactions */}
      {expenses.length>0&&(
        <div style={{background:"#fff",borderRadius:18,border:`1px solid ${palette.border}`,padding:"14px 16px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <p style={{fontSize:11,fontWeight:800,color:palette.muted,textTransform:"uppercase",letterSpacing:"0.06em",margin:0}}>Recent Transactions</p>
            <button onClick={()=>setTab("transactions")} style={{background:"none",border:"none",color:palette.primary,fontSize:12,fontWeight:700,cursor:"pointer"}}>All →</button>
          </div>
          {[...expenses].sort((a,b)=>(b.date+b.time).localeCompare(a.date+a.time)).slice(0,4).map(e=>{
            const cat=categories.find(c=>c.id===e.categoryId)||{emoji:"📦",label:"Other",color:"#9A8F92"};
            const w=wallets.find(w=>w.id===e.walletId);
            return (
              <div key={e.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:`1px solid ${palette.border}`}}>
                <div style={{width:36,height:36,borderRadius:10,background:cat.color+"22",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>{cat.emoji}</div>
                <div style={{flex:1,minWidth:0}}>
                  <p style={{fontSize:13,fontWeight:600,color:palette.text,margin:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{e.description}</p>
                  <p style={{fontSize:11,color:palette.muted,margin:0}}>{fmtDateShort(e.date)}{w?" · "+w.icon+" "+w.name:""}</p>
                </div>
                <p style={{fontSize:14,fontWeight:800,color:palette.text,margin:0,flexShrink:0}}>{fmtMoney(e.amount,e.currency)}</p>
              </div>
            );
          })}
        </div>
      )}

      {expenses.length===0&&(
        <div style={{textAlign:"center",padding:"40px 0",color:palette.muted}}>
          <div style={{fontSize:40,marginBottom:12}}>💸</div>
          <p style={{fontSize:16,fontWeight:700,color:palette.text,margin:"0 0 6px"}}>No expenses yet</p>
          <p style={{fontSize:13}}>Tap the + button to log your first expense</p>
        </div>
      )}
    </div>
  );

  const TransactionsSection = () => (
    <div>
      {/* Search + sort */}
      <div style={{display:"flex",alignItems:"center",background:"#fff",border:`1px solid ${palette.border}`,borderRadius:12,padding:"0 12px",marginBottom:8}}>
        <Search size={14} color={palette.muted}/>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search transactions…"
          style={{flex:1,border:"none",outline:"none",padding:"10px 8px",fontSize:13,fontFamily:"inherit",color:palette.text,background:"transparent"}}/>
        {search&&<button onClick={()=>setSearch("")} style={{background:"none",border:"none",cursor:"pointer",padding:0}}><X size={14} color={palette.muted}/></button>}
      </div>
      <div style={{display:"flex",gap:6,overflowX:"auto",marginBottom:8}}>
        <select value={filterCat} onChange={e=>setFilterCat(e.target.value)}
          style={{flexShrink:0,border:`1px solid ${palette.border}`,borderRadius:10,padding:"6px 10px",fontSize:12,fontFamily:"inherit",outline:"none",background:"#fff",color:palette.text}}>
          <option value="all">All categories</option>
          {categories.map(c=><option key={c.id} value={c.id}>{c.emoji} {c.label}</option>)}
        </select>
        <select value={filterWallet} onChange={e=>setFilterWallet(e.target.value)}
          style={{flexShrink:0,border:`1px solid ${palette.border}`,borderRadius:10,padding:"6px 10px",fontSize:12,fontFamily:"inherit",outline:"none",background:"#fff",color:palette.text}}>
          <option value="all">All wallets</option>
          {wallets.map(w=><option key={w.id} value={w.id}>{w.icon} {w.name}</option>)}
        </select>
        <select value={sortBy} onChange={e=>setSortBy(e.target.value)}
          style={{flexShrink:0,border:`1px solid ${palette.border}`,borderRadius:10,padding:"6px 10px",fontSize:12,fontFamily:"inherit",outline:"none",background:"#fff",color:palette.text}}>
          <option value="date_desc">Newest first</option>
          <option value="date_asc">Oldest first</option>
          <option value="amount_desc">Highest amount</option>
          <option value="amount_asc">Lowest amount</option>
        </select>
      </div>

      <p style={{fontSize:12,color:palette.muted,margin:"0 0 10px"}}>{filtered.length} transaction{filtered.length!==1?"s":""}</p>

      {filtered.length===0&&<div style={{textAlign:"center",padding:"40px 0",color:palette.muted}}><div style={{fontSize:32,marginBottom:8}}>🔍</div><p>No matching transactions</p></div>}

      {filtered.map(e=>{
        const cat=categories.find(c=>c.id===e.categoryId)||{emoji:"📦",label:"Other",color:"#9A8F92"};
        const w=wallets.find(w=>w.id===e.walletId);
        return (
          <div key={e.id} style={{background:"#fff",borderRadius:16,border:`1px solid ${palette.border}`,padding:"12px 14px",marginBottom:8}}>
            <div style={{display:"flex",alignItems:"flex-start",gap:10}}>
              <div style={{width:40,height:40,borderRadius:12,background:cat.color+"22",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>{cat.emoji}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                  <div style={{flex:1,minWidth:0}}>
                    <p style={{fontSize:14,fontWeight:700,color:palette.text,margin:"0 0 2px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{e.description}</p>
                    <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
                      <span style={{fontSize:11,background:cat.color+"22",color:cat.color,padding:"1px 7px",borderRadius:99,fontWeight:700}}>{cat.label}</span>
                      {w&&<span style={{fontSize:11,color:palette.muted}}>{w.icon} {w.name}</span>}
                      <span style={{fontSize:11,color:palette.muted}}>{e.date}{e.time?" "+e.time:""}</span>
                      {e.location&&<span style={{fontSize:11,color:palette.muted}}><MapPin size={9} style={{verticalAlign:-1}}/> {e.location}</span>}
                    </div>
                    {e.notes&&<p style={{fontSize:11,color:palette.muted,margin:"3px 0 0"}}>{e.notes}</p>}
                  </div>
                  <div style={{textAlign:"right",marginLeft:12,flexShrink:0}}>
                    <p style={{fontSize:16,fontWeight:800,color:palette.text,margin:"0 0 4px"}}>{fmtMoney(e.amount,e.currency)}</p>
                    {e.currency!==baseCurrency&&e.convertedAmount&&<p style={{fontSize:11,color:palette.muted,margin:0}}>≈ {fmtMoney(e.convertedAmount,baseCurrency)}</p>}
                    <div style={{display:"flex",gap:4,justifyContent:"flex-end",marginTop:4}}>
                      <button onClick={()=>{ setNe({...e,amount:String(e.amount),convertedAmount:String(e.convertedAmount||e.amount)}); setEditExpId(e.id); setShowAddExp(true); setTab("transactions"); }}
                        style={{background:palette.primaryLight,color:palette.primary,border:"none",borderRadius:7,padding:"3px 8px",fontSize:11,cursor:"pointer"}}><Edit3 size={10}/></button>
                      <button onClick={()=>setDelExpId(e.id)} style={{background:"#FDE8E8",color:"#9B2020",border:"none",borderRadius:7,padding:"3px 8px",fontSize:11,cursor:"pointer"}}><Trash2 size={10}/></button>
                    </div>
                  </div>
                </div>
                {e.receiptData&&<button onClick={()=>{ const a=document.createElement("a");a.href=e.receiptData.data;a.download=e.receiptData.name;a.click(); }}
                  style={{marginTop:6,display:"inline-flex",alignItems:"center",gap:4,background:"#F5F0F2",color:palette.muted,border:"none",borderRadius:7,padding:"4px 10px",fontSize:11,fontWeight:600,cursor:"pointer"}}>
                  🧾 {e.receiptData.name}
                </button>}
              </div>
            </div>
          </div>
        );
      })}

      {/* Export */}
      {expenses.length>0&&(
        <div style={{background:"#fff",borderRadius:16,border:`1px solid ${palette.border}`,padding:"12px 14px",marginTop:8}}>
          <p style={{fontSize:11,fontWeight:800,color:palette.muted,textTransform:"uppercase",letterSpacing:"0.06em",margin:"0 0 10px"}}>Export</p>
          <div style={{display:"flex",gap:8}}>
            <button onClick={exportCSV}  style={{flex:1,background:"#DFF0E1",color:"#3A6B42",border:"none",borderRadius:10,padding:"10px 0",fontSize:12,fontWeight:700,cursor:"pointer"}}>📄 CSV</button>
            <button onClick={exportXLSX} style={{flex:1,background:"#E3EDF5",color:"#2A567A",border:"none",borderRadius:10,padding:"10px 0",fontSize:12,fontWeight:700,cursor:"pointer"}}>📊 Excel</button>
            <button onClick={exportJSON} style={{flex:1,background:"#EEE8F8",color:"#5B4C8A",border:"none",borderRadius:10,padding:"10px 0",fontSize:12,fontWeight:700,cursor:"pointer"}}>🔗 JSON</button>
          </div>
        </div>
      )}
    </div>
  );

  const WalletsSection = () => (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <p style={{fontSize:13,color:palette.muted,margin:0}}>{wallets.length} payment method{wallets.length!==1?"s":""}</p>
        <button onClick={()=>{ setNw(blankWallet()); setEditWalletId(null); setShowAddWallet(true); }}
          style={{display:"flex",alignItems:"center",gap:6,background:palette.primary,color:"#fff",border:"none",borderRadius:12,padding:"8px 14px",fontSize:13,fontWeight:700,cursor:"pointer"}}>
          <Plus size={14}/>Add Wallet
        </button>
      </div>

      {/* Base currency setting */}
      <div style={{background:"#fff",borderRadius:14,border:`1px solid ${palette.border}`,padding:"12px 14px",marginBottom:14}}>
        <p style={{fontSize:11,fontWeight:800,color:palette.muted,textTransform:"uppercase",letterSpacing:"0.06em",margin:"0 0 8px"}}>Base Currency</p>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <p style={{fontSize:13,color:palette.text,margin:0,flex:1}}>All amounts will be shown in:</p>
          <select value={baseCurrency} onChange={e=>onUpdate("baseCurrency",e.target.value)}
            style={{border:`1px solid ${palette.border}`,borderRadius:10,padding:"7px 10px",fontSize:13,fontFamily:"inherit",outline:"none",background:"#FAF8F9",color:palette.text}}>
            {CURRENCIES_ALL.map(c=><option key={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {wallets.map(w=>{
        const wData=byWallet.find(x=>x.id===w.id)||{spent:0,txnCount:0};
        const isCredit=w.type==="credit";
        const outstanding=isCredit?wData.spent:0;
        const pct=isCredit&&w.creditLimit>0?Math.min(100,Math.round((outstanding/w.creditLimit)*100)):0;
        return (
          <div key={w.id} style={{background:"#fff",borderRadius:18,border:`1px solid ${palette.border}`,padding:"16px 18px",marginBottom:12}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <div style={{width:48,height:48,borderRadius:14,background:palette.primaryLight,display:"flex",alignItems:"center",justifyContent:"center",fontSize:26}}>{w.icon}</div>
                <div>
                  <h3 style={{fontSize:16,fontWeight:700,color:palette.text,margin:"0 0 2px"}}>{w.name}</h3>
                  <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                    <span style={{fontSize:11,background:"#F5F0F2",color:palette.muted,padding:"1px 7px",borderRadius:99,fontWeight:600}}>{WALLET_TYPES.find(t=>t.v===w.type)?.l||w.type}</span>
                    <span style={{fontSize:11,background:"#F5F0F2",color:palette.muted,padding:"1px 7px",borderRadius:99,fontWeight:600}}>{w.currency}</span>
                  </div>
                </div>
              </div>
              <div style={{display:"flex",gap:6}}>
                <button onClick={()=>{ setNw({...w,balance:String(w.balance),creditLimit:String(w.creditLimit||"")}); setEditWalletId(w.id); setShowAddWallet(true); }}
                  style={{background:palette.primaryLight,color:palette.primary,border:"none",borderRadius:8,padding:"6px 10px",cursor:"pointer"}}><Edit3 size={13}/></button>
                <button onClick={()=>setDelWalletId(w.id)} style={{background:"#FDE8E8",color:"#9B2020",border:"none",borderRadius:8,padding:"6px 10px",cursor:"pointer"}}><Trash2 size={13}/></button>
              </div>
            </div>

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:isCredit?12:0}}>
              {!isCredit&&<div style={{background:"#FAF8F9",borderRadius:10,padding:"10px 12px"}}><p style={{fontSize:10,fontWeight:700,color:palette.muted,margin:"0 0 2px"}}>BALANCE</p><p style={{fontSize:15,fontWeight:800,color:palette.text,margin:0}}>{fmtMoney(w.balance,w.currency)}</p></div>}
              {isCredit&&<div style={{background:"#FAF8F9",borderRadius:10,padding:"10px 12px"}}><p style={{fontSize:10,fontWeight:700,color:palette.muted,margin:"0 0 2px"}}>OUTSTANDING</p><p style={{fontSize:15,fontWeight:800,color:"#E05C5C",margin:0}}>{fmtMoney(outstanding,w.currency)}</p></div>}
              {isCredit&&<div style={{background:"#FAF8F9",borderRadius:10,padding:"10px 12px"}}><p style={{fontSize:10,fontWeight:700,color:palette.muted,margin:"0 0 2px"}}>LIMIT</p><p style={{fontSize:15,fontWeight:800,color:palette.text,margin:0}}>{fmtMoney(w.creditLimit,w.currency)}</p></div>}
              <div style={{background:"#FAF8F9",borderRadius:10,padding:"10px 12px"}}><p style={{fontSize:10,fontWeight:700,color:palette.muted,margin:"0 0 2px"}}>SPENT</p><p style={{fontSize:15,fontWeight:800,color:palette.primary,margin:0}}>{fmtMoney(wData.spent,w.currency)}</p></div>
              <div style={{background:"#FAF8F9",borderRadius:10,padding:"10px 12px"}}><p style={{fontSize:10,fontWeight:700,color:palette.muted,margin:"0 0 2px"}}>TXN</p><p style={{fontSize:15,fontWeight:800,color:palette.text,margin:0}}>{wData.txnCount}</p></div>
            </div>

            {isCredit&&w.creditLimit>0&&(
              <div>
                <div style={{height:8,background:"#F5F0F2",borderRadius:99,overflow:"hidden",marginBottom:6}}>
                  <div style={{height:"100%",width:`${pct}%`,background:pct>80?"#E05C5C":`linear-gradient(90deg,${palette.primary},${palette.accent})`,borderRadius:99,transition:"width 0.4s"}}/>
                </div>
                <p style={{fontSize:11,color:palette.muted,margin:0}}>{pct}% of credit limit used · {fmtMoney((parseFloat(w.creditLimit)||0)-outstanding,w.currency)} available</p>
              </div>
            )}
            {w.notes&&<p style={{fontSize:12,color:palette.muted,margin:"8px 0 0",lineHeight:1.4}}>{w.notes}</p>}
          </div>
        );
      })}

      {/* Categories */}
      <div style={{background:"#fff",borderRadius:18,border:`1px solid ${palette.border}`,padding:"14px 16px",marginTop:4}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <p style={{fontSize:11,fontWeight:800,color:palette.muted,textTransform:"uppercase",letterSpacing:"0.06em",margin:0}}>Expense Categories</p>
          <button onClick={()=>setShowAddCat(v=>!v)} style={{background:palette.primaryLight,color:palette.primary,border:"none",borderRadius:8,padding:"5px 12px",fontSize:12,fontWeight:700,cursor:"pointer"}}><Plus size={12}/> Add</button>
        </div>
        {showAddCat&&(
          <div style={{display:"flex",gap:8,marginBottom:12,alignItems:"center"}}>
            <input value={newCatEmoji} onChange={e=>setNewCatEmoji(e.target.value)} style={{width:44,border:`1px solid ${palette.border}`,borderRadius:10,padding:"8px",fontSize:16,textAlign:"center",outline:"none",background:"#FAF8F9"}}/>
            <input value={newCatName} onChange={e=>setNewCatName(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")addCategory();}} placeholder="Category name…" style={{flex:1,border:`1px solid ${palette.border}`,borderRadius:10,padding:"8px 10px",fontSize:13,fontFamily:"inherit",outline:"none",background:"#FAF8F9",color:palette.text}}/>
            <button onClick={addCategory} disabled={!newCatName.trim()} style={{background:newCatName.trim()?palette.primary:"#D0C8CA",color:"#fff",border:"none",borderRadius:10,padding:"8px 14px",fontSize:13,fontWeight:700,cursor:newCatName.trim()?"pointer":"not-allowed"}}>Add</button>
          </div>
        )}
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          {categories.map(cat=>(
            <div key={cat.id} style={{display:"flex",alignItems:"center",gap:5,background:cat.color+"18",border:`1px solid ${cat.color}33`,borderRadius:99,padding:"4px 10px 4px 8px"}}>
              <span style={{fontSize:14}}>{cat.emoji}</span>
              <span style={{fontSize:12,fontWeight:600,color:cat.color||palette.text}}>{cat.label}</span>
              {!DEFAULT_CATEGORIES.find(d=>d.id===cat.id)&&(
                <button onClick={()=>onUpdate("finCats",categories.filter(c=>c.id!==cat.id))} style={{background:"none",border:"none",cursor:"pointer",color:cat.color,fontSize:13,lineHeight:1,padding:"0 0 0 2px"}}>×</button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const AnalyticsSection = () => (
    <div>
      {/* Spending trend */}
      <div style={{background:"#fff",borderRadius:18,border:`1px solid ${palette.border}`,padding:"16px 18px",marginBottom:14}}>
        <p style={{fontSize:11,fontWeight:800,color:palette.muted,textTransform:"uppercase",letterSpacing:"0.06em",margin:"0 0 14px"}}>Spending Trend (Last 14 Days)</p>
        <MiniBar data={byDay} palette={palette} height={80}/>
      </div>

      {/* By category donut */}
      {byCat.length>0&&(
        <div style={{background:"#fff",borderRadius:18,border:`1px solid ${palette.border}`,padding:"16px 18px",marginBottom:14}}>
          <p style={{fontSize:11,fontWeight:800,color:palette.muted,textTransform:"uppercase",letterSpacing:"0.06em",margin:"0 0 14px"}}>Spending by Category</p>
          <div style={{display:"flex",alignItems:"center",gap:20}}>
            <DonutChart data={byCat.map(c=>({value:c.total,color:c.color,label:c.label}))} palette={palette} size={110}/>
            <div style={{flex:1}}>
              {byCat.slice(0,6).map(cat=>(
                <div key={cat.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    <div style={{width:10,height:10,borderRadius:"50%",background:cat.color,flexShrink:0}}/>
                    <span style={{fontSize:12,color:palette.text}}>{cat.emoji} {cat.label}</span>
                  </div>
                  <span style={{fontSize:12,fontWeight:700,color:palette.text}}>{fmtMoney(cat.total,baseCurrency)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* By wallet donut */}
      {byWallet.filter(w=>w.spent>0).length>0&&(
        <div style={{background:"#fff",borderRadius:18,border:`1px solid ${palette.border}`,padding:"16px 18px",marginBottom:14}}>
          <p style={{fontSize:11,fontWeight:800,color:palette.muted,textTransform:"uppercase",letterSpacing:"0.06em",margin:"0 0 14px"}}>Spending by Wallet</p>
          <div style={{display:"flex",alignItems:"center",gap:20}}>
            <DonutChart data={byWallet.filter(w=>w.spent>0).map((w,i)=>({value:w.spent,color:["#C97B84","#7B6FA0","#6B8F71","#C46E3A","#5B8DAE"][i%5],label:w.name}))} palette={palette} size={110}/>
            <div style={{flex:1}}>
              {byWallet.filter(w=>w.spent>0).map((w,i)=>(
                <div key={w.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    <div style={{width:10,height:10,borderRadius:"50%",background:["#C97B84","#7B6FA0","#6B8F71","#C46E3A","#5B8DAE"][i%5],flexShrink:0}}/>
                    <span style={{fontSize:12,color:palette.text}}>{w.icon} {w.name}</span>
                  </div>
                  <span style={{fontSize:12,fontWeight:700,color:palette.text}}>{fmtMoney(w.spent,w.currency)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div style={{background:"#fff",borderRadius:18,border:`1px solid ${palette.border}`,padding:"16px 18px"}}>
        <p style={{fontSize:11,fontWeight:800,color:palette.muted,textTransform:"uppercase",letterSpacing:"0.06em",margin:"0 0 12px"}}>Trip Statistics</p>
        {[
          ["Total Spent",fmtMoneyFull(totalSpent,baseCurrency)],
          ["Daily Average",fmtMoneyFull(dailyAvg,baseCurrency)],
          ["Highest Single Expense", fmtMoneyFull(Math.max(...expenses.map(e=>parseFloat(e.amount)||0),0),baseCurrency)],
          ["Most Used Category", byCat[0]?`${byCat[0].emoji} ${byCat[0].label}`:"—"],
          ["Days with Expenses",String([...new Set(expenses.map(e=>e.date))].length)],
          ["Currencies Used",[...new Set(expenses.map(e=>e.currency))].join(", ")||"—"],
        ].map(([label,val])=>(
          <div key={label} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:`1px solid ${palette.border}`}}>
            <span style={{fontSize:13,color:palette.muted}}>{label}</span>
            <span style={{fontSize:13,fontWeight:700,color:palette.text}}>{val}</span>
          </div>
        ))}
      </div>
    </div>
  );

  // ── Add Expense Form ──────────────────────────────────────────
  const AddExpenseForm = () => (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:2000,display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
      <div style={{background:"#fff",borderRadius:"24px 24px 0 0",width:"100%",maxWidth:680,maxHeight:"90vh",overflowY:"auto",padding:"24px 20px 40px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
          <h3 style={{fontSize:18,fontWeight:700,color:palette.text,margin:0,fontFamily:"'Playfair Display',serif"}}>{editExpId?"Edit":"Add"} Expense</h3>
          <button onClick={()=>{ setShowAddExp(false); setEditExpId(null); setNe(blankExp()); }} style={{background:"#F5F0F2",border:"none",borderRadius:"50%",width:32,height:32,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}><X size={16} color={palette.muted}/></button>
        </div>

        <Inp label="Description" value={ne.description} placeholder="What did you spend on?" onChange={v=>setNe(p=>({...p,description:v}))}/>
        <div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:8}}>
          <Inp label="Amount" type="number" value={ne.amount} placeholder="0.00" onChange={v=>setNe(p=>({...p,amount:v,convertedAmount:v}))}/>
          <Inp label="Currency" value={ne.currency} opts={CURRENCIES_ALL} onChange={v=>setNe(p=>({...p,currency:v}))}/>
        </div>

        {ne.currency!==baseCurrency&&(
          <div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:8}}>
            <Inp label={`Converted to ${baseCurrency}`} type="number" value={ne.convertedAmount} placeholder="0.00" onChange={v=>setNe(p=>({...p,convertedAmount:v}))}/>
            <Inp label="Base" value={baseCurrency} opts={[baseCurrency]} onChange={()=>{}}/>
          </div>
        )}

        {/* Category picker */}
        <div style={{marginBottom:12}}>
          <label style={{fontSize:11,fontWeight:700,color:"#9A8F92",display:"block",marginBottom:8,textTransform:"uppercase",letterSpacing:"0.05em"}}>Category</label>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(80px,1fr))",gap:6}}>
            {categories.map(cat=>(
              <button key={cat.id} onClick={()=>setNe(p=>({...p,categoryId:cat.id}))}
                style={{padding:"8px 6px",borderRadius:12,border:`2px solid ${ne.categoryId===cat.id?cat.color:"transparent"}`,background:ne.categoryId===cat.id?cat.color+"22":"#FAF8F9",cursor:"pointer",textAlign:"center"}}>
                <div style={{fontSize:20,marginBottom:2}}>{cat.emoji}</div>
                <div style={{fontSize:9,color:ne.categoryId===cat.id?(cat.color||palette.primary):palette.muted,fontWeight:700,lineHeight:1.2}}>{cat.label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Wallet picker */}
        <div style={{marginBottom:12}}>
          <label style={{fontSize:11,fontWeight:700,color:"#9A8F92",display:"block",marginBottom:8,textTransform:"uppercase",letterSpacing:"0.05em"}}>Payment Method *</label>
          <div style={{display:"flex",gap:8,overflowX:"auto",paddingBottom:4}}>
            {wallets.map(w=>(
              <button key={w.id} onClick={()=>setNe(p=>({...p,walletId:w.id}))}
                style={{flexShrink:0,padding:"10px 14px",borderRadius:14,border:`2px solid ${ne.walletId===w.id?palette.primary:"transparent"}`,background:ne.walletId===w.id?palette.primaryLight:"#FAF8F9",cursor:"pointer",textAlign:"center",minWidth:72}}>
                <div style={{fontSize:22,marginBottom:3}}>{w.icon}</div>
                <div style={{fontSize:10,fontWeight:700,color:ne.walletId===w.id?palette.primary:palette.muted,whiteSpace:"nowrap"}}>{w.name}</div>
                {(w.type==="cash"||w.type==="debit")&&<div style={{fontSize:9,color:palette.muted,marginTop:1}}>{fmtMoney(w.balance,w.currency)}</div>}
              </button>
            ))}
          </div>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          <Inp label="Date" type="date" value={ne.date} onChange={v=>setNe(p=>({...p,date:v}))}/>
          <Inp label="Time" type="time" value={ne.time} onChange={v=>setNe(p=>({...p,time:v}))}/>
        </div>
        <Inp label="Location (optional)" value={ne.location||""} placeholder="Restaurant name, city…" onChange={v=>setNe(p=>({...p,location:v}))}/>
        <Inp label="Notes (optional)" value={ne.notes||""} placeholder="Extra details…" onChange={v=>setNe(p=>({...p,notes:v}))} multi rows={2}/>

        {/* Receipt */}
        <div style={{marginBottom:16}}>
          <label style={{fontSize:11,fontWeight:700,color:"#9A8F92",display:"block",marginBottom:8,textTransform:"uppercase",letterSpacing:"0.05em"}}>Receipt (optional)</label>
          {ne.receiptData
            ? <div style={{display:"flex",alignItems:"center",gap:8,background:"#FAF8F9",borderRadius:10,padding:"8px 12px",border:`1px solid ${palette.border}`}}>
                <span style={{fontSize:16}}>🧾</span>
                <span style={{flex:1,fontSize:12,fontWeight:600,color:palette.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{ne.receiptData.name}</span>
                <button onClick={()=>setNe(p=>({...p,receiptData:null}))} style={{background:"#FDE8E8",color:"#9B2020",border:"none",borderRadius:7,padding:"4px 8px",fontSize:11,cursor:"pointer"}}>✕</button>
              </div>
            : <button onClick={()=>receiptRef.current.click()} style={{display:"flex",alignItems:"center",gap:6,background:"#F5F0F2",color:"#9A8F92",border:"1px dashed #D0C8CA",borderRadius:10,padding:"9px 14px",fontSize:12,fontWeight:700,cursor:"pointer"}}>
                <Camera size={13}/>Attach receipt
              </button>
          }
          <input ref={receiptRef} type="file" accept="image/*,.pdf" style={{display:"none"}} onChange={async e=>{ if(e.target.files[0]){const r=await new Promise(res=>{const fr=new FileReader();fr.onload=ev=>res({name:e.target.files[0].name,type:e.target.files[0].type,data:ev.target.result});fr.readAsDataURL(e.target.files[0]);});setNe(p=>({...p,receiptData:r}));}}}/>
        </div>

        <div style={{display:"flex",gap:8}}>
          <button onClick={saveExpense} disabled={!ne.description.trim()||!ne.amount||!ne.walletId}
            style={{flex:1,background:(ne.description.trim()&&ne.amount&&ne.walletId)?palette.primary:"#D0C8CA",color:"#fff",border:"none",borderRadius:12,padding:"13px 0",fontSize:14,fontWeight:700,cursor:(ne.description.trim()&&ne.amount&&ne.walletId)?"pointer":"not-allowed"}}>
            {editExpId?"Save Changes":"Add Expense"}
          </button>
        </div>
      </div>
    </div>
  );

  // ── Add Wallet Form ───────────────────────────────────────────
  const AddWalletForm = () => (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:2000,display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
      <div style={{background:"#fff",borderRadius:"24px 24px 0 0",width:"100%",maxWidth:680,maxHeight:"85vh",overflowY:"auto",padding:"24px 20px 40px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
          <h3 style={{fontSize:18,fontWeight:700,color:palette.text,margin:0,fontFamily:"'Playfair Display',serif"}}>{editWalletId?"Edit":"Add"} Wallet</h3>
          <button onClick={()=>{ setShowAddWallet(false); setEditWalletId(null); setNw(blankWallet()); }} style={{background:"#F5F0F2",border:"none",borderRadius:"50%",width:32,height:32,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}><X size={16} color={palette.muted}/></button>
        </div>

        {/* Icon picker */}
        <div style={{marginBottom:12}}>
          <label style={{fontSize:11,fontWeight:700,color:"#9A8F92",display:"block",marginBottom:8,textTransform:"uppercase",letterSpacing:"0.05em"}}>Icon</label>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            {WALLET_ICONS.map(icon=>(
              <button key={icon} onClick={()=>setNw(p=>({...p,icon}))}
                style={{width:44,height:44,borderRadius:12,border:`2px solid ${nw.icon===icon?palette.primary:"transparent"}`,background:nw.icon===icon?palette.primaryLight:"#FAF8F9",fontSize:22,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
                {icon}
              </button>
            ))}
          </div>
        </div>

        <Inp label="Name" value={nw.name} placeholder="e.g. Wise Card, Cash EUR…" onChange={v=>setNw(p=>({...p,name:v}))}/>
        <Inp label="Type" value={nw.type} opts={WALLET_TYPES} onChange={v=>setNw(p=>({...p,type:v}))}/>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          <Inp label="Currency" value={nw.currency} opts={CURRENCIES_ALL} onChange={v=>setNw(p=>({...p,currency:v}))}/>
          {(nw.type==="cash"||nw.type==="debit"||nw.type==="travel")
            ? <Inp label="Starting Balance" type="number" value={nw.balance} placeholder="0.00" onChange={v=>setNw(p=>({...p,balance:v}))}/>
            : nw.type==="credit"
            ? <Inp label="Credit Limit" type="number" value={nw.creditLimit} placeholder="0.00" onChange={v=>setNw(p=>({...p,creditLimit:v}))}/>
            : <div/>
          }
        </div>
        <Inp label="Notes (optional)" value={nw.notes} placeholder="e.g. Mastercard ending 1234" onChange={v=>setNw(p=>({...p,notes:v}))} multi rows={2}/>

        <div style={{display:"flex",gap:8}}>
          <button onClick={saveWallet} disabled={!nw.name.trim()}
            style={{flex:1,background:nw.name.trim()?palette.primary:"#D0C8CA",color:"#fff",border:"none",borderRadius:12,padding:"13px 0",fontSize:14,fontWeight:700,cursor:nw.name.trim()?"pointer":"not-allowed"}}>
            {editWalletId?"Save Changes":"Add Wallet"}
          </button>
        </div>
      </div>
    </div>
  );

  // ── DESKTOP layout ────────────────────────────────────────────
  const DesktopLayout = () => (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <div>
          <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:24,fontWeight:700,color:palette.text,margin:"0 0 4px"}}>Finances</h2>
          <p style={{color:palette.muted,fontSize:13,margin:0}}>{expenses.length} expense{expenses.length!==1?"s":""} · {fmtMoney(totalSpent,baseCurrency)} total spent</p>
        </div>
        <button onClick={()=>{ setNe(blankExp()); setEditExpId(null); setShowAddExp(true); }}
          style={{display:"flex",alignItems:"center",gap:8,background:palette.primary,color:"#fff",border:"none",borderRadius:12,padding:"11px 20px",fontSize:14,fontWeight:700,cursor:"pointer",boxShadow:`0 4px 16px ${palette.primary}44`}}>
          <Plus size={16}/>Add Expense
        </button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"300px 1fr 320px",gap:16,alignItems:"start"}}>
        {/* Col 1: summary + wallets */}
        <div>
          {/* Budget */}
          <div style={{background:"#fff",borderRadius:18,border:`1px solid ${palette.border}`,padding:"16px",marginBottom:14}}>
            <p style={{fontSize:11,fontWeight:800,color:palette.muted,textTransform:"uppercase",letterSpacing:"0.06em",margin:"0 0 10px"}}>Budget</p>
            <div style={{display:"flex",gap:8,marginBottom:12}}>
              <input type="number" value={budget.amount||""} onChange={e=>onUpdate("budget",{...budget,amount:e.target.value})} placeholder="Set budget"
                style={{flex:1,border:`1px solid ${palette.border}`,borderRadius:10,padding:"8px 10px",fontSize:13,fontFamily:"inherit",outline:"none",background:"#FAF8F9",color:palette.text}}/>
              <select value={budget.currency||baseCurrency} onChange={e=>onUpdate("budget",{...budget,currency:e.target.value})}
                style={{width:76,border:`1px solid ${palette.border}`,borderRadius:10,padding:"8px",fontSize:12,fontFamily:"inherit",outline:"none",background:"#FAF8F9",color:palette.text}}>
                {CURRENCIES_ALL.map(c=><option key={c}>{c}</option>)}
              </select>
            </div>
            {budgetAmt>0&&(()=>{
              const pct=Math.min(100,Math.round((totalSpent/budgetAmt)*100));const over=totalSpent>budgetAmt;
              return <>
                <div style={{height:8,background:"#F5F0F2",borderRadius:99,overflow:"hidden",marginBottom:6}}><div style={{height:"100%",width:`${pct}%`,background:over?"#E05C5C":`linear-gradient(90deg,${palette.primary},${palette.accent})`,borderRadius:99,transition:"width 0.4s"}}/></div>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:11}}>
                  <span style={{color:palette.muted}}>Spent: <strong style={{color:over?"#E05C5C":palette.text}}>{fmtMoney(totalSpent,budget.currency)}</strong></span>
                  <span style={{color:over?"#E05C5C":palette.muted,fontWeight:700}}>{over?"Over!":pct+"%"}</span>
                </div>
              </>;
            })()}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:12}}>
              {[["💸","Spent",fmtMoney(totalSpent,baseCurrency)],["📅","Daily avg",fmtMoney(dailyAvg,baseCurrency)],["💰","Left",budgetAmt>0?fmtMoney(Math.max(0,remaining),budget.currency):"—"],["🧾","Txns",expenses.length]].map(([icon,label,val])=>(
                <div key={label} style={{background:"#FAF8F9",borderRadius:10,padding:"10px"}}>
                  <div style={{fontSize:16,marginBottom:2}}>{icon}</div>
                  <div style={{fontSize:13,fontWeight:800,color:palette.text}}>{val}</div>
                  <div style={{fontSize:10,color:palette.muted,fontWeight:600}}>{label}</div>
                </div>
              ))}
            </div>
          </div>
          {/* Wallets */}
          <div style={{background:"#fff",borderRadius:18,border:`1px solid ${palette.border}`,padding:"16px",marginBottom:14}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <p style={{fontSize:11,fontWeight:800,color:palette.muted,textTransform:"uppercase",letterSpacing:"0.06em",margin:0}}>Wallets</p>
              <button onClick={()=>{ setNw(blankWallet()); setEditWalletId(null); setShowAddWallet(true); }} style={{background:palette.primaryLight,color:palette.primary,border:"none",borderRadius:8,padding:"4px 10px",fontSize:11,fontWeight:700,cursor:"pointer"}}><Plus size={11}/> Add</button>
            </div>
            {wallets.map(w=>{
              const wData=byWallet.find(x=>x.id===w.id)||{spent:0};const isCredit=w.type==="credit";
              return (
                <div key={w.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:`1px solid ${palette.border}`}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <span style={{fontSize:20}}>{w.icon}</span>
                    <div><p style={{fontSize:12,fontWeight:700,color:palette.text,margin:0}}>{w.name}</p><p style={{fontSize:10,color:palette.muted,margin:0}}>{w.currency}</p></div>
                  </div>
                  <div style={{textAlign:"right",display:"flex",gap:6,alignItems:"center"}}>
                    <div>{isCredit
                      ?<><p style={{fontSize:12,fontWeight:700,color:"#E05C5C",margin:0}}>{fmtMoney(wData.spent,w.currency)}</p><p style={{fontSize:10,color:palette.muted,margin:0}}>due</p></>
                      :<><p style={{fontSize:12,fontWeight:700,color:palette.text,margin:0}}>{fmtMoney(w.balance,w.currency)}</p><p style={{fontSize:10,color:palette.muted,margin:0}}>balance</p></>
                    }</div>
                    <button onClick={()=>{ setNw({...w,balance:String(w.balance),creditLimit:String(w.creditLimit||"")}); setEditWalletId(w.id); setShowAddWallet(true); }} style={{background:palette.primaryLight,color:palette.primary,border:"none",borderRadius:7,padding:"4px 7px",cursor:"pointer",fontSize:10}}><Edit3 size={10}/></button>
                  </div>
                </div>
              );
            })}
          </div>
          {/* Category breakdown */}
          {byCat.length>0&&(
            <div style={{background:"#fff",borderRadius:18,border:`1px solid ${palette.border}`,padding:"16px"}}>
              <p style={{fontSize:11,fontWeight:800,color:palette.muted,textTransform:"uppercase",letterSpacing:"0.06em",margin:"0 0 10px"}}>By Category</p>
              {byCat.slice(0,6).map(cat=>{const pct=totalSpent>0?Math.round((cat.total/totalSpent)*100):0;return(
                <div key={cat.id} style={{marginBottom:8}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                    <span style={{fontSize:12,color:palette.text}}>{cat.emoji} {cat.label}</span>
                    <span style={{fontSize:12,fontWeight:700,color:palette.text}}>{fmtMoney(cat.total,baseCurrency)}</span>
                  </div>
                  <div style={{height:5,background:"#F5F0F2",borderRadius:99,overflow:"hidden"}}><div style={{height:"100%",width:`${pct}%`,background:cat.color,borderRadius:99}}/></div>
                </div>
              );})}
            </div>
          )}
        </div>

        {/* Col 2: charts */}
        <div>
          <div style={{background:"#fff",borderRadius:18,border:`1px solid ${palette.border}`,padding:"16px",marginBottom:14}}>
            <p style={{fontSize:11,fontWeight:800,color:palette.muted,textTransform:"uppercase",letterSpacing:"0.06em",margin:"0 0 14px"}}>Spending Trend (Last 14 Days)</p>
            <MiniBar data={byDay} palette={palette} height={120}/>
          </div>
          {byCat.length>0&&(
            <div style={{background:"#fff",borderRadius:18,border:`1px solid ${palette.border}`,padding:"16px",marginBottom:14}}>
              <p style={{fontSize:11,fontWeight:800,color:palette.muted,textTransform:"uppercase",letterSpacing:"0.06em",margin:"0 0 14px"}}>Spending by Category</p>
              <div style={{display:"flex",alignItems:"center",gap:24}}>
                <DonutChart data={byCat.map(c=>({value:c.total,color:c.color,label:c.label}))} palette={palette} size={130}/>
                <div style={{flex:1}}>
                  {byCat.map(cat=>(
                    <div key={cat.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                      <div style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:10,height:10,borderRadius:"50%",background:cat.color}}/><span style={{fontSize:12,color:palette.text}}>{cat.emoji} {cat.label}</span></div>
                      <span style={{fontSize:12,fontWeight:700,color:palette.text}}>{fmtMoney(cat.total,baseCurrency)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          {/* Export */}
          {expenses.length>0&&(
            <div style={{background:"#fff",borderRadius:18,border:`1px solid ${palette.border}`,padding:"16px"}}>
              <p style={{fontSize:11,fontWeight:800,color:palette.muted,textTransform:"uppercase",letterSpacing:"0.06em",margin:"0 0 10px"}}>Export</p>
              <div style={{display:"flex",gap:8}}>
                <button onClick={exportCSV} style={{flex:1,background:"#DFF0E1",color:"#3A6B42",border:"none",borderRadius:10,padding:"10px 0",fontSize:12,fontWeight:700,cursor:"pointer"}}>📄 CSV</button>
                <button onClick={exportXLSX} style={{flex:1,background:"#E3EDF5",color:"#2A567A",border:"none",borderRadius:10,padding:"10px 0",fontSize:12,fontWeight:700,cursor:"pointer"}}>📊 Excel</button>
                <button onClick={exportJSON} style={{flex:1,background:"#EEE8F8",color:"#5B4C8A",border:"none",borderRadius:10,padding:"10px 0",fontSize:12,fontWeight:700,cursor:"pointer"}}>🔗 JSON</button>
              </div>
            </div>
          )}
        </div>

        {/* Col 3: transactions */}
        <div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <p style={{fontSize:11,fontWeight:800,color:palette.muted,textTransform:"uppercase",letterSpacing:"0.06em",margin:0}}>Transactions ({filtered.length})</p>
          </div>
          <div style={{display:"flex",gap:6,marginBottom:8}}>
            <div style={{display:"flex",alignItems:"center",flex:1,background:"#fff",border:`1px solid ${palette.border}`,borderRadius:10,padding:"0 10px"}}>
              <Search size={12} color={palette.muted}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search…" style={{flex:1,border:"none",outline:"none",padding:"8px 6px",fontSize:12,fontFamily:"inherit",background:"transparent",color:palette.text}}/>
            </div>
            <select value={filterCat} onChange={e=>setFilterCat(e.target.value)} style={{border:`1px solid ${palette.border}`,borderRadius:10,padding:"6px 8px",fontSize:11,fontFamily:"inherit",outline:"none",background:"#fff",color:palette.text}}>
              <option value="all">All cats</option>
              {categories.map(c=><option key={c.id} value={c.id}>{c.emoji}</option>)}
            </select>
            <select value={filterWallet} onChange={e=>setFilterWallet(e.target.value)} style={{border:`1px solid ${palette.border}`,borderRadius:10,padding:"6px 8px",fontSize:11,fontFamily:"inherit",outline:"none",background:"#fff",color:palette.text}}>
              <option value="all">All</option>
              {wallets.map(w=><option key={w.id} value={w.id}>{w.icon}</option>)}
            </select>
          </div>
          <div style={{maxHeight:600,overflowY:"auto"}}>
            {filtered.length===0&&<div style={{textAlign:"center",padding:"30px 0",color:palette.muted}}><p style={{fontSize:13}}>No transactions</p></div>}
            {filtered.map(e=>{
              const cat=categories.find(c=>c.id===e.categoryId)||{emoji:"📦",color:"#9A8F92",label:"Other"};
              const w=wallets.find(w=>w.id===e.walletId);
              return (
                <div key={e.id} style={{display:"flex",alignItems:"flex-start",gap:8,padding:"10px 12px",background:"#fff",borderRadius:12,border:`1px solid ${palette.border}`,marginBottom:6}}>
                  <div style={{width:32,height:32,borderRadius:9,background:cat.color+"22",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>{cat.emoji}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <p style={{fontSize:12,fontWeight:700,color:palette.text,margin:"0 0 1px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{e.description}</p>
                    <p style={{fontSize:10,color:palette.muted,margin:0}}>{e.date}{w?" · "+w.icon:""}{e.location?" · "+e.location:""}</p>
                  </div>
                  <div style={{textAlign:"right",flexShrink:0}}>
                    <p style={{fontSize:13,fontWeight:800,color:palette.text,margin:"0 0 3px"}}>{fmtMoney(e.amount,e.currency)}</p>
                    <div style={{display:"flex",gap:3}}>
                      <button onClick={()=>{ setNe({...e,amount:String(e.amount),convertedAmount:String(e.convertedAmount||e.amount)}); setEditExpId(e.id); setShowAddExp(true); }} style={{background:palette.primaryLight,color:palette.primary,border:"none",borderRadius:6,padding:"2px 6px",fontSize:10,cursor:"pointer"}}><Edit3 size={9}/></button>
                      <button onClick={()=>setDelExpId(e.id)} style={{background:"#FDE8E8",color:"#9B2020",border:"none",borderRadius:6,padding:"2px 6px",fontSize:10,cursor:"pointer"}}><Trash2 size={9}/></button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );

  // ── MOBILE layout ─────────────────────────────────────────────
  const MobileLayout = () => {
    const TABS=[{id:"overview",l:"Overview",Icon:Home},{id:"transactions",l:"Transactions",Icon:Search},{id:"wallets",l:"Wallets",Icon:Hotel},{id:"analytics",l:"Analytics",Icon:Star}];
    return (
      <div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <div>
            <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:24,fontWeight:700,color:palette.text,margin:"0 0 4px"}}>Finances</h2>
            <p style={{color:palette.muted,fontSize:13,margin:0}}>{fmtMoney(totalSpent,baseCurrency)} spent</p>
          </div>
        </div>
        {/* Sub-nav tabs */}
        <div style={{display:"flex",gap:6,marginBottom:16,overflowX:"auto",paddingBottom:2}}>
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)} style={{flexShrink:0,display:"flex",alignItems:"center",gap:5,padding:"8px 14px",borderRadius:99,border:"none",fontSize:12,fontWeight:700,cursor:"pointer",background:tab===t.id?palette.primary:palette.primaryLight,color:tab===t.id?"#fff":palette.primary}}>
              <t.Icon size={13}/>{t.l}
            </button>
          ))}
        </div>
        {tab==="overview"&&<OverviewSection/>}
        {tab==="transactions"&&<TransactionsSection/>}
        {tab==="wallets"&&<WalletsSection/>}
        {tab==="analytics"&&<AnalyticsSection/>}
      </div>
    );
  };

  // ── Render ─────────────────────────────────────────────────────
  return (
    <div style={{padding:"20px 16px 40px",position:"relative"}}>
      {delExpId&&<Confirm message="Delete this expense?" onOk={()=>deleteExpense(delExpId)} onNo={()=>setDelExpId(null)}/>}
      {delWalletId&&<Confirm message="Delete this wallet? Expense records will remain." onOk={()=>deleteWallet(delWalletId)} onNo={()=>setDelWalletId(null)}/>}
      {showAddExp&&<AddExpenseForm/>}
      {showAddWallet&&<AddWalletForm/>}

      {/* Responsive: desktop vs mobile */}
      <style>{`.fin-desktop{display:none}.fin-mobile{display:block}@media(min-width:900px){.fin-desktop{display:block}.fin-mobile{display:none}}`}</style>
      <div className="fin-desktop"><DesktopLayout/></div>
      <div className="fin-mobile"><MobileLayout/></div>

      {/* Floating + button (mobile only) */}
      <style>{`@media(min-width:900px){.fin-fab{display:none!important}}`}</style>
      <button className="fin-fab" onClick={()=>{ setNe(blankExp()); setEditExpId(null); setShowAddExp(true); }}
        style={{position:"fixed",bottom:90,right:20,width:56,height:56,borderRadius:"50%",background:`linear-gradient(135deg,${palette.primary},${palette.accent})`,color:"#fff",border:"none",fontSize:28,cursor:"pointer",boxShadow:`0 6px 24px ${palette.primary}66`,display:"flex",alignItems:"center",justifyContent:"center",zIndex:100}}>
        <Plus size={24}/>
      </button>
    </div>
  );
}
function SettingsView({ trip, palette, paletteName, setPaletteName, onUpdate, onReset, onImportNew }) {
  const [edit,setEdit]=useState(false);
  const [tn,setTn]=useState(trip.tripName);
  const [sd,setSd]=useState(trip.startDate);
  const [ed,setEd]=useState(trip.endDate);
  const [confirmReset,setConfirmReset]=useState(false);
  const save=()=>{onUpdate("meta",{tripName:tn,startDate:sd,endDate:ed});setEdit(false);};
  return (
    <div style={{padding:"20px 16px 40px"}}>
      {confirmReset&&<Confirm message="Permanently delete this trip and all data?" onOk={()=>{setConfirmReset(false);onReset();}} onNo={()=>setConfirmReset(false)}/>}
      <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:24,fontWeight:700,color:palette.text,margin:"0 0 20px"}}>Settings</h2>
      <div style={{background:"#fff",borderRadius:20,border:`1px solid ${palette.border}`,padding:20,marginBottom:14}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
          <p style={{fontSize:14,fontWeight:700,color:palette.text,margin:0}}>Trip Info</p>
          <button onClick={()=>{setTn(trip.tripName);setSd(trip.startDate);setEd(trip.endDate);setEdit(v=>!v);}} style={{background:palette.primaryLight,color:palette.primary,border:"none",borderRadius:8,padding:"6px 14px",fontSize:12,fontWeight:700,cursor:"pointer"}}>{edit?"Cancel":"Edit"}</button>
        </div>
        {edit?(<>
          <Inp label="Trip Name" value={tn} onChange={setTn}/>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}><Inp label="Start" type="date" value={sd} onChange={setSd}/><Inp label="End" type="date" value={ed} onChange={setEd}/></div>
          <button onClick={save} style={{background:palette.primary,color:"#fff",border:"none",borderRadius:10,padding:"10px 20px",fontSize:13,fontWeight:700,cursor:"pointer"}}>Save</button>
        </>):(
          <><p style={{fontSize:16,fontWeight:700,color:palette.text,margin:"0 0 4px"}}>{trip.tripName}</p><p style={{fontSize:13,color:palette.muted,margin:0}}>{fmtDate(trip.startDate)} — {fmtDate(trip.endDate)}</p></>
        )}
      </div>
      <div style={{background:"#fff",borderRadius:20,border:`1px solid ${palette.border}`,padding:20,marginBottom:14}}>
        <p style={{fontSize:14,fontWeight:700,color:palette.text,margin:"0 0 14px"}}>Colour Theme</p>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          {Object.entries(PALETTES).map(([name,p])=>(
            <button key={name} onClick={()=>setPaletteName(name)} style={{background:p.primaryLight,border:`2.5px solid ${paletteName===name?p.primary:"transparent"}`,borderRadius:14,padding:"12px 14px",cursor:"pointer",textAlign:"left"}}>
              <div style={{width:26,height:26,borderRadius:"50%",background:p.primary,marginBottom:6}}/>
              <p style={{fontSize:12,fontWeight:700,color:p.text,margin:0}}>{p.name}</p>
            </button>
          ))}
        </div>
      </div>
      <div style={{background:"#fff",borderRadius:20,border:`1px solid ${palette.border}`,padding:20,marginBottom:14}}>
        <p style={{fontSize:14,fontWeight:700,color:palette.text,margin:"0 0 10px"}}>👥 Share with Others</p>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {[["Share your Vercel URL","Anyone who opens it gets their own private instance — data never mixes between devices."],["Add to Home Screen","Each person adds it via Safari/Chrome share menu. Works like a native app."],["Cloud sync (planned)","Accounts + shared trips via Supabase — a future upgrade."]].map(([title,desc])=>(
            <div key={title} style={{background:"#FAF8F9",borderRadius:12,padding:"12px 14px",border:`1px solid ${palette.border}`}}>
              <p style={{fontSize:12,fontWeight:700,color:palette.text,margin:"0 0 3px"}}>{title}</p>
              <p style={{fontSize:12,color:palette.muted,margin:0,lineHeight:1.5}}>{desc}</p>
            </div>
          ))}
        </div>
      </div>
      <div style={{background:"#fff",borderRadius:20,border:`1px solid ${palette.border}`,padding:20}}>
        <p style={{fontSize:14,fontWeight:700,color:palette.text,margin:"0 0 12px"}}>Data</p>
        <button onClick={onImportNew} style={{display:"block",width:"100%",background:palette.primaryLight,color:palette.primary,border:"none",borderRadius:10,padding:"11px 0",fontSize:13,fontWeight:700,cursor:"pointer",marginBottom:10}}>📥 Import / Replace Excel</button>
        <button onClick={()=>setConfirmReset(true)} style={{display:"block",width:"100%",background:"#FDE8E8",color:"#9B2020",border:"none",borderRadius:10,padding:"11px 0",fontSize:13,fontWeight:700,cursor:"pointer"}}>🗑️ Delete This Trip</button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// ROOT APP — clean unified navigation
// ══════════════════════════════════════════════════════════════
export default function App() {
  const [paletteName,setPaletteName]=useState("sakura");
  const [trips,setTrips]=useState([]);
  const [activeTripId,setActiveTripId]=useState(null);
  const [view,setView]=useState("home");
  const palette=PALETTES[paletteName];

  useEffect(()=>{
    try{
      const saved=localStorage.getItem("kumo_trips_v4");
      const savedP=localStorage.getItem("kumo_palette");
      const savedAct=localStorage.getItem("kumo_active_v4");
      if(saved){
        const parsed=JSON.parse(saved);
        const migrated=parsed.map(t=>({memories:[],expenses:[],budget:{amount:"",currency:"USD"},route:{stops:[],travelMode:"walking"},places:[],...t}));
        setTrips(migrated);
        if(savedAct&&migrated.find(t=>t.id===savedAct))setActiveTripId(savedAct);
      }
      if(savedP&&PALETTES[savedP])setPaletteName(savedP);
    }catch(e){console.error("Load error:",e);}
  },[]);

  useEffect(()=>{try{localStorage.setItem("kumo_trips_v4",JSON.stringify(trips));}catch(e){}},[trips]);
  useEffect(()=>{localStorage.setItem("kumo_palette",paletteName);},[paletteName]);
  useEffect(()=>{if(activeTripId)localStorage.setItem("kumo_active_v4",activeTripId);},[activeTripId]);

  const activeTrip=trips.find(t=>t.id===activeTripId)||null;

  const createTrip=()=>{
    const t={id:uid(),tripName:`Trip ${trips.length+1}`,startDate:"",endDate:"",itinerary:[],restaurants:[],hotels:[],memories:[],expenses:[],budget:{amount:"",currency:"USD"},route:{stops:[],travelMode:"walking"},places:[]};
    setTrips(prev=>[...prev,t]);setActiveTripId(t.id);setView("home");
  };
  const importTrip=(trip)=>{
    const safe={memories:[],expenses:[],budget:{amount:"",currency:"USD"},route:{stops:[],travelMode:"walking"},places:[],...trip};
    setTrips(prev=>{const ex=prev.find(t=>t.id===safe.id);return ex?prev.map(t=>t.id===safe.id?safe:t):[...prev,safe];});
    setActiveTripId(safe.id);setView("home");
  };
  const deleteTrip=(id)=>{setTrips(prev=>prev.filter(t=>t.id!==id));if(activeTripId===id)setActiveTripId(null);};
  const updateTrip=useCallback((section,value)=>{
    setTrips(prev=>prev.map(t=>{
      if(t.id!==activeTripId)return t;
      if(section==="meta")return{...t,...value};
      return{...t,[section]:value};
    }));
  },[activeTripId]);

  // All nav items
  const NAV=[
    {id:"home",      label:"Home",      Icon:Home},
    {id:"itinerary", label:"Itinerary", Icon:Calendar},
    {id:"eats",      label:"Eats",      Icon:Utensils},
    {id:"places",    label:"Places",    Icon:MapPin},
    {id:"hotels",    label:"Hotels",    Icon:Hotel},
    {id:"transport", label:"Transport", Icon:Train},
    {id:"route",     label:"Route",     Icon:Globe},
    {id:"finances",  label:"Finances",  Icon:Star},
    {id:"memories",  label:"Memories",  Icon:Camera},
    {id:"settings",  label:"Settings",  Icon:Settings},
  ];
  // Mobile: 5 most-used tabs (Hotels now included)
  const MOB_NAV=[
    {id:"home",      label:"Home",      Icon:Home},
    {id:"itinerary", label:"Plan",      Icon:Calendar},
    {id:"eats",      label:"Eats",      Icon:Utensils},
    {id:"places",    label:"Places",    Icon:MapPin},
    {id:"hotels",    label:"Hotels",    Icon:Hotel},
  ];
  const unbooked=activeTrip?activeTrip.itinerary.filter(d=>d.bookingStatus==="needs booking").length:0;

  // Map eats → restaurants key internally
  const getOnUpdate=(v)=>{
    if(v==="eats") return (sec,val)=>updateTrip(sec==="restaurants"?sec:sec,val);
    return updateTrip;
  };

  if(!activeTripId||!activeTrip){
    return(
      <>
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=Playfair+Display:wght@600;700&display=swap" rel="stylesheet"/>
        <TripSelector trips={trips} onSelect={id=>{setActiveTripId(id);setView("home");}} onCreate={createTrip} onImport={importTrip} onDelete={deleteTrip} palette={palette}/>
      </>
    );
  }

  const renderView=()=>{
    const p={trip:activeTrip,palette,onUpdate:updateTrip};
    switch(view){
      case "home":      return <HomeView        {...p} setView={setView}/>;
      case "itinerary": return <ItineraryView   {...p}/>;
      case "eats":      return <RestaurantsView {...p}/>;
      case "places":    return <PlacesView      {...p}/>;
      case "hotels":    return <HotelsView      {...p}/>;
      case "transport": return <TransportView   {...p}/>;
      case "route":     return <RoutePlannerView {...p}/>;
      case "finances":  return <FinancesView    {...p}/>;
      case "memories":  return <MemoriesView    {...p}/>;
      case "settings":  return <SettingsView    {...p} paletteName={paletteName} setPaletteName={setPaletteName} onReset={()=>deleteTrip(activeTripId)} onImportNew={()=>setActiveTripId(null)}/>;
      default:          return <HomeView        {...p} setView={setView}/>;
    }
  };

  return (
    <div style={{minHeight:"100vh",background:palette.bg,fontFamily:"'DM Sans',-apple-system,sans-serif"}}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=Playfair+Display:wght@600;700&display=swap" rel="stylesheet"/>
      <style>{`
        @media(min-width:768px){.km-mob{display:none!important;}.km-top{display:none!important;}.km-side{display:flex!important;}.km-main{margin-left:240px;}}
        @media(max-width:767px){.km-side{display:none!important;}.km-main{margin-left:0;padding-bottom:80px;}}
        *{box-sizing:border-box;}
        ::-webkit-scrollbar{width:4px;height:4px;}
        ::-webkit-scrollbar-thumb{background:#D0C8CA;border-radius:99px;}
      `}</style>

      {/* DESKTOP SIDEBAR */}
      <div className="km-side" style={{display:"none",position:"fixed",left:0,top:0,bottom:0,width:240,background:"#fff",borderRight:`1px solid ${palette.border}`,flexDirection:"column",zIndex:300,padding:"24px 0 20px"}}>
        <div style={{padding:"0 20px 16px",borderBottom:`1px solid ${palette.border}`}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
            <span style={{fontSize:24}}>☁️</span>
            <div><div style={{fontSize:15,fontWeight:800,color:palette.text,fontFamily:"'Playfair Display',Georgia,serif"}}>Kumo</div><div style={{fontSize:10,color:palette.muted,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.05em"}}>Travel Planner</div></div>
          </div>
          <button onClick={()=>setActiveTripId(null)} style={{width:"100%",background:palette.primaryLight,color:palette.primary,border:"none",borderRadius:10,padding:"8px 12px",fontSize:12,fontWeight:700,cursor:"pointer",textAlign:"left",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1}}>{activeTrip.tripName}</span>
            <span style={{fontSize:10,opacity:0.65,marginLeft:6,flexShrink:0}}>↕ trips</span>
          </button>
        </div>
        <nav style={{flex:1,padding:"12px",overflowY:"auto"}}>
          {NAV.map(({id,label,Icon})=>(
            <button key={id} onClick={()=>setView(id)} style={{display:"flex",alignItems:"center",gap:12,width:"100%",background:view===id?palette.primaryLight:"transparent",color:view===id?palette.primary:palette.muted,border:"none",borderRadius:12,padding:"11px 14px",fontSize:13,fontWeight:view===id?700:500,cursor:"pointer",textAlign:"left",transition:"all 0.15s",marginBottom:2}}>
              <Icon size={17} strokeWidth={view===id?2.5:1.8}/>{label}
              {id==="transport"&&unbooked>0&&<span style={{marginLeft:"auto",background:"#E05C5C",color:"#fff",fontSize:10,fontWeight:800,width:18,height:18,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center"}}>{unbooked}</span>}
            </button>
          ))}
        </nav>
        <div style={{padding:"12px 20px",borderTop:`1px solid ${palette.border}`}}>
          <button onClick={createTrip} style={{width:"100%",background:palette.primaryLight,color:palette.primary,border:"none",borderRadius:10,padding:"9px 0",fontSize:12,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}><Plus size={14}/>New Trip</button>
        </div>
      </div>

      {/* MOBILE TOP BAR — simplified, no nav icons */}
      <div className="km-top" style={{position:"sticky",top:0,zIndex:200,background:palette.bg,borderBottom:`1px solid ${palette.border}`,padding:"12px 16px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <button onClick={()=>setActiveTripId(null)} style={{display:"flex",alignItems:"center",gap:8,background:"none",border:"none",cursor:"pointer",padding:0}}>
          <span style={{fontSize:18}}>☁️</span>
          <div style={{textAlign:"left"}}>
            <div style={{fontSize:13,fontWeight:800,color:palette.text,fontFamily:"'Playfair Display',Georgia,serif",lineHeight:1}}>Kumo</div>
            <div style={{fontSize:10,color:palette.primary,fontWeight:600,marginTop:1}}>← All Trips</div>
          </div>
        </button>
        <span style={{fontSize:11,fontWeight:700,color:palette.text,maxWidth:120,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{activeTrip.tripName}</span>
        <div style={{display:"flex",gap:4}}>
          <button onClick={()=>setView("transport")} style={{background:view==="transport"?palette.primaryLight:"transparent",border:"none",borderRadius:8,padding:"6px 8px",cursor:"pointer",position:"relative"}}>
            <Train size={17} color={view==="transport"?palette.primary:palette.muted}/>
            {unbooked>0&&<span style={{position:"absolute",top:2,right:2,width:6,height:6,borderRadius:"50%",background:"#E05C5C",border:"1.5px solid "+palette.bg}}/>}
          </button>
          <button onClick={()=>setView("settings")} style={{background:view==="settings"?palette.primaryLight:"transparent",border:"none",borderRadius:8,padding:"6px 8px",cursor:"pointer"}}>
            <Settings size={17} color={view==="settings"?palette.primary:palette.muted}/>
          </button>
        </div>
      </div>

      {/* MAIN */}
      <div className="km-main" style={{minHeight:"100vh"}}>
        <div style={{maxWidth:900,margin:"0 auto"}}>{renderView()}</div>
      </div>

      {/* MOBILE BOTTOM NAV — 5 key tabs, Hotels included */}
      <div className="km-mob" style={{position:"fixed",bottom:0,left:0,right:0,background:"#fff",borderTop:`1px solid ${palette.border}`,display:"flex",justifyContent:"space-around",padding:"8px 0 max(14px,env(safe-area-inset-bottom))",zIndex:200}}>
        {MOB_NAV.map(({id,label,Icon})=>(
          <button key={id} onClick={()=>setView(id)} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:3,background:"none",border:"none",cursor:"pointer",padding:"4px 8px",color:view===id?palette.primary:palette.muted,flex:1}}>
            <Icon size={20} strokeWidth={view===id?2.5:1.8}/>
            <span style={{fontSize:9,fontWeight:view===id?700:500}}>{label}</span>
            {view===id&&<div style={{width:16,height:2.5,background:palette.primary,borderRadius:99}}/>}
          </button>
        ))}
      </div>
    </div>
  );
}
