export var PHASE_LABELS = {
  aufbau: 'Aufbau',
  freitag: 'Freitag',
  samstag: 'Samstag',
  sonntag: 'Sonntag',
  abbau: 'Abbau'
};

export function dayLabel(value) {
  return PHASE_LABELS[value] || value;
}

export function phaseLabel(value) {
  return PHASE_LABELS[value] || value;
}
