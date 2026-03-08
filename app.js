// --- CONFIGURATION --- //
const SUPABASE_URL = "https://bzgftajvobdmaxpbfdva.supabase.co";
const SUPABASE_KEY = "sb_publishable_-Q__aDDOjH8beKr1Qec9Hw_UfqZlu9x";
const COMMUNE = "Corte";
const CONTACT_RGPD = "jean_hugues_robert@yahoo.com";

var supabase = window.supabaseClient || window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
window.supabaseClient = supabase;
const {useState, useEffect, useRef} = React;

let seedIdeas = [];
async function loadSeedIdeas() {
  const res = await fetch("ideas-seed.json");
  seedIdeas = await res.json();
}

function App() {
  const [ideas,setIdeas] = useState([]);
  const [text,setText] = useState("");
  const [tags,setTags] = useState("");
  const [email,setEmail] = useState("");
  const [consent,setConsent] = useState(false);
  const [showForm,setShowForm] = useState(false);
  const [voterType,setVoterType] = useState("résident");
  const [selectedTags,setSelectedTags] = useState([]);
  const chartRef = useRef(null);
  const chartInstanceRef = useRef(null);

  async function seed() {
    if(!seedIdeas || seedIdeas.length===0) return;
    let {data, error} = await supabase.from("ideas").select("id").limit(1);
    if(error){ alert(error.message); return; }
    if(data && data.length>0) return;
    for(let i of seedIdeas){
      let {error: insertError} = await supabase.from("ideas").insert({text:i.text,tags:i.tags});
      if(insertError){ alert(insertError.message); return; }
    }
  }

  async function loadIdeas(){
    let {data: ideasData, error: ideasError} = await supabase.from("ideas").select("*");
    if(ideasError){ alert(ideasError.message); return; }
    let {data: votes, error: votesError} = await supabase.from("votes").select("*");
    if(votesError){ alert(votesError.message); return; }
    let map = {};
    (ideasData||[]).forEach(i=>map[i.id]={...i,votes:0,byType:{}});
    (votes||[]).forEach(v=>{
      let m = map[v.idea_id];
      if(!m) return;
      m.votes++;
      m.byType[v.voter_type]=(m.byType[v.voter_type]||0)+1;
    });
    let list = Object.values(map).sort((a,b)=>b.votes-a.votes);
    setIdeas(list);
    drawChart(list);
  }

  async function addIdea(){
    if(!text) return;
    if(email && !consent){ alert("Consentement RGPD requis"); return; }
    let {error} = await supabase.from("ideas").insert({text, tags:tags.split(",").map(t=>t.trim()).filter(Boolean), email:email||null});
    if(error){ alert(error.message); return; }
    setText(""); setTags(""); setEmail(""); setConsent(false); setShowForm(false);
    await loadIdeas();
  }

  async function vote(id){
    let {error} = await supabase.from("votes").insert({idea_id:id,voter_type:voterType});
    if(error){ alert(error.message); return; }
    await loadIdeas();
  }

  function drawChart(list){
    const palette = {
      logement:'#FF0000',"mobilité":'#0000FF',environnement:'#FFFF00',
      "économie":'#FF0000',services:'#0000FF',culture:'#FFFF00',
      "sécurité":'#FF0000',tourisme:'#0000FF'
    };
    let counts={};
    let colors={};
    list.forEach(i=>{(i.tags||[]).forEach(t=>{
      counts[t]=(counts[t]||0)+i.votes;
      colors[t]=palette[t]||'#000000';
    })});
    if(!chartRef.current) return;
    if(chartInstanceRef.current){ chartInstanceRef.current.destroy(); }
    chartInstanceRef.current = new Chart(chartRef.current,{
      type:'bar',
      data:{labels:Object.keys(counts),datasets:[{label:'Priorités',data:Object.values(counts),backgroundColor:Object.keys(counts).map(t=>colors[t])}]},
      options:{responsive:true,plugins:{legend:{display:false}}}
    });
  }

  useEffect(()=>{ async function init(){ await loadSeedIdeas(); await seed(); await loadIdeas(); } init(); },[]);
  const allTags = Array.from(new Set(ideas.flatMap(i=>i.tags||[]))).sort();
  const filteredIdeas = selectedTags.length===0 ? ideas : ideas.filter(i=>(i.tags||[]).some(t=>selectedTags.includes(t)));
  useEffect(()=>{ drawChart(filteredIdeas); },[selectedTags, ideas]);

  return React.createElement("div",{className:"max-w-4xl mx-auto p-6"},
    React.createElement("h1",{className:"text-3xl font-bold mb-6", style:{borderBottom:'8px solid #000000', paddingBottom:'8px'}},"Boîte à idées citoyenne – "+COMMUNE),

    React.createElement("div",{className:"mb-4"},
      React.createElement("span",{className:"mr-2 font-bold"},"Vous êtes : "),
      React.createElement("select",{value:voterType,onChange:e=>setVoterType(e.target.value),className:"border-2 border-black p-2 rounded"},
        React.createElement("option",{value:"résident"},"Résident"),
        React.createElement("option",{value:"alentour"},"Alentour"),
        React.createElement("option",{value:"étudiant"},"Étudiant"),
        React.createElement("option",{value:"visiteur"},"Visiteur")
      )
    ),

    React.createElement("div",{className:"mb-4 flex flex-wrap gap-2"},
      allTags.map(t=>React.createElement("button",{key:t,className:"px-3 py-1 rounded", style:{backgroundColor:selectedTags.includes(t)?'#000000':'#FFFFFF', color:selectedTags.includes(t)?'#FFFFFF':'#000000', border:'2px solid #000000'}, onClick:()=>setSelectedTags(selectedTags.includes(t)?selectedTags.filter(x=>x!==t):[...selectedTags,t])},"#"+t)),
      allTags.length>0 && React.createElement("button",{className:"px-3 py-1 rounded", style:{backgroundColor:'#FFFFFF', color:'#000000', border:'2px solid #000000'}, onClick:()=>setSelectedTags([])},"Tous")
    ),

    React.createElement("canvas",{ref:chartRef,className:"mb-8"}),

    filteredIdeas.map(i=>React.createElement("div",{key:i.id,className:"bg-white border-4 border-black p-4 mb-3 rounded"},
      React.createElement("div",{className:"mb-2 font-bold"},i.text),
      React.createElement("div",{className:"text-sm text-black mb-2"},(i.tags||[]).map(t=>"#"+t).join(" ")),
      React.createElement("div",{className:"text-xs mb-2"},"Votes : "+i.votes),
      React.createElement("button",{className:"px-3 py-1 rounded", style:{backgroundColor:'#0000FF', color:'#FFFFFF', fontWeight:'bold'},onClick:()=>vote(i.id)},"👍 Voter")
    )),

    React.createElement("div",{className:"mt-6"},
      React.createElement("button",{className:"px-4 py-2 rounded mb-4", style:{backgroundColor:'#FF0000', color:'#FFFFFF', fontWeight:'bold'}, onClick:()=>setShowForm(!showForm)}, showForm ? "Fermer" : "Proposer une idée"),
      showForm && React.createElement("div",{className:"bg-white border-4 border-black p-4 rounded"},
        React.createElement("textarea",{className:"w-full border-2 border-black p-2 mb-2",placeholder:"Votre idée",value:text,onChange:e=>setText(e.target.value)}),
        React.createElement("input",{className:"w-full border-2 border-black p-2 mb-2",placeholder:"#logement,#mobilité",value:tags,onChange:e=>setTags(e.target.value)}),
        React.createElement("input",{className:"w-full border-2 border-black p-2 mb-2",placeholder:"email optionnel",value:email,onChange:e=>setEmail(e.target.value)}),
        email && React.createElement("label",{className:"text-sm block mb-2"},
          React.createElement("input",{type:"checkbox",checked:consent,onChange:e=>setConsent(e.target.checked)}),
          " consentement RGPD responsable "+CONTACT_RGPD
        ),
        React.createElement("button",{className:"px-4 py-2 rounded", style:{backgroundColor:'#FF0000', color:'#FFFFFF', fontWeight:'bold'}, onClick:addIdea},"Ajouter")
      )
    )
  );
}

ReactDOM.createRoot(document.getElementById("app")).render(React.createElement(App));
