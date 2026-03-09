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
  const [comments,setComments] = useState({});
  const [text,setText] = useState("");
  const [tags,setTags] = useState("");
  const [email,setEmail] = useState("");
  const [consent,setConsent] = useState(false);
  const [showForm,setShowForm] = useState(false);
  const [voterType,setVoterType] = useState("résident");
  const [selectedTags,setSelectedTags] = useState([]);
  const [votedIds,setVotedIds] = useState([]);
  const [commentText,setCommentText] = useState("");
  const [commentAuthor,setCommentAuthor] = useState("");
  const [editingComment,setEditingComment] = useState(null);
  const [expandedIdeas,setExpandedIdeas] = useState({});
  const [showHelp,setShowHelp] = useState(false);
  const [helpContent,setHelpContent] = useState("");
  const chartRef = useRef(null);
  const chartInstanceRef = useRef(null);
  const appUrl = window.location.href;

  async function shareApp(){
    if(navigator.share){
      try { await navigator.share({title:document.title, url:appUrl}); return; } catch(e){}
    }
    if(navigator.clipboard && window.isSecureContext){
      try { await navigator.clipboard.writeText(appUrl); alert("Lien copié"); return; } catch(e){}
    }
    window.prompt("Copiez le lien", appUrl);
  }

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
    let list = Object.values(map).sort((a,b)=>(b.byType["résident"]||0)-(a.byType["résident"]||0));
    setIdeas(list);
    drawChart(list);
    await loadComments();
  }

  async function loadComments(){
    let {data, error} = await supabase.from("comments").select("*");
    if(error){ alert(error.message); return; }
    const commentsByIdea = {};
    (data||[]).forEach(c=>{
      if(!commentsByIdea[c.idea_id]) commentsByIdea[c.idea_id] = [];
      commentsByIdea[c.idea_id].push(c);
    });
    setComments(commentsByIdea);
  }

  async function addComment(ideaId){
    if(!commentText || !commentAuthor) return;
    const commentData = {
      idea_id: ideaId,
      author: commentAuthor,
      content: commentText,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      local_id: Date.now() + '-' + Math.random().toString(36).substr(2, 9)
    };
    
    let {error} = await supabase.from("comments").insert(commentData);
    if(error){ alert(error.message); return; }
    
    const localKey = `comment_${commentData.local_id}`;
    localStorage.setItem(localKey, JSON.stringify({author: commentAuthor}));
    
    setCommentText("");
    setCommentAuthor("");
    await loadComments();
  }

  async function updateComment(comment){
    if(!commentText) return;
    const updatedComment = {
      ...comment,
      content: commentText,
      updated_at: new Date().toISOString()
    };
    
    let {error} = await supabase.from("comments").update(updatedComment).eq("id", comment.id);
    if(error){ alert(error.message); return; }
    
    setCommentText("");
    setCommentAuthor("");
    setEditingComment(null);
    await loadComments();
  }

  async function deleteComment(comment){
    if(!confirm("Supprimer ce commentaire ?")) return;
    
    let {error} = await supabase.from("comments").delete().eq("id", comment.id);
    if(error){ alert(error.message); return; }
    
    const localKey = `comment_${comment.local_id}`;
    localStorage.removeItem(localKey);
    
    await loadComments();
  }

  function canEditComment(comment){
    if(!comment.local_id) return false;
    const localKey = `comment_${comment.local_id}`;
    const stored = localStorage.getItem(localKey);
    return stored !== null;
  }

  function startEditComment(comment){
    setCommentText(comment.content);
    setCommentAuthor(comment.author);
    setEditingComment(comment);
  }

  function cancelEdit(){
    setCommentText("");
    setCommentAuthor("");
    setEditingComment(null);
  }

  function toggleComments(ideaId){
    setExpandedIdeas(prev=>({...prev, [ideaId]: !prev[ideaId]}));
  }

  async function loadHelpContent(){
    try {
      const res = await fetch("mode-emploi.md");
      if(res.ok){
        const content = await res.text();
        // Remplacer la date dynamiquement
        const datedContent = content.replace("{date}", new Date().toLocaleDateString('fr-FR'));
        setHelpContent(datedContent);
      }
    } catch(e){
      setHelpContent("# Mode d'emploi\n\nLe fichier d'aide n'a pas pu être chargé.");
    }
  }

  function toggleHelp(){
    const newState = !showHelp;
    setShowHelp(newState);
    localStorage.setItem("helpOpen", newState.toString());
    
    if(!helpContent && newState){
      loadHelpContent();
    }
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
    if(votedIds.includes(id)){ alert("Vous avez déjà voté pour cette idée"); return; }
    let {error} = await supabase.from("votes").insert({idea_id:id,voter_type:voterType});
    if(error){ alert(error.message); return; }
    const nextVoted = [...votedIds, id];
    setVotedIds(nextVoted);
    localStorage.setItem("votedIdeaIds", JSON.stringify(nextVoted));
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
  useEffect(()=>{ 
    const stored = localStorage.getItem("votedIdeaIds");
    if(stored){ 
      try { setVotedIds(JSON.parse(stored)); } catch(e){ setVotedIds([]); }
    }
    
    const helpState = localStorage.getItem("helpOpen");
    if(helpState === "true"){
      setShowHelp(true);
      loadHelpContent();
    }
  },[]);
  const allTags = Array.from(new Set(ideas.flatMap(i=>i.tags||[]))).sort();
  const filteredIdeas = selectedTags.length===0 ? ideas : ideas.filter(i=>(i.tags||[]).some(t=>selectedTags.includes(t)));
  useEffect(()=>{ drawChart(filteredIdeas); },[selectedTags, ideas]);

  return React.createElement("div",{className:"max-w-4xl mx-auto p-4 sm:p-6"},
    React.createElement("div",{className:"text-center mb-4"},
      React.createElement("img",{src:"image.png", alt:"Logo Civic Ideas", className:"mx-auto mb-2 max-w-full h-auto", style:{maxHeight:'120px'}})
    ),
    React.createElement("h1",{className:"text-2xl sm:text-3xl font-bold mb-2 sm:mb-4 text-center", style:{borderBottom:'8px solid #000000', paddingBottom:'8px'}},"Boîte à idées citoyenne – "+COMMUNE),
    
    React.createElement("div",{className:"mb-4"},
      React.createElement("button",{className:"px-4 py-2 rounded mb-2 text-sm sm:text-base", style:{backgroundColor:'#000000', color:'#FFFFFF', fontWeight:'bold'}, onClick:toggleHelp},
        showHelp ? "Masquer l'aide" : "Afficher le mode d'emploi"
      ),
      showHelp && React.createElement("div",{className:"bg-white border-4 border-black p-3 sm:p-4 rounded"},
        React.createElement("div",{className:"prose max-w-none", dangerouslySetInnerHTML:{__html: 
          helpContent
            .replace(/^# (.*$)/gm, '<h1 class="text-2xl font-bold mb-4">$1</h1>')
            .replace(/^## (.*$)/gm, '<h2 class="text-xl font-bold mt-6 mb-3">$1</h2>')
            .replace(/^### (.*$)/gm, '<h3 class="text-lg font-bold mt-4 mb-2">$1</h3>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code class="bg-gray-100 px-1 py-0.5 rounded">$1</code>')
            .replace(/^- (.*$)/gm, '<li>$1</li>')
            .replace(/^\d+\. (.*$)/gm, '<li>$1</li>')
            .replace(/<li>(.*)<\/li>/g, '<li class="ml-4">$1</li>')
            .replace(/\n\n/g, '</p><p>')
            .replace(/\n/g, '<br>')
            .replace(/^<p>(.*)<\/p>$/gm, '<p class="mb-3">$1</p>')
            .replace(/✅/g, '<span class="text-green-600">✅</span>')
            .replace(/🎯/g, '<span class="text-blue-600">🎯</span>')
            .replace(/💡/g, '<span class="text-yellow-600">💡</span>')
            .replace(/🗳️/g, '<span class="text-purple-600">🗳️</span>')
            .replace(/🏷️/g, '<span class="text-indigo-600">🏷️</span>')
            .replace(/💬/g, '<span class="text-teal-600">💬</span>')
            .replace(/✏️/g, '<span class="text-orange-600">✏️</span>')
            .replace(/📊/g, '<span class="text-red-600">📊</span>')
            .replace(/🔗/g, '<span class="text-blue-600">🔗</span>')
            .replace(/🎨/g, '<span class="text-pink-600">🎨</span>')
            .replace(/🔒/g, '<span class="text-gray-600">🔒</span>')
            .replace(/📱/g, '<span class="text-green-600">📱</span>')
            .replace(/🛠️/g, '<span class="text-gray-600">🛠️</span>')
            .replace(/📖/g, '<span class="text-blue-600">📖</span>')
        }})
      )
    ),
    
    React.createElement("div",{className:"mb-4 sm:mb-6"},
      React.createElement("a",{href:"https://github.com/JeanHuguesRobert/civic-ideas", target:"_blank", rel:"noreferrer", className:"underline font-bold text-sm sm:text-base"},"Dépôt Open Source GitHub")
    ),

    React.createElement("div",{className:"mb-4"},
      React.createElement("span",{className:"mr-2 font-bold text-sm sm:text-base"},"Vous êtes : "),
      React.createElement("select",{value:voterType,onChange:e=>setVoterType(e.target.value),className:"border-2 border-black p-2 rounded text-sm sm:text-base"},
        React.createElement("option",{value:"résident"},"Résident"),
        React.createElement("option",{value:"alentour"},"Alentour"),
        React.createElement("option",{value:"étudiant"},"Étudiant"),
        React.createElement("option",{value:"visiteur"},"Visiteur")
      )
    ),

    React.createElement("div",{className:"mb-4 flex flex-wrap gap-1 sm:gap-2"},
      allTags.map(t=>React.createElement("button",{key:t,className:"px-2 py-1 rounded text-xs sm:text-sm", style:{backgroundColor:selectedTags.includes(t)?'#000000':'#FFFFFF', color:selectedTags.includes(t)?'#FFFFFF':'#000000', border:'2px solid #000000'}, onClick:()=>setSelectedTags(selectedTags.includes(t)?selectedTags.filter(x=>x!==t):[...selectedTags,t])},"#"+t)),
      allTags.length>0 && React.createElement("button",{className:"px-2 py-1 rounded text-xs sm:text-sm", style:{backgroundColor:'#FFFFFF', color:'#000000', border:'2px solid #000000'}, onClick:()=>setSelectedTags([])},"Tous")
    ),

    React.createElement("canvas",{ref:chartRef,className:"mb-6 sm:mb-8"}),

    filteredIdeas.map(i=>React.createElement("div",{key:i.id,className:"bg-white border-4 border-black p-3 sm:p-4 mb-3 rounded"},
      React.createElement("div",{className:"mb-2 font-bold text-sm sm:text-base"},i.text),
      React.createElement("div",{className:"text-xs sm:text-sm text-black mb-2"},(i.tags||[]).map(t=>"#"+t).join(" ")),
      React.createElement("div",{className:"text-xs mb-2"},"Votes : "+i.votes),
      React.createElement("div",{className:"text-xs mb-2"},
        (i.byType && i.byType["résident"]>0) ? "Résident: "+i.byType["résident"]+" " : "",
        (i.byType && i.byType["alentour"]>0) ? "Alentour: "+i.byType["alentour"]+" " : "",
        (i.byType && i.byType["étudiant"]>0) ? "Étudiant: "+i.byType["étudiant"]+" " : "",
        (i.byType && i.byType["visiteur"]>0) ? "Visiteur: "+i.byType["visiteur"] : ""
      ),
      React.createElement("button",{className:"px-3 py-1 rounded text-xs sm:text-sm", style:{backgroundColor:votedIds.includes(i.id)?'#000000':'#0000FF', color:'#FFFFFF', fontWeight:'bold', opacity:votedIds.includes(i.id)?0.6:1, cursor:votedIds.includes(i.id)?'not-allowed':'pointer'},onClick:()=>vote(i.id)},"👍 Voter"),
      
      React.createElement("div",{className:"mt-4"},
          React.createElement("button",{className:"text-xs sm:text-sm underline mb-2", onClick:()=>toggleComments(i.id)},
            expandedIdeas[i.id] ? "Masquer les commentaires" : "Afficher les commentaires ("+(comments[i.id]?.length||0)+")"
          ),
          expandedIdeas[i.id] && React.createElement("div",{className:"mt-2"},
            React.createElement("div",{className:"mb-3"},
              editingComment ? React.createElement("div",{},
                React.createElement("div",{className:"font-bold mb-2"},"Modifier le commentaire"),
                React.createElement("input",{className:"w-full border-2 border-black p-2 mb-2 text-sm sm:text-base", placeholder:"Votre nom, pseudo ou email", value:commentAuthor, onChange:e=>setCommentAuthor(e.target.value)}),
              React.createElement("textarea",{className:"w-full border-2 border-black p-2 mb-2 text-sm sm:text-base", placeholder:"Votre commentaire (Markdown supporté)", value:commentText, onChange:e=>setCommentText(e.target.value), rows:3}),
              React.createElement("div",{className:"flex gap-2"},
                React.createElement("button",{className:"px-3 py-1 rounded text-xs sm:text-sm", style:{backgroundColor:'#0000FF', color:'#FFFFFF'}, onClick:()=>updateComment(editingComment)},"Modifier"),
                React.createElement("button",{className:"px-3 py-1 rounded text-xs sm:text-sm", style:{backgroundColor:'#666666', color:'#FFFFFF'}, onClick:cancelEdit},"Annuler")
              )
            ) : React.createElement("div",{},
              React.createElement("input",{className:"w-full border-2 border-black p-2 mb-2 text-sm sm:text-base", placeholder:"Votre nom, pseudo ou email", value:commentAuthor, onChange:e=>setCommentAuthor(e.target.value)}),
              React.createElement("textarea",{className:"w-full border-2 border-black p-2 mb-2 text-sm sm:text-base", placeholder:"Votre commentaire (Markdown supporté)", value:commentText, onChange:e=>setCommentText(e.target.value), rows:3}),
              React.createElement("button",{className:"px-3 py-1 rounded text-xs sm:text-sm", style:{backgroundColor:'#0000FF', color:'#FFFFFF'}, onClick:()=>addComment(i.id)},"Ajouter commentaire")
            )
            ),
          
          (comments[i.id]||[]).sort((a,b)=>new Date(b.created_at) - new Date(a.created_at)).map(c=>React.createElement("div",{key:c.id,className:"bg-gray-100 p-3 mb-2 rounded"},
            React.createElement("div",{className:"text-sm font-bold"},c.author),
            React.createElement("div",{className:"text-xs text-gray-600 mb-1"},new Date(c.created_at).toLocaleString('fr-FR') + (c.created_at !== c.updated_at ? " (modifié)" : "")),
            React.createElement("div",{className:"text-sm", dangerouslySetInnerHTML:{__html: c.content.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\*(.*?)\*/g, '<em>$1</em>').replace(/`(.*?)`/g, '<code>$1</code>')}}),
            
            canEditComment(c) && React.createElement("div",{className:"mt-2"},
              React.createElement("button",{className:"text-xs text-blue-600 mr-2", onClick:()=>startEditComment(c)},"Modifier"),
              React.createElement("button",{className:"text-xs text-red-600", onClick:()=>deleteComment(c)},"Supprimer")
            )
          ))
        )
      )
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
    ),

    React.createElement("div",{className:"mt-8 p-4 bg-white border-4 border-black rounded"},
      React.createElement("div",{className:"font-bold mb-2"},"Partager l'application"),
      React.createElement("div",{className:"flex flex-col sm:flex-row gap-2"},
        React.createElement("input",{className:"flex-1 border-2 border-black p-2",readOnly:true,value:appUrl}),
        React.createElement("button",{className:"px-4 py-2 rounded", style:{backgroundColor:'#0000FF', color:'#FFFFFF', fontWeight:'bold'}, onClick:shareApp},"Copier le lien")
      )
    )
  );
}

ReactDOM.createRoot(document.getElementById("app")).render(React.createElement(App));
