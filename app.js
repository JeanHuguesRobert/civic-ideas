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
  const [voterType,setVoterType] = useState("cortenais");
  const chartRef = useRef(null);

  async function seed() {
    if(!seedIdeas || seedIdeas.length===0) return;
    let {data} = await supabase.from("ideas").select("id").limit(1);
    if(data && data.length>0) return;
    for(let i of seedIdeas){
      await supabase.from("ideas").insert({text:i.text,tags:i.tags});
    }
  }

  async function loadIdeas(){
    let {data: ideasData} = await supabase.from("ideas").select("*");
    let {data: votes} = await supabase.from("votes").select("*");
    let map = {};
    ideasData.forEach(i=>map[i.id]={...i,votes:0,byType:{}});
    votes.forEach(v=>{
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
    await supabase.from("ideas").insert({text, tags:tags.split(",").map(t=>t.trim()).filter(Boolean), email:email||null});
    setText(""); setTags(""); setEmail(""); setConsent(false);
    loadIdeas();
  }

  async function vote(id){
    await supabase.from("votes").insert({idea_id:id,voter_type:voterType});
    loadIdeas();
  }

  function drawChart(list){
    const palette = {
      logement:'#FF0000',mobilite:'#0000FF',environnement:'#FFFF00',
      economie:'#FF0000',services:'#0000FF',culture:'#FFFF00',
      securite:'#FF0000',tourisme:'#0000FF'
    };
    let counts={};
    let colors={};
    list.forEach(i=>{(i.tags||[]).forEach(t=>{
      counts[t]=(counts[t]||0)+i.votes;
      colors[t]=palette[t]||'#000000';
    })});
    if(!chartRef.current) return;
    new Chart(chartRef.current,{
      type:'bar',
      data:{labels:Object.keys(counts),datasets:[{label:'Priorités',data:Object.values(counts),backgroundColor:Object.keys(counts).map(t=>colors[t])}]},
      options:{responsive:true,plugins:{legend:{display:false}}}
    });
  }

  useEffect(()=>{ async function init(){ await loadSeedIdeas(); await seed(); await loadIdeas(); } init(); },[]);

  return React.createElement("div",{className:"max-w-4xl mx-auto p-6"},
    React.createElement("h1",{className:"text-3xl font-bold mb-6", style:{borderBottom:'8px solid #000000', paddingBottom:'8px'}},"Boîte à idées citoyenne – "+COMMUNE),

    React.createElement("div",{className:"bg-white border-4 border-black p-4 mb-6 rounded"},
      React.createElement("textarea",{className:"w-full border-2 border-black p-2 mb-2",placeholder:"Votre idée",value:text,onChange:e=>setText(e.target.value)}),
      React.createElement("input",{className:"w-full border-2 border-black p-2 mb-2",placeholder:"#logement,#mobilite",value:tags,onChange:e=>setTags(e.target.value)}),
      React.createElement("input",{className:"w-full border-2 border-black p-2 mb-2",placeholder:"email optionnel",value:email,onChange:e=>setEmail(e.target.value)}),
      email && React.createElement("label",{className:"text-sm block mb-2"},
        React.createElement("input",{type:"checkbox",checked:consent,onChange:e=>setConsent(e.target.checked)}),
        " consentement RGPD responsable "+CONTACT_RGPD
      ),
      React.createElement("button",{className:"px-4 py-2 rounded", style:{backgroundColor:'#FF0000', color:'#FFFFFF', fontWeight:'bold'}, onClick:addIdea},"Ajouter")
    ),

    React.createElement("div",{className:"mb-4"},
      React.createElement("select",{value:voterType,onChange:e=>setVoterType(e.target.value),className:"border-2 border-black p-2 rounded"},
        React.createElement("option",{value:"cortenais"},"Cortenais"),
        React.createElement("option",{value:"cortenais_region"},"Cortenais région"),
        React.createElement("option",{value:"etudiant"},"Étudiant"),
        React.createElement("option",{value:"visiteur"},"Visiteur")
      )
    ),

    React.createElement("canvas",{ref:chartRef,className:"mb-8"}),

    ideas.map(i=>React.createElement("div",{key:i.id,className:"bg-white border-4 border-black p-4 mb-3 rounded"},
      React.createElement("div",{className:"mb-2 font-bold"},i.text),
      React.createElement("div",{className:"text-sm text-black mb-2"},(i.tags||[]).map(t=>"#"+t).join(" ")),
      React.createElement("div",{className:"text-xs mb-2"},"Votes: "+i.votes),
      React.createElement("button",{className:"px-3 py-1 rounded", style:{backgroundColor:'#0000FF', color:'#FFFFFF', fontWeight:'bold'},onClick:()=>vote(i.id)},"👍 Voter")
    ))
  );
}

ReactDOM.createRoot(document.getElementById("app")).render(React.createElement(App));
