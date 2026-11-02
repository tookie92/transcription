# Skripta Music Prompts for MusicGen-small

## 🧠 Psychologie Marketing Appliquée

| Principe | Application à la musique |
|----------|--------------------------|
| **Peak-End Rule** | Un pic mémorable + fin satisfaisante = meilleure rétention |
| **Mere Exposure Effect** | Boucles répétitives créent familiarité et confort |
| **Authority Bias** | Musique pro = produit crédible |
| **Liking/Similarity** | Kora + djembe = connexion culturelle chaleureuse |
| **Loss Aversion** | La musique crée une tension subtile qui pousse à agir |
| **BJ Fogg (B=MAP)** | Musique = Motivation qui prépare au CTA |

---

## 📝 Format MusicGen-small

MusicGen prend une **description textuelle simple** :

```
[Genre]. [Mood]. [Instruments]. [Vibe].
```

Pas de timings, pas de "at 4 seconds", pas de négations.

---

## 🎵 Prompts par Plateforme (Copy-paste ready)

---

### 💼 LinkedIn (37 sec)

**Prompt MusicGen :**
```
Afro-futuristic electronic. Inspiring and professional. Kora melody over warm synth pads with djembe percussion. Tech startup cinematic. Modern African fusion.
```

**Psychologie :** Authority bias + Peak-End Rule (montée en tension progressive)

---

### 🎬 YouTube (52 sec)

**Prompt MusicGen :**
```
Cinematic African fusion soundtrack. Emotional and uplifting. Kora harp with talking drums and kalimba. Builds from gentle to powerful. Storytelling journey.
```

**Psychologie :** Peak-End Rule (pic à 60%) + Mere Exposure (boucle kalimba)

---

### 🎵 TikTok (21 sec)

**Prompt MusicGen :**
```
High energy Afro-tech loop. Joyful and catchy. Djembe drums with groovy electronic bass. Kalimba riff repeating. Party vibe.
```

**Psychologie :** Mere Exposure Effect (riff kalimba = earworm) + Liking (énergie)

---

### 📘 Facebook (35 sec)

**Prompt MusicGen :**
```
Warm Afro-acoustic fusion. Relaxed and friendly. Gentle kora and balafon with soft percussion. Coffee shop meets African sunset. Feel-good.
```

**Psychologie :** Liking/Similarity (chaleur) + Availability Heuristic (positif = produit positif)

---

### ⚡ Teaser (8 sec)

**Prompt MusicGen :**
```
Powerful Afro-cinematic hit. Bold drums with kora glissando and bass drop. Short intense trailer music. Modern African epic.
```

**Psychologie :** Scarcity (court = urgent) + Peak-End (fin abrupte)

---

### 🎬 YouTube Extended (90 sec, optional)

**Prompt MusicGen (prompt générique, génère en segments de 30s) :**
```
African cinematic ambient. Ethereal kora and kalimba with talking drums. Progressive journey. Studio Ghibli meets Afrobeat. Emotional storytelling.
```

**Psychologie :** Peak-End + Zeigarnik Effect (tension narrative qui retient)

---

## 🎛️ Paramètres MusicGen

```
Model: facebook/musicgen-small
Temperature: 0.8
Top-k: 250
Top-p: 0.9
Guidance scale: 3.0
```

**Note :** Pour YouTube (52-90s), génère en segments de 30s et assemble.

---

## 📋 Tableau Récap (copier-coller)

| Platform | Prompt | Durée |
|----------|--------|-------|
| **LinkedIn** | `Afro-futuristic electronic. Inspiring and professional. Kora melody over warm synth pads with djembe percussion. Tech startup cinematic. Modern African fusion.` | 37s |
| **YouTube** | `Cinematic African fusion soundtrack. Emotional and uplifting. Kora harp with talking drums and kalimba. Builds from gentle to powerful. Storytelling journey.` | 52s |
| **TikTok** | `High energy Afro-tech loop. Joyful and catchy. Djembe drums with groovy electronic bass. Kalimba riff repeating. Party vibe.` | 21s |
| **Facebook** | `Warm Afro-acoustic fusion. Relaxed and friendly. Gentle kora and balafon with soft percussion. Coffee shop meets African sunset. Feel-good.` | 35s |
| **Teaser** | `Powerful Afro-cinematic hit. Bold drums with kora glissando and bass drop. Short intense trailer music. Modern African epic.` | 8s |
| **YouTube Ext** | `African cinematic ambient. Ethereal kora and kalimba with talking drums. Progressive journey. Studio Ghibli meets Afrobeat.` | 90s |

---

## 💡 Tips MusicGen-small

1. **Genre en premier** (Afro-futuristic, Cinematic African...)
2. **Émotions simples** (inspiring, joyful, warm, powerful)
3. **2-3 instruments max** (trop confuse le modèle)
4. **Pas de négations** ("no vocals" donne de mauvais résultats)
5. **Génère 2-3 variations** et garde la meilleure

---

*Generated for Skripta SaaS Marketing*
*Model: facebook/musicgen-small*
*Psychology framework: Peak-End Rule, Mere Exposure, Authority Bias*
