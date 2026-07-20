const COURSE_ID_MAP = {
  html: 'html',
  css: 'css',
  js: 'js',
  javascript: 'js',
  react: 'react',
};

export const normalizeCourseId = (courseId) => {
  if (typeof courseId !== 'string') return courseId;

  const normalized = courseId.trim().toLowerCase();
  return COURSE_ID_MAP[normalized] || normalized;
};
