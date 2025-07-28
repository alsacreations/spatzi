# Spätzi - Outil d'aide au contraste des couleurs

Spätzi est un outil interactif conçu pour aider les designers et développeurs à créer des palettes de couleurs accessibles. Il permet de vérifier les ratios de contraste selon les normes <span lang="en">WCAG (Web Content Accessibility Guidelines)</span> et <APCA lang="en">APCA (Accessible Perceptual Contrast Algorithm)</span>, et d'explorer des variations de couleurs en utilisant l'espace colorimétrique OKLCH.

## Fonctionnalités principales

- ℹ️ **Informations d'accessibilité :** obtenez les taux de contraste entre la couleur de fond et la couleur de texte selon les normes WCAG 2.1 et APCA.
- 🎨 **Aperçu en direct :** visualisation directe du rendu texte/fond selon les combinaisons choisies.
- 👁️ **Exemples d'application en temps réel :** une démonstration (recette de cuisine) montre comment vos couleurs s'appliquent sur du texte de différentes tailles et des éléments graphiques, avec des indicateurs visuels de conformité (✅/❌).
- 🎯 **Couleur proche accessible :** trouve automatiquement la couleur la plus proche qui respecte les seuils d'accessibilité WCAG (4.5:1) ou APCA (60) selon le mode sélectionné
- ⚖️ **Guides d’accessibilité intégrés** : indications sur les seuils requis pour AA, AAA ou APCA lisibilité renforcée.
- ↔️ **Échange de couleurs :** bouton de permutation pour échanger instantanément la couleur de fond et la couleur de texte.
- 🧽 **Réinitialiser :** remet les couleurs à leurs valeurs par défaut
- ⚠️ Un avertissement "(sRGB la plus proche)" apparaît si une couleur OKLCH choisie ou générée est en dehors du champ sRGB. La valeur HEX affichée correspond alors à la couleur sRGB la plus proche.

## Comment utiliser cet outil ?

- **Sélectionnez vos couleurs de base :** Sélectionnez une couleur de fond et une couleur de texte à l'aide des sélecteurs de couleur ou en saisissant directement les valeurs (formats acceptés : mots-clés CSS, OKLCH, HEX, RGB, HSL)
- **Observez la boîte de couleur :** Vérifiez les informations de couleur et les ratios de contraste.
- **Explorez les variations :** Utilisez les curseurs L, C, H pour modifier la couleur de fond.
- **Utilisez les boutons d'action :**
  - **Réinitialiser** pour revenir aux couleurs par défaut
  - **Couleur proche accessible** pour optimiser automatiquement l'accessibilité
- **Basculez entre WCAG et APCA :** Utilisez le commutateur pour évaluer vos couleurs selon différentes normes d'accessibilité.

## Pourquoi OKLCH ?

L'espace colorimétrique OKLCH offre plusieurs avantages :

- **Gamut étendu :** Représente une plus large gamme de couleurs que sRGB.
- **Perception uniforme :** Basé sur la manière dont l'œil humain perçoit les couleurs.
- **Manipulation intuitive :** Les paramètres de teinte, luminosité et saturation sont plus intuitifs.
- **Meilleure préservation de la teinte :** Lors des transitions ou des dégradés.
- **Contrôle précis du contraste :** Le composant de luminosité (L) correspond directement à la luminosité perçue.

Pour en savoir plus sur le support navigateur et les avantages d'OKLCH, consultez [Can I use OKLCH?](https://caniuse.com/mdn-css_types_color_oklch) et l'article [OKLCH in CSS: why we moved from RGB and HSL](https://evilmartians.com/chronicles/oklch-in-css-why-quit-rgb-hsl).

## Normes d'accessibilité supportées

### WCAG 2.1 (Web Content Accessibility Guidelines)

- **Seuil AA normal :** 4.5:1 pour le texte standard
- **Seuil AA large :** 3:1 pour le texte de 18pt gras ou 24pt+ normal
- **Éléments graphiques :** 3:1 pour les icônes et éléments d'interface

### APCA (Accessible Perceptual Contrast Algorithm)

- **Texte standard :** 75+ Lc pour les petites tailles
- **Texte moyen :** 60+ Lc pour les tailles moyennes
- **Texte large :** 45+ Lc pour les grandes tailles et éléments graphiques

L'algorithme d'optimisation automatique trouve la couleur la plus proche qui respecte ces seuils selon la norme sélectionnée.

## Contribution

Ce projet est développé avec ❤️ par [Alsacréations](https://www.alsacreations.fr/).
