function getSiteColor(siteId) {
  // Palette de couleurs pour les sites
  const colors = [
    '#4CAF50', // Vert
    '#2196F3', // Bleu
    '#FF9800', // Orange
    '#F44336', // Rouge
    '#9C27B0', // Violet
    '#00BCD4', // Cyan
    '#FFC107', // Jaune
    '#795548', // Marron
    '#607D8B', // Gris bleu
    '#E91E63'  // Rose
  ];
  
  // Utiliser l'ID du site pour choisir une couleur de façon cohérente
  const index = (siteId - 1) % colors.length;
  return colors[index];
}

module.exports = { getSiteColor };