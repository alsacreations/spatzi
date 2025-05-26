# Spätzi - Outil d'aide au contraste des couleurs

Spätzi est un outil interactif conçu pour aider les designers et développeurs à créer des palettes de couleurs accessibles. Il permet de vérifier les ratios de contraste selon les normes WCAG (Web Content Accessibility Guidelines) et APCA (Accessible Perceptual Contrast Algorithm), et d'explorer des variations de couleurs en utilisant l'espace colorimétrique OKLCH.

## Fonctionnalités principales

- **Choix des couleurs de base :** Sélectionnez une couleur de fond et une couleur de texte à l'aide des sélecteurs de couleur ou en saisissant directement les valeurs (formats acceptés : mots-clés CSS, OKLCH, HEX, RGB, HSL).
- **Visualisation des contrastes :**
  - La boîte "Base Color" affiche la couleur de fond choisie, sa représentation en OKLCH et en HEX sRGB, ainsi que les ratios de contraste WCAG et APCA par rapport à la couleur de texte sélectionnée.
- **Exploration des variations avec OKLCH :**
  - Ajustez les curseurs "Lightness" (Luminosité - L), "Chroma" (C) et "Hue" (Teinte - H) pour modifier la couleur de fond et générer une nouvelle variante.
  - La boîte "Variant Color" affiche la couleur générée par les curseurs LCH, ses valeurs OKLCH et HEX sRGB, et ses ratios de contraste par rapport à la couleur de texte.
- **Gestion du gamut :**
  - Un avertissement "(closest sRGB color)" apparaît si une couleur OKLCH choisie ou générée est en dehors du gamut sRGB. La valeur HEX affichée est la couleur sRGB la plus proche.
- **Informations d'accessibilité :** Les valeurs WCAG et APCA vous aident à vous assurer que vos combinaisons de couleurs sont accessibles.

## Comment utiliser cet outil ?

1. **Sélectionnez vos couleurs de base :** Utilisez les sélecteurs "Background Color" et "Text Color" ou les champs de texte associés.
2. **Observez la boîte "Base Color" :** Vérifiez les informations de couleur et les ratios de contraste.
3. **Explorez les variations :** Utilisez les curseurs L, C, H pour modifier la couleur de fond.
4. **Vérifiez la boîte "Variant Color" :** Analysez la nouvelle couleur et ses contrastes.
5. **Prenez en compte le gamut :** Soyez attentif aux avertissements si une couleur est hors du gamut sRGB.
6. **Visez l'accessibilité :** Utilisez les indicateurs WCAG et APCA pour garantir des contrastes suffisants.

## Pourquoi OKLCH ?

L'espace colorimétrique OKLCH offre plusieurs avantages :

- **Gamut étendu :** Représente une plus large gamme de couleurs que sRGB.
- **Perception uniforme :** Basé sur la manière dont l'œil humain perçoit les couleurs.
- **Manipulation intuitive :** Les paramètres de teinte, luminosité et saturation sont plus intuitifs.
- **Meilleure préservation de la teinte :** Lors des transitions ou des dégradés.
- **Contrôle précis du contraste :** Le composant de luminosité (L) correspond directement à la luminosité perçue.

Pour en savoir plus sur le support navigateur et les avantages d'OKLCH, consultez [Can I use OKLCH?](https://caniuse.com/mdn-css_types_color_oklch) et l'article [OKLCH in CSS: why we moved from RGB and HSL](https://evilmartians.com/chronicles/oklch-in-css-why-quit-rgb-hsl).

## Contribution

Ce projet est développé avec ❤️ par [Alsacréations](https://www.alsacreations.fr/).
