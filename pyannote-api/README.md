# PyAnnote Diarization API

API Python gratuite pour la diarization des speakers avec PyAnnote.

## Déploiement sur Render.com

### Prérequis

1. Créer un compte [Render.com](https://render.com)
2. Générer un token HF sur [HuggingFace](https://huggingface.co/settings/tokens)

### Étapes

1. **Connecter le repo GitHub** à Render

2. **Créer un nouveau Web Service**:
   - Owner: Votre compte
   - Name: `pyannote-diarization`
   - Region: Frankfurt (ou closest)
   - Environment: Python
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`

3. **Variables d'environnement**:
   - `HF_TOKEN`: Votre token HuggingFace (requis pour télécharger les modèles)

4. **Resources**: Choisir "Free" ( starter)

5. **Déployer**!

### URL de l'API

Une fois déployé, vous aurez une URL comme:
`https://pyannote-diarization-xxxx.onrender.com`

## Configuration locale

```bash
cd pyannote-api
pip install -r requirements.txt
export HF_TOKEN=your_hf_token
uvicorn main:app --reload
```

## Intégration Next.js

Ajouter dans `.env.local`:
```
PYANNOTE_API_URL=https://pyannote-diarization-xxxx.onrender.com
```

## Utilisation

```bash
curl -X POST https://your-api.onrender.com/diarize \
  -F "audio=@interview.mp3" \
  -F 'segments=[{"start":0,"end":5,"text":"Hello"}]'
```

## Limites

- **Gratuit**: 750h/mois sur Render
- **Modèle**: pyannote/speaker-diarization-community-1 (gratuit)
