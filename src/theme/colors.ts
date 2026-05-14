export const colors = {
  background: '#0E0F12',
  surface: '#1A1C22',
  surfaceMuted: '#222530',
  border: '#2C2F3A',
  text: '#F2F3F5',
  textMuted: '#9AA0AE',
  primary: '#7CA8FF',
  green: '#3FB97A',
  yellow: '#F1B547',
  red: '#E5604E',
  pending: '#5B6173',
};

export const statusColor = {
  green: colors.green,
  yellow: colors.yellow,
  red: colors.red,
  pending: colors.pending,
  unknown: colors.border,
} as const;
