# Notes de développement - Stockage Audio

## Ce qui a été fait

### 1. Schema Convex
- Ajout du champ `audioUrl` dans `convex/schema.ts` (table interviews)

### 2. API d'upload
- Créé `app/api/upload-audio/route.ts` - prêt pour UploadThing

### 3. Frontend
- `app/project/[projectId]/interview/page.tsx` : 
  - Ajout de `audioFile` dans `pendingInterview`
  - Upload de l'audio lors du save
- `components/myComponents/InterviewContent.tsx` : 
  - Ajout du lecteur audio dans le header

### 4. Route API
- `app/api/upload-audio/route.ts` configurée pour utiliser UploadThing

## Ce qu'il reste à faire

### 1. Configurer UploadThing
Aller sur https://uploadthing.com :
- Créer un compte
- Aller dans API Keys
- Copier le token (sk_live_xxx)
- Ajouter dans `.env.local` :
  ```
  UPLOADTHING_TOKEN=sk_live_xxx
  ```

### 2. Tester
- Relancer le dev server
- Uploader une interview
- Vérifier que l'audio est stocké et le lecteur fonctionne

## Notes
- R2 a été abandonné à cause de problèmes de signature
- UploadThing est plus simple et gratuit (1GB)
