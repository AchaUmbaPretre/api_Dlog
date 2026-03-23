// Fonction utilitaire pour parser les coordonnées
function parseCoordinate(value, coordName = 'coordinate') {
  if (value === null || value === undefined) {
    console.warn(`${coordName} is null or undefined`);
    return null;
  }
  
  let parsed;
  if (typeof value === 'string') {
    parsed = parseFloat(value.trim());
  } else if (typeof value === 'number') {
    parsed = value;
  } else if (typeof value === 'object' && value !== null) {
    // Pour les cas où le driver MySQL retourne un objet Decimal
    parsed = parseFloat(value.toString());
  } else {
    parsed = parseFloat(value);
  }
  
  if (isNaN(parsed)) {
    console.error(`${coordName} is NaN after parsing:`, value);
    return null;
  }
  
  return parsed;
}

module.exports = { parseCoordinate };
