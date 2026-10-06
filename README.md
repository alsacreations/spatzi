# Spätzi - Outil d'aide au contraste des couleurs

Spätzi est un outil interactif conçu pour aider les designers et développeurs à créer des combinaisons de couleurs accessibles. Il mesure le contraste entre un texte et son fond selon les WCAG 2.2 (_Web Content Accessibility Guidelines_) ou APCA (_Accessible Perceptual Contrast Algorithm_), permet d'ajuster les couleurs dans l'espace colorimétrique OKLCH, propose des corrections automatiques et simule les principaux daltonismes.

## Fonctionnalités principales

- 🎯 **Rapport de contraste :** ratio WCAG ou valeur APCA Lc, verdict de conformité et lecture secondaire selon l'autre méthode.
- ⚖️ **Bascule WCAG 2.2 / APCA :** tous les affichages (verdict, critères, corrections, daltonismes, palette) suivent la méthode choisie.
- 🎨 **Ajustement OKLCH :** curseurs Luminosité, Chroma et Teinte pour la couleur du texte ou celle du fond, avec avertissement « sRGB la plus proche » lorsque la couleur sort du gamut sRGB.
- 👁️ **Aperçu en direct :** exemple de recette en plusieurs cas (30 px, 24 px gras, 24 px, 19 px gras, 16 px, icônes, 14 px), avec boutons et lien dans vos couleurs.
- ✅ **Conformité par cas :** chaque taille de texte et les icônes affichent leur seuil et un indicateur conforme / non conforme, en plus des critères détaillés.
- 🪄 **Corrections proposées :** la couleur la plus proche qui atteint le seuil, en modifiant le texte ou le fond. Seule la luminosité OKLCH varie, la teinte et la saturation sont conservées.
- 🕶️ **Simulation des daltonismes :** protanopie, deutéranopie, tritanopie et achromatopsie, avec le contraste qui en résulte.
- 🧩 **Test de palette :** matrice de toutes les combinaisons texte/fond d'une palette (jusqu'à 10 couleurs). Un clic sur une case la charge dans l'outil.
- ↔️ **Inverser / Réinitialiser :** échange le texte et le fond, ou revient aux couleurs de départ.
- 🔗 **Partage et historique :** lien de partage, copie du CSS, et historique des 8 dernières combinaisons testées.
- 💧 **Pipette :** prélèvement d'une couleur à l'écran (navigateurs compatibles avec l'API EyeDropper).
- 🌓 **Thème clair / sombre :** selon la préférence système ou au choix.

## Comment utiliser cet outil ?

1. **Saisissez vos couleurs :** couleur du texte et couleur de fond, via le sélecteur, la pipette ou en saisissant directement une valeur (formats acceptés : mots-clés CSS, HEX, RGB, HSL, OKLCH…).
2. **Ajustez en OKLCH :** choisissez « Texte » ou « Fond », puis déplacez les curseurs L, C et H.
3. **Choisissez la méthode :** WCAG 2.2 (norme en vigueur, exigée par le RGAA) ou APCA (à titre indicatif).
4. **Lisez la conformité par cas :** les seuils applicables dépendent de la taille et de la graisse du texte.
5. **Corrigez si besoin :** appliquez une des corrections proposées en un clic.
6. **Partagez :** copiez le lien ou le CSS du couple de couleurs.

## Pourquoi OKLCH ?

L'espace colorimétrique OKLCH offre plusieurs avantages :

- **Gamut étendu :** Représente une plus large gamme de couleurs que sRGB.
- **Perception uniforme :** Basé sur la manière dont l'œil humain perçoit les couleurs.
- **Manipulation intuitive :** Les paramètres de teinte, luminosité et saturation sont plus intuitifs.
- **Meilleure préservation de la teinte :** Lors des transitions ou des dégradés.
- **Contrôle précis du contraste :** Le composant de luminosité (L) correspond directement à la luminosité perçue.

Pour en savoir plus sur le support navigateur et les avantages d'OKLCH, consultez [Can I use OKLCH?](https://caniuse.com/mdn-css_types_color_oklch) et l'article [OKLCH in CSS: why we moved from RGB and HSL](https://evilmartians.com/chronicles/oklch-in-css-why-quit-rgb-hsl).

## Normes d'accessibilité supportées

### WCAG 2.2 (Web Content Accessibility Guidelines)

- **Critère 1.4.3 (AA) :** 4,5:1 pour le texte courant, 3:1 pour le grand texte (au moins 24 px, ou 18,66 px en gras).
- **Critère 1.4.6 (AAA) :** 7:1 pour le texte courant, 4,5:1 pour le grand texte.
- **Critère 1.4.11 (AA) :** 3:1 pour les composants d'interface et éléments graphiques (bordures de champs, icônes porteuses de sens, états de focus).

### APCA (Accessible Perceptual Contrast Algorithm)

Méthode à l'étude pour les futures WCAG 3, donnée à titre indicatif.

- **Texte courant :** Lc 75 minimum, Lc 90 idéal.
- **Texte moyen :** Lc 60 (à partir de 24 px, ou 16 px en gras).
- **Grand texte :** Lc 45 (à partir de 36 px, ou 24 px en gras).

La valeur Lc est signée : elle est négative lorsque le texte est plus clair que le fond. Les seuils s'appliquent à sa valeur absolue.

## Détails d'implémentation

Spätzi est un site statique en HTML, CSS et JavaScript, sans dépendance ni étape de build.

```text
index.html
app.css                    # point d'entrée CSS (layers)
assets/css/
  reset.css
  theme-tokens.css         # polices et design tokens (light-dark())
  styles.css               # styles de base et mise en page
  components.css           # composants
assets/js/
  spatzi.js                # logique de l'outil
  theme-switcher.js        # thème clair / sombre
assets/fonts/
  lexend.woff2
```

### Calculs

- **Lecture des couleurs :** toute couleur CSS valide est convertie en sRGB 8 bits via un `<canvas>`. Les couleurs semi-transparentes sont composées sur le fond avant calcul.
- **WCAG :** ratio de luminance relative. Les ratios affichés sont tronqués et non arrondis : 4,499:1 n'atteint pas 4,5:1.
- **APCA :** implémentation de l'algorithme APCA 0.0.98G (`APCAcontrast`) intégrée au script. La valeur affichée est également tronquée.
- **Corrections :** recherche par pas de 0,005 sur la luminosité OKLCH, dans les deux sens, en conservant la chroma et la teinte. La chroma est réduite si nécessaire pour rester dans le gamut sRGB.
- **Daltonismes :** matrices de Machado et al. (2009) à sévérité maximale ; luminance seule pour l'achromatopsie.

### Partage et stockage

- **Lien de partage :** les couleurs sont stockées dans le fragment d'URL, par exemple `#fg=146af5&bg=ffffff`, avec `&m=apca` lorsque la méthode APCA est active.
- **Stockage local (`localStorage`) :** thème (`theme`), méthode de calcul (`spatzi-method`) et historique (`spatzi-history`).

### Lancer le projet en local

Les scripts sont chargés en modules ES : la page doit être servie par un serveur HTTP, par exemple :

```bash
python3 -m http.server
```

## Contribution

Ce projet est développé avec ❤️ par [Alsacréations](https://www.alsacreations.fr/).
