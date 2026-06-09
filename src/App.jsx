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
function TransBadge({ type }) {
  const m = TRANSPORT_META[type] || TRANSPORT_META.other;
  return <span style={{display:"inline-flex",alignItems:"center",gap:4,background:m.colors[0],color:m.colors[1],fontSize:11,fontWeight:700,padding:"3px 9px",borderRadius:99}}><m.Icon size={11}/>{m.label}</span>;
}

function Inp({ label, value, onChange, type="text", placeholder="", multi, rows=2, opts, sx={} }) {
  const base = {width:"100%",border:"1px solid #EDE5E7",borderRadius:10,padding:"9px 11px",fontSize:13,fontFamily:"inherit",outline:"none",boxSizing:"border-box",color:"#2D2426",background:"#FAF8F9"};
  return (
    <div style={{marginBottom:12,...sx}}>
      {label && <label style={{fontSize:11,fontWeight:700,color:"#9A8F92",display:"block",marginBottom:5,textTransform:"uppercase",letterSpacing:"0.05em"}}>{label}</label>}
      {multi ? <textarea value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} rows={rows} style={{...base,resize:"vertical"}}/>
      : opts ? <select value={value} onChange={e=>onChange(e.target.value)} style={base}>{opts.map(o=><option key={o.v||o} value={o.v||o}>{o.l||o}</option>)}</select>
      : <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} style={base}/>}
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
          <button onClick={()=>{if(v.trim())onOk(v.trim());}} disabled={!v.trim()} style={{flex:1,background:v.trim()?palette.primary:"#D0C8CA",color:"#fff",border:"none",borderRadius:10,padding:"11px 0",fontSize:13,fontWeight:700,cursor:v.trim()?"pointer":"not-allowed"}}>Add City</button>
        </div>
      </div>
    </div>
  );
}

// ─── TRIP SELECTOR ────────────────────────────────────────────────────────────
function HomeView({ trip, palette, setView }) {
  const du = daysUntil(trip.startDate);
  const totalDays = nightsBetween(trip.startDate, trip.endDate)+1;
  const cities = [...new Set(trip.itinerary.map(d=>d.city).filter(Boolean))];
  const nb = trip.itinerary.filter(d=>d.bookingStatus==="needs booking");
  const today = trip.itinerary.find(d=>isToday(d.date));
  const next  = trip.itinerary.find(d=>!isPast(d.date)&&!isToday(d.date));
  const hl    = today||next;
  const activeHotel = trip.hotels.find(h=>new Date(h.checkIn+"T00:00:00")<=new Date()&&new Date(h.checkOut+"T00:00:00")>=new Date());
  const lastMemory  = (trip.memories||[]).slice(-1)[0];

  return (
    <div style={{padding:"24px 20px 40px"}}>
      <div style={{marginBottom:20}}>
        <p style={{fontSize:11,fontWeight:800,color:palette.primary,textTransform:"uppercase",letterSpacing:"0.1em",margin:"0 0 4px"}}>My Trip</p>
        <h1 style={{fontFamily:"'Playfair Display',Georgia,serif",fontSize:26,fontWeight:700,color:palette.text,margin:"0 0 4px"}}>{trip.tripName}</h1>
        <p style={{color:palette.muted,fontSize:13,margin:0}}>{fmtDate(trip.startDate)} — {fmtDate(trip.endDate)}</p>
      </div>

      {/* Countdown hero */}
      <div style={{background:`linear-gradient(135deg,${palette.primary},${palette.accent})`,borderRadius:22,padding:"22px 24px",marginBottom:16,color:"#fff",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",right:-30,top:-30,width:130,height:130,borderRadius:"50%",background:"rgba(255,255,255,0.09)"}}/>
        <div style={{position:"absolute",right:20,bottom:-35,width:90,height:90,borderRadius:"50%",background:"rgba(255,255,255,0.06)"}}/>
        {du>0&&<><p style={{margin:"0 0 4px",fontSize:13,opacity:0.85}}>Trip starts in</p><div style={{display:"flex",alignItems:"baseline",gap:8}}><span style={{fontSize:50,fontWeight:800,lineHeight:1}}>{du}</span><span style={{fontSize:18,opacity:0.85}}>days</span></div><p style={{margin:"8px 0 0",fontSize:13,opacity:0.8}}>✈️ {totalDays} days · {cities.length} {cities.length===1?"city":"cities"}</p></>}
        {du===0&&<><p style={{margin:"0 0 8px",fontSize:18,fontWeight:700}}>🎉 Today is the day!</p><p style={{margin:0,fontSize:13,opacity:0.85}}>Your adventure begins!</p></>}
        {du<0&&<><p style={{margin:"0 0 4px",fontSize:13,opacity:0.85}}>Trip in progress</p><p style={{fontSize:20,fontWeight:800,margin:0}}>Day {Math.abs(du)+1} of {totalDays}</p><p style={{margin:"4px 0 0",fontSize:13,opacity:0.8}}>{cities.length} cities · {trip.itinerary.length} days planned</p></>}
      </div>

      {/* Today/next card */}
      {hl&&(
        <div style={{background:"#fff",borderRadius:18,border:`1px solid ${palette.border}`,padding:"16px 18px",marginBottom:14,boxShadow:"0 2px 12px rgba(0,0,0,0.05)"}}>
          <p style={{fontSize:11,fontWeight:800,color:palette.primary,textTransform:"uppercase",letterSpacing:"0.08em",margin:"0 0 10px"}}>{today?"Today":`Up next — Day ${hl.dayNum}`}</p>
          <div style={{display:"flex",gap:12,justifyContent:"space-between"}}>
            <div style={{flex:1}}>
              <h3 style={{fontSize:16,fontWeight:700,color:palette.text,margin:"0 0 4px"}}>{hl.city}</h3>
              <p style={{fontSize:13,color:palette.muted,margin:"0 0 8px",lineHeight:1.5}}>{hl.activities}</p>
              <TransBadge type={hl.transport}/>
              {hl.transportDetail&&<span style={{fontSize:11,color:palette.muted,marginLeft:8}}>{hl.transportDetail}</span>}
            </div>
            <div style={{width:42,height:42,borderRadius:"50%",background:cityColor(hl.city)+"22",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
              <MapPin size={17} color={cityColor(hl.city)}/>
            </div>
          </div>
          {activeHotel&&<div style={{marginTop:10,paddingTop:10,borderTop:`1px solid ${palette.border}`,display:"flex",alignItems:"center",gap:8}}><Hotel size={13} color={palette.muted}/><span style={{fontSize:12,color:palette.muted}}>{activeHotel.name}</span></div>}
        </div>
      )}

      {/* Stats */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
        {[["📅","Days",totalDays],["🏙️","Cities",cities.length],["🍜","Restaurants",trip.restaurants.filter(r=>r.name).length],["📸","Memories",(trip.memories||[]).length]].map(([icon,label,val])=>(
          <div key={label} style={{background:"#fff",borderRadius:14,border:`1px solid ${palette.border}`,padding:"12px 14px"}}>
            <div style={{fontSize:20,marginBottom:3}}>{icon}</div>
            <div style={{fontSize:24,fontWeight:800,color:palette.text,lineHeight:1}}>{val}</div>
            <div style={{fontSize:11,color:palette.muted,fontWeight:600,marginTop:2}}>{label}</div>
          </div>
        ))}
      </div>

      {/* Needs booking */}
      {nb.length>0&&(
        <div style={{background:"#FFF3DC",borderRadius:14,padding:"12px 16px",marginBottom:14,border:"1px solid #FFDEA0",cursor:"pointer"}} onClick={()=>setView("transport")}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}><AlertCircle size={15} color="#8A6200"/><span style={{fontSize:13,fontWeight:700,color:"#8A6200"}}>{nb.length} booking{nb.length>1?"s":""} needed</span></div>
          <p style={{fontSize:11,color:"#8A6200",margin:0,fontWeight:600}}>Tap to view →</p>
        </div>
      )}

      {/* Latest memory */}
      {lastMemory&&(
        <div style={{background:"#fff",borderRadius:16,border:`1px solid ${palette.border}`,padding:"14px 16px",marginBottom:14,cursor:"pointer"}} onClick={()=>setView("memories")}>
          <p style={{fontSize:11,fontWeight:800,color:palette.primary,textTransform:"uppercase",letterSpacing:"0.06em",margin:"0 0 8px"}}>Latest Memory</p>
          <h3 style={{fontSize:14,fontWeight:700,color:palette.text,margin:"0 0 3px"}}>{lastMemory.title}</h3>
          <p style={{fontSize:12,color:palette.muted,margin:"0 0 5px"}}>{lastMemory.city} · {fmtDate(lastMemory.date)}</p>
          <div style={{display:"flex",gap:4,alignItems:"center"}}>
            <span style={{fontSize:18}}>{lastMemory.mood}</span>
            <span style={{fontSize:13}}>{"⭐".repeat(lastMemory.rating||0)}</span>
          </div>
        </div>
      )}

      {/* City journey */}
      <p style={{fontSize:11,fontWeight:800,color:palette.muted,textTransform:"uppercase",letterSpacing:"0.06em",margin:"0 0 10px"}}>City Journey</p>
      <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
        {cities.map((c,i)=>(
          <span key={c} style={{display:"inline-flex",alignItems:"center",gap:4,background:cityColor(c)+"18",border:`1.5px solid ${cityColor(c)}44`,color:cityColor(c),borderRadius:10,padding:"6px 12px",fontSize:12,fontWeight:700}}>
            {i>0&&<span style={{fontSize:10,opacity:0.5}}>→</span>}{c}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── ITINERARY VIEW ───────────────────────────────────────────────────────────
function ItineraryView({ trip, palette, onUpdate }) {
  const [expId,setExpId]=useState(null);
  const [editId,setEditId]=useState(null);
  const [ef,setEf]=useState({});
  const [showAdd,setShowAdd]=useState(false);
  const [delId,setDelId]=useState(null);
  const [nd,setNd]=useState({date:"",city:"",activities:"",transport:"train",transportDetail:"",bookingStatus:"pending",notes:""});

  const cycleStatus=(d)=>{const c=["confirmed","pending","needs booking"];onUpdate("itinerary",trip.itinerary.map(x=>x.id===d.id?{...x,bookingStatus:c[(c.indexOf(d.bookingStatus)+1)%c.length]}:x));};
  const saveEdit=()=>{onUpdate("itinerary",trip.itinerary.map(x=>x.id===editId?{...x,...ef}:x));setEditId(null);};
  const doDelete=(id)=>{onUpdate("itinerary",trip.itinerary.filter(x=>x.id!==id));setDelId(null);setExpId(null);};
  const addDay=()=>{
    const sorted=[...trip.itinerary,{...nd,id:uid(),dayNum:0}].sort((a,b)=>a.date.localeCompare(b.date)).map((d,i)=>({...d,dayNum:i+1}));
    onUpdate("itinerary",sorted);setShowAdd(false);setNd({date:"",city:"",activities:"",transport:"train",transportDetail:"",bookingStatus:"pending",notes:""});
  };

  return (
    <div style={{padding:"24px 20px 40px"}}>
      {delId&&<Confirm message="Delete this day?" onOk={()=>doDelete(delId)} onNo={()=>setDelId(null)}/>}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <div><h2 style={{fontFamily:"'Playfair Display',Georgia,serif",fontSize:24,fontWeight:700,color:palette.text,margin:"0 0 4px"}}>Itinerary</h2><p style={{color:palette.muted,fontSize:13,margin:0}}>{trip.itinerary.length} days</p></div>
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
          <div style={{display:"flex",gap:8}}>
            <button onClick={addDay} disabled={!nd.date||!nd.city} style={{flex:1,background:(nd.date&&nd.city)?palette.primary:"#D0C8CA",color:"#fff",border:"none",borderRadius:10,padding:"11px 0",fontSize:13,fontWeight:700,cursor:(nd.date&&nd.city)?"pointer":"not-allowed"}}>Add Day</button>
            <button onClick={()=>setShowAdd(false)} style={{flex:1,background:"#F5F0F2",color:palette.muted,border:"none",borderRadius:10,padding:"11px 0",fontSize:13,fontWeight:600,cursor:"pointer"}}>Cancel</button>
          </div>
        </div>
      )}

      {trip.itinerary.map(d=>{
        const past=isPast(d.date),today=isToday(d.date),ss=BOOK_STATUS[d.bookingStatus]||BOOK_STATUS.pending,isExp=expId===d.id,isEd=editId===d.id;
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
                    <div style={{display:"flex",gap:8}}>
                      <button onClick={saveEdit} style={{flex:1,background:palette.primary,color:"#fff",border:"none",borderRadius:10,padding:"10px 0",fontSize:13,fontWeight:700,cursor:"pointer"}}>Save</button>
                      <button onClick={()=>setEditId(null)} style={{flex:1,background:"#F5F0F2",color:palette.muted,border:"none",borderRadius:10,padding:"10px 0",fontSize:13,fontWeight:600,cursor:"pointer"}}>Cancel</button>
                    </div>
                  </div>
                ):(
                  <div style={{paddingTop:12}}>
                    {d.transportDetail&&<p style={{fontSize:12,color:palette.muted,margin:"0 0 10px"}}>{d.transportDetail}</p>}
                    {d.notes&&<div style={{background:"#FAF8F9",borderRadius:10,padding:"10px 12px",marginBottom:12}}><p style={{fontSize:11,fontWeight:700,color:palette.muted,margin:"0 0 3px"}}>NOTES</p><p style={{fontSize:12,color:palette.text,margin:0}}>{d.notes}</p></div>}
                    <div style={{display:"flex",gap:8}}>
                      <button onClick={()=>{setEditId(d.id);setEf({...d});}} style={{display:"flex",alignItems:"center",gap:6,background:palette.primaryLight,color:palette.primary,border:"none",borderRadius:10,padding:"8px 14px",fontSize:12,fontWeight:700,cursor:"pointer"}}><Edit3 size={13}/>Edit</button>
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

// ─── RESTAURANTS VIEW ─────────────────────────────────────────────────────────
function TransportView({ trip, palette, onUpdate }) {
  const legs=trip.itinerary.filter(d=>d.transport!=="walk");
  const cyc=(d)=>{const c=["confirmed","pending","needs booking"];onUpdate("itinerary",trip.itinerary.map(x=>x.id===d.id?{...x,bookingStatus:c[(c.indexOf(d.bookingStatus)+1)%c.length]}:x));};
  const nb=legs.filter(l=>l.bookingStatus==="needs booking");
  return (
    <div style={{padding:"24px 20px 40px"}}>
      <h2 style={{fontFamily:"'Playfair Display',Georgia,serif",fontSize:24,fontWeight:700,color:palette.text,margin:"0 0 4px"}}>Transport</h2>
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

// ─── ROUTE PLANNER — state persisted in trip.route so it survives tab switches ─
function RoutePlannerView({ trip, palette, onUpdate }) {
  const allCities=[...new Set([...trip.itinerary.map(d=>d.city),...trip.restaurants.map(r=>r.city),...trip.hotels.map(h=>h.city)].filter(Boolean))];
  const rs = trip.route || {stops:[],travelMode:"walking"};
  const [selCity,setSelCity]=useState(allCities[0]||"");
  const [custom,setCustom]=useState("");
  const [copied,setCopied]=useState(false);

  const setStops=(stops)=>onUpdate("route",{...rs,stops});
  const setMode=(travelMode)=>onUpdate("route",{...rs,travelMode});

  const MODES=[{id:"walking",label:"Walk",e:"🚶"},{id:"transit",label:"Transit",e:"🚇"},{id:"driving",label:"Drive",e:"🚗"},{id:"bicycling",label:"Bike",e:"🚲"}];
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
    <div style={{padding:"24px 20px 40px"}}>
      <h2 style={{fontFamily:"'Playfair Display',Georgia,serif",fontSize:24,fontWeight:700,color:palette.text,margin:"0 0 4px"}}>Route Planner</h2>
      <p style={{color:palette.muted,fontSize:13,margin:"0 0 20px"}}>Build your stops · opens efficient route in Google Maps</p>

      <div style={{marginBottom:14}}>
        <p style={{fontSize:11,fontWeight:800,color:palette.muted,textTransform:"uppercase",letterSpacing:"0.06em",margin:"0 0 8px"}}>City</p>
        <div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:4}}>
          {allCities.map(c=><button key={c} onClick={()=>setSelCity(c)} style={{flexShrink:0,padding:"7px 16px",borderRadius:99,border:"none",fontSize:13,fontWeight:700,cursor:"pointer",background:selCity===c?palette.primary:palette.primaryLight,color:selCity===c?"#fff":palette.primary}}>{c}</button>)}
        </div>
      </div>

      <div style={{marginBottom:18}}>
        <p style={{fontSize:11,fontWeight:800,color:palette.muted,textTransform:"uppercase",letterSpacing:"0.06em",margin:"0 0 8px"}}>Travel Mode</p>
        <div style={{display:"flex",gap:8}}>
          {MODES.map(m=><button key={m.id} onClick={()=>setMode(m.id)} style={{flex:1,padding:"9px 4px",borderRadius:12,border:`2px solid ${rs.travelMode===m.id?palette.primary:"transparent"}`,background:rs.travelMode===m.id?palette.primaryLight:"#fff",color:rs.travelMode===m.id?palette.primary:palette.muted,fontSize:11,fontWeight:700,cursor:"pointer",textAlign:"center"}}><div style={{fontSize:18,marginBottom:2}}>{m.e}</div>{m.label}</button>)}
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"minmax(0,1fr) minmax(0,1fr)",gap:16,alignItems:"start"}}>
        {/* Left: add stops */}
        <div>
          <p style={{fontSize:11,fontWeight:800,color:palette.muted,textTransform:"uppercase",letterSpacing:"0.06em",margin:"0 0 10px"}}>Add Stops</p>
          <div style={{background:"#fff",borderRadius:14,border:`1px solid ${palette.border}`,padding:"12px 14px",marginBottom:12}}>
            <p style={{fontSize:12,fontWeight:700,color:palette.text,margin:"0 0 8px"}}>Type any place</p>
            <div style={{display:"flex",gap:8}}>
              <input value={custom} onChange={e=>setCustom(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")addCustom();}} placeholder={`e.g. Senso-ji Temple`} style={{flex:1,border:`1px solid ${palette.border}`,borderRadius:10,padding:"9px 11px",fontSize:13,fontFamily:"inherit",outline:"none",color:palette.text,background:"#FAF8F9"}}/>
              <button onClick={addCustom} disabled={!custom.trim()} style={{background:custom.trim()?palette.primary:"#D0C8CA",color:"#fff",border:"none",borderRadius:10,padding:"9px 14px",fontSize:13,fontWeight:700,cursor:custom.trim()?"pointer":"not-allowed",flexShrink:0}}><Plus size={14}/></button>
            </div>
          </div>
          {suggestions.length>0&&(
            <div style={{background:"#fff",borderRadius:14,border:`1px solid ${palette.border}`,padding:"12px 14px"}}>
              <p style={{fontSize:12,fontWeight:700,color:palette.text,margin:"0 0 10px"}}>From your trip</p>
              <div style={{maxHeight:260,overflowY:"auto"}}>
                {suggestions.map(s=>{const already=rs.stops.find(st=>st.id===s.id),tc=TC[s.type]||TC.custom;return(
                  <div key={s.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:`1px solid ${palette.border}`}}>
                    <div style={{flex:1,minWidth:0,marginRight:8}}>
                      <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:2}}><span style={{fontSize:13}}>{s.e}</span><span style={{fontSize:12,fontWeight:700,color:palette.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{s.label}</span></div>
                      <span style={{fontSize:10,background:tc.bg,color:tc.text,padding:"1px 7px",borderRadius:99,fontWeight:700}}>{s.type}</span>
                    </div>
                    <button onClick={()=>addStop(s)} disabled={!!already} style={{flexShrink:0,background:already?"#F1EFEF":palette.primaryLight,color:already?palette.muted:palette.primary,border:"none",borderRadius:8,padding:"5px 10px",fontSize:11,fontWeight:700,cursor:already?"not-allowed":"pointer"}}>{already?"✓":"+ Add"}</button>
                  </div>
                );})}
              </div>
            </div>
          )}
        </div>

        {/* Right: route */}
        <div>
          <p style={{fontSize:11,fontWeight:800,color:palette.muted,textTransform:"uppercase",letterSpacing:"0.06em",margin:"0 0 10px"}}>Your Route ({rs.stops.length})</p>
          {rs.stops.length===0&&<div style={{background:"#fff",borderRadius:14,border:`1.5px dashed ${palette.border}`,padding:"32px 16px",textAlign:"center",color:palette.muted}}><div style={{fontSize:32,marginBottom:8}}>📍</div><p style={{fontSize:13}}>Add 2+ stops to build a route</p></div>}
          {rs.stops.length>0&&(
            <div style={{background:"#fff",borderRadius:14,border:`1px solid ${palette.border}`,overflow:"hidden",marginBottom:12}}>
              {rs.stops.map((s,i)=>{const tc=TC[s.type]||TC.custom,isLast=i===rs.stops.length-1;return(
                <div key={s.id} style={{padding:"11px 14px",borderBottom:isLast?"none":`1px solid ${palette.border}`,display:"flex",alignItems:"center",gap:10}}>
                  <div style={{width:28,height:28,borderRadius:"50%",background:i===0?`linear-gradient(135deg,${palette.primary},${palette.accent})`:isLast?"#2D2426":palette.primaryLight,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:800,color:i===0||isLast?"#fff":palette.primary,flexShrink:0}}>{String.fromCharCode(65+i)}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13,fontWeight:700,color:palette.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{s.label}</div>
                    <span style={{fontSize:10,background:tc.bg,color:tc.text,padding:"1px 7px",borderRadius:99,fontWeight:700}}>{s.type}</span>
                  </div>
                  <div style={{display:"flex",gap:4,flexShrink:0}}>
                    <button onClick={()=>moveStop(i,-1)} disabled={i===0} style={{background:i===0?"#F5F0F2":palette.primaryLight,color:i===0?palette.muted:palette.primary,border:"none",borderRadius:6,width:26,height:26,cursor:i===0?"not-allowed":"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>↑</button>
                    <button onClick={()=>moveStop(i,1)} disabled={isLast} style={{background:isLast?"#F5F0F2":palette.primaryLight,color:isLast?palette.muted:palette.primary,border:"none",borderRadius:6,width:26,height:26,cursor:isLast?"not-allowed":"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>↓</button>
                    <button onClick={()=>removeStop(s.id)} style={{background:"#FDE8E8",color:"#9B2020",border:"none",borderRadius:6,width:26,height:26,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}><X size={12}/></button>
                  </div>
                </div>
              );})}
            </div>
          )}
          {rs.stops.length>=2&&(
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              <a href={mapsUrl} target="_blank" rel="noreferrer" style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,background:`linear-gradient(135deg,${palette.primary},${palette.accent})`,color:"#fff",borderRadius:14,padding:"14px 0",fontSize:14,fontWeight:700,textDecoration:"none",boxShadow:`0 4px 16px ${palette.primary}44`}}><MapPin size={16}/>Open in Google Maps</a>
              <button onClick={copyUrl} style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,background:copied?"#DFF0E1":palette.primaryLight,color:copied?"#3A6B42":palette.primary,border:"none",borderRadius:14,padding:"12px 0",fontSize:13,fontWeight:700,cursor:"pointer"}}>{copied?<Check size={15}/>:<Copy size={15}/>}{copied?"Copied!":"Copy link"}</button>
              <div style={{background:"#FFF3DC",borderRadius:12,padding:"10px 14px",border:"1px solid #FFDEA0"}}><p style={{fontSize:11,color:"#8A6200",margin:0,lineHeight:1.5}}>💡 Inside Google Maps tap <strong>"Optimise route"</strong> for the most efficient order.</p></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── MEMORIES VIEW ────────────────────────────────────────────────────────────
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

// ─── SETTINGS VIEW ────────────────────────────────────────────────────────────

// ══════════════════════════════════════════════════════════════
// CUISINE AUTOCOMPLETE
// ══════════════════════════════════════════════════════════════
const CUISINE_LIST = [
  "American","Bakery","BBQ","Brunch","Burger","Café","Chinese","Cocktail Bar",
  "Dim Sum","Ethiopian","Filipino","Fine Dining","French","Fusion","Greek",
  "Hot Pot","Indian","Indonesian","Izakaya","Italian","Japanese","Kaiseki",
  "Korean","Latin","Malaysian","Mediterranean","Mexican","Middle Eastern",
  "Noodles","Okonomiyaki","Omakase","Pasta","Persian","Pizza","Ramen",
  "Seafood","Shabu-shabu","Soba","Spanish","Sri Lankan","Steak","Street Food",
  "Sushi","Tapas","Thai","Turkish","Udon","Vegan","Vietnamese","Wine Bar","Yakitori"
];

function CuisineInput({ value, onChange, palette }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState(value || "");
  const ref = useRef();
  useEffect(() => { setQ(value || ""); }, [value]);
  const filtered = q.length > 0
    ? CUISINE_LIST.filter(c => c.toLowerCase().includes(q.toLowerCase())).slice(0, 7)
    : CUISINE_LIST.slice(0, 7);
  const pick = (v) => { setQ(v); onChange(v); setOpen(false); };
  useEffect(() => {
    const fn = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);
  return (
    <div ref={ref} style={{ position:"relative", marginBottom:12 }}>
      <label style={{ fontSize:11,fontWeight:700,color:"#9A8F92",display:"block",marginBottom:5,textTransform:"uppercase",letterSpacing:"0.05em" }}>Cuisine</label>
      <input value={q}
        onChange={e => { setQ(e.target.value); onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder="Type or pick — e.g. Ramen, Kaiseki…"
        style={{ width:"100%",border:"1px solid #EDE5E7",borderRadius:10,padding:"9px 11px",fontSize:13,fontFamily:"inherit",outline:"none",boxSizing:"border-box",color:"#2D2426",background:"#FAF8F9" }}
      />
      {open && filtered.length > 0 && (
        <div style={{ position:"absolute",top:"calc(100% + 2px)",left:0,right:0,background:"#fff",border:"1px solid #EDE5E7",borderRadius:10,boxShadow:"0 8px 28px rgba(0,0,0,0.13)",zIndex:600,overflow:"hidden" }}>
          {filtered.map(c => (
            <div key={c} onMouseDown={() => pick(c)}
              style={{ padding:"10px 14px",fontSize:13,cursor:"pointer",color:"#2D2426",borderBottom:"1px solid #F8F4F5" }}
              onMouseEnter={e => e.currentTarget.style.background="#FAF7F8"}
              onMouseLeave={e => e.currentTarget.style.background="#fff"}>
              {c}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// BOOKING CONFIRMATION UPLOAD
// ══════════════════════════════════════════════════════════════
function BookingUpload({ files, onAdd, onRemove, palette }) {
  const ref = useRef();
  const read = (file) => new Promise(res => {
    const r = new FileReader();
    r.onload = e => res({ name:file.name, type:file.type, data:e.target.result });
    r.readAsDataURL(file);
  });
  const handle = async (fl) => {
    const results = await Promise.all(Array.from(fl).map(read));
    results.forEach(f => onAdd(f));
  };
  const download = (f) => {
    const a = document.createElement("a"); a.href = f.data; a.download = f.name; a.click();
  };
  const isPDF = (f) => f.type === "application/pdf" || f.name?.endsWith(".pdf");
  return (
    <div style={{ marginBottom:12 }}>
      <label style={{ fontSize:11,fontWeight:700,color:"#9A8F92",display:"block",marginBottom:8,textTransform:"uppercase",letterSpacing:"0.05em" }}>Booking Confirmation</label>
      {(files||[]).length > 0 && (
        <div style={{ marginBottom:8, display:"flex", flexDirection:"column", gap:6 }}>
          {files.map((f,i) => (
            <div key={i} style={{ display:"flex",alignItems:"center",gap:8,background:"#FAF8F9",borderRadius:10,padding:"8px 12px",border:"1px solid #EDE5E7" }}>
              <span style={{ fontSize:18 }}>{isPDF(f)?"📄":"🖼️"}</span>
              <span style={{ flex:1,fontSize:12,fontWeight:600,color:"#2D2426",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{f.name}</span>
              <button onClick={() => download(f)} style={{ background:"#E3EDF5",color:"#2A567A",border:"none",borderRadius:7,padding:"4px 10px",fontSize:11,fontWeight:700,cursor:"pointer" }}>View</button>
              <button onClick={() => onRemove(i)} style={{ background:"#FDE8E8",color:"#9B2020",border:"none",borderRadius:7,padding:"4px 8px",fontSize:11,cursor:"pointer" }}>✕</button>
            </div>
          ))}
        </div>
      )}
      <button onClick={() => ref.current.click()}
        style={{ display:"flex",alignItems:"center",gap:6,background:"#F5F0F2",color:"#9A8F92",border:"1px dashed #D0C8CA",borderRadius:10,padding:"9px 14px",fontSize:12,fontWeight:700,cursor:"pointer" }}>
        <Upload size={13}/>Upload PDF or Image
      </button>
      <input ref={ref} type="file" accept="image/*,.pdf" multiple style={{ display:"none" }} onChange={e => handle(e.target.files)}/>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// FINANCES VIEW
// ══════════════════════════════════════════════════════════════
const EXPENSE_CATS = [
  { id:"accommodation", label:"Accommodation", emoji:"🏨" },
  { id:"transport",     label:"Transport",     emoji:"🚄" },
  { id:"food",          label:"Food & Drink",  emoji:"🍜" },
  { id:"activity",      label:"Activities",    emoji:"🎭" },
  { id:"shopping",      label:"Shopping",      emoji:"🛍️" },
  { id:"health",        label:"Health",        emoji:"💊" },
  { id:"other",         label:"Other",         emoji:"📦" },
];
const CURRENCIES = ["USD","IDR","JPY","EUR","GBP","AUD","SGD","MYR","THB","KRW","CNY","HKD","TWD","PHP","VND","CHF","CAD","NZD"];

function FinancesView({ trip, palette, onUpdate }) {
  const expenses = trip.expenses || [];
  const budget   = trip.budget   || { amount:"", currency:"USD" };
  const [showAdd,setShowAdd]     = useState(false);
  const [editId,setEditId]       = useState(null);
  const [delId,setDelId]         = useState(null);
  const [filterCat,setFilterCat] = useState("all");
  const [showBudget,setShowBudget] = useState(false);
  const cities = [...new Set(trip.itinerary.map(d=>d.city).filter(Boolean))];

  const blank = () => ({
    date: new Date().toISOString().split("T")[0],
    description:"", category:"food",
    amount:"", currency: budget.currency||"USD",
    city:"", paidBy:"", notes:""
  });
  const [ne, setNe] = useState(blank());

  const save = () => {
    if (!ne.description.trim() || !ne.amount) return;
    const exp = { ...ne, id:editId||uid(), amount:parseFloat(ne.amount) };
    onUpdate("expenses", editId ? expenses.map(e=>e.id===editId?exp:e) : [...expenses,exp]);
    setEditId(null); setShowAdd(false); setNe(blank());
  };
  const startEdit = (e) => { setNe({...e,amount:String(e.amount)}); setEditId(e.id); setShowAdd(true); };
  const doDelete  = (id) => { onUpdate("expenses",expenses.filter(e=>e.id!==id)); setDelId(null); };

  const filtered = filterCat==="all" ? expenses : expenses.filter(e=>e.category===filterCat);

  // Totals per currency
  const totals = expenses.reduce((acc,e)=>{ acc[e.currency]=(acc[e.currency]||0)+(parseFloat(e.amount)||0); return acc; },{});

  // Export
  const exportCSV = () => {
    const hdr = ["Date","Description","Category","Amount","Currency","City","Paid By","Notes"];
    const rows = expenses.map(e=>[e.date,e.description,EXPENSE_CATS.find(c=>c.id===e.category)?.label||e.category,e.amount,e.currency,e.city||"",e.paidBy||"",e.notes||""]);
    const csv = [hdr,...rows].map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
    const a=document.createElement("a"); a.href="data:text/csv;charset=utf-8,"+encodeURIComponent(csv); a.download=`${trip.tripName}-finances.csv`; a.click();
  };
  const exportXLSX = () => {
    const ws = XLSX.utils.json_to_sheet(expenses.map(e=>({
      Date:e.date, Description:e.description,
      Category:EXPENSE_CATS.find(c=>c.id===e.category)?.label||e.category,
      Amount:parseFloat(e.amount)||0, Currency:e.currency,
      City:e.city||"", "Paid By":e.paidBy||"", Notes:e.notes||""
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb,ws,"Expenses");
    const ws2 = XLSX.utils.json_to_sheet([{ Trip:trip.tripName, "Budget Amount":budget.amount||"", "Budget Currency":budget.currency }]);
    XLSX.utils.book_append_sheet(wb,ws2,"Budget");
    XLSX.writeFile(wb,`${trip.tripName}-finances.xlsx`);
  };
  const exportJSON = () => {
    const blob = JSON.stringify({ trip:trip.tripName, exportedAt:new Date().toISOString(), budget, expenses },null,2);
    const a=document.createElement("a"); a.href="data:application/json;charset=utf-8,"+encodeURIComponent(blob); a.download=`${trip.tripName}-finances.json`; a.click();
  };

  return (
    <div style={{ padding:"24px 20px 40px" }}>
      {delId && <Confirm message="Delete this expense?" onOk={()=>doDelete(delId)} onNo={()=>setDelId(null)}/>}

      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20 }}>
        <div>
          <h2 style={{ fontFamily:"'Playfair Display',Georgia,serif",fontSize:24,fontWeight:700,color:palette.text,margin:"0 0 4px" }}>Finances</h2>
          <p style={{ color:palette.muted,fontSize:13,margin:0 }}>{expenses.length} expense{expenses.length!==1?"s":""} tracked</p>
        </div>
        <button onClick={()=>{ setNe(blank()); setEditId(null); setShowAdd(v=>!v); }}
          style={{ display:"flex",alignItems:"center",gap:6,background:palette.primary,color:"#fff",border:"none",borderRadius:12,padding:"9px 16px",fontSize:13,fontWeight:700,cursor:"pointer" }}>
          <Plus size={15}/>Add
        </button>
      </div>

      {/* Budget card */}
      <div style={{ background:"#fff",borderRadius:18,border:`1px solid ${palette.border}`,padding:"16px 18px",marginBottom:14 }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom: showBudget?12:0 }}>
          <div>
            <p style={{ fontSize:11,fontWeight:800,color:palette.muted,textTransform:"uppercase",letterSpacing:"0.06em",margin:"0 0 4px" }}>Trip Budget</p>
            {budget.amount
              ? <p style={{ fontSize:22,fontWeight:800,color:palette.text,margin:0 }}>{budget.currency} {parseFloat(budget.amount).toLocaleString()}</p>
              : <p style={{ fontSize:14,color:palette.muted,margin:0 }}>No budget set yet</p>
            }
          </div>
          <button onClick={()=>setShowBudget(v=>!v)}
            style={{ background:palette.primaryLight,color:palette.primary,border:"none",borderRadius:10,padding:"7px 14px",fontSize:12,fontWeight:700,cursor:"pointer" }}>
            {showBudget?"Done":"Set Budget"}
          </button>
        </div>
        {showBudget && (
          <div style={{ display:"flex",gap:8 }}>
            <div style={{ flex:1 }}><Inp label="" value={String(budget.amount||"")} type="number" placeholder="Amount" onChange={v=>onUpdate("budget",{...budget,amount:v})} sx={{marginBottom:0}}/></div>
            <div style={{ width:100 }}><Inp label="" value={budget.currency} opts={CURRENCIES} onChange={v=>onUpdate("budget",{...budget,currency:v})} sx={{marginBottom:0}}/></div>
          </div>
        )}
        {/* Progress bar */}
        {budget.amount && Object.entries(totals).map(([cur,spent]) => {
          if (cur !== budget.currency) return null;
          const pct = Math.min(100,Math.round((spent/parseFloat(budget.amount))*100));
          const over = spent > parseFloat(budget.amount);
          return (
            <div key={cur} style={{ marginTop:12 }}>
              <div style={{ display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:5 }}>
                <span style={{ color:palette.muted }}>Spent: <strong style={{ color:over?"#E05C5C":palette.text }}>{cur} {spent.toLocaleString(undefined,{maximumFractionDigits:0})}</strong></span>
                <span style={{ color:over?"#E05C5C":palette.muted,fontWeight:700 }}>{over?"Over budget!":`${pct}% used`}</span>
              </div>
              <div style={{ height:8,background:"#F5F0F2",borderRadius:99,overflow:"hidden" }}>
                <div style={{ height:"100%",width:`${pct}%`,background:over?"#E05C5C":`linear-gradient(90deg,${palette.primary},${palette.accent})`,borderRadius:99,transition:"width 0.4s" }}/>
              </div>
            </div>
          );
        })}
      </div>

      {/* Total pills */}
      {Object.keys(totals).length > 0 && (
        <div style={{ display:"flex",gap:8,overflowX:"auto",marginBottom:14 }}>
          {Object.entries(totals).map(([cur,amt]) => (
            <div key={cur} style={{ background:"#fff",borderRadius:14,border:`1px solid ${palette.border}`,padding:"10px 16px",flexShrink:0 }}>
              <p style={{ fontSize:10,fontWeight:700,color:palette.muted,margin:"0 0 2px",textTransform:"uppercase" }}>{cur}</p>
              <p style={{ fontSize:18,fontWeight:800,color:palette.primary,margin:0 }}>{amt.toLocaleString(undefined,{maximumFractionDigits:0})}</p>
            </div>
          ))}
        </div>
      )}

      {/* By category breakdown */}
      {expenses.length > 0 && (
        <div style={{ background:"#fff",borderRadius:18,border:`1px solid ${palette.border}`,padding:"14px 16px",marginBottom:14 }}>
          <p style={{ fontSize:11,fontWeight:800,color:palette.muted,textTransform:"uppercase",letterSpacing:"0.06em",margin:"0 0 12px" }}>By Category</p>
          {EXPENSE_CATS.map(cat => {
            const items = expenses.filter(e=>e.category===cat.id);
            if (!items.length) return null;
            const byCur = items.reduce((acc,e)=>{ acc[e.currency]=(acc[e.currency]||0)+(parseFloat(e.amount)||0); return acc; },{});
            return (
              <div key={cat.id} style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 0",borderBottom:`1px solid ${palette.border}` }}>
                <span style={{ fontSize:13,color:palette.text }}>{cat.emoji} {cat.label}</span>
                <span style={{ fontSize:13,fontWeight:700,color:palette.text }}>
                  {Object.entries(byCur).map(([c,a])=>`${c} ${a.toLocaleString(undefined,{maximumFractionDigits:0})}`).join(" · ")}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Export */}
      {expenses.length > 0 && (
        <div style={{ background:"#fff",borderRadius:18,border:`1px solid ${palette.border}`,padding:"14px 16px",marginBottom:14 }}>
          <p style={{ fontSize:11,fontWeight:800,color:palette.muted,textTransform:"uppercase",letterSpacing:"0.06em",margin:"0 0 10px" }}>Export Data</p>
          <div style={{ display:"flex",gap:8,marginBottom:8 }}>
            <button onClick={exportCSV}  style={{ flex:1,background:"#DFF0E1",color:"#3A6B42",border:"none",borderRadius:10,padding:"11px 0",fontSize:12,fontWeight:700,cursor:"pointer" }}>📄 CSV</button>
            <button onClick={exportXLSX} style={{ flex:1,background:"#E3EDF5",color:"#2A567A",border:"none",borderRadius:10,padding:"11px 0",fontSize:12,fontWeight:700,cursor:"pointer" }}>📊 Excel</button>
            <button onClick={exportJSON} style={{ flex:1,background:"#EEE8F8",color:"#5B4C8A",border:"none",borderRadius:10,padding:"11px 0",fontSize:12,fontWeight:700,cursor:"pointer" }}>🔗 JSON</button>
          </div>
          <p style={{ fontSize:11,color:palette.muted,margin:0,lineHeight:1.5 }}>CSV/Excel → Notion, Google Sheets, Excel. JSON → personal finance apps & APIs.</p>
        </div>
      )}

      {/* Add / edit form */}
      {showAdd && (
        <div style={{ background:"#fff",borderRadius:20,border:`1px solid ${palette.border}`,padding:20,marginBottom:16,boxShadow:"0 6px 30px rgba(0,0,0,0.08)" }}>
          <h3 style={{ fontSize:15,fontWeight:700,color:palette.text,margin:"0 0 14px" }}>{editId?"Edit":"New"} Expense</h3>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:8 }}>
            <Inp label="Date" type="date" value={ne.date} onChange={v=>setNe(p=>({...p,date:v}))}/>
            {cities.length>0
              ? <Inp label="City" value={ne.city} opts={["(any)",...cities]} onChange={v=>setNe(p=>({...p,city:v==="(any)"?"":v}))}/>
              : <Inp label="City" value={ne.city} placeholder="City" onChange={v=>setNe(p=>({...p,city:v}))}/>}
          </div>
          <Inp label="Description" value={ne.description} placeholder="What did you spend on?" onChange={v=>setNe(p=>({...p,description:v}))}/>
          <Inp label="Category" value={ne.category} opts={EXPENSE_CATS.map(c=>({v:c.id,l:c.emoji+" "+c.label}))} onChange={v=>setNe(p=>({...p,category:v}))}/>
          <div style={{ display:"grid",gridTemplateColumns:"1fr auto",gap:8 }}>
            <Inp label="Amount" type="number" value={ne.amount} placeholder="0.00" onChange={v=>setNe(p=>({...p,amount:v}))}/>
            <Inp label="Currency" value={ne.currency} opts={CURRENCIES} onChange={v=>setNe(p=>({...p,currency:v}))}/>
          </div>
          <Inp label="Paid By" value={ne.paidBy} placeholder="Your name / split" onChange={v=>setNe(p=>({...p,paidBy:v}))}/>
          <Inp label="Notes" value={ne.notes} placeholder="Extra details…" onChange={v=>setNe(p=>({...p,notes:v}))} multi rows={2}/>
          <div style={{ display:"flex",gap:8 }}>
            <button onClick={save} disabled={!ne.description.trim()||!ne.amount}
              style={{ flex:1,background:(ne.description.trim()&&ne.amount)?palette.primary:"#D0C8CA",color:"#fff",border:"none",borderRadius:10,padding:"11px 0",fontSize:13,fontWeight:700,cursor:(ne.description.trim()&&ne.amount)?"pointer":"not-allowed" }}>
              {editId?"Save Changes":"Add Expense"}
            </button>
            <button onClick={()=>{ setShowAdd(false); setEditId(null); }}
              style={{ flex:1,background:"#F5F0F2",color:palette.muted,border:"none",borderRadius:10,padding:"11px 0",fontSize:13,fontWeight:600,cursor:"pointer" }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div style={{ display:"flex",gap:6,overflowX:"auto",marginBottom:12 }}>
        <button onClick={()=>setFilterCat("all")} style={{ flexShrink:0,padding:"5px 12px",borderRadius:99,border:"none",fontSize:11,fontWeight:700,cursor:"pointer",background:filterCat==="all"?palette.primary:"#F5F0F2",color:filterCat==="all"?"#fff":palette.muted }}>All</button>
        {EXPENSE_CATS.map(c => { if(!expenses.some(e=>e.category===c.id)) return null; return (
          <button key={c.id} onClick={()=>setFilterCat(c.id)} style={{ flexShrink:0,padding:"5px 12px",borderRadius:99,border:"none",fontSize:11,fontWeight:700,cursor:"pointer",background:filterCat===c.id?palette.primary:"#F5F0F2",color:filterCat===c.id?"#fff":palette.muted }}>
            {c.emoji} {c.label}
          </button>
        ); })}
      </div>

      {/* List */}
      {filtered.length===0 && !showAdd && (
        <div style={{ textAlign:"center",padding:"50px 0",color:palette.muted }}>
          <div style={{ fontSize:40,marginBottom:12 }}>💸</div>
          <p style={{ fontSize:16,fontWeight:700,color:palette.text,margin:"0 0 6px" }}>No expenses yet</p>
          <p style={{ fontSize:13 }}>Track every spend — export to Notion or your finance app when done</p>
        </div>
      )}
      {filtered.map(e => {
        const cat = EXPENSE_CATS.find(c=>c.id===e.category)||EXPENSE_CATS[6];
        return (
          <div key={e.id} style={{ background:"#fff",borderRadius:16,border:`1px solid ${palette.border}`,padding:"12px 16px",marginBottom:8,display:"flex",alignItems:"center",gap:12 }}>
            <div style={{ width:40,height:40,borderRadius:12,background:palette.primaryLight,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0 }}>{cat.emoji}</div>
            <div style={{ flex:1,minWidth:0 }}>
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start" }}>
                <div style={{ flex:1,minWidth:0 }}>
                  <p style={{ fontSize:13,fontWeight:700,color:palette.text,margin:"0 0 2px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{e.description}</p>
                  <div style={{ display:"flex",gap:6,alignItems:"center",flexWrap:"wrap" }}>
                    <span style={{ fontSize:11,color:palette.muted }}>{fmtDateShort(e.date)}</span>
                    {e.city&&<span style={{ fontSize:11,color:palette.muted }}>· {e.city}</span>}
                    <span style={{ fontSize:10,background:"#F5F0F2",color:palette.muted,padding:"1px 7px",borderRadius:99,fontWeight:600 }}>{cat.label}</span>
                    {e.paidBy&&<span style={{ fontSize:10,color:palette.muted }}>👤 {e.paidBy}</span>}
                  </div>
                  {e.notes&&<p style={{ fontSize:11,color:palette.muted,margin:"3px 0 0" }}>{e.notes}</p>}
                </div>
                <div style={{ textAlign:"right",marginLeft:12,flexShrink:0 }}>
                  <p style={{ fontSize:15,fontWeight:800,color:palette.primary,margin:"0 0 5px" }}>{e.currency} {parseFloat(e.amount).toLocaleString(undefined,{maximumFractionDigits:2})}</p>
                  <div style={{ display:"flex",gap:4,justifyContent:"flex-end" }}>
                    <button onClick={()=>startEdit(e)} style={{ background:palette.primaryLight,color:palette.primary,border:"none",borderRadius:7,padding:"3px 8px",fontSize:11,cursor:"pointer" }}><Edit3 size={10}/></button>
                    <button onClick={()=>setDelId(e.id)} style={{ background:"#FDE8E8",color:"#9B2020",border:"none",borderRadius:7,padding:"3px 8px",fontSize:11,cursor:"pointer" }}><Trash2 size={10}/></button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// TRIP SELECTOR — with delete trip
// ══════════════════════════════════════════════════════════════
function TripSelector({ trips, onSelect, onCreate, onImport, onDelete, palette }) {
  const fileRef = useRef();
  const [dragging, setDragging] = useState(false);
  const [delId, setDelId] = useState(null);

  const parseAndCreate = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type:"binary" });
        const sheets = {};
        wb.SheetNames.forEach(n => { sheets[n] = XLSX.utils.sheet_to_json(wb.Sheets[n], { defval:"" }); });
        onImport(parseExcelSheets(sheets));
      } catch(err) { console.error("Import error:", err); alert("Could not read file. Open F12 console for details."); }
    };
    reader.readAsBinaryString(file);
  };

  const tripStatus = (t) => {
    if (!t.startDate) return { label:"Draft", color:"#6A6060", bg:"#F1EFEF" };
    const du = daysUntil(t.startDate);
    if (du > 0)  return { label:`In ${du} days`, color:"#8A6200", bg:"#FFF3DC" };
    if (du === 0) return { label:"Today!", color:"#fff", bg:"#C97B84" };
    if (daysUntil(t.endDate) >= 0) return { label:"Ongoing", color:"#3A6B42", bg:"#DFF0E1" };
    return { label:"Completed", color:"#6A6060", bg:"#F1EFEF" };
  };

  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(160deg,#FAF7F8 0%,#F2DDE1 100%)", fontFamily:"'DM Sans',sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=Playfair+Display:wght@600;700&display=swap" rel="stylesheet"/>
      {delId && <Confirm message="Permanently delete this trip and all its data? This cannot be undone." onOk={()=>{ onDelete(delId); setDelId(null); }} onNo={()=>setDelId(null)}/>}

      <div style={{ padding:"44px 24px 0" }}>
        <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:6 }}>
          <span style={{ fontSize:38 }}>☁️</span>
          <div>
            <h1 style={{ fontFamily:"'Playfair Display',Georgia,serif",fontSize:28,fontWeight:700,color:"#2D2426",margin:0 }}>Kumo Travel</h1>
            <p style={{ color:"#9A8F92",fontSize:13,margin:0 }}>All your trips in one place</p>
          </div>
        </div>
      </div>

      <div style={{ padding:"28px 24px 60px" }}>
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:20 }}>
          <button onClick={onCreate}
            style={{ background:palette.primary,color:"#fff",border:"none",borderRadius:16,padding:"18px 12px",fontSize:13,fontWeight:700,cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:6 }}>
            <Plus size={22}/>New Trip
          </button>
          <button onClick={()=>fileRef.current.click()}
            onDragOver={e=>{e.preventDefault();setDragging(true);}}
            onDragLeave={()=>setDragging(false)}
            onDrop={e=>{e.preventDefault();setDragging(false);const f=e.dataTransfer.files[0];if(f)parseAndCreate(f);}}
            style={{ background:dragging?palette.primaryLight:"#fff",color:palette.primary,border:`2px dashed ${palette.primary}`,borderRadius:16,padding:"18px 12px",fontSize:13,fontWeight:700,cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:6 }}>
            <Upload size={22}/>Import Excel
          </button>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" style={{ display:"none" }} onChange={e=>{if(e.target.files[0])parseAndCreate(e.target.files[0]);}}/>
        </div>

        {trips.length===0 && (
          <>
            <button onClick={()=>onImport({...DEMO_TRIP,id:uid()})}
              style={{ width:"100%",background:"#fff",color:"#9A8F92",border:"1px solid #EDE5E7",borderRadius:14,padding:"13px",fontSize:13,fontWeight:600,cursor:"pointer",marginBottom:28 }}>
              ✈️ Load Japan demo trip
            </button>
            <div style={{ textAlign:"center",padding:"20px 0",color:"#9A8F92" }}>
              <div style={{ fontSize:48,marginBottom:12 }}>🗺️</div>
              <p style={{ fontSize:16,fontWeight:700,color:"#2D2426",margin:"0 0 6px" }}>No trips yet</p>
              <p style={{ fontSize:13 }}>Create a new trip or import your Excel planner above</p>
            </div>
          </>
        )}

        {trips.length>0 && (
          <>
            <p style={{ fontSize:11,fontWeight:800,color:"#9A8F92",textTransform:"uppercase",letterSpacing:"0.08em",margin:"0 0 12px" }}>Your Trips ({trips.length})</p>
            {trips.map(trip => {
              const st = tripStatus(trip);
              const cities = [...new Set(trip.itinerary.map(d=>d.city).filter(Boolean))];
              return (
                <div key={trip.id}
                  style={{ background:"#fff",borderRadius:20,border:"1px solid #EDE5E7",marginBottom:12,boxShadow:"0 2px 14px rgba(0,0,0,0.05)",overflow:"hidden",transition:"transform 0.15s" }}
                  onMouseEnter={e=>e.currentTarget.style.transform="translateY(-2px)"}
                  onMouseLeave={e=>e.currentTarget.style.transform="none"}>
                  <div onClick={()=>onSelect(trip.id)} style={{ padding:"18px 20px",cursor:"pointer" }}>
                    <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8 }}>
                      <div>
                        <h3 style={{ fontSize:17,fontWeight:700,color:"#2D2426",margin:"0 0 3px",fontFamily:"'Playfair Display',Georgia,serif" }}>{trip.tripName}</h3>
                        <p style={{ fontSize:12,color:"#9A8F92",margin:0 }}>{fmtDateShort(trip.startDate)} — {fmtDateShort(trip.endDate)}</p>
                      </div>
                      <span style={{ background:st.bg,color:st.color,fontSize:10,fontWeight:800,padding:"4px 10px",borderRadius:99,flexShrink:0 }}>{st.label}</span>
                    </div>
                    <div style={{ display:"flex",gap:6,flexWrap:"wrap",marginBottom:8 }}>
                      {cities.slice(0,5).map(c=><span key={c} style={{ background:cityColor(c)+"20",color:cityColor(c),fontSize:11,fontWeight:700,padding:"2px 9px",borderRadius:99 }}>{c}</span>)}
                      {cities.length>5&&<span style={{ fontSize:11,color:"#9A8F92" }}>+{cities.length-5}</span>}
                    </div>
                    <div style={{ display:"flex",gap:14,flexWrap:"wrap" }}>
                      {trip.itinerary.length>0&&<span style={{ fontSize:12,color:"#9A8F92" }}>📅 {trip.itinerary.length} days</span>}
                      {(trip.memories||[]).length>0&&<span style={{ fontSize:12,color:"#9A8F92" }}>📸 {trip.memories.length} memories</span>}
                      {(trip.expenses||[]).length>0&&<span style={{ fontSize:12,color:"#9A8F92" }}>💸 {trip.expenses.length} expenses</span>}
                    </div>
                  </div>
                  <div style={{ borderTop:"1px solid #F5F0F2",padding:"10px 20px",display:"flex",justifyContent:"flex-end" }}>
                    <button onClick={e=>{e.stopPropagation();setDelId(trip.id);}}
                      style={{ display:"flex",alignItems:"center",gap:5,background:"#FDE8E8",color:"#9B2020",border:"none",borderRadius:8,padding:"6px 12px",fontSize:12,fontWeight:700,cursor:"pointer" }}>
                      <Trash2 size={12}/>Delete Trip
                    </button>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// RESTAURANTS VIEW — with cuisine autocomplete
// ══════════════════════════════════════════════════════════════
function RestaurantsView({ trip, palette, onUpdate }) {
  const allCities=[...new Set(trip.restaurants.map(r=>r.city).filter(Boolean))];
  const [city,setCity]=useState(allCities[0]||"");
  const [search,setSearch]=useState("");
  const [fSt,setFSt]=useState("all");
  const [showAdd,setShowAdd]=useState(false);
  const [showAddCity,setShowAddCity]=useState(false);
  const [delId,setDelId]=useState(null);
  const [nr,setNr]=useState({city:allCities[0]||"",name:"",cuisine:"",price:"¥¥",mustTry:"",area:"",reservationRequired:"No",notes:"",status:"wishlist",bookingFiles:[]});

  const switchCity=(c)=>{setCity(c);setNr(p=>({...p,city:c}));};
  useEffect(()=>{const u=[...new Set(trip.restaurants.map(r=>r.city).filter(Boolean))];if(u.length>0&&!u.includes(city))switchCity(u[u.length-1]);},[trip.restaurants]);

  const SO=["wishlist","chosen","visited","skipped"];
  const cycle=(r)=>{const i=SO.indexOf(r.status);onUpdate("restaurants",trip.restaurants.map(x=>x.id===r.id?{...x,status:SO[(i+1)%SO.length]}:x));};
  const doDelete=(id)=>{onUpdate("restaurants",trip.restaurants.filter(x=>x.id!==id));setDelId(null);};
  const addR=()=>{
    if(!nr.name.trim())return;
    onUpdate("restaurants",[...trip.restaurants,{...nr,id:uid()}]);
    setShowAdd(false);
    setNr({city,name:"",cuisine:"",price:"¥¥",mustTry:"",area:"",reservationRequired:"No",notes:"",status:"wishlist",bookingFiles:[]});
  };
  const addCity=(name)=>{onUpdate("restaurants",[...trip.restaurants,{id:uid(),city:name,name:"",cuisine:"",price:"",mustTry:"",area:"",reservationRequired:"No",notes:"",status:"wishlist",bookingFiles:[]}]);setShowAddCity(false);};

  const filtered=trip.restaurants.filter(r=>r.city===city&&r.name&&(fSt==="all"||r.status===fSt)&&(search===""||r.name.toLowerCase().includes(search.toLowerCase())||(r.cuisine||"").toLowerCase().includes(search.toLowerCase())));

  return (
    <div style={{ padding:"24px 20px 40px" }}>
      {delId&&<Confirm message="Remove this restaurant?" onOk={()=>doDelete(delId)} onNo={()=>setDelId(null)}/>}
      {showAddCity&&<CityDialog onOk={addCity} onNo={()=>setShowAddCity(false)} palette={palette}/>}

      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16 }}>
        <div>
          <h2 style={{ fontFamily:"'Playfair Display',Georgia,serif",fontSize:24,fontWeight:700,color:palette.text,margin:"0 0 4px" }}>Restaurants</h2>
          <p style={{ color:palette.muted,fontSize:13,margin:0 }}>{trip.restaurants.filter(r=>r.name&&r.status==="wishlist").length} wishlist · {trip.restaurants.filter(r=>r.name&&r.status==="chosen").length} chosen</p>
        </div>
        <button onClick={()=>setShowAdd(v=>!v)} style={{ display:"flex",alignItems:"center",gap:6,background:palette.primary,color:"#fff",border:"none",borderRadius:12,padding:"9px 16px",fontSize:13,fontWeight:700,cursor:"pointer" }}>
          <Plus size={15}/>Add
        </button>
      </div>

      <div style={{ display:"flex",gap:6,overflowX:"auto",paddingBottom:10,marginBottom:8 }}>
        {allCities.map(c=><button key={c} onClick={()=>switchCity(c)} style={{ flexShrink:0,padding:"7px 16px",borderRadius:99,border:"none",fontSize:13,fontWeight:700,cursor:"pointer",background:city===c?palette.primary:palette.primaryLight,color:city===c?"#fff":palette.primary }}>{c}</button>)}
        <button onClick={()=>setShowAddCity(true)} style={{ flexShrink:0,padding:"7px 14px",borderRadius:99,border:`1.5px dashed ${palette.primary}`,background:"transparent",color:palette.primary,fontSize:13,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:4 }}><Plus size={13}/>City</button>
      </div>

      {showAdd&&(
        <div style={{ background:"#fff",borderRadius:18,border:`1px solid ${palette.border}`,padding:20,marginBottom:16,boxShadow:"0 4px 20px rgba(0,0,0,0.07)" }}>
          <h3 style={{ fontSize:15,fontWeight:700,color:palette.text,margin:"0 0 14px" }}>Add Restaurant {city?"— "+city:""}</h3>
          <Inp label="Name" value={nr.name} placeholder="Restaurant name" onChange={v=>setNr(p=>({...p,name:v}))}/>
          <CuisineInput value={nr.cuisine} onChange={v=>setNr(p=>({...p,cuisine:v}))} palette={palette}/>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:8 }}>
            <Inp label="Price" value={nr.price} onChange={v=>setNr(p=>({...p,price:v}))} opts={["¥","¥¥","¥¥¥","¥¥¥¥","$","$$","$$$","$$$$"]}/>
            <Inp label="Reservation" value={nr.reservationRequired} onChange={v=>setNr(p=>({...p,reservationRequired:v}))} opts={["No","Yes","Recommended"]}/>
          </div>
          <Inp label="Must-try dish" value={nr.mustTry} placeholder="Signature item" onChange={v=>setNr(p=>({...p,mustTry:v}))}/>
          <Inp label="Area / District" value={nr.area} placeholder="Neighborhood" onChange={v=>setNr(p=>({...p,area:v}))}/>
          <Inp label="Notes" value={nr.notes} placeholder="Hours, tips…" onChange={v=>setNr(p=>({...p,notes:v}))} multi rows={2}/>
          {nr.reservationRequired!=="No"&&(
            <BookingUpload
              files={nr.bookingFiles||[]}
              onAdd={f=>setNr(p=>({...p,bookingFiles:[...(p.bookingFiles||[]),f]}))}
              onRemove={i=>setNr(p=>({...p,bookingFiles:p.bookingFiles.filter((_,pi)=>pi!==i)}))}
              palette={palette}/>
          )}
          <div style={{ display:"flex",gap:8 }}>
            <button onClick={addR} disabled={!nr.name.trim()} style={{ flex:1,background:nr.name.trim()?palette.primary:"#D0C8CA",color:"#fff",border:"none",borderRadius:10,padding:"11px 0",fontSize:13,fontWeight:700,cursor:nr.name.trim()?"pointer":"not-allowed" }}>Add Restaurant</button>
            <button onClick={()=>setShowAdd(false)} style={{ flex:1,background:"#F5F0F2",color:palette.muted,border:"none",borderRadius:10,padding:"11px 0",fontSize:13,fontWeight:600,cursor:"pointer" }}>Cancel</button>
          </div>
        </div>
      )}

      <div style={{ marginBottom:12 }}>
        <div style={{ display:"flex",alignItems:"center",background:"#fff",border:`1px solid ${palette.border}`,borderRadius:12,padding:"0 12px",marginBottom:8 }}>
          <Search size={14} color={palette.muted}/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search…" style={{ flex:1,border:"none",outline:"none",padding:"10px 8px",fontSize:13,fontFamily:"inherit",color:palette.text,background:"transparent" }}/>
          {search&&<button onClick={()=>setSearch("")} style={{ background:"none",border:"none",cursor:"pointer",padding:0 }}><X size={14} color={palette.muted}/></button>}
        </div>
        <div style={{ display:"flex",gap:6,overflowX:"auto" }}>
          {["all","wishlist","chosen","visited","skipped"].map(s=><button key={s} onClick={()=>setFSt(s)} style={{ flexShrink:0,padding:"5px 12px",borderRadius:99,border:"none",fontSize:11,fontWeight:700,cursor:"pointer",background:fSt===s?palette.primary:"#F5F0F2",color:fSt===s?"#fff":palette.muted }}>{s==="all"?"All":REST_STATUS[s]?.label}</button>)}
        </div>
      </div>

      {filtered.length===0&&<div style={{ textAlign:"center",padding:"40px 0",color:palette.muted }}><div style={{ fontSize:32,marginBottom:8 }}>🍽️</div><p>No restaurants found</p></div>}
      {filtered.map(r=>{
        const st=REST_STATUS[r.status]||REST_STATUS.wishlist;
        const hasFiles=(r.bookingFiles||[]).length>0;
        return (
          <div key={r.id} style={{ background:"#fff",borderRadius:18,border:`1px solid ${palette.border}`,padding:"14px 16px",marginBottom:10 }}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6 }}>
              <div style={{ flex:1,minWidth:0 }}>
                <h3 style={{ fontSize:15,fontWeight:700,color:palette.text,margin:"0 0 5px" }}>{r.name}</h3>
                <div style={{ display:"flex",gap:6,flexWrap:"wrap",alignItems:"center" }}>
                  {r.cuisine&&<span style={{ fontSize:11,background:"#F5F0F2",color:palette.muted,padding:"2px 8px",borderRadius:99,fontWeight:600 }}>{r.cuisine}</span>}
                  {r.price&&<span style={{ fontSize:12,color:palette.primary,fontWeight:700 }}>{r.price}</span>}
                  {r.area&&<span style={{ fontSize:11,color:palette.muted,display:"flex",alignItems:"center",gap:3 }}><MapPin size={10}/>{r.area}</span>}
                  {hasFiles&&<span style={{ fontSize:10,background:"#DFF0E1",color:"#3A6B42",padding:"1px 7px",borderRadius:99,fontWeight:700 }}>📄 Confirmation</span>}
                </div>
              </div>
              <div style={{ display:"flex",gap:6,marginLeft:8,flexShrink:0 }}>
                <button onClick={()=>cycle(r)} style={{ background:st.bg,color:st.text,border:"none",borderRadius:99,fontSize:10,fontWeight:700,padding:"5px 10px",cursor:"pointer" }}>{st.label}</button>
                <button onClick={()=>setDelId(r.id)} style={{ background:"#FDE8E8",color:"#9B2020",border:"none",borderRadius:8,padding:"5px 7px",cursor:"pointer" }}><Trash2 size={11}/></button>
              </div>
            </div>
            {r.mustTry&&<p style={{ fontSize:12,color:palette.text,margin:"0 0 4px" }}>⭐ {r.mustTry}</p>}
            {r.reservationRequired&&r.reservationRequired!=="No"&&<span style={{ fontSize:11,background:"#FFF3DC",color:"#8A6200",padding:"2px 8px",borderRadius:99,fontWeight:600,display:"inline-block",marginBottom:4 }}>Reservation: {r.reservationRequired}</span>}
            {r.notes&&<p style={{ fontSize:11,color:palette.muted,margin:"4px 0 0",lineHeight:1.4 }}>{r.notes}</p>}
            {hasFiles&&(
              <div style={{ marginTop:8 }}>
                {(r.bookingFiles||[]).map((f,i)=>(
                  <button key={i} onClick={()=>{ const a=document.createElement("a"); a.href=f.data; a.download=f.name; a.click(); }}
                    style={{ display:"inline-flex",alignItems:"center",gap:5,background:"#F5F0F2",color:palette.muted,border:"none",borderRadius:8,padding:"4px 10px",fontSize:11,fontWeight:700,cursor:"pointer",marginRight:6 }}>
                    📄 {f.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// HOTELS VIEW — with booking upload
// ══════════════════════════════════════════════════════════════
function HotelsView({ trip, palette, onUpdate }) {
  const [copied,setCopied]=useState(null);
  const [showAdd,setShowAdd]=useState(false);
  const [delId,setDelId]=useState(null);
  const [nh,setNh]=useState({city:"",name:"",checkIn:"",checkOut:"",confirmation:"",address:"",phone:"",notes:"",bookingFiles:[]});

  const copy=(id,txt)=>{navigator.clipboard.writeText(txt).catch(()=>{});setCopied(id);setTimeout(()=>setCopied(null),1500);};
  const doDelete=(id)=>{onUpdate("hotels",trip.hotels.filter(x=>x.id!==id));setDelId(null);};
  const addH=()=>{
    if(!nh.name.trim())return;
    onUpdate("hotels",[...trip.hotels,{...nh,id:uid()}]);
    setShowAdd(false);
    setNh({city:"",name:"",checkIn:"",checkOut:"",confirmation:"",address:"",phone:"",notes:"",bookingFiles:[]});
  };

  return (
    <div style={{ padding:"24px 20px 40px" }}>
      {delId&&<Confirm message="Remove this hotel?" onOk={()=>doDelete(delId)} onNo={()=>setDelId(null)}/>}
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20 }}>
        <div><h2 style={{ fontFamily:"'Playfair Display',Georgia,serif",fontSize:24,fontWeight:700,color:palette.text,margin:"0 0 4px" }}>Hotels</h2><p style={{ color:palette.muted,fontSize:13,margin:0 }}>{trip.hotels.length} stays</p></div>
        <button onClick={()=>setShowAdd(v=>!v)} style={{ display:"flex",alignItems:"center",gap:6,background:palette.primary,color:"#fff",border:"none",borderRadius:12,padding:"9px 16px",fontSize:13,fontWeight:700,cursor:"pointer" }}><Plus size={15}/>Add Hotel</button>
      </div>

      {showAdd&&(
        <div style={{ background:"#fff",borderRadius:18,border:`1px solid ${palette.border}`,padding:20,marginBottom:16,boxShadow:"0 4px 20px rgba(0,0,0,0.07)" }}>
          <h3 style={{ fontSize:15,fontWeight:700,color:palette.text,margin:"0 0 14px" }}>New Stay</h3>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:8 }}>
            <Inp label="City" value={nh.city} placeholder="e.g. Tokyo" onChange={v=>setNh(p=>({...p,city:v}))}/>
            <Inp label="Hotel Name" value={nh.name} placeholder="Hotel name" onChange={v=>setNh(p=>({...p,name:v}))}/>
          </div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:8 }}>
            <Inp label="Check-in" type="date" value={nh.checkIn} onChange={v=>setNh(p=>({...p,checkIn:v}))}/>
            <Inp label="Check-out" type="date" value={nh.checkOut} onChange={v=>setNh(p=>({...p,checkOut:v}))}/>
          </div>
          <Inp label="Confirmation #" value={nh.confirmation} placeholder="Booking reference" onChange={v=>setNh(p=>({...p,confirmation:v}))}/>
          <Inp label="Address" value={nh.address} placeholder="Full address" onChange={v=>setNh(p=>({...p,address:v}))}/>
          <Inp label="Phone" value={nh.phone} placeholder="+XX XXX XXXX" onChange={v=>setNh(p=>({...p,phone:v}))}/>
          <Inp label="Notes" value={nh.notes} placeholder="Early check-in, preferences…" onChange={v=>setNh(p=>({...p,notes:v}))} multi rows={2}/>
          <BookingUpload
            files={nh.bookingFiles||[]}
            onAdd={f=>setNh(p=>({...p,bookingFiles:[...(p.bookingFiles||[]),f]}))}
            onRemove={i=>setNh(p=>({...p,bookingFiles:p.bookingFiles.filter((_,pi)=>pi!==i)}))}
            palette={palette}/>
          <div style={{ display:"flex",gap:8 }}>
            <button onClick={addH} disabled={!nh.name.trim()} style={{ flex:1,background:nh.name.trim()?palette.primary:"#D0C8CA",color:"#fff",border:"none",borderRadius:10,padding:"11px 0",fontSize:13,fontWeight:700,cursor:nh.name.trim()?"pointer":"not-allowed" }}>Add Hotel</button>
            <button onClick={()=>setShowAdd(false)} style={{ flex:1,background:"#F5F0F2",color:palette.muted,border:"none",borderRadius:10,padding:"11px 0",fontSize:13,fontWeight:600,cursor:"pointer" }}>Cancel</button>
          </div>
        </div>
      )}

      {trip.hotels.map(h=>{
        const nights=nightsBetween(h.checkIn,h.checkOut),du=daysUntil(h.checkIn);
        const active=new Date(h.checkIn+"T00:00:00")<=new Date()&&new Date(h.checkOut+"T00:00:00")>=new Date();
        const past=new Date(h.checkOut+"T00:00:00")<new Date();
        const hasFiles=(h.bookingFiles||[]).length>0;
        return(
          <div key={h.id} style={{ background:"#fff",borderRadius:20,border:`1.5px solid ${active?palette.primary+"44":palette.border}`,marginBottom:12,overflow:"hidden",opacity:past?0.65:1,boxShadow:active?`0 4px 20px ${palette.primary}18`:"0 1px 8px rgba(0,0,0,0.04)" }}>
            {active&&<div style={{ background:`linear-gradient(90deg,${palette.primary},${palette.accent})`,height:4 }}/>}
            <div style={{ padding:"16px 18px" }}>
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10 }}>
                <div>
                  <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:5 }}>
                    <span style={{ background:cityColor(h.city)+"20",color:cityColor(h.city),fontSize:11,fontWeight:700,padding:"2px 9px",borderRadius:99 }}>{h.city}</span>
                    {active&&<span style={{ background:palette.primaryLight,color:palette.primary,fontSize:10,fontWeight:800,padding:"2px 8px",borderRadius:99 }}>STAYING HERE</span>}
                    {hasFiles&&<span style={{ fontSize:10,background:"#DFF0E1",color:"#3A6B42",padding:"2px 8px",borderRadius:99,fontWeight:700 }}>📄 Docs</span>}
                  </div>
                  <h3 style={{ fontSize:16,fontWeight:700,color:palette.text,margin:0 }}>{h.name}</h3>
                </div>
                <div style={{ textAlign:"right",display:"flex",flexDirection:"column",alignItems:"flex-end",gap:6 }}>
                  <div><div style={{ fontSize:20,fontWeight:800,color:palette.primary }}>{nights}</div><div style={{ fontSize:11,color:palette.muted,fontWeight:600 }}>night{nights!==1?"s":""}</div></div>
                  <button onClick={()=>setDelId(h.id)} style={{ background:"#FDE8E8",color:"#9B2020",border:"none",borderRadius:8,padding:"5px 7px",cursor:"pointer" }}><Trash2 size={12}/></button>
                </div>
              </div>
              <div style={{ background:"#FAF8F9",borderRadius:12,padding:"10px 12px",marginBottom:10,display:"flex",justifyContent:"space-between" }}>
                <div><p style={{ fontSize:10,fontWeight:700,color:palette.muted,margin:"0 0 2px" }}>CHECK IN</p><p style={{ fontSize:13,fontWeight:700,color:palette.text,margin:0 }}>{fmtDate(h.checkIn)}</p></div>
                <div style={{ width:1,background:palette.border }}/>
                <div style={{ textAlign:"right" }}><p style={{ fontSize:10,fontWeight:700,color:palette.muted,margin:"0 0 2px" }}>CHECK OUT</p><p style={{ fontSize:13,fontWeight:700,color:palette.text,margin:0 }}>{fmtDate(h.checkOut)}</p></div>
              </div>
              {!past&&du>0&&<p style={{ fontSize:11,color:palette.muted,margin:"0 0 10px",textAlign:"center" }}>Check-in in {du} day{du!==1?"s":""}</p>}
              <div style={{ display:"flex",gap:8 }}>
                {h.confirmation&&<button onClick={()=>copy(h.id,h.confirmation)} style={{ flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:6,background:copied===h.id?"#DFF0E1":palette.primaryLight,color:copied===h.id?"#3A6B42":palette.primary,border:"none",borderRadius:10,padding:"10px 0",fontSize:12,fontWeight:700,cursor:"pointer",transition:"all 0.2s" }}>{copied===h.id?<Check size={13}/>:<Copy size={13}/>}{copied===h.id?"Copied!":h.confirmation}</button>}
                {h.address&&<a href={`https://maps.google.com/?q=${encodeURIComponent(h.address)}`} target="_blank" rel="noreferrer" style={{ display:"flex",alignItems:"center",gap:5,background:"#F5F0F2",color:palette.muted,borderRadius:10,padding:"10px 14px",fontSize:12,fontWeight:700,textDecoration:"none" }}><MapPin size={13}/>Map</a>}
              </div>
              {hasFiles&&(
                <div style={{ marginTop:10,paddingTop:10,borderTop:`1px solid ${palette.border}` }}>
                  <p style={{ fontSize:11,fontWeight:700,color:palette.muted,margin:"0 0 6px" }}>BOOKING DOCUMENTS</p>
                  <div style={{ display:"flex",gap:6,flexWrap:"wrap" }}>
                    {h.bookingFiles.map((f,i)=>(
                      <button key={i} onClick={()=>{ const a=document.createElement("a"); a.href=f.data; a.download=f.name; a.click(); }}
                        style={{ display:"inline-flex",alignItems:"center",gap:5,background:"#F5F0F2",color:palette.muted,border:"none",borderRadius:8,padding:"5px 10px",fontSize:11,fontWeight:700,cursor:"pointer" }}>
                        📄 {f.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {h.notes&&<p style={{ fontSize:12,color:palette.muted,margin:"10px 0 0",lineHeight:1.4 }}>{h.notes}</p>}
            </div>
          </div>
        );
      })}
      {trip.hotels.length===0&&<div style={{ textAlign:"center",padding:"60px 0",color:palette.muted }}><div style={{ fontSize:40,marginBottom:12 }}>🏨</div><p>No hotels yet</p></div>}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// SETTINGS VIEW
// ══════════════════════════════════════════════════════════════
function SettingsView({ trip, palette, paletteName, setPaletteName, onUpdate, onReset, onImportNew }) {
  const [edit,setEdit]=useState(false);
  const [tn,setTn]=useState(trip.tripName);
  const [sd,setSd]=useState(trip.startDate);
  const [ed,setEd]=useState(trip.endDate);
  const [confirmReset,setConfirmReset]=useState(false);
  const save=()=>{ onUpdate("meta",{tripName:tn,startDate:sd,endDate:ed}); setEdit(false); };

  return (
    <div style={{ padding:"24px 20px 40px" }}>
      {confirmReset&&<Confirm message="Permanently delete this trip and all its data?" onOk={()=>{ setConfirmReset(false); onReset(); }} onNo={()=>setConfirmReset(false)}/>}
      <h2 style={{ fontFamily:"'Playfair Display',Georgia,serif",fontSize:24,fontWeight:700,color:palette.text,margin:"0 0 20px" }}>Settings</h2>

      <div style={{ background:"#fff",borderRadius:20,border:`1px solid ${palette.border}`,padding:20,marginBottom:14 }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14 }}>
          <p style={{ fontSize:14,fontWeight:700,color:palette.text,margin:0 }}>Trip Info</p>
          <button onClick={()=>{ setTn(trip.tripName); setSd(trip.startDate); setEd(trip.endDate); setEdit(v=>!v); }} style={{ background:palette.primaryLight,color:palette.primary,border:"none",borderRadius:8,padding:"6px 14px",fontSize:12,fontWeight:700,cursor:"pointer" }}>{edit?"Cancel":"Edit"}</button>
        </div>
        {edit?(<>
          <Inp label="Trip Name" value={tn} onChange={setTn}/>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:8 }}><Inp label="Start" type="date" value={sd} onChange={setSd}/><Inp label="End" type="date" value={ed} onChange={setEd}/></div>
          <button onClick={save} style={{ background:palette.primary,color:"#fff",border:"none",borderRadius:10,padding:"10px 20px",fontSize:13,fontWeight:700,cursor:"pointer" }}>Save Changes</button>
        </>):(
          <><p style={{ fontSize:16,fontWeight:700,color:palette.text,margin:"0 0 4px" }}>{trip.tripName}</p><p style={{ fontSize:13,color:palette.muted,margin:0 }}>{fmtDate(trip.startDate)} — {fmtDate(trip.endDate)}</p></>
        )}
      </div>

      <div style={{ background:"#fff",borderRadius:20,border:`1px solid ${palette.border}`,padding:20,marginBottom:14 }}>
        <p style={{ fontSize:14,fontWeight:700,color:palette.text,margin:"0 0 14px" }}>Colour Theme</p>
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10 }}>
          {Object.entries(PALETTES).map(([name,p])=>(
            <button key={name} onClick={()=>setPaletteName(name)} style={{ background:p.primaryLight,border:`2.5px solid ${paletteName===name?p.primary:"transparent"}`,borderRadius:14,padding:"12px 14px",cursor:"pointer",textAlign:"left",transition:"all 0.15s" }}>
              <div style={{ width:26,height:26,borderRadius:"50%",background:p.primary,marginBottom:6 }}/>
              <p style={{ fontSize:12,fontWeight:700,color:p.text,margin:0 }}>{p.name}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Multi-user instructions */}
      <div style={{ background:"#fff",borderRadius:20,border:`1px solid ${palette.border}`,padding:20,marginBottom:14 }}>
        <p style={{ fontSize:14,fontWeight:700,color:palette.text,margin:"0 0 10px" }}>👥 Share with Others</p>
        <p style={{ fontSize:13,color:palette.muted,margin:"0 0 10px",lineHeight:1.6 }}>
          Kumo stores data locally in each browser. To let others use their own trips:
        </p>
        <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
          <div style={{ background:"#FAF8F9",borderRadius:12,padding:"12px 14px",border:`1px solid ${palette.border}` }}>
            <p style={{ fontSize:12,fontWeight:700,color:palette.text,margin:"0 0 4px" }}>Option 1 — Share the URL</p>
            <p style={{ fontSize:12,color:palette.muted,margin:0,lineHeight:1.5 }}>Anyone with your Vercel URL can open Kumo in their own browser. Their data is completely separate from yours — each device has its own storage.</p>
          </div>
          <div style={{ background:"#FAF8F9",borderRadius:12,padding:"12px 14px",border:`1px solid ${palette.border}` }}>
            <p style={{ fontSize:12,fontWeight:700,color:palette.text,margin:"0 0 4px" }}>Option 2 — Add to Home Screen</p>
            <p style={{ fontSize:12,color:palette.muted,margin:0,lineHeight:1.5 }}>Each person opens the URL in Safari/Chrome, adds to their home screen, and uses it as their own private app — data never mixes.</p>
          </div>
          <div style={{ background:"#FAF8F9",borderRadius:12,padding:"12px 14px",border:`1px solid ${palette.border}` }}>
            <p style={{ fontSize:12,fontWeight:700,color:palette.text,margin:"0 0 4px" }}>Option 3 — Cloud sync (future)</p>
            <p style={{ fontSize:12,color:palette.muted,margin:0,lineHeight:1.5 }}>Adding a backend (Supabase, Firebase) would allow real accounts and shared trips. This is a planned upgrade.</p>
          </div>
        </div>
      </div>

      <div style={{ background:"#fff",borderRadius:20,border:`1px solid ${palette.border}`,padding:20 }}>
        <p style={{ fontSize:14,fontWeight:700,color:palette.text,margin:"0 0 12px" }}>Data</p>
        <button onClick={onImportNew} style={{ display:"block",width:"100%",background:palette.primaryLight,color:palette.primary,border:"none",borderRadius:10,padding:"11px 0",fontSize:13,fontWeight:700,cursor:"pointer",marginBottom:10 }}>📥 Import / Replace Excel File</button>
        <button onClick={()=>setConfirmReset(true)} style={{ display:"block",width:"100%",background:"#FDE8E8",color:"#9B2020",border:"none",borderRadius:10,padding:"11px 0",fontSize:13,fontWeight:700,cursor:"pointer" }}>🗑️ Delete This Trip</button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// ROOT APP
// ══════════════════════════════════════════════════════════════
export default function App() {
  const [paletteName, setPaletteName] = useState("sakura");
  const [trips, setTrips]             = useState([]);
  const [activeTripId, setActiveTripId] = useState(null);
  const [view, setView]               = useState("home");
  const palette = PALETTES[paletteName];

  useEffect(() => {
    try {
      const saved   = localStorage.getItem("kumo_trips_v3");
      const savedP  = localStorage.getItem("kumo_palette");
      const savedAct= localStorage.getItem("kumo_active_v3");
      if (saved) {
        const parsed = JSON.parse(saved);
        // Ensure every trip has all required fields (migrations)
        const migrated = parsed.map(t => ({
          memories:[], expenses:[], budget:{amount:"",currency:"USD"},
          route:{stops:[],travelMode:"walking"}, ...t
        }));
        setTrips(migrated);
        if (savedAct && migrated.find(t=>t.id===savedAct)) setActiveTripId(savedAct);
      }
      if (savedP && PALETTES[savedP]) setPaletteName(savedP);
    } catch(e) { console.error("Load error:", e); }
  }, []);

  useEffect(() => { try { localStorage.setItem("kumo_trips_v3", JSON.stringify(trips)); } catch(e) {} }, [trips]);
  useEffect(() => { localStorage.setItem("kumo_palette", paletteName); }, [paletteName]);
  useEffect(() => { if (activeTripId) localStorage.setItem("kumo_active_v3", activeTripId); }, [activeTripId]);

  const activeTrip = trips.find(t=>t.id===activeTripId) || null;

  const createTrip = () => {
    const t = { id:uid(), tripName:`Trip ${trips.length+1}`, startDate:"", endDate:"",
      itinerary:[], restaurants:[], hotels:[], memories:[], expenses:[],
      budget:{amount:"",currency:"USD"}, route:{stops:[],travelMode:"walking"} };
    setTrips(prev=>[...prev,t]); setActiveTripId(t.id); setView("home");
  };

  const importTrip = (trip) => {
    const safe = { memories:[], expenses:[], budget:{amount:"",currency:"USD"},
      route:{stops:[],travelMode:"walking"}, ...trip };
    setTrips(prev => { const ex=prev.find(t=>t.id===safe.id); return ex ? prev.map(t=>t.id===safe.id?safe:t) : [...prev,safe]; });
    setActiveTripId(safe.id); setView("home");
  };

  const deleteTrip = (id) => {
    setTrips(prev=>prev.filter(t=>t.id!==id));
    if (activeTripId===id) setActiveTripId(null);
  };

  const updateTrip = useCallback((section, value) => {
    setTrips(prev => prev.map(t => {
      if (t.id !== activeTripId) return t;
      if (section === "meta") return { ...t, ...value };
      return { ...t, [section]:value };
    }));
  }, [activeTripId]);

  const NAV = [
    { id:"home",        label:"Home",      Icon:Home },
    { id:"itinerary",   label:"Itinerary", Icon:Calendar },
    { id:"restaurants", label:"Eats",      Icon:Utensils },
    { id:"hotels",      label:"Hotels",    Icon:Hotel },
    { id:"transport",   label:"Transport", Icon:Train },
    { id:"finances",    label:"Finances",  Icon:Star },
    { id:"route",       label:"Route",     Icon:MapPin },
    { id:"memories",    label:"Memories",  Icon:Camera },
    { id:"settings",    label:"Settings",  Icon:Settings },
  ];
  const mobileNav = NAV.filter(n=>["home","itinerary","restaurants","finances","memories"].includes(n.id));
  const unbooked = activeTrip ? activeTrip.itinerary.filter(d=>d.bookingStatus==="needs booking").length : 0;

  if (!activeTripId || !activeTrip) {
    return (
      <>
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=Playfair+Display:wght@600;700&display=swap" rel="stylesheet"/>
        <TripSelector trips={trips} onSelect={id=>{setActiveTripId(id);setView("home");}} onCreate={createTrip} onImport={importTrip} onDelete={deleteTrip} palette={palette}/>
      </>
    );
  }

  const renderView = () => {
    const p = { trip:activeTrip, palette, onUpdate:updateTrip };
    switch(view) {
      case "home":        return <HomeView        {...p} setView={setView}/>;
      case "itinerary":   return <ItineraryView   {...p}/>;
      case "restaurants": return <RestaurantsView {...p}/>;
      case "hotels":      return <HotelsView      {...p}/>;
      case "transport":   return <TransportView   {...p}/>;
      case "finances":    return <FinancesView    {...p}/>;
      case "route":       return <RoutePlannerView {...p}/>;
      case "memories":    return <MemoriesView    {...p}/>;
      case "settings":    return <SettingsView    {...p} paletteName={paletteName} setPaletteName={setPaletteName} onReset={()=>deleteTrip(activeTripId)} onImportNew={()=>setActiveTripId(null)}/>;
      default:            return <HomeView        {...p} setView={setView}/>;
    }
  };

  return (
    <div style={{ minHeight:"100vh", background:palette.bg, fontFamily:"'DM Sans',-apple-system,sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=Playfair+Display:wght@600;700&display=swap" rel="stylesheet"/>
      <style>{`
        @media(min-width:768px){.km-mob-nav{display:none!important;}.km-topbar{display:none!important;}.km-sidebar{display:flex!important;}.km-content{margin-left:240px;}}
        @media(max-width:767px){.km-sidebar{display:none!important;}.km-content{margin-left:0;padding-bottom:80px;}}
        *{box-sizing:border-box;}
        ::-webkit-scrollbar{width:4px;height:4px;}
        ::-webkit-scrollbar-thumb{background:#D0C8CA;border-radius:99px;}
      `}</style>

      {/* DESKTOP SIDEBAR */}
      <div className="km-sidebar" style={{ display:"none",position:"fixed",left:0,top:0,bottom:0,width:240,background:"#fff",borderRight:`1px solid ${palette.border}`,flexDirection:"column",zIndex:300,padding:"24px 0 20px" }}>
        <div style={{ padding:"0 20px 16px",borderBottom:`1px solid ${palette.border}` }}>
          <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:14 }}>
            <span style={{ fontSize:24 }}>☁️</span>
            <div>
              <div style={{ fontSize:15,fontWeight:800,color:palette.text,fontFamily:"'Playfair Display',Georgia,serif" }}>Kumo</div>
              <div style={{ fontSize:10,color:palette.muted,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.05em" }}>Travel Planner</div>
            </div>
          </div>
          <button onClick={()=>setActiveTripId(null)} style={{ width:"100%",background:palette.primaryLight,color:palette.primary,border:"none",borderRadius:10,padding:"8px 12px",fontSize:12,fontWeight:700,cursor:"pointer",textAlign:"left",display:"flex",justifyContent:"space-between",alignItems:"center" }}>
            <span style={{ overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1 }}>{activeTrip.tripName}</span>
            <span style={{ fontSize:10,opacity:0.65,marginLeft:6,flexShrink:0 }}>↕ trips</span>
          </button>
        </div>
        <nav style={{ flex:1,padding:"12px",overflowY:"auto" }}>
          {NAV.map(({id,label,Icon})=>(
            <button key={id} onClick={()=>setView(id)} style={{ display:"flex",alignItems:"center",gap:12,width:"100%",background:view===id?palette.primaryLight:"transparent",color:view===id?palette.primary:palette.muted,border:"none",borderRadius:12,padding:"11px 14px",fontSize:13,fontWeight:view===id?700:500,cursor:"pointer",textAlign:"left",transition:"all 0.15s",marginBottom:2 }}>
              <Icon size={17} strokeWidth={view===id?2.5:1.8}/>{label}
              {id==="transport"&&unbooked>0&&<span style={{ marginLeft:"auto",background:"#E05C5C",color:"#fff",fontSize:10,fontWeight:800,width:18,height:18,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center" }}>{unbooked}</span>}
            </button>
          ))}
        </nav>
        <div style={{ padding:"12px 20px",borderTop:`1px solid ${palette.border}` }}>
          <button onClick={createTrip} style={{ width:"100%",background:palette.primaryLight,color:palette.primary,border:"none",borderRadius:10,padding:"9px 0",fontSize:12,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6 }}>
            <Plus size={14}/>New Trip
          </button>
        </div>
      </div>

      {/* MOBILE TOP BAR */}
      <div className="km-topbar" style={{ position:"sticky",top:0,zIndex:200,background:palette.bg,borderBottom:`1px solid ${palette.border}`,padding:"12px 16px",display:"flex",justifyContent:"space-between",alignItems:"center" }}>
        <button onClick={()=>setActiveTripId(null)} style={{ display:"flex",alignItems:"center",gap:6,background:"none",border:"none",cursor:"pointer",padding:0 }}>
          <span style={{ fontSize:18 }}>☁️</span>
          <span style={{ fontSize:14,fontWeight:800,color:palette.text,fontFamily:"'Playfair Display',Georgia,serif" }}>Kumo</span>
        </button>
        <span style={{ fontSize:11,fontWeight:700,color:palette.primary,maxWidth:120,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{activeTrip.tripName}</span>
        <div style={{ display:"flex",gap:4 }}>
          <button onClick={()=>setView("route")} style={{ background:view==="route"?palette.primaryLight:"transparent",border:"none",borderRadius:8,padding:"6px 8px",cursor:"pointer" }}>
            <MapPin size={17} color={view==="route"?palette.primary:palette.muted}/>
          </button>
          <button onClick={()=>setView("transport")} style={{ background:view==="transport"?palette.primaryLight:"transparent",border:"none",borderRadius:8,padding:"6px 8px",cursor:"pointer",position:"relative" }}>
            <Train size={17} color={view==="transport"?palette.primary:palette.muted}/>
            {unbooked>0&&<span style={{ position:"absolute",top:2,right:2,width:6,height:6,borderRadius:"50%",background:"#E05C5C",border:"1.5px solid "+palette.bg }}/>}
          </button>
          <button onClick={()=>setView("settings")} style={{ background:view==="settings"?palette.primaryLight:"transparent",border:"none",borderRadius:8,padding:"6px 8px",cursor:"pointer" }}>
            <Settings size={17} color={view==="settings"?palette.primary:palette.muted}/>
          </button>
        </div>
      </div>

      {/* MAIN */}
      <div className="km-content" style={{ minHeight:"100vh" }}>
        <div style={{ maxWidth:900,margin:"0 auto" }}>{renderView()}</div>
      </div>

      {/* MOBILE BOTTOM NAV */}
      <div className="km-mob-nav" style={{ position:"fixed",bottom:0,left:0,right:0,background:"#fff",borderTop:`1px solid ${palette.border}`,display:"flex",justifyContent:"space-around",padding:"8px 0 14px",zIndex:200 }}>
        {mobileNav.map(({id,label,Icon})=>(
          <button key={id} onClick={()=>setView(id)} style={{ display:"flex",flexDirection:"column",alignItems:"center",gap:3,background:"none",border:"none",cursor:"pointer",padding:"4px 6px",color:view===id?palette.primary:palette.muted }}>
            <Icon size={20} strokeWidth={view===id?2.5:1.8}/>
            <span style={{ fontSize:9,fontWeight:view===id?700:500 }}>{label}</span>
            {view===id&&<div style={{ width:16,height:2.5,background:palette.primary,borderRadius:99 }}/>}
          </button>
        ))}
      </div>
    </div>
  );
}
