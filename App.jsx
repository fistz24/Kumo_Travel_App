import { useState, useEffect, useRef } from "react";
import * as XLSX from "xlsx";
import {
  MapPin, Calendar, Hotel, Train, Home, Upload, ChevronDown,
  Check, AlertCircle, Copy, Search, X, Edit3, Plane, Bus, Car,
  Footprints, Ship, Globe, Settings, Utensils, Plus, Trash2,
  ChevronRight, Star
} from "lucide-react";

// ─── PALETTES ────────────────────────────────────────────────────────────────
const PALETTES = {
  sakura:    { primary:"#C97B84", primaryLight:"#F2DDE1", accent:"#D4A0A7", bg:"#FAF7F8", surface:"#FFFFFF", border:"#EDE5E7", text:"#2D2426", muted:"#9A8F92", name:"Sakura" },
  wisteria:  { primary:"#7B6FA0", primaryLight:"#E8E3F5", accent:"#A99BC8", bg:"#F8F7FB", surface:"#FFFFFF", border:"#E5E0F0", text:"#241E35", muted:"#8078A0", name:"Wisteria" },
  matcha:    { primary:"#6B8F71", primaryLight:"#DFF0E1", accent:"#95B89B", bg:"#F6FAF7", surface:"#FFFFFF", border:"#D8EDD9", text:"#1E2E21", muted:"#6B836E", name:"Matcha" },
  persimmon: { primary:"#C46E3A", primaryLight:"#F5E5D9", accent:"#D4966E", bg:"#FAF6F3", surface:"#FFFFFF", border:"#EDE0D5", text:"#2D1E12", muted:"#9A7A5A", name:"Persimmon" },
};

const TRANSPORT_META = {
  flight: { Icon:Plane,     label:"Flight",  colors:["#E3EDF5","#2A567A"] },
  train:  { Icon:Train,     label:"Train",   colors:["#DFF0E1","#3A6B42"] },
  bus:    { Icon:Bus,       label:"Bus",     colors:["#FFF3DC","#8A6200"] },
  car:    { Icon:Car,       label:"Car",     colors:["#EEE8F8","#5B4C8A"] },
  walk:   { Icon:Footprints,label:"Walk",    colors:["#F0F5E3","#4A6A20"] },
  boat:   { Icon:Ship,      label:"Boat",    colors:["#E3EEF5","#2A4C7A"] },
  other:  { Icon:Globe,     label:"Other",   colors:["#F1EFEF","#5A5A5A"] },
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

// ─── CITY COLORS ─────────────────────────────────────────────────────────────
const COLOR_POOL = ["#C97B84","#7B6FA0","#6B8F71","#C46E3A","#5B8DAE","#8A7B5C","#9A6B8A","#6B8A9A"];
const colorMap = {};
let colorIdx = 0;
function cityColor(city) {
  if (!city) return "#AAA";
  if (!colorMap[city]) { colorMap[city] = COLOR_POOL[colorIdx++ % COLOR_POOL.length]; }
  return colorMap[city];
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const fmtDate = (s) => {
  if (!s) return "—";
  try { return new Date(s + "T00:00:00").toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"}); }
  catch { return s; }
};
const nightsBetween = (a,b) => {
  try { return Math.max(0,Math.round((new Date(b)-new Date(a))/86400000)); } catch { return 0; }
};
const daysUntil = (s) => {
  try { return Math.round((new Date(s+"T00:00:00") - new Date(new Date().toDateString())) / 86400000); }
  catch { return 0; }
};
const isToday = (s) => {
  try { return new Date(s+"T00:00:00").toDateString() === new Date().toDateString(); } catch { return false; }
};
const isPast = (s) => {
  try { return new Date(s+"T00:00:00") < new Date(new Date().toDateString()); } catch { return false; }
};
const uid = () => Math.random().toString(36).slice(2,9);

// ─── DEMO DATA ────────────────────────────────────────────────────────────────
const DEMO = {
  tripName:"Japan Autumn 2026", startDate:"2026-10-15", endDate:"2026-10-30",
  itinerary:[
    {id:"d1",date:"2026-10-15",dayNum:1,city:"Tokyo",activities:"Arrive Narita, check in, explore Shinjuku",transport:"flight",transportDetail:"JL 712 Jakarta→Tokyo",bookingStatus:"confirmed",notes:"Early check-in requested"},
    {id:"d2",date:"2026-10-16",dayNum:2,city:"Tokyo",activities:"Tsukiji market, Senso-ji, Ueno Park, Akihabara",transport:"walk",transportDetail:"Tokyo Metro day pass",bookingStatus:"confirmed",notes:""},
    {id:"d3",date:"2026-10-17",dayNum:3,city:"Tokyo",activities:"Harajuku, Meiji Shrine, Shibuya crossing, Roppongi",transport:"walk",transportDetail:"",bookingStatus:"confirmed",notes:"TeamLab tickets pre-booked"},
    {id:"d4",date:"2026-10-18",dayNum:4,city:"Hakone",activities:"Open Air Museum, Mt Fuji views, onsen ryokan",transport:"train",transportDetail:"Romancecar from Shinjuku 08:30",bookingStatus:"confirmed",notes:"Hakone Free Pass"},
    {id:"d5",date:"2026-10-19",dayNum:5,city:"Kyoto",activities:"Arrive Kyoto, Nishiki Market, Gion walk at dusk",transport:"train",transportDetail:"Shinkansen Kodama — Odawara→Kyoto 11:20",bookingStatus:"confirmed",notes:""},
    {id:"d6",date:"2026-10-20",dayNum:6,city:"Kyoto",activities:"Arashiyama bamboo grove, Fushimi Inari sunset",transport:"bus",transportDetail:"City Bus pass",bookingStatus:"confirmed",notes:"Start early!"},
    {id:"d7",date:"2026-10-21",dayNum:7,city:"Kyoto",activities:"Kinkaku-ji, Nijo Castle, Philosopher's Path",transport:"car",transportDetail:"Rent from hotel",bookingStatus:"confirmed",notes:"Tea ceremony 14:00"},
    {id:"d8",date:"2026-10-22",dayNum:8,city:"Osaka",activities:"Arrive Osaka, Dotonbori food crawl, Shinsaibashi",transport:"train",transportDetail:"JR Kyoto–Osaka 10:47",bookingStatus:"confirmed",notes:""},
    {id:"d9",date:"2026-10-23",dayNum:9,city:"Osaka",activities:"Osaka Castle, Kuromon Market, Shinsekai",transport:"walk",transportDetail:"Osaka 1-Day Pass",bookingStatus:"confirmed",notes:""},
    {id:"d10",date:"2026-10-24",dayNum:10,city:"Osaka",activities:"Universal Studios Japan full day",transport:"train",transportDetail:"JR Yumesaki Line to USJ",bookingStatus:"confirmed",notes:"Express pass booked"},
    {id:"d11",date:"2026-10-25",dayNum:11,city:"Hiroshima",activities:"Peace Memorial Museum, Atomic Bomb Dome, Miyajima",transport:"train",transportDetail:"Shinkansen Nozomi — Osaka→Hiroshima 09:05",bookingStatus:"pending",notes:""},
    {id:"d12",date:"2026-10-26",dayNum:12,city:"Hiroshima",activities:"Hiroshima Castle, Shukkeien Garden, okonomiyaki",transport:"walk",transportDetail:"Hiroden tram pass",bookingStatus:"confirmed",notes:""},
    {id:"d13",date:"2026-10-27",dayNum:13,city:"Tokyo",activities:"Return Tokyo — Shibuya Sky, Hamarikyu Gardens",transport:"train",transportDetail:"Shinkansen Nozomi — Hiroshima→Tokyo 10:15",bookingStatus:"needs booking",notes:"⚠️ Book return Shinkansen!"},
    {id:"d14",date:"2026-10-28",dayNum:14,city:"Tokyo",activities:"Odaiba, TeamLab Planets, Tokyo Tower, Ginza shopping",transport:"walk",transportDetail:"Yurikamome Line",bookingStatus:"confirmed",notes:""},
    {id:"d15",date:"2026-10-29",dayNum:15,city:"Tokyo",activities:"Free morning, Tsukiji, depart for airport",transport:"flight",transportDetail:"JL 723 Tokyo→Jakarta 16:30",bookingStatus:"confirmed",notes:"Airport transfer 12:00"},
  ],
  restaurants:[
    {id:"r1",city:"Tokyo",name:"Ichiran Ramen Shibuya",cuisine:"Ramen",price:"¥¥",mustTry:"Tonkotsu ramen",area:"Shibuya",reservationRequired:"No",notes:"Solo booth experience, open 24h",status:"wishlist"},
    {id:"r2",city:"Tokyo",name:"Afuri Ramen Harajuku",cuisine:"Ramen",price:"¥¥",mustTry:"Yuzu Shio Ramen",area:"Harajuku",reservationRequired:"No",notes:"Yuzu-based broth, lighter style",status:"chosen"},
    {id:"r3",city:"Tokyo",name:"Gonpachi Nishi-Azabu",cuisine:"Izakaya",price:"¥¥¥",mustTry:"Soba and yakitori set",area:"Nishi-Azabu",reservationRequired:"Recommended",notes:"Kill Bill inspiration restaurant",status:"wishlist"},
    {id:"r4",city:"Tokyo",name:"Narisawa",cuisine:"Kaiseki",price:"¥¥¥¥",mustTry:"Innovative Forest menu",area:"Aoyama",reservationRequired:"Yes",notes:"World's 50 Best — book immediately",status:"wishlist"},
    {id:"r5",city:"Kyoto",name:"Nishiki Warai",cuisine:"Kaiseki",price:"¥¥¥¥",mustTry:"Seasonal kaiseki course",area:"Nishiki Market",reservationRequired:"Yes",notes:"Traditional 7-course kaiseki",status:"chosen"},
    {id:"r6",city:"Kyoto",name:"Café de 505",cuisine:"Café",price:"¥",mustTry:"Matcha parfait",area:"Gion",reservationRequired:"No",notes:"Adorable matcha café in Gion",status:"chosen"},
    {id:"r7",city:"Kyoto",name:"Kikunoi Honten",cuisine:"Kaiseki",price:"¥¥¥¥",mustTry:"Chef's seasonal menu",area:"Higashiyama",reservationRequired:"Yes",notes:"3 Michelin stars, book 2 months out",status:"wishlist"},
    {id:"r8",city:"Osaka",name:"Takoyaki Doraku Wanaka",cuisine:"Street Food",price:"¥",mustTry:"Takoyaki 8-piece set",area:"Shinsaibashi",reservationRequired:"No",notes:"Best takoyaki in Osaka",status:"chosen"},
    {id:"r9",city:"Osaka",name:"Kani Doraku",cuisine:"Seafood",price:"¥¥¥",mustTry:"Snow crab course",area:"Dotonbori",reservationRequired:"Recommended",notes:"Iconic giant crab sign",status:"wishlist"},
    {id:"r10",city:"Hiroshima",name:"Okonomimura",cuisine:"Okonomiyaki",price:"¥¥",mustTry:"Hiroshima-style okonomiyaki",area:"Naka-ku",reservationRequired:"No",notes:"Multi-floor building, all okonomiyaki",status:"chosen"},
    {id:"r11",city:"Hiroshima",name:"Kaisen Ichiba",cuisine:"Seafood",price:"¥¥¥",mustTry:"Hiroshima oyster set",area:"Peace Memorial area",reservationRequired:"No",notes:"Famous local oysters",status:"wishlist"},
  ],
  hotels:[
    {id:"h1",city:"Tokyo",name:"The Prince Park Tower Tokyo",checkIn:"2026-10-15",checkOut:"2026-10-18",confirmation:"TKY-2026-88321",address:"4-8-1 Shibakoen, Minato-ku, Tokyo",phone:"+81-3-5400-1111",notes:"Tokyo Tower views, early check-in requested"},
    {id:"h2",city:"Hakone",name:"Gora Kadan Ryokan",checkIn:"2026-10-18",checkOut:"2026-10-19",confirmation:"HKN-2026-44109",address:"1300 Gora, Hakone-machi",phone:"+81-460-82-3331",notes:"Private onsen, dinner at 19:00"},
    {id:"h3",city:"Kyoto",name:"The Ritz-Carlton Kyoto",checkIn:"2026-10-19",checkOut:"2026-10-22",confirmation:"KYT-2026-55723",address:"Kamogawa Nijo-Ohashi, Kyoto",phone:"+81-75-746-5555",notes:"River view room, late checkout requested"},
    {id:"h4",city:"Osaka",name:"Cross Hotel Osaka",checkIn:"2026-10-22",checkOut:"2026-10-25",confirmation:"OSK-2026-78234",address:"2-5-15 Shinsaibashisuji, Chuo-ku, Osaka",phone:"+81-6-6213-8281",notes:"Walking distance to Dotonbori"},
    {id:"h5",city:"Hiroshima",name:"Sheraton Grand Hiroshima",checkIn:"2026-10-25",checkOut:"2026-10-27",confirmation:"HRS-2026-32156",address:"12-9 Kyobashicho, Minami-ku, Hiroshima",phone:"+81-82-262-7111",notes:"Connected to station"},
    {id:"h6",city:"Tokyo",name:"Andaz Tokyo Toranomon Hills",checkIn:"2026-10-27",checkOut:"2026-10-29",confirmation:"TKY-2026-91047",address:"1-23-4 Toranomon, Minato-ku, Tokyo",phone:"+81-3-6830-1234",notes:"Last nights — rooftop bar!"},
  ],
};

// ─── SHARED INPUT COMPONENT ───────────────────────────────────────────────────
function Input({ label, value, onChange, type="text", placeholder="", multiline, rows=2, options, style={} }) {
  return (
    <div style={{marginBottom:12,...style}}>
      {label && <label style={{fontSize:11,fontWeight:700,color:"#9A8F92",display:"block",marginBottom:5,textTransform:"uppercase",letterSpacing:"0.05em"}}>{label}</label>}
      {multiline
        ? <textarea value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} rows={rows}
            style={{width:"100%",border:"1px solid #EDE5E7",borderRadius:10,padding:"9px 11px",fontSize:13,fontFamily:"inherit",resize:"vertical",outline:"none",boxSizing:"border-box",color:"#2D2426",background:"#FAF8F9"}}/>
        : options
        ? <select value={value} onChange={e=>onChange(e.target.value)}
            style={{width:"100%",border:"1px solid #EDE5E7",borderRadius:10,padding:"9px 11px",fontSize:13,fontFamily:"inherit",outline:"none",boxSizing:"border-box",color:"#2D2426",background:"#FAF8F9"}}>
            {options.map(o=><option key={o.v||o} value={o.v||o}>{o.l||o}</option>)}
          </select>
        : <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
            style={{width:"100%",border:"1px solid #EDE5E7",borderRadius:10,padding:"9px 11px",fontSize:13,fontFamily:"inherit",outline:"none",boxSizing:"border-box",color:"#2D2426",background:"#FAF8F9"}}/>
      }
    </div>
  );
}

// ─── TRANSPORT BADGE ─────────────────────────────────────────────────────────
function TransBadge({ type }) {
  const m = TRANSPORT_META[type] || TRANSPORT_META.other;
  return (
    <span style={{display:"inline-flex",alignItems:"center",gap:4,background:m.colors[0],color:m.colors[1],fontSize:11,fontWeight:700,padding:"3px 9px",borderRadius:99}}>
      <m.Icon size={11}/>{m.label}
    </span>
  );
}

// ─── CONFIRM DIALOG (replaces window.confirm which can be blocked) ───────────
function ConfirmDialog({ message, onConfirm, onCancel, palette }) {
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
      <div style={{background:"#fff",borderRadius:20,padding:28,maxWidth:320,width:"100%",boxShadow:"0 20px 60px rgba(0,0,0,0.2)"}}>
        <p style={{fontSize:15,fontWeight:600,color:"#2D2426",margin:"0 0 20px",lineHeight:1.5}}>{message}</p>
        <div style={{display:"flex",gap:10}}>
          <button onClick={onCancel} style={{flex:1,background:"#F5F0F2",color:"#9A8F92",border:"none",borderRadius:10,padding:"11px 0",fontSize:13,fontWeight:700,cursor:"pointer"}}>Cancel</button>
          <button onClick={onConfirm} style={{flex:1,background:"#E05C5C",color:"#fff",border:"none",borderRadius:10,padding:"11px 0",fontSize:13,fontWeight:700,cursor:"pointer"}}>Confirm</button>
        </div>
      </div>
    </div>
  );
}

// ─── ADD CITY DIALOG (replaces prompt() which is blocked in some envs) ───────
function AddCityDialog({ onConfirm, onCancel, palette }) {
  const [name, setName] = useState("");
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
      <div style={{background:"#fff",borderRadius:20,padding:28,maxWidth:320,width:"100%",boxShadow:"0 20px 60px rgba(0,0,0,0.2)"}}>
        <h3 style={{fontSize:16,fontWeight:700,color:"#2D2426",margin:"0 0 14px"}}>Add New City</h3>
        <input
          autoFocus
          value={name}
          onChange={e=>setName(e.target.value)}
          onKeyDown={e=>{ if(e.key==="Enter"&&name.trim()) onConfirm(name.trim()); if(e.key==="Escape") onCancel(); }}
          placeholder="e.g. Paris, Bali, London…"
          style={{width:"100%",border:"1px solid #EDE5E7",borderRadius:10,padding:"10px 12px",fontSize:14,fontFamily:"inherit",outline:"none",boxSizing:"border-box",color:"#2D2426",marginBottom:16}}
        />
        <div style={{display:"flex",gap:10}}>
          <button onClick={onCancel} style={{flex:1,background:"#F5F0F2",color:"#9A8F92",border:"none",borderRadius:10,padding:"11px 0",fontSize:13,fontWeight:700,cursor:"pointer"}}>Cancel</button>
          <button onClick={()=>{ if(name.trim()) onConfirm(name.trim()); }} disabled={!name.trim()} style={{flex:1,background:name.trim()?palette.primary:"#D0C8CA",color:"#fff",border:"none",borderRadius:10,padding:"11px 0",fontSize:13,fontWeight:700,cursor:name.trim()?"pointer":"not-allowed"}}>Add City</button>
        </div>
      </div>
    </div>
  );
}

// ─── ONBOARDING ───────────────────────────────────────────────────────────────
function Onboarding({ palette, onImport, onDemo, onScratch }) {
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef();

  const parseFile = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type:"binary" });
        const sheets = {};
        wb.SheetNames.forEach(n => { sheets[n] = XLSX.utils.sheet_to_json(wb.Sheets[n], { defval:"" }); });
        onImport(sheets);
      } catch { alert("Couldn't read file. Please check your Excel format."); }
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div style={{minHeight:"100vh",background:"linear-gradient(135deg,#FAF7F8 0%,#F2DDE1 100%)",display:"flex",alignItems:"center",justifyContent:"center",padding:24,fontFamily:"'DM Sans',sans-serif"}}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=Playfair+Display:wght@600;700&display=swap" rel="stylesheet"/>
      <div style={{maxWidth:480,width:"100%"}}>
        <div style={{textAlign:"center",marginBottom:36}}>
          <div style={{fontSize:52,marginBottom:12}}>☁️</div>
          <h1 style={{fontFamily:"'Playfair Display',Georgia,serif",fontSize:36,fontWeight:700,color:"#2D2426",margin:"0 0 8px",letterSpacing:"-0.02em"}}>Kumo Travel</h1>
          <p style={{color:"#9A8F92",fontSize:15,margin:0}}>Your personal trip companion — anywhere in the world</p>
        </div>
        <div style={{background:"#fff",borderRadius:24,boxShadow:"0 8px 40px rgba(201,123,132,0.12)",padding:32,marginBottom:16}}>
          <h2 style={{fontSize:16,fontWeight:700,color:"#2D2426",margin:"0 0 16px"}}>Import from Excel</h2>
          <div
            onDragOver={e=>{e.preventDefault();setDragging(true);}}
            onDragLeave={()=>setDragging(false)}
            onDrop={e=>{e.preventDefault();setDragging(false);const f=e.dataTransfer.files[0];if(f)parseFile(f);}}
            onClick={()=>fileRef.current.click()}
            style={{border:`2px dashed ${dragging?palette.primary:"#EDE5E7"}`,borderRadius:16,padding:"28px 20px",textAlign:"center",cursor:"pointer",background:dragging?palette.primaryLight:"#FAF8F9",transition:"all 0.2s",marginBottom:16}}>
            <Upload size={28} color={palette.primary} style={{marginBottom:8}}/>
            <p style={{fontSize:14,fontWeight:700,color:"#2D2426",margin:"0 0 4px"}}>Drop your .xlsx file here</p>
            <p style={{fontSize:12,color:"#9A8F92",margin:0}}>Needs 3 tabs: Itinerary · Restaurants · Hotels</p>
            <input ref={fileRef} type="file" accept=".xlsx,.xls" style={{display:"none"}} onChange={e=>{if(e.target.files[0])parseFile(e.target.files[0]);}}/>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <button onClick={onDemo} style={{background:palette.primary,color:"#fff",border:"none",borderRadius:12,padding:"13px 0",fontSize:13,fontWeight:700,cursor:"pointer"}}>Try Demo Trip ✈️</button>
            <button onClick={onScratch} style={{background:palette.primaryLight,color:palette.primary,border:"none",borderRadius:12,padding:"13px 0",fontSize:13,fontWeight:700,cursor:"pointer"}}>Start from Scratch ✏️</button>
          </div>
        </div>
        <p style={{textAlign:"center",fontSize:12,color:"#9A8F92"}}>Your data stays on your device — nothing is uploaded anywhere.</p>
      </div>
    </div>
  );
}

// ─── HOME ─────────────────────────────────────────────────────────────────────
function HomeView({ data, palette, setView }) {
  const du = daysUntil(data.startDate);
  const totalDays = nightsBetween(data.startDate, data.endDate) + 1;
  const cities = [...new Set(data.itinerary.map(d=>d.city))];
  const needsBooking = data.itinerary.filter(d=>d.bookingStatus==="needs booking");
  const today = data.itinerary.find(d=>isToday(d.date));
  const next  = data.itinerary.find(d=>!isPast(d.date)&&!isToday(d.date));
  const activeHotel = data.hotels.find(h=>new Date(h.checkIn+"T00:00:00")<=new Date()&&new Date(h.checkOut+"T00:00:00")>=new Date());
  const highlight = today||next;

  return (
    <div style={{padding:"24px 20px 40px"}}>
      <div style={{marginBottom:24}}>
        <p style={{fontSize:11,fontWeight:800,color:palette.primary,textTransform:"uppercase",letterSpacing:"0.1em",margin:"0 0 4px"}}>My Trip</p>
        <h1 style={{fontFamily:"'Playfair Display',Georgia,serif",fontSize:28,fontWeight:700,color:palette.text,margin:"0 0 4px",letterSpacing:"-0.02em"}}>{data.tripName}</h1>
        <p style={{color:palette.muted,fontSize:13,margin:0}}>{fmtDate(data.startDate)} — {fmtDate(data.endDate)}</p>
      </div>

      {/* Countdown */}
      <div style={{background:`linear-gradient(135deg,${palette.primary} 0%,${palette.accent} 100%)`,borderRadius:22,padding:"24px 26px",marginBottom:18,color:"#fff",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",right:-30,top:-30,width:140,height:140,borderRadius:"50%",background:"rgba(255,255,255,0.09)"}}/>
        <div style={{position:"absolute",right:30,bottom:-40,width:90,height:90,borderRadius:"50%",background:"rgba(255,255,255,0.06)"}}/>
        {du>0 && <><p style={{margin:"0 0 4px",fontSize:13,opacity:0.85}}>Trip starts in</p><div style={{display:"flex",alignItems:"baseline",gap:8}}><span style={{fontSize:52,fontWeight:800,lineHeight:1}}>{du}</span><span style={{fontSize:20,opacity:0.85}}>days</span></div><p style={{margin:"8px 0 0",fontSize:13,opacity:0.8}}>✈️ {totalDays} days · {cities.length} {cities.length===1?"city":"cities"}</p></>}
        {du===0 && <><p style={{margin:"0 0 8px",fontSize:18,fontWeight:700}}>🎉 Today is the day!</p><p style={{margin:0,fontSize:14,opacity:0.85}}>Your adventure begins — have an amazing trip!</p></>}
        {du<0 && <><p style={{margin:"0 0 4px",fontSize:13,opacity:0.85}}>Trip in progress</p><p style={{fontSize:20,fontWeight:800,margin:0}}>Day {Math.abs(du)+1} of {totalDays}</p><p style={{margin:"4px 0 0",fontSize:13,opacity:0.8}}>{cities.length} cities · {data.itinerary.length} days planned</p></>}
      </div>

      {/* Today / next card */}
      {highlight && (
        <div style={{background:"#fff",borderRadius:20,border:`1px solid ${palette.border}`,padding:"18px 20px",marginBottom:14,boxShadow:"0 2px 16px rgba(0,0,0,0.05)"}}>
          <p style={{fontSize:11,fontWeight:800,color:palette.primary,textTransform:"uppercase",letterSpacing:"0.08em",margin:"0 0 12px"}}>{today?"Today":"Up next — Day "+highlight.dayNum}</p>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12}}>
            <div style={{flex:1}}>
              <h3 style={{fontSize:17,fontWeight:700,color:palette.text,margin:"0 0 4px"}}>{highlight.city}</h3>
              <p style={{fontSize:13,color:palette.muted,margin:"0 0 10px",lineHeight:1.5}}>{highlight.activities}</p>
              <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
                <TransBadge type={highlight.transport}/>
                {highlight.transportDetail && <span style={{fontSize:11,color:palette.muted}}>{highlight.transportDetail}</span>}
              </div>
            </div>
            <div style={{width:44,height:44,borderRadius:"50%",background:cityColor(highlight.city)+"22",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
              <MapPin size={18} color={cityColor(highlight.city)}/>
            </div>
          </div>
          {activeHotel && (
            <div style={{marginTop:12,paddingTop:12,borderTop:`1px solid ${palette.border}`,display:"flex",alignItems:"center",gap:8}}>
              <Hotel size={13} color={palette.muted}/>
              <span style={{fontSize:12,color:palette.muted}}>{activeHotel.name}</span>
            </div>
          )}
        </div>
      )}

      {/* Stats */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
        {[["📅","Total Days",totalDays],["🏙️","Cities",cities.length],["🍜","Restaurants",data.restaurants.length],["🏨","Hotels",data.hotels.length]].map(([icon,label,val])=>(
          <div key={label} style={{background:"#fff",borderRadius:16,border:`1px solid ${palette.border}`,padding:"14px 16px"}}>
            <div style={{fontSize:22,marginBottom:4}}>{icon}</div>
            <div style={{fontSize:26,fontWeight:800,color:palette.text,lineHeight:1}}>{val}</div>
            <div style={{fontSize:11,color:palette.muted,fontWeight:600,marginTop:3}}>{label}</div>
          </div>
        ))}
      </div>

      {/* Needs booking alert */}
      {needsBooking.length>0 && (
        <div style={{background:"#FFF3DC",borderRadius:16,padding:"14px 16px",marginBottom:14,border:"1px solid #FFDEA0",cursor:"pointer"}} onClick={()=>setView("transport")}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}><AlertCircle size={16} color="#8A6200"/><span style={{fontSize:13,fontWeight:700,color:"#8A6200"}}>{needsBooking.length} booking{needsBooking.length>1?"s":""} still needed</span></div>
          {needsBooking.slice(0,2).map(d=><div key={d.id} style={{fontSize:12,color:"#8A6200",paddingTop:4,borderTop:"1px solid #FFD580"}}>Day {d.dayNum} · {d.city}: {d.transportDetail||d.transport}</div>)}
          <div style={{fontSize:11,color:"#8A6200",marginTop:6,fontWeight:600}}>Tap to view all →</div>
        </div>
      )}

      {/* City journey */}
      <p style={{fontSize:11,fontWeight:800,color:palette.muted,textTransform:"uppercase",letterSpacing:"0.06em",margin:"0 0 10px"}}>City Journey</p>
      <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
        {cities.map((city,i)=>(
          <span key={city} style={{display:"inline-flex",alignItems:"center",gap:5,background:cityColor(city)+"18",border:`1.5px solid ${cityColor(city)}44`,color:cityColor(city),borderRadius:10,padding:"6px 12px",fontSize:12,fontWeight:700}}>
            {i>0 && <span style={{fontSize:10,opacity:0.5}}>→</span>}{city}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── ITINERARY ────────────────────────────────────────────────────────────────
function ItineraryView({ data, palette, onUpdate }) {
  const [expandedId, setExpandedId] = useState(null);
  const [editId, setEditId]         = useState(null);
  const [ef, setEf]                 = useState({});
  const [showAdd, setShowAdd]       = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [newDay, setNewDay]         = useState({ date:"",city:"",activities:"",transport:"train",transportDetail:"",bookingStatus:"pending",notes:"" });

  const cycleStatus = (d) => {
    const cyc = ["confirmed","pending","needs booking"];
    const next = cyc[(cyc.indexOf(d.bookingStatus)+1)%cyc.length];
    onUpdate("itinerary", data.itinerary.map(x=>x.id===d.id?{...x,bookingStatus:next}:x));
  };
  const saveEdit = () => { onUpdate("itinerary", data.itinerary.map(x=>x.id===editId?{...x,...ef}:x)); setEditId(null); };
  const doDelete = (id) => { onUpdate("itinerary", data.itinerary.filter(x=>x.id!==id)); setConfirmDelete(null); setExpandedId(null); };
  const addDay = () => {
    const sorted = [...data.itinerary, {...newDay,id:uid(),dayNum:0}]
      .sort((a,b)=>a.date.localeCompare(b.date))
      .map((d,i)=>({...d,dayNum:i+1}));
    onUpdate("itinerary", sorted);
    setShowAdd(false);
    setNewDay({date:"",city:"",activities:"",transport:"train",transportDetail:"",bookingStatus:"pending",notes:""});
  };

  return (
    <div style={{padding:"24px 20px 40px"}}>
      {confirmDelete && <ConfirmDialog message="Delete this day from your itinerary?" onConfirm={()=>doDelete(confirmDelete)} onCancel={()=>setConfirmDelete(null)} palette={palette}/>}

      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20}}>
        <div>
          <h2 style={{fontFamily:"'Playfair Display',Georgia,serif",fontSize:24,fontWeight:700,color:palette.text,margin:"0 0 4px"}}>Itinerary</h2>
          <p style={{color:palette.muted,fontSize:13,margin:0}}>{data.itinerary.length} days planned</p>
        </div>
        <button onClick={()=>setShowAdd(v=>!v)} style={{display:"flex",alignItems:"center",gap:6,background:palette.primary,color:"#fff",border:"none",borderRadius:12,padding:"9px 16px",fontSize:13,fontWeight:700,cursor:"pointer"}}>
          <Plus size={15}/>Add Day
        </button>
      </div>

      {showAdd && (
        <div style={{background:"#fff",borderRadius:18,border:`1px solid ${palette.border}`,padding:20,marginBottom:16,boxShadow:"0 4px 20px rgba(0,0,0,0.08)"}}>
          <h3 style={{fontSize:15,fontWeight:700,color:palette.text,margin:"0 0 14px"}}>New Day</h3>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            <Input label="Date" type="date" value={newDay.date} onChange={v=>setNewDay(p=>({...p,date:v}))}/>
            <Input label="City" value={newDay.city} placeholder="e.g. Paris" onChange={v=>setNewDay(p=>({...p,city:v}))}/>
          </div>
          <Input label="Activities" value={newDay.activities} placeholder="What's planned?" onChange={v=>setNewDay(p=>({...p,activities:v}))} multiline rows={2}/>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            <Input label="Transport" value={newDay.transport} onChange={v=>setNewDay(p=>({...p,transport:v}))} options={Object.entries(TRANSPORT_META).map(([v,m])=>({v,l:m.label}))}/>
            <Input label="Status" value={newDay.bookingStatus} onChange={v=>setNewDay(p=>({...p,bookingStatus:v}))} options={["confirmed","pending","needs booking"]}/>
          </div>
          <Input label="Transport detail" value={newDay.transportDetail} placeholder="e.g. JL 712 Jakarta→Tokyo" onChange={v=>setNewDay(p=>({...p,transportDetail:v}))}/>
          <Input label="Notes" value={newDay.notes} placeholder="Anything to remember?" onChange={v=>setNewDay(p=>({...p,notes:v}))} multiline rows={2}/>
          <div style={{display:"flex",gap:8}}>
            <button onClick={addDay} disabled={!newDay.date||!newDay.city} style={{flex:1,background:(newDay.date&&newDay.city)?palette.primary:"#D0C8CA",color:"#fff",border:"none",borderRadius:10,padding:"11px 0",fontSize:13,fontWeight:700,cursor:(newDay.date&&newDay.city)?"pointer":"not-allowed"}}>Add Day</button>
            <button onClick={()=>setShowAdd(false)} style={{flex:1,background:"#F5F0F2",color:palette.muted,border:"none",borderRadius:10,padding:"11px 0",fontSize:13,fontWeight:600,cursor:"pointer"}}>Cancel</button>
          </div>
        </div>
      )}

      {data.itinerary.map(d=>{
        const past=isPast(d.date); const today=isToday(d.date);
        const ss=BOOK_STATUS[d.bookingStatus]||BOOK_STATUS.pending;
        const isExp=expandedId===d.id; const isEd=editId===d.id;
        return (
          <div key={d.id} style={{background:"#fff",borderRadius:18,border:`1.5px solid ${today?palette.primary+"66":palette.border}`,marginBottom:10,opacity:past&&!today?0.6:1,boxShadow:today?`0 4px 24px ${palette.primary}22`:"none",overflow:"hidden"}}>
            {today && <div style={{background:palette.primary,height:3}}/>}
            <div style={{padding:"14px 16px",cursor:"pointer"}} onClick={()=>!isEd&&setExpandedId(isExp?null:d.id)}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3,flexWrap:"wrap"}}>
                    <span style={{fontSize:11,fontWeight:700,color:palette.muted}}>Day {d.dayNum}</span>
                    {today && <span style={{fontSize:10,fontWeight:800,color:palette.primary,background:palette.primaryLight,padding:"2px 8px",borderRadius:99}}>TODAY</span>}
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

            {isExp && (
              <div style={{padding:"0 16px 16px",borderTop:`1px solid ${palette.border}`}}>
                {isEd ? (
                  <div style={{paddingTop:14}}>
                    <Input label="Activities" value={ef.activities||""} onChange={v=>setEf(p=>({...p,activities:v}))} multiline rows={3}/>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                      <Input label="Transport" value={ef.transport||"other"} onChange={v=>setEf(p=>({...p,transport:v}))} options={Object.entries(TRANSPORT_META).map(([v,m])=>({v,l:m.label}))}/>
                      <Input label="Status" value={ef.bookingStatus||"pending"} onChange={v=>setEf(p=>({...p,bookingStatus:v}))} options={["confirmed","pending","needs booking"]}/>
                    </div>
                    <Input label="Transport detail" value={ef.transportDetail||""} onChange={v=>setEf(p=>({...p,transportDetail:v}))} placeholder="Route, flight number…"/>
                    <Input label="Notes" value={ef.notes||""} onChange={v=>setEf(p=>({...p,notes:v}))} multiline rows={2}/>
                    <div style={{display:"flex",gap:8}}>
                      <button onClick={saveEdit} style={{flex:1,background:palette.primary,color:"#fff",border:"none",borderRadius:10,padding:"10px 0",fontSize:13,fontWeight:700,cursor:"pointer"}}>Save</button>
                      <button onClick={()=>setEditId(null)} style={{flex:1,background:"#F5F0F2",color:palette.muted,border:"none",borderRadius:10,padding:"10px 0",fontSize:13,fontWeight:600,cursor:"pointer"}}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div style={{paddingTop:12}}>
                    {d.transportDetail && <p style={{fontSize:12,color:palette.muted,margin:"0 0 10px"}}>{d.transportDetail}</p>}
                    {d.notes && <div style={{background:"#FAF8F9",borderRadius:10,padding:"10px 12px",marginBottom:12}}><p style={{fontSize:11,fontWeight:700,color:palette.muted,margin:"0 0 3px"}}>NOTES</p><p style={{fontSize:12,color:palette.text,margin:0}}>{d.notes}</p></div>}
                    <div style={{display:"flex",gap:8}}>
                      <button onClick={()=>{setEditId(d.id);setEf({...d});}} style={{display:"flex",alignItems:"center",gap:6,background:palette.primaryLight,color:palette.primary,border:"none",borderRadius:10,padding:"8px 14px",fontSize:12,fontWeight:700,cursor:"pointer"}}><Edit3 size={13}/>Edit</button>
                      <button onClick={()=>setConfirmDelete(d.id)} style={{display:"flex",alignItems:"center",gap:6,background:"#FDE8E8",color:"#9B2020",border:"none",borderRadius:10,padding:"8px 14px",fontSize:12,fontWeight:700,cursor:"pointer"}}><Trash2 size={13}/>Delete</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
      {data.itinerary.length===0 && <div style={{textAlign:"center",padding:"60px 0",color:palette.muted}}><div style={{fontSize:40,marginBottom:12}}>📅</div><p style={{fontSize:14}}>No days yet — tap "Add Day" to start planning!</p></div>}
    </div>
  );
}

// ─── RESTAURANTS ──────────────────────────────────────────────────────────────
function RestaurantsView({ data, palette, onUpdate }) {
  const cities = [...new Set(data.restaurants.map(r=>r.city).filter(Boolean))];
  const [city, setCity]             = useState(cities[0]||"");
  const [search, setSearch]         = useState("");
  const [fStatus, setFStatus]       = useState("all");
  const [showAdd, setShowAdd]       = useState(false);
  const [showAddCity, setShowAddCity] = useState(false);  // FIX: proper modal instead of prompt()
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [nr, setNr]                 = useState({ city:cities[0]||"", name:"", cuisine:"", price:"¥¥", mustTry:"", area:"", reservationRequired:"No", notes:"", status:"wishlist" });

  // Keep nr.city in sync when city tab changes
  const switchCity = (c) => { setCity(c); setNr(p=>({...p,city:c})); };

  // FIX: When cities list changes (new city added), update active tab
  useEffect(()=>{
    const updated = [...new Set(data.restaurants.map(r=>r.city).filter(Boolean))];
    if (updated.length>0 && !updated.includes(city)) {
      switchCity(updated[updated.length-1]);
    }
  }, [data.restaurants]);

  const STATUS_ORDER = ["wishlist","chosen","visited","skipped"];
  const cycle = (r) => {
    const i = STATUS_ORDER.indexOf(r.status);
    onUpdate("restaurants", data.restaurants.map(x=>x.id===r.id?{...x,status:STATUS_ORDER[(i+1)%STATUS_ORDER.length]}:x));
  };
  const doDelete = (id) => { onUpdate("restaurants", data.restaurants.filter(x=>x.id!==id)); setConfirmDelete(null); };
  const addRestaurant = () => {
    if (!nr.name.trim()) return;
    onUpdate("restaurants", [...data.restaurants, {...nr,id:uid()}]);
    setShowAdd(false);
    setNr({ city, name:"", cuisine:"", price:"¥¥", mustTry:"", area:"", reservationRequired:"No", notes:"", status:"wishlist" });
  };

  // FIX: Add city handler using modal dialog
  const handleAddCity = (newCityName) => {
    const trimmed = newCityName.trim();
    if (!trimmed) return;
    // Add a placeholder restaurant so the city tab appears
    onUpdate("restaurants", [...data.restaurants, { id:uid(), city:trimmed, name:"", cuisine:"", price:"¥¥", mustTry:"", area:"", reservationRequired:"No", notes:"", status:"wishlist" }]);
    setShowAddCity(false);
    // switchCity will be triggered by useEffect above
  };

  const filtered = data.restaurants.filter(r=>
    r.city===city &&
    r.name !== "" &&  // hide the placeholder empty restaurant added when creating a city
    (fStatus==="all" || r.status===fStatus) &&
    (search==="" || r.name.toLowerCase().includes(search.toLowerCase()) || (r.cuisine||"").toLowerCase().includes(search.toLowerCase()))
  );

  const allCities = [...new Set(data.restaurants.map(r=>r.city).filter(Boolean))];

  return (
    <div style={{padding:"24px 20px 40px"}}>
      {confirmDelete && <ConfirmDialog message="Remove this restaurant from your list?" onConfirm={()=>doDelete(confirmDelete)} onCancel={()=>setConfirmDelete(null)} palette={palette}/>}
      {showAddCity && <AddCityDialog onConfirm={handleAddCity} onCancel={()=>setShowAddCity(false)} palette={palette}/>}

      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
        <div>
          <h2 style={{fontFamily:"'Playfair Display',Georgia,serif",fontSize:24,fontWeight:700,color:palette.text,margin:"0 0 4px"}}>Restaurants</h2>
          <p style={{color:palette.muted,fontSize:13,margin:0}}>{data.restaurants.filter(r=>r.name&&r.status==="wishlist").length} on wishlist · {data.restaurants.filter(r=>r.name&&r.status==="chosen").length} chosen</p>
        </div>
        <button onClick={()=>setShowAdd(v=>!v)} style={{display:"flex",alignItems:"center",gap:6,background:palette.primary,color:"#fff",border:"none",borderRadius:12,padding:"9px 16px",fontSize:13,fontWeight:700,cursor:"pointer"}}>
          <Plus size={15}/>Add
        </button>
      </div>

      {/* City tabs — FIX: + City now opens modal, not prompt() */}
      <div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:10,marginBottom:8}}>
        {allCities.map(c=>(
          <button key={c} onClick={()=>switchCity(c)} style={{flexShrink:0,padding:"7px 16px",borderRadius:99,border:"none",fontSize:13,fontWeight:700,cursor:"pointer",transition:"all 0.15s",background:city===c?palette.primary:palette.primaryLight,color:city===c?"#fff":palette.primary}}>{c}</button>
        ))}
        <button
          onClick={()=>setShowAddCity(true)}
          style={{flexShrink:0,padding:"7px 14px",borderRadius:99,border:`1.5px dashed ${palette.primary}`,background:"transparent",color:palette.primary,fontSize:13,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:5}}>
          <Plus size={13}/>City
        </button>
      </div>

      {/* Add restaurant form */}
      {showAdd && (
        <div style={{background:"#fff",borderRadius:18,border:`1px solid ${palette.border}`,padding:20,marginBottom:16,boxShadow:"0 4px 20px rgba(0,0,0,0.07)"}}>
          <h3 style={{fontSize:15,fontWeight:700,color:palette.text,margin:"0 0 14px"}}>Add Restaurant {city?"— "+city:""}</h3>
          <Input label="Name" value={nr.name} placeholder="Restaurant name" onChange={v=>setNr(p=>({...p,name:v}))}/>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            <Input label="Cuisine" value={nr.cuisine} placeholder="e.g. Ramen" onChange={v=>setNr(p=>({...p,cuisine:v}))}/>
            <Input label="Price Range" value={nr.price} onChange={v=>setNr(p=>({...p,price:v}))} options={["¥","¥¥","¥¥¥","¥¥¥¥","$","$$","$$$","$$$$"]}/>
          </div>
          <Input label="Must-try dish" value={nr.mustTry} placeholder="Signature item" onChange={v=>setNr(p=>({...p,mustTry:v}))}/>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            <Input label="Area / District" value={nr.area} placeholder="e.g. Shibuya" onChange={v=>setNr(p=>({...p,area:v}))}/>
            <Input label="Reservation" value={nr.reservationRequired} onChange={v=>setNr(p=>({...p,reservationRequired:v}))} options={["No","Yes","Recommended"]}/>
          </div>
          <Input label="Notes" value={nr.notes} placeholder="Hours, tips, links…" onChange={v=>setNr(p=>({...p,notes:v}))} multiline rows={2}/>
          <div style={{display:"flex",gap:8}}>
            <button onClick={addRestaurant} disabled={!nr.name.trim()} style={{flex:1,background:nr.name.trim()?palette.primary:"#D0C8CA",color:"#fff",border:"none",borderRadius:10,padding:"11px 0",fontSize:13,fontWeight:700,cursor:nr.name.trim()?"pointer":"not-allowed"}}>Add Restaurant</button>
            <button onClick={()=>setShowAdd(false)} style={{flex:1,background:"#F5F0F2",color:palette.muted,border:"none",borderRadius:10,padding:"11px 0",fontSize:13,fontWeight:600,cursor:"pointer"}}>Cancel</button>
          </div>
        </div>
      )}

      {/* Search & filter */}
      <div style={{marginBottom:12}}>
        <div style={{display:"flex",alignItems:"center",background:"#fff",border:`1px solid ${palette.border}`,borderRadius:12,padding:"0 12px",marginBottom:8}}>
          <Search size={14} color={palette.muted}/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search restaurants, cuisine…" style={{flex:1,border:"none",outline:"none",padding:"10px 8px",fontSize:13,fontFamily:"inherit",color:palette.text,background:"transparent"}}/>
          {search && <button onClick={()=>setSearch("")} style={{background:"none",border:"none",cursor:"pointer",padding:0}}><X size={14} color={palette.muted}/></button>}
        </div>
        <div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:2}}>
          {["all","wishlist","chosen","visited","skipped"].map(s=>(
            <button key={s} onClick={()=>setFStatus(s)} style={{flexShrink:0,padding:"5px 12px",borderRadius:99,border:"none",fontSize:11,fontWeight:700,cursor:"pointer",background:fStatus===s?palette.primary:"#F5F0F2",color:fStatus===s?"#fff":palette.muted}}>
              {s==="all"?"All":REST_STATUS[s]?.label}
            </button>
          ))}
        </div>
      </div>

      {allCities.length===0 && <div style={{textAlign:"center",padding:"60px 0",color:palette.muted}}><div style={{fontSize:40,marginBottom:12}}>🍽️</div><p style={{fontSize:14}}>Add a city first, then add restaurants!</p></div>}
      {allCities.length>0 && filtered.length===0 && <div style={{textAlign:"center",padding:"40px 0",color:palette.muted}}><div style={{fontSize:32,marginBottom:8}}>🍽️</div><p style={{fontSize:14}}>No restaurants found</p></div>}

      {filtered.map(r=>{
        const st = REST_STATUS[r.status]||REST_STATUS.wishlist;
        return (
          <div key={r.id} style={{background:"#fff",borderRadius:18,border:`1px solid ${palette.border}`,padding:"14px 16px",marginBottom:10,boxShadow:"0 1px 8px rgba(0,0,0,0.04)"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
              <div style={{flex:1,minWidth:0}}>
                <h3 style={{fontSize:15,fontWeight:700,color:palette.text,margin:"0 0 5px"}}>{r.name}</h3>
                <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
                  {r.cuisine && <span style={{fontSize:11,background:"#F5F0F2",color:palette.muted,padding:"2px 8px",borderRadius:99,fontWeight:600}}>{r.cuisine}</span>}
                  {r.price   && <span style={{fontSize:12,color:palette.primary,fontWeight:700}}>{r.price}</span>}
                  {r.area    && <span style={{fontSize:11,color:palette.muted,display:"flex",alignItems:"center",gap:3}}><MapPin size={10}/>{r.area}</span>}
                </div>
              </div>
              <div style={{display:"flex",gap:6,marginLeft:8,flexShrink:0}}>
                <button onClick={()=>cycle(r)} style={{background:st.bg,color:st.text,border:"none",borderRadius:99,fontSize:10,fontWeight:700,padding:"5px 10px",cursor:"pointer"}}>{st.label}</button>
                <button onClick={()=>setConfirmDelete(r.id)} style={{background:"#FDE8E8",color:"#9B2020",border:"none",borderRadius:8,padding:"5px 7px",cursor:"pointer"}}><Trash2 size={11}/></button>
              </div>
            </div>
            {r.mustTry && <p style={{fontSize:12,color:palette.text,margin:"0 0 4px"}}>⭐ {r.mustTry}</p>}
            {r.reservationRequired && r.reservationRequired!=="No" && <span style={{fontSize:11,background:"#FFF3DC",color:"#8A6200",padding:"2px 8px",borderRadius:99,fontWeight:600,display:"inline-block",marginBottom:r.notes?4:0}}>Reservation: {r.reservationRequired}</span>}
            {r.notes && <p style={{fontSize:11,color:palette.muted,margin:"4px 0 0",lineHeight:1.4}}>{r.notes}</p>}
          </div>
        );
      })}
    </div>
  );
}

// ─── HOTELS ───────────────────────────────────────────────────────────────────
function HotelsView({ data, palette, onUpdate }) {
  const [copied, setCopied]         = useState(null);
  const [showAdd, setShowAdd]       = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [nh, setNh]                 = useState({ city:"", name:"", checkIn:"", checkOut:"", confirmation:"", address:"", phone:"", notes:"" });

  const copy = (id,txt) => { navigator.clipboard.writeText(txt).catch(()=>{}); setCopied(id); setTimeout(()=>setCopied(null),1500); };
  const doDelete = (id) => { onUpdate("hotels", data.hotels.filter(x=>x.id!==id)); setConfirmDelete(null); };
  const addHotel = () => {
    if (!nh.name.trim()) return;
    onUpdate("hotels", [...data.hotels, {...nh,id:uid()}]);
    setShowAdd(false);
    setNh({ city:"", name:"", checkIn:"", checkOut:"", confirmation:"", address:"", phone:"", notes:"" });
  };

  return (
    <div style={{padding:"24px 20px 40px"}}>
      {confirmDelete && <ConfirmDialog message="Remove this hotel from your trip?" onConfirm={()=>doDelete(confirmDelete)} onCancel={()=>setConfirmDelete(null)} palette={palette}/>}

      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20}}>
        <div>
          <h2 style={{fontFamily:"'Playfair Display',Georgia,serif",fontSize:24,fontWeight:700,color:palette.text,margin:"0 0 4px"}}>Hotels</h2>
          <p style={{color:palette.muted,fontSize:13,margin:0}}>{data.hotels.length} stays</p>
        </div>
        <button onClick={()=>setShowAdd(v=>!v)} style={{display:"flex",alignItems:"center",gap:6,background:palette.primary,color:"#fff",border:"none",borderRadius:12,padding:"9px 16px",fontSize:13,fontWeight:700,cursor:"pointer"}}>
          <Plus size={15}/>Add Hotel
        </button>
      </div>

      {showAdd && (
        <div style={{background:"#fff",borderRadius:18,border:`1px solid ${palette.border}`,padding:20,marginBottom:16,boxShadow:"0 4px 20px rgba(0,0,0,0.07)"}}>
          <h3 style={{fontSize:15,fontWeight:700,color:palette.text,margin:"0 0 14px"}}>New Hotel Stay</h3>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            <Input label="City" value={nh.city} placeholder="e.g. Paris" onChange={v=>setNh(p=>({...p,city:v}))}/>
            <Input label="Hotel Name" value={nh.name} placeholder="Hotel name" onChange={v=>setNh(p=>({...p,name:v}))}/>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            <Input label="Check-in" type="date" value={nh.checkIn} onChange={v=>setNh(p=>({...p,checkIn:v}))}/>
            <Input label="Check-out" type="date" value={nh.checkOut} onChange={v=>setNh(p=>({...p,checkOut:v}))}/>
          </div>
          <Input label="Confirmation #" value={nh.confirmation} placeholder="Booking reference" onChange={v=>setNh(p=>({...p,confirmation:v}))}/>
          <Input label="Address" value={nh.address} placeholder="Full address" onChange={v=>setNh(p=>({...p,address:v}))}/>
          <Input label="Phone" value={nh.phone} placeholder="+XX XXX XXXX" onChange={v=>setNh(p=>({...p,phone:v}))}/>
          <Input label="Notes" value={nh.notes} placeholder="Early check-in, room preferences…" onChange={v=>setNh(p=>({...p,notes:v}))} multiline rows={2}/>
          <div style={{display:"flex",gap:8}}>
            <button onClick={addHotel} disabled={!nh.name.trim()} style={{flex:1,background:nh.name.trim()?palette.primary:"#D0C8CA",color:"#fff",border:"none",borderRadius:10,padding:"11px 0",fontSize:13,fontWeight:700,cursor:nh.name.trim()?"pointer":"not-allowed"}}>Add Hotel</button>
            <button onClick={()=>setShowAdd(false)} style={{flex:1,background:"#F5F0F2",color:palette.muted,border:"none",borderRadius:10,padding:"11px 0",fontSize:13,fontWeight:600,cursor:"pointer"}}>Cancel</button>
          </div>
        </div>
      )}

      {data.hotels.map(h=>{
        const nights = nightsBetween(h.checkIn, h.checkOut);
        const du     = daysUntil(h.checkIn);
        const active = new Date(h.checkIn+"T00:00:00")<=new Date() && new Date(h.checkOut+"T00:00:00")>=new Date();
        const past   = new Date(h.checkOut+"T00:00:00")<new Date();
        return (
          <div key={h.id} style={{background:"#fff",borderRadius:20,border:`1.5px solid ${active?palette.primary+"44":palette.border}`,marginBottom:12,overflow:"hidden",opacity:past?0.65:1,boxShadow:active?`0 4px 20px ${palette.primary}18`:"0 1px 8px rgba(0,0,0,0.04)"}}>
            {active && <div style={{background:`linear-gradient(90deg,${palette.primary},${palette.accent})`,height:4}}/>}
            <div style={{padding:"16px 18px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                <div>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:5}}>
                    <span style={{background:cityColor(h.city)+"20",color:cityColor(h.city),fontSize:11,fontWeight:700,padding:"2px 9px",borderRadius:99}}>{h.city}</span>
                    {active && <span style={{background:palette.primaryLight,color:palette.primary,fontSize:10,fontWeight:800,padding:"2px 8px",borderRadius:99}}>STAYING HERE</span>}
                  </div>
                  <h3 style={{fontSize:16,fontWeight:700,color:palette.text,margin:0}}>{h.name}</h3>
                </div>
                <div style={{textAlign:"right",display:"flex",flexDirection:"column",alignItems:"flex-end",gap:6}}>
                  <div>
                    <div style={{fontSize:20,fontWeight:800,color:palette.primary}}>{nights}</div>
                    <div style={{fontSize:11,color:palette.muted,fontWeight:600}}>night{nights!==1?"s":""}</div>
                  </div>
                  <button onClick={()=>setConfirmDelete(h.id)} style={{background:"#FDE8E8",color:"#9B2020",border:"none",borderRadius:8,padding:"5px 7px",cursor:"pointer"}}><Trash2 size={12}/></button>
                </div>
              </div>
              <div style={{background:"#FAF8F9",borderRadius:12,padding:"10px 12px",marginBottom:10,display:"flex",justifyContent:"space-between"}}>
                <div><p style={{fontSize:10,fontWeight:700,color:palette.muted,margin:"0 0 2px"}}>CHECK IN</p><p style={{fontSize:13,fontWeight:700,color:palette.text,margin:0}}>{fmtDate(h.checkIn)}</p></div>
                <div style={{width:1,background:palette.border}}/>
                <div style={{textAlign:"right"}}><p style={{fontSize:10,fontWeight:700,color:palette.muted,margin:"0 0 2px"}}>CHECK OUT</p><p style={{fontSize:13,fontWeight:700,color:palette.text,margin:0}}>{fmtDate(h.checkOut)}</p></div>
              </div>
              {!past && du>0 && <p style={{fontSize:11,color:palette.muted,margin:"0 0 10px",textAlign:"center"}}>Check-in in {du} day{du!==1?"s":""}</p>}
              <div style={{display:"flex",gap:8}}>
                {h.confirmation && (
                  <button onClick={()=>copy(h.id,h.confirmation)} style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:6,background:copied===h.id?"#DFF0E1":palette.primaryLight,color:copied===h.id?"#3A6B42":palette.primary,border:"none",borderRadius:10,padding:"10px 0",fontSize:12,fontWeight:700,cursor:"pointer",transition:"all 0.2s"}}>
                    {copied===h.id?<Check size={13}/>:<Copy size={13}/>}{copied===h.id?"Copied!":h.confirmation}
                  </button>
                )}
                {h.address && (
                  <a href={`https://maps.google.com/?q=${encodeURIComponent(h.address)}`} target="_blank" rel="noreferrer" style={{display:"flex",alignItems:"center",gap:5,background:"#F5F0F2",color:palette.muted,borderRadius:10,padding:"10px 14px",fontSize:12,fontWeight:700,textDecoration:"none"}}>
                    <MapPin size={13}/>Map
                  </a>
                )}
              </div>
              {h.notes && <p style={{fontSize:12,color:palette.muted,margin:"10px 0 0",lineHeight:1.4}}>{h.notes}</p>}
            </div>
          </div>
        );
      })}
      {data.hotels.length===0 && <div style={{textAlign:"center",padding:"60px 0",color:palette.muted}}><div style={{fontSize:40,marginBottom:12}}>🏨</div><p style={{fontSize:14}}>No hotels yet — tap "Add Hotel" to get started!</p></div>}
    </div>
  );
}

// ─── TRANSPORT ────────────────────────────────────────────────────────────────
function TransportView({ data, palette, onUpdate }) {
  const legs = data.itinerary.filter(d=>d.transport!=="walk");
  const cyc  = (d) => {
    const c=["confirmed","pending","needs booking"];
    const next=c[(c.indexOf(d.bookingStatus)+1)%c.length];
    onUpdate("itinerary", data.itinerary.map(x=>x.id===d.id?{...x,bookingStatus:next}:x));
  };
  const nb = legs.filter(l=>l.bookingStatus==="needs booking");

  return (
    <div style={{padding:"24px 20px 40px"}}>
      <h2 style={{fontFamily:"'Playfair Display',Georgia,serif",fontSize:24,fontWeight:700,color:palette.text,margin:"0 0 4px"}}>Transport</h2>
      <p style={{color:palette.muted,fontSize:13,margin:"0 0 16px"}}>{legs.length} legs · {nb.length} need booking</p>

      {nb.length>0 && (
        <div style={{background:"#FDE8E8",borderRadius:14,padding:"12px 16px",marginBottom:16,border:"1px solid #F5C0C0"}}>
          <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:6}}><AlertCircle size={15} color="#9B2020"/><span style={{fontSize:13,fontWeight:700,color:"#9B2020"}}>{nb.length} unbooked leg{nb.length>1?"s":""}</span></div>
          {nb.map(l=><p key={l.id} style={{fontSize:12,color:"#9B2020",margin:"3px 0 0"}}>Day {l.dayNum} — {l.city}: {l.transportDetail||TRANSPORT_META[l.transport]?.label}</p>)}
        </div>
      )}

      <div style={{position:"relative"}}>
        <div style={{position:"absolute",left:22,top:0,bottom:0,width:2,background:palette.primaryLight}}/>
        {legs.map(d=>{
          const ss=BOOK_STATUS[d.bookingStatus]||BOOK_STATUS.pending;
          const M=TRANSPORT_META[d.transport]||TRANSPORT_META.other;
          return (
            <div key={d.id} style={{display:"flex",gap:12,marginBottom:12,position:"relative"}}>
              <div style={{width:44,height:44,borderRadius:"50%",background:`linear-gradient(135deg,${palette.primary},${palette.accent})`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,position:"relative",zIndex:1,boxShadow:`0 2px 10px ${palette.primary}44`}}>
                <M.Icon size={18} color="#fff"/>
              </div>
              <div style={{flex:1,background:"#fff",borderRadius:16,border:`1px solid ${palette.border}`,padding:"12px 14px",boxShadow:"0 1px 6px rgba(0,0,0,0.04)"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                  <div>
                    <div style={{fontSize:11,color:palette.muted,marginBottom:3}}>Day {d.dayNum} · {fmtDate(d.date)}</div>
                    <div style={{fontSize:14,fontWeight:700,color:palette.text}}>{d.city}</div>
                    {d.transportDetail && <div style={{fontSize:12,color:palette.muted,marginTop:3}}>{d.transportDetail}</div>}
                  </div>
                  <button onClick={()=>cyc(d)} style={{background:ss.bg,color:ss.text,border:"none",borderRadius:99,fontSize:10,fontWeight:700,padding:"4px 9px",cursor:"pointer",flexShrink:0,marginLeft:8}}>{ss.label}</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {legs.length===0 && <div style={{textAlign:"center",padding:"60px 0",color:palette.muted}}><div style={{fontSize:40,marginBottom:12}}>🚄</div><p style={{fontSize:14}}>No transport legs yet. Add days in Itinerary with transport types.</p></div>}
    </div>
  );
}

// ─── SETTINGS ─────────────────────────────────────────────────────────────────
function SettingsView({ data, palette, paletteName, setPaletteName, onUpdate, onReset, onImportNew }) {
  const [edit, setEdit]   = useState(false);
  const [tn, setTn]       = useState(data.tripName);
  const [sd, setSd]       = useState(data.startDate);
  const [ed, setEd]       = useState(data.endDate);
  // FIX: use in-app confirm dialog instead of window.confirm
  const [confirmReset, setConfirmReset] = useState(false);

  const save = () => { onUpdate("meta",{tripName:tn,startDate:sd,endDate:ed}); setEdit(false); };

  return (
    <div style={{padding:"24px 20px 40px"}}>
      {/* FIX: confirmReset now uses our custom ConfirmDialog */}
      {confirmReset && (
        <ConfirmDialog
          message="This will permanently delete all your trip data. Are you sure?"
          onConfirm={()=>{ setConfirmReset(false); onReset(); }}
          onCancel={()=>setConfirmReset(false)}
          palette={palette}
        />
      )}

      <h2 style={{fontFamily:"'Playfair Display',Georgia,serif",fontSize:24,fontWeight:700,color:palette.text,margin:"0 0 20px"}}>Settings</h2>

      {/* Trip info */}
      <div style={{background:"#fff",borderRadius:20,border:`1px solid ${palette.border}`,padding:20,marginBottom:14}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
          <p style={{fontSize:14,fontWeight:700,color:palette.text,margin:0}}>Trip Info</p>
          <button onClick={()=>{ setTn(data.tripName); setSd(data.startDate); setEd(data.endDate); setEdit(v=>!v); }} style={{background:palette.primaryLight,color:palette.primary,border:"none",borderRadius:8,padding:"6px 14px",fontSize:12,fontWeight:700,cursor:"pointer"}}>
            {edit?"Cancel":"Edit"}
          </button>
        </div>
        {edit ? (
          <>
            <Input label="Trip Name" value={tn} onChange={setTn}/>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              <Input label="Start Date" type="date" value={sd} onChange={setSd}/>
              <Input label="End Date" type="date" value={ed} onChange={setEd}/>
            </div>
            <button onClick={save} style={{background:palette.primary,color:"#fff",border:"none",borderRadius:10,padding:"10px 20px",fontSize:13,fontWeight:700,cursor:"pointer"}}>Save Changes</button>
          </>
        ) : (
          <>
            <p style={{fontSize:16,fontWeight:700,color:palette.text,margin:"0 0 4px"}}>{data.tripName}</p>
            <p style={{fontSize:13,color:palette.muted,margin:0}}>{fmtDate(data.startDate)} — {fmtDate(data.endDate)}</p>
          </>
        )}
      </div>

      {/* Theme */}
      <div style={{background:"#fff",borderRadius:20,border:`1px solid ${palette.border}`,padding:20,marginBottom:14}}>
        <p style={{fontSize:14,fontWeight:700,color:palette.text,margin:"0 0 14px"}}>Colour Theme</p>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          {Object.entries(PALETTES).map(([name,p])=>(
            <button key={name} onClick={()=>setPaletteName(name)} style={{background:p.primaryLight,border:`2.5px solid ${paletteName===name?p.primary:"transparent"}`,borderRadius:14,padding:"12px 14px",cursor:"pointer",textAlign:"left",transition:"all 0.15s"}}>
              <div style={{width:26,height:26,borderRadius:"50%",background:p.primary,marginBottom:6}}/>
              <p style={{fontSize:12,fontWeight:700,color:p.text,margin:0}}>{p.name}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Data actions */}
      <div style={{background:"#fff",borderRadius:20,border:`1px solid ${palette.border}`,padding:20}}>
        <p style={{fontSize:14,fontWeight:700,color:palette.text,margin:"0 0 12px"}}>Data</p>
        <button onClick={onImportNew} style={{display:"block",width:"100%",background:palette.primaryLight,color:palette.primary,border:"none",borderRadius:10,padding:"11px 0",fontSize:13,fontWeight:700,cursor:"pointer",marginBottom:10}}>
          📥 Import / Replace Excel File
        </button>
        {/* FIX: uses custom ConfirmDialog, not window.confirm */}
        <button onClick={()=>setConfirmReset(true)} style={{display:"block",width:"100%",background:"#FDE8E8",color:"#9B2020",border:"none",borderRadius:10,padding:"11px 0",fontSize:13,fontWeight:700,cursor:"pointer"}}>
          🗑️ Reset All Data
        </button>
      </div>
    </div>
  );
}


// ─── ROUTE PLANNER VIEW ──────────────────────────────────────────────────────
// Lets user build a list of places for a day, then opens the most efficient
// route in Google Maps (via waypoints URL), and shows a visual stop list.
function RoutePlannerView({ data, palette }) {
  const cities = [...new Set([
    ...data.itinerary.map(d => d.city),
    ...data.restaurants.map(r => r.city),
    ...data.hotels.map(h => h.city),
  ].filter(Boolean))];

  const [selectedCity, setSelectedCity] = useState(cities[0] || "");
  const [stops, setStops]               = useState([]); // [{id, label, address, type}]
  const [customInput, setCustomInput]   = useState("");
  const [travelMode, setTravelMode]     = useState("walking");
  const [showCopied, setShowCopied]     = useState(false);

  const MODES = [
    { id:"walking",   label:"Walk",    emoji:"🚶" },
    { id:"transit",   label:"Transit", emoji:"🚇" },
    { id:"driving",   label:"Drive",   emoji:"🚗" },
    { id:"bicycling", label:"Bike",    emoji:"🚲" },
  ];

  // Suggestions from existing data for the selected city
  const suggestions = [
    ...data.restaurants
      .filter(r => r.city === selectedCity && r.name)
      .map(r => ({ id:"r-"+r.id, label:r.name, address:r.area ? r.name+", "+r.area+", "+selectedCity : r.name+", "+selectedCity, type:"restaurant", emoji:"🍜" })),
    ...data.hotels
      .filter(h => h.city === selectedCity && h.name)
      .map(h => ({ id:"h-"+h.id, label:h.name, address:h.address||h.name+", "+selectedCity, type:"hotel", emoji:"🏨" })),
  ];

  const addStop = (item) => {
    if (stops.find(s => s.id === item.id)) return; // already added
    setStops(prev => [...prev, item]);
  };

  const addCustom = () => {
    const trimmed = customInput.trim();
    if (!trimmed) return;
    const item = { id:"custom-"+Date.now(), label:trimmed, address:trimmed+", "+selectedCity, type:"custom", emoji:"📍" };
    setStops(prev => [...prev, item]);
    setCustomInput("");
  };

  const removeStop = (id) => setStops(prev => prev.filter(s => s.id !== id));

  const moveStop = (index, dir) => {
    const arr = [...stops];
    const target = index + dir;
    if (target < 0 || target >= arr.length) return;
    [arr[index], arr[target]] = [arr[target], arr[index]];
    setStops(arr);
  };

  // Build Google Maps URL
  // Format: https://www.google.com/maps/dir/origin/waypoint1/waypoint2/.../destination
  const buildMapsUrl = () => {
    if (stops.length < 2) return null;
    const encoded = stops.map(s => encodeURIComponent(s.address));
    const origin = encoded[0];
    const destination = encoded[encoded.length - 1];
    const waypoints = encoded.slice(1, -1);
    let url = `https://www.google.com/maps/dir/${origin}`;
    waypoints.forEach(w => { url += `/${w}`; });
    url += `/${destination}`;
    url += `?travelmode=${travelMode}`;
    return url;
  };

  const mapsUrl = buildMapsUrl();

  const copyUrl = () => {
    if (!mapsUrl) return;
    navigator.clipboard.writeText(mapsUrl).catch(()=>{});
    setShowCopied(true);
    setTimeout(() => setShowCopied(false), 2000);
  };

  const TYPE_COLORS = {
    restaurant: { bg:"#EEE8F8", text:"#5B4C8A" },
    hotel:      { bg:"#DFF0E1", text:"#3A6B42" },
    custom:     { bg:"#FFF3DC", text:"#8A6200" },
  };

  return (
    <div style={{padding:"24px 20px 40px"}}>
      <h2 style={{fontFamily:"'Playfair Display',Georgia,serif",fontSize:24,fontWeight:700,color:palette.text,margin:"0 0 4px"}}>Route Planner</h2>
      <p style={{color:palette.muted,fontSize:13,margin:"0 0 20px"}}>Build your day's stops — we'll find the most efficient route</p>

      {/* City selector */}
      <div style={{marginBottom:16}}>
        <p style={{fontSize:11,fontWeight:800,color:palette.muted,textTransform:"uppercase",letterSpacing:"0.06em",margin:"0 0 8px"}}>City</p>
        <div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:4}}>
          {cities.map(c => (
            <button key={c} onClick={()=>setSelectedCity(c)}
              style={{flexShrink:0,padding:"7px 16px",borderRadius:99,border:"none",fontSize:13,fontWeight:700,cursor:"pointer",transition:"all 0.15s",
                background:selectedCity===c?palette.primary:palette.primaryLight,
                color:selectedCity===c?"#fff":palette.primary}}>
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Travel mode */}
      <div style={{marginBottom:20}}>
        <p style={{fontSize:11,fontWeight:800,color:palette.muted,textTransform:"uppercase",letterSpacing:"0.06em",margin:"0 0 8px"}}>Travel Mode</p>
        <div style={{display:"flex",gap:8}}>
          {MODES.map(m => (
            <button key={m.id} onClick={()=>setTravelMode(m.id)}
              style={{flex:1,padding:"9px 4px",borderRadius:12,border:`2px solid ${travelMode===m.id?palette.primary:"transparent"}`,
                background:travelMode===m.id?palette.primaryLight:"#fff",
                color:travelMode===m.id?palette.primary:palette.muted,
                fontSize:11,fontWeight:700,cursor:"pointer",textAlign:"center",transition:"all 0.15s"}}>
              <div style={{fontSize:18,marginBottom:2}}>{m.emoji}</div>
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Two-column layout on desktop */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,alignItems:"start"}}>

        {/* LEFT: Add stops */}
        <div>
          <p style={{fontSize:11,fontWeight:800,color:palette.muted,textTransform:"uppercase",letterSpacing:"0.06em",margin:"0 0 10px"}}>Add Stops</p>

          {/* Custom address input */}
          <div style={{background:"#fff",borderRadius:14,border:`1px solid ${palette.border}`,padding:"12px 14px",marginBottom:12}}>
            <p style={{fontSize:12,fontWeight:700,color:palette.text,margin:"0 0 8px"}}>Type any place or address</p>
            <div style={{display:"flex",gap:8}}>
              <input
                value={customInput}
                onChange={e=>setCustomInput(e.target.value)}
                onKeyDown={e=>{ if(e.key==="Enter") addCustom(); }}
                placeholder={`e.g. Senso-ji Temple, ${selectedCity}`}
                style={{flex:1,border:`1px solid ${palette.border}`,borderRadius:10,padding:"9px 11px",fontSize:13,fontFamily:"inherit",outline:"none",color:palette.text,background:"#FAF8F9"}}
              />
              <button onClick={addCustom} disabled={!customInput.trim()}
                style={{background:customInput.trim()?palette.primary:"#D0C8CA",color:"#fff",border:"none",borderRadius:10,padding:"9px 14px",fontSize:13,fontWeight:700,cursor:customInput.trim()?"pointer":"not-allowed",flexShrink:0,display:"flex",alignItems:"center",gap:4}}>
                <Plus size={14}/>Add
              </button>
            </div>
          </div>

          {/* Suggestions from trip data */}
          {suggestions.length > 0 && (
            <div style={{background:"#fff",borderRadius:14,border:`1px solid ${palette.border}`,padding:"12px 14px"}}>
              <p style={{fontSize:12,fontWeight:700,color:palette.text,margin:"0 0 10px"}}>From your trip in {selectedCity}</p>
              <div style={{maxHeight:280,overflowY:"auto"}}>
                {suggestions.map(s => {
                  const already = stops.find(st=>st.id===s.id);
                  const tc = TYPE_COLORS[s.type]||TYPE_COLORS.custom;
                  return (
                    <div key={s.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:`1px solid ${palette.border}`}}>
                      <div style={{flex:1,minWidth:0,marginRight:8}}>
                        <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:2}}>
                          <span style={{fontSize:14}}>{s.emoji}</span>
                          <span style={{fontSize:12,fontWeight:700,color:palette.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{s.label}</span>
                        </div>
                        <span style={{fontSize:10,background:tc.bg,color:tc.text,padding:"1px 7px",borderRadius:99,fontWeight:700}}>{s.type}</span>
                      </div>
                      <button onClick={()=>addStop(s)} disabled={!!already}
                        style={{flexShrink:0,background:already?"#F1EFEF":palette.primaryLight,color:already?palette.muted:palette.primary,border:"none",borderRadius:8,padding:"5px 10px",fontSize:11,fontWeight:700,cursor:already?"not-allowed":"pointer"}}>
                        {already?"Added ✓":"+ Add"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {suggestions.length === 0 && (
            <div style={{background:"#fff",borderRadius:14,border:`1px solid ${palette.border}`,padding:"20px",textAlign:"center",color:palette.muted}}>
              <div style={{fontSize:28,marginBottom:6}}>🗺️</div>
              <p style={{fontSize:13,margin:0}}>No saved places for {selectedCity} yet.<br/>Type any address above to add stops.</p>
            </div>
          )}
        </div>

        {/* RIGHT: Your route */}
        <div>
          <p style={{fontSize:11,fontWeight:800,color:palette.muted,textTransform:"uppercase",letterSpacing:"0.06em",margin:"0 0 10px"}}>Your Route ({stops.length} stops)</p>

          {stops.length === 0 && (
            <div style={{background:"#fff",borderRadius:14,border:`1.5px dashed ${palette.border}`,padding:"32px 20px",textAlign:"center",color:palette.muted}}>
              <div style={{fontSize:32,marginBottom:8}}>📍</div>
              <p style={{fontSize:13,margin:0}}>Add at least 2 stops<br/>to build a route</p>
            </div>
          )}

          {/* Stop list with drag-order */}
          {stops.length > 0 && (
            <div style={{background:"#fff",borderRadius:14,border:`1px solid ${palette.border}`,overflow:"hidden",marginBottom:12}}>
              {stops.map((s, i) => {
                const tc = TYPE_COLORS[s.type]||TYPE_COLORS.custom;
                const isFirst = i===0; const isLast = i===stops.length-1;
                return (
                  <div key={s.id} style={{padding:"11px 14px",borderBottom:isLast?"none":`1px solid ${palette.border}`,display:"flex",alignItems:"center",gap:10,position:"relative"}}>
                    {/* Timeline dot */}
                    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:0,flexShrink:0}}>
                      <div style={{width:28,height:28,borderRadius:"50%",
                        background:isFirst?`linear-gradient(135deg,${palette.primary},${palette.accent})`:isLast?"#2D2426":palette.primaryLight,
                        display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:800,
                        color:isFirst||isLast?"#fff":palette.primary}}>
                        {isFirst?"A":isLast?String.fromCharCode(64+stops.length):String.fromCharCode(65+i)}
                      </div>
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:13,fontWeight:700,color:palette.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{s.label}</div>
                      <div style={{display:"flex",alignItems:"center",gap:6,marginTop:2}}>
                        <span style={{fontSize:10,background:tc.bg,color:tc.text,padding:"1px 7px",borderRadius:99,fontWeight:700}}>{s.type}</span>
                        <span style={{fontSize:10,color:palette.muted,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{s.address}</span>
                      </div>
                    </div>
                    {/* Controls */}
                    <div style={{display:"flex",gap:4,flexShrink:0}}>
                      <button onClick={()=>moveStop(i,-1)} disabled={i===0} style={{background:i===0?"#F5F0F2":palette.primaryLight,color:i===0?palette.muted:palette.primary,border:"none",borderRadius:6,width:26,height:26,cursor:i===0?"not-allowed":"pointer",fontSize:13,display:"flex",alignItems:"center",justifyContent:"center"}}>↑</button>
                      <button onClick={()=>moveStop(i,1)} disabled={isLast} style={{background:isLast?"#F5F0F2":palette.primaryLight,color:isLast?palette.muted:palette.primary,border:"none",borderRadius:6,width:26,height:26,cursor:isLast?"not-allowed":"pointer",fontSize:13,display:"flex",alignItems:"center",justifyContent:"center"}}>↓</button>
                      <button onClick={()=>removeStop(s.id)} style={{background:"#FDE8E8",color:"#9B2020",border:"none",borderRadius:6,width:26,height:26,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}><X size={12}/></button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Action buttons */}
          {stops.length >= 2 && (
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {/* Open in Google Maps */}
              <a href={mapsUrl} target="_blank" rel="noreferrer"
                style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,background:`linear-gradient(135deg,${palette.primary},${palette.accent})`,color:"#fff",borderRadius:14,padding:"14px 0",fontSize:14,fontWeight:700,textDecoration:"none",boxShadow:`0 4px 16px ${palette.primary}44`}}>
                <MapPin size={16}/>Open Route in Google Maps
              </a>
              {/* Copy link */}
              <button onClick={copyUrl}
                style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,background:showCopied?"#DFF0E1":palette.primaryLight,color:showCopied?"#3A6B42":palette.primary,border:"none",borderRadius:14,padding:"12px 0",fontSize:13,fontWeight:700,cursor:"pointer",transition:"all 0.2s"}}>
                {showCopied?<Check size={15}/>:<Copy size={15}/>}
                {showCopied?"Link copied!":"Copy route link"}
              </button>
              {/* Tip */}
              <div style={{background:"#FFF3DC",borderRadius:12,padding:"10px 14px",border:"1px solid #FFDEA0"}}>
                <p style={{fontSize:11,color:"#8A6200",margin:0,lineHeight:1.5}}>
                  💡 <strong>Tip:</strong> Google Maps will automatically reorder stops for the most efficient route when you tap "Optimise route" inside the app. The order you set here is your preferred sequence.
                </p>
              </div>
            </div>
          )}

          {stops.length === 1 && (
            <div style={{background:"#F5F0F2",borderRadius:12,padding:"10px 14px"}}>
              <p style={{fontSize:12,color:palette.muted,margin:0}}>Add at least one more stop to generate a route.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── ROOT APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [paletteName, setPaletteName] = useState("sakura");
  const [view, setView]               = useState("home");
  const [data, setData]               = useState(null);
  const [showOnboard, setShowOnboard] = useState(false);

  const palette = PALETTES[paletteName];

  useEffect(()=>{
    try {
      const saved  = localStorage.getItem("kumo_data");
      const savedP = localStorage.getItem("kumo_palette");
      if (saved) setData(JSON.parse(saved));
      else setShowOnboard(true);
      if (savedP && PALETTES[savedP]) setPaletteName(savedP);
    } catch { setShowOnboard(true); }
  },[]);

  useEffect(()=>{ if(data) localStorage.setItem("kumo_data", JSON.stringify(data)); },[data]);
  useEffect(()=>{ localStorage.setItem("kumo_palette", paletteName); },[paletteName]);

  const handleImport = (sheets) => {
    const findSheet = (kws) => { const k=Object.keys(sheets).find(n=>kws.some(kw=>n.toLowerCase().includes(kw))); return k?sheets[k]:[]; };
    const mf = (row,cands) => { for(const c of cands){ const k=Object.keys(row).find(k=>k.toLowerCase().includes(c)); if(k&&row[k]) return String(row[k]); } return ""; };
    const itinRaw  = findSheet(["itinerar","day","schedule","plan"]);
    const restRaw  = findSheet(["restaurant","food","dining","eat"]);
    const hotelRaw = findSheet(["hotel","accommodation","stay"]);
    const itinerary   = itinRaw.map((r,i)=>({ id:uid(),date:mf(r,["date"]),dayNum:parseInt(mf(r,["day"]))||i+1,city:mf(r,["city","location","destination"]),activities:mf(r,["activit","plan","desc","schedule"]),transport:mf(r,["transport","method","mode"]).toLowerCase()||"other",transportDetail:mf(r,["detail","route","flight","train","booking"]),bookingStatus:mf(r,["status","booking"]).toLowerCase()||"pending",notes:mf(r,["note"]) }));
    const restaurants = restRaw.map((r)=>({ id:uid(),city:mf(r,["city","location"]),name:mf(r,["name","restaurant"]),cuisine:mf(r,["cuisine","type","category"]),price:mf(r,["price","cost","range"]),mustTry:mf(r,["must","signature","dish"]),area:mf(r,["area","district","address"]),reservationRequired:mf(r,["reservation","booking"])||"No",notes:mf(r,["note","hours","info"]),status:"wishlist" }));
    const hotels      = hotelRaw.map((r)=>({ id:uid(),city:mf(r,["city","location"]),name:mf(r,["hotel","name","property"]),checkIn:mf(r,["check in","checkin","arrival","from"]),checkOut:mf(r,["check out","checkout","departure","to"]),confirmation:mf(r,["confirm","booking","reference","code"]),address:mf(r,["address"]),phone:mf(r,["phone","tel","contact"]),notes:mf(r,["note"]) }));
    const dates = itinerary.map(d=>d.date).filter(Boolean).sort();
    setData({ tripName:"My Trip", startDate:dates[0]||"", endDate:dates[dates.length-1]||"", itinerary, restaurants, hotels });
    setShowOnboard(false);
  };

  const handleDemo    = () => { setData(DEMO); setShowOnboard(false); };
  const handleScratch = () => { setData({ tripName:"My New Trip", startDate:"", endDate:"", itinerary:[], restaurants:[], hotels:[] }); setShowOnboard(false); };
  const handleReset   = () => { localStorage.removeItem("kumo_data"); setData(null); setShowOnboard(true); setView("home"); };
  const handleUpdate  = (section,value) => setData(prev => section==="meta" ? {...prev,...value} : {...prev,[section]:value});

  const NAV = [
    { id:"home",        label:"Home",      Icon:Home },
    { id:"itinerary",   label:"Itinerary", Icon:Calendar },
    { id:"restaurants", label:"Eats",      Icon:Utensils },
    { id:"hotels",      label:"Hotels",    Icon:Hotel },
    { id:"transport",   label:"Transport", Icon:Train },
    { id:"route",       label:"Route",     Icon:MapPin },
    { id:"settings",    label:"Settings",  Icon:Settings },
  ];

  const unbooked = data ? data.itinerary.filter(d=>d.bookingStatus==="needs booking").length : 0;

  if (showOnboard) return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=Playfair+Display:wght@600;700&display=swap" rel="stylesheet"/>
      <Onboarding palette={palette} onImport={handleImport} onDemo={handleDemo} onScratch={handleScratch}/>
    </>
  );

  if (!data) return null;

  const renderView = () => {
    const p = { data, palette, onUpdate:handleUpdate };
    switch(view) {
      case "home":        return <HomeView        {...p} setView={setView}/>;
      case "itinerary":   return <ItineraryView   {...p}/>;
      case "restaurants": return <RestaurantsView {...p}/>;
      case "hotels":      return <HotelsView      {...p}/>;
      case "transport":   return <TransportView   {...p}/>;
      case "route":       return <RoutePlannerView {...p}/>;
      case "settings":    return <SettingsView    {...p} paletteName={paletteName} setPaletteName={setPaletteName} onReset={handleReset} onImportNew={()=>setShowOnboard(true)}/>;
      default:            return <HomeView        {...p} setView={setView}/>;
    }
  };

  // Mobile nav: show Home, Itinerary, Eats, Route, Transport — Settings in top bar
  const mobileNav = NAV.filter(n => ["home","itinerary","restaurants","route","transport"].includes(n.id));

  return (
    <div style={{minHeight:"100vh",background:palette.bg,fontFamily:"'DM Sans',-apple-system,sans-serif"}}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=Playfair+Display:wght@600;700&display=swap" rel="stylesheet"/>
      <style>{`
        @media(min-width:768px){
          .kumo-mobile-nav { display:none !important; }
          .kumo-topbar     { display:none !important; }
          .kumo-desktop    { display:flex !important; }
          .kumo-content    { margin-left:240px; }
        }
        @media(max-width:767px){
          .kumo-desktop { display:none !important; }
          .kumo-content { margin-left:0; padding-bottom:80px; }
        }
        * { box-sizing:border-box; }
        ::-webkit-scrollbar { width:4px; height:4px; }
        ::-webkit-scrollbar-thumb { background:#D0C8CA; border-radius:99px; }
      `}</style>

      {/* ── DESKTOP SIDEBAR ── */}
      <div className="kumo-desktop" style={{display:"none",position:"fixed",left:0,top:0,bottom:0,width:240,background:"#fff",borderRight:`1px solid ${palette.border}`,flexDirection:"column",zIndex:300,padding:"28px 0 20px"}}>
        <div style={{padding:"0 24px 24px",borderBottom:`1px solid ${palette.border}`}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontSize:26}}>☁️</span>
            <div>
              <div style={{fontSize:16,fontWeight:800,color:palette.text,letterSpacing:"-0.02em",fontFamily:"'Playfair Display',Georgia,serif"}}>Kumo</div>
              <div style={{fontSize:10,color:palette.muted,fontWeight:600,letterSpacing:"0.05em",textTransform:"uppercase",marginTop:-2}}>Travel Planner</div>
            </div>
          </div>
        </div>
        <div style={{padding:"16px 24px",borderBottom:`1px solid ${palette.border}`}}>
          <p style={{fontSize:10,fontWeight:700,color:palette.muted,textTransform:"uppercase",letterSpacing:"0.06em",margin:"0 0 4px"}}>Current Trip</p>
          <p style={{fontSize:13,fontWeight:700,color:palette.text,margin:0}}>{data.tripName}</p>
          {data.startDate && <p style={{fontSize:11,color:palette.muted,margin:"2px 0 0"}}>{fmtDate(data.startDate)} — {fmtDate(data.endDate)}</p>}
        </div>
        <nav style={{flex:1,padding:"12px",overflowY:"auto"}}>
          {NAV.map(({id,label,Icon})=>(
            <button key={id} onClick={()=>setView(id)} style={{display:"flex",alignItems:"center",gap:12,width:"100%",background:view===id?palette.primaryLight:"transparent",color:view===id?palette.primary:palette.muted,border:"none",borderRadius:12,padding:"11px 14px",fontSize:13,fontWeight:view===id?700:500,cursor:"pointer",textAlign:"left",transition:"all 0.15s",marginBottom:2}}>
              <Icon size={17} strokeWidth={view===id?2.5:1.8}/>
              {label}
              {id==="transport" && unbooked>0 && <span style={{marginLeft:"auto",background:"#E05C5C",color:"#fff",fontSize:10,fontWeight:800,width:18,height:18,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center"}}>{unbooked}</span>}
            </button>
          ))}
        </nav>
        <div style={{padding:"12px 24px",borderTop:`1px solid ${palette.border}`}}>
          <p style={{fontSize:11,color:palette.muted,margin:0,lineHeight:1.5}}>All data saved on this device</p>
        </div>
      </div>

      {/* ── MOBILE TOP BAR ── */}
      <div className="kumo-topbar" style={{position:"sticky",top:0,zIndex:200,background:palette.bg,borderBottom:`1px solid ${palette.border}`,padding:"12px 16px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:20}}>☁️</span>
          <span style={{fontSize:15,fontWeight:800,color:palette.text,fontFamily:"'Playfair Display',Georgia,serif"}}>Kumo</span>
        </div>
        <span style={{fontSize:12,fontWeight:700,color:palette.primary,maxWidth:140,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{data.tripName}</span>
        <button onClick={()=>setView("settings")} style={{background:view==="settings"?palette.primaryLight:"transparent",border:"none",borderRadius:10,padding:"6px 8px",cursor:"pointer"}}>
          <Settings size={18} color={view==="settings"?palette.primary:palette.muted}/>
        </button>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div className="kumo-content" style={{minHeight:"100vh"}}>
        <div style={{maxWidth:900,margin:"0 auto"}}>
          {renderView()}
        </div>
      </div>

      {/* ── MOBILE BOTTOM NAV ── */}
      <div className="kumo-mobile-nav" style={{position:"fixed",bottom:0,left:0,right:0,background:"#fff",borderTop:`1px solid ${palette.border}`,display:"flex",justifyContent:"space-around",padding:"8px 0 14px",zIndex:200}}>
        {mobileNav.map(({id,label,Icon})=>(
          <button key={id} onClick={()=>setView(id)} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:3,background:"none",border:"none",cursor:"pointer",padding:"4px 8px",color:view===id?palette.primary:palette.muted,position:"relative"}}>
            <div style={{position:"relative"}}>
              <Icon size={20} strokeWidth={view===id?2.5:1.8}/>
              {id==="transport" && unbooked>0 && <span style={{position:"absolute",top:-3,right:-3,width:7,height:7,borderRadius:"50%",background:"#E05C5C",border:"1.5px solid #fff"}}/>}
            </div>
            <span style={{fontSize:10,fontWeight:view===id?700:500}}>{label}</span>
            {view===id && <div style={{width:16,height:2.5,background:palette.primary,borderRadius:99}}/>}
          </button>
        ))}
      </div>
    </div>
  );
}
