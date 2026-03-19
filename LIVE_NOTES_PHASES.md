# Live Notes - Phases de Developpement

## Phase 1: Core (COMPLETEE) ✅
**But:** Notes basiques, timestamp, sauvegarder en base

| Tache | Status |
|-------|--------|
| Schema Convex - Table `liveNotes` | ✅ |
| CRUD basique (create, list, delete) | ✅ |
| Composant UI `LiveNotesPanel.tsx` | ✅ |
| Timestamp auto sur l'audio | ✅ |
| Click sur note → audio seek | ✅ |

**Resultat:** Tu peux taper des notes pendant l'interview, elles sont sauvegardees et clickables.

---

## Phase 2: Collaboration (A faire)
**But:** Plusieurs personnes peuvent ecrire en meme temps

| Tache | Description |
|-------|-------------|
| Presence | Voir qui tape quoi en temps reel |
| Couleurs par user | Chaque note montre qui l'a ecrite |
| Real-time sync | Convex realtime — pas de refresh |

**Resultat:** Toi + 1 collegue pouvez ecrire des notes pendant le meme entretien.

**Note:** Reporter pour apres v1 — les premiers utilisateurs seront solo.

---

## Phase 3: Integration (COMPLETEE) ✅
**But:** Connecter Live Notes au reste du workflow

| Tache | Status |
|-------|--------|
| Selection multiple de notes | ✅ |
| Send to Canvas button | ✅ |
| Conversion notes → insights | ✅ |
| Tags traduits en types insights | ✅ |
| Lien note → insight (insightId) | ✅ |
| Badge "Sent" sur notes converties | ✅ |

### Mapping tags → insights

| Tag | Signification | Type Insight |
|-----|---------------|--------------|
| **Observation** | Tu remarques quelque chose | `insight` |
| **Question** | Le participant pose une question | `follow-up` |
| **Idea** | Une idee qui emerge | `insight` |
| **Important** | Quelque chose de critique | `pain-point` |
| **Action** | Une action a faire | `follow-up` |

### Suppression Cascade

Quand tu supprimes une note:
1. Si la note a ete convertie en insight → l'insight est aussi supprime
2. Si tu supprimes l'insight manuellement sur le canvas → la note reste (mais n'a plus de lien)

### Workflow

```
1. Tape une note → elle se timestamp automatiquement
2. Selectionne plusieurs notes
3. Clique "Send to Canvas"
4. Toast: "X note(s) converted — go to Canvas" avec bouton
5. Les notes ont un badge "Sent" vert
6. Va sur le Canvas pour les organiser
```

---

## Bonus: Space Bar Audio Control ✅

La touche espace fait maintenant pause/play sur l'audio.

**Condition:** Ne fonctionne que si tu n'es pas dans un champ de texte/input.

---

## Phase 4: Polish (Optionnel)
- Templates de notes (Observation, Question, Idea)
- Export notes vers PDF/CSV
- Shortcuts clavier (Space = pause/play audio ✅)
- Auto-save pendant la frappe

---

## Bonus: Space Bar Audio Control ✅

La touche espace fait maintenant pause/play sur l'audio.

**Condition:** Ne fonctionne que si tu n'es pas dans un champ de texte/input.

---

## Notes Techniques

### Schema Convex
Table: `liveNotes`
- `interviewId` — lie a l'interview
- `userId` — ID utilisateur Clerk
- `userName` — nom pour affichage
- `content` — texte de la note
- `timestamp` — position dans l'audio (secondes)
- `tag` — optionnel (observation, question, idea, important, action)

### Fichiers modifies/crees
- `convex/schema.ts` — ajout table liveNotes
- `convex/liveNotes.ts` — CRUD functions
- `components/myComponents/LiveNotesPanel.tsx` — composant UI avec selection et send to canvas
- `components/myComponents/InterviewContent.tsx` — integration + space bar shortcut

### Dependances utilisees
- `react-resizable-panels` — pour le split view
- `useAuth` from `@clerk/nextjs` — pour l'authentification
- `useRouter` from `next/navigation` — pour la navigation vers le canvas
- Convex realtime subscriptions

### Workflow complet
```
1. Taper une note pendant l'entretien
2. Elle se timestamp automatiquement
3. Selectionner plusieurs notes
4. Cliquer "Send to Canvas"
5. Redirection vers l'affinity map avec les insights
```
