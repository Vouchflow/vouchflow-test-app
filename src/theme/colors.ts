export const colors = {
  bg: {
    base:    '#0A0B0E',
    surface: '#111318',
    raised:  '#191C23',
    border:  '#252830',
  },
  brand: {
    primary:  '#00E5BE',
    dim:      '#00E5BE22',
    glow:     '#00E5BE40',
  },
  status: {
    verified:   '#00E5BE',
    pending:    '#F5A623',
    failed:     '#FF4757',
    enrolled:   '#00E5BE',
    unenrolled: '#6B7280',
  },
  log: {
    request:  '#7C9EFF',
    response: '#00E5BE',
    error:    '#FF4757',
    warn:     '#F5A623',
    info:     '#6B7280',
    debug:    '#3D4350',
  },
  text: {
    primary:   '#F0F2F5',
    secondary: '#8B91A0',
    tertiary:  '#4A5060',
    mono:      '#A8B4C8',
  },
} as const;
