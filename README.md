# Civic Ideas – Boîte à idées citoyenne

**Prototype interactif pour les communes**, permettant aux habitants de proposer, commenter, voter et prioriser des idées locales. Conçu pour être facilement adaptable à toute commune.

---

## Fonctionnalités

* Ajout d'idées par les utilisateurs avec étiquettes (#tags)
* Vote sur les idées avec distinction par type de votant : Résident, Alentour, Étudiant, Visiteur
* **Système complet de commentaires** avec support Markdown
* Classement automatique des idées par nombre de votes
* Visualisation graphique des priorités par catégorie
* Filtrage des idées par tags
* Champ email **optionnel** avec consentement RGPD
* **Authentification locale** pour l'édition/suppression des commentaires
* Style Bauhaus / palette Mondrian : cartes blanches, bordures noires, boutons colorés rouge/bleu/jaune
* Seed initial des idées via `ideas-seed.json`

---

## Technologies

* **Frontend :** React + Tailwind CSS
* **Backend :** Supabase (stockage des idées et votes)
* **Graphiques :** Chart.js
* **Déploiement :** Netlify
* **JSON seed** : fichier séparé pour faciliter la personnalisation par commune

---

## Installation et Déploiement

### 1. Préparer le dépôt

1. Cloner le dépôt :

```bash
git clone https://github.com/jeanhuguesrobert/civic-ideas.git
cd civic-ideas
```

2. Placer les fichiers suivants à la racine :

* `index.html`
* `app.js`
* `ideas-seed.json`

3. Commit et push initial :

```bash
git add .
git commit -m "Initial commit - prototype civic-ideas"
git push origin main
```

---

### 2. Configurer Supabase

1. Créer un projet Supabase ou utiliser un existant.
2. Noter `SUPABASE_URL` et `SUPABASE_KEY` (clé **anon public**).
3. Créer les tables SQL si nécessaire :

```sql
create table if not exists ideas (
  id bigserial primary key,
  text text not null,
  tags text[],
  email text
);

create table if not exists votes (
  id bigserial primary key,
  idea_id bigint references ideas(id),
  voter_type text
);

create table if not exists comments (
  id bigserial primary key,
  idea_id bigint references ideas(id) on delete cascade,
  author text not null,
  content text not null,
  local_id text unique,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_comments_idea_id on comments(idea_id);
create index if not exists idx_comments_created_at on comments(created_at desc);
```

4. Remplacer les placeholders dans `app.js` :

```javascript
const SUPABASE_URL = "VOTRE_URL_SUPABASE";
const SUPABASE_KEY = "VOTRE_CLE_SUPABASE";
const COMMUNE = "Corte"; // ou autre commune
```

---

### 3. Déployer sur Netlify

1. Connecter Netlify à GitHub → sélectionner `civic-ideas`.
2. Branch : `main`.
3. Build command : **laisser vide**
4. Publish directory : `/` (racine du dépôt)
5. Déployer → HTTPS automatique activé

Le fichier JSON `ideas-seed.json` sera accessible via :

```
https://votre-site.netlify.app/ideas-seed.json
```

---

### 4. Utilisation

1. Ouvrir le site Netlify.
2. Parcourir les idées, filtrer par tags, puis proposer une idée si besoin.
3. Choisir le type de votant si nécessaire.
4. **Commenter les idées** : Cliquer sur "Afficher les commentaires" sous une idée
5. **Formatage Markdown** : Utiliser `**gras**`, `*italique*`, ``code`` dans les commentaires
6. **Édition/Suppression** : Seul l'auteur original peut modifier/supprimer ses commentaires
7. Visualiser les priorités par catégorie dans le graphique.

### 5. Système de commentaires

* **Ajout** : Nom/email + commentaire avec support Markdown basique
* **Authentification** : Via localStorage du navigateur
* **Édition** : Boutons "Modifier" réservés à l'auteur
* **Suppression** : Confirmation avant suppression
* **Tri** : Commentaires affichés du plus récent au plus ancien
* **Timestamps** : Dates de création et modification visibles

---

### 5. Personnalisation par commune

* Modifier `COMMUNE` dans `app.js` pour changer le nom de la ville.
* Modifier `ideas-seed.json` pour changer le jeu d’idées initiales.

---

### 6. RGPD / Email

* Champ email **optionnel** pour l’utilisateur.
* Consentement obligatoire si email fourni.
* Responsable RGPD : `jean_hugues_robert@yahoo.com`

---

### 7. Style et design

* Style **Bauhaus / Mondrian** : rouge, bleu, jaune, noir et blanc
* Bordures noires marquées, boutons rectangulaires colorés
* Graphiques colorés par catégorie (#tags)

---

### 8. Maintenance

* Mettre à jour les idées : modifier `ideas-seed.json` et redeployer
* Modération : intervenir directement dans Supabase SQL
* Changement de commune : modifier variable `COMMUNE` ou rendre dynamique via query string

### 9. Contact
  email:jean_hugues_robert@yahoo.com
