const moment = require('moment');

const jourSemaineFR = (date) => {
  return moment(date).locale('fr').format('dddd').toUpperCase(); // LUNDI, MARDI ...
};

const formatDate = (date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const mapJourSemaineFR = {
      dimanche: 0,
      lundi: 1,
      mardi: 2,
      mercredi: 3,
      jeudi: 4,
      vendredi: 5,
      samedi: 6
};

const jourSemaineSQL = (dateISO) => {
  const map = {
    lundi: 'lundi',
    mardi: 'mardi',
    mercredi: 'mercredi',
    jeudi: 'jeudi',
    vendredi: 'vendredi',
    samedi: 'samedi',
    dimanche: 'dimanche',
  };

  const jour = jourSemaineFR(dateISO)?.toLowerCase();

  if (!map[jour]) {
    throw new Error(`Jour de semaine invalide : ${jour}`);
  }

  return map[jour];
};


module.exports = {
  jourSemaineFR,
  formatDate,
  mapJourSemaineFR,
  jourSemaineSQL
};