export function stepConversions(values: number[]) {
  return values.map((value, index) => (index === 0 ? 1 : value / values[index - 1]));
}

export function weakestStep(values: number[]) {
  const conversions = stepConversions(values);
  let weakest = 1;
  for (let index = 2; index < conversions.length; index++) {
    if (conversions[index] < conversions[weakest]) weakest = index;
  }
  return weakest;
}

// Square-root scale keeps late funnel stages visible without hiding the drop-off.
export function barWidth(value: number, max: number) {
  return `${Math.max(Math.sqrt(value / max) * 100, 4)}%`;
}
