export function dayLabel(value) {
  return ({
    aufbau: 'Aufbau',
    freitag: 'Freitag',
    samstag: 'Samstag',
    sonntag: 'Sonntag',
    abbau: 'Abbau'
  })[value] || value;
}

export function areaLabel(value) {
  return ({
    einlass: 'Einlass',
    bar: 'Bar / Schirmbar',
    technik: 'Technik',
    camping: 'Camping',
    food: 'Food',
    familientag: 'Familientag',
    sonstiges: 'Sonstiges'
  })[value] || value;
}
