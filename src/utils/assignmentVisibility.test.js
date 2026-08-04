import test from 'node:test';
import assert from 'node:assert/strict';
import { buildStudentAssignmentRecords } from './assignmentVisibility.js';

test('buildStudentAssignmentRecords creates one pending record per assignment and student pair', () => {
  const records = buildStudentAssignmentRecords(['assignment-1', 'assignment-2'], ['student-1', 'student-2']);

  assert.equal(records.length, 4);
  assert.deepEqual(records[0], {
    assignmentId: 'assignment-1',
    studentId: 'student-1',
    status: 'pending',
  });
  assert.deepEqual(records[3], {
    assignmentId: 'assignment-2',
    studentId: 'student-2',
    status: 'pending',
  });
});
