import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeCourseId } from './courseId.js';

test('normalizes legacy javascript course ids to js', () => {
  assert.equal(normalizeCourseId('javascript'), 'js');
  assert.equal(normalizeCourseId('JS'), 'js');
});

test('preserves supported course ids', () => {
  assert.equal(normalizeCourseId('css'), 'css');
  assert.equal(normalizeCourseId('html'), 'html');
  assert.equal(normalizeCourseId('react'), 'react');
});
