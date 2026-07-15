export const buildStudentAssignmentRecords = (assignmentIds, studentIds) =>
  studentIds.flatMap((studentId) =>
    assignmentIds.map((assignmentId) => ({
      assignmentId,
      studentId,
      status: 'pending',
    }))
  );
