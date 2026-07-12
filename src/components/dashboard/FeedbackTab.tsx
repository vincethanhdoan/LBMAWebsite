import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { MessageSquare, Calendar, User, Award } from 'lucide-react';
import {
  getFamilyByOwner,
  getStudentsByFamily,
  getStudentFeedbackByFamily,
  getFeedbackTestsByFamily,
  type FeedbackWithRelations,
} from '../../lib/supabase/queries';
import { formatDate, formatTestDate, getInitials } from '../../lib/format';
import type { User as AppUser, Student, FeedbackTest } from '../../lib/types';

type FeedbackTabProps = {
  user: NonNullable<AppUser>;
};

export function FeedbackTab({ user }: FeedbackTabProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [tests, setTests] = useState<FeedbackTest[]>([]);
  const [feedback, setFeedback] = useState<FeedbackWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // per-student selected test ID
  const [selectedTestByStudent, setSelectedTestByStudent] = useState<Map<string, string>>(new Map());

  // Auto-select the most recent test for each student once data loads
  useEffect(() => {
    if (students.length === 0 || tests.length === 0) return;
    setSelectedTestByStudent((prev) => {
      if (prev.size > 0) return prev;
      const initial = new Map<string, string>();
      for (const student of students) {
        const studentTestIds = new Set(
          feedback.filter((f) => f.student_id === student.student_id).map((f) => f.test_id)
        );
        const sorted = tests
          .filter((t) => studentTestIds.has(t.test_id))
          .sort((a, b) => b.test_date.localeCompare(a.test_date));
        if (sorted.length > 0) initial.set(student.student_id, sorted[0].test_id);
      }
      return initial;
    });
  }, [students, tests, feedback]);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const family = await getFamilyByOwner(user.id);
        if (!family) {
          setLoading(false);
          return;
        }
        const [studentsData, testsData, feedbackData] = await Promise.all([
          getStudentsByFamily(family.family_id),
          getFeedbackTestsByFamily(family.family_id),
          getStudentFeedbackByFamily(family.family_id),
        ]);
        setStudents(studentsData);
        setTests(testsData);
        setFeedback(feedbackData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load feedback');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user.id]);

  function getTestsForStudent(studentId: string): FeedbackTest[] {
    const testIdsForStudent = new Set(
      feedback.filter((f) => f.student_id === studentId).map((f) => f.test_id)
    );
    return tests
      .filter((t) => testIdsForStudent.has(t.test_id))
      .sort((a, b) => b.test_date.localeCompare(a.test_date));
  }

  function getFeedbackForStudentInTest(studentId: string, testId: string): FeedbackWithRelations | undefined {
    return feedback.find((f) => f.student_id === studentId && f.test_id === testId);
  }

  function selectTest(studentId: string, testId: string) {
    setSelectedTestByStudent((prev) => new Map(prev).set(studentId, testId));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mr-3" />
        Loading feedback...
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 text-destructive">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Instructor Feedback</h2>
        <p className="text-muted-foreground">
          Review feedback and progress notes from your instructors
        </p>
      </div>

      <div className="space-y-6">
        {students.map((student) => {
          const testsForStudent = getTestsForStudent(student.student_id);
          const selectedTestId = selectedTestByStudent.get(student.student_id) ?? null;
          const selectedTest = selectedTestId
            ? tests.find((t) => t.test_id === selectedTestId) ?? null
            : null;
          const selectedFeedback = selectedTestId
            ? getFeedbackForStudentInTest(student.student_id, selectedTestId)
            : undefined;

          return (
            <Card key={student.student_id}>
              <CardHeader>
                <div className="flex items-center gap-4">
                  <Avatar className="h-12 w-12">
                    {student.photo_url && <AvatarImage src={student.photo_url} alt={`${student.first_name} ${student.last_name}`} />}
                    <AvatarFallback className="text-lg bg-primary/10 text-primary">
                      {getInitials(`${student.first_name} ${student.last_name}`)}
                    </AvatarFallback>
                  </Avatar>
                  <CardTitle className="flex items-center gap-3">
                    {student.first_name} {student.last_name}
                    {student.belt_level && (
                      <Badge variant="secondary" className="gap-1">
                        <Award className="w-3 h-3" />
                        {student.belt_level}
                      </Badge>
                    )}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {testsForStudent.length > 0 ? (
                  <div className="grid gap-4 sm:grid-cols-[240px_1fr]">
                    {/* Test list */}
                    <div className="space-y-2">
                      {testsForStudent.map((test) => (
                        <button
                          key={test.test_id}
                          className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                            selectedTestId === test.test_id
                              ? 'bg-primary/10 border-primary'
                              : 'hover:bg-secondary/50 border-transparent'
                          }`}
                          onClick={() => selectTest(student.student_id, test.test_id)}
                        >
                          <p className="font-medium text-sm leading-tight">{test.title}</p>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                            <Calendar className="w-3 h-3" />
                            {formatTestDate(test.test_date)}
                          </div>
                        </button>
                      ))}
                    </div>

                    {/* Feedback content */}
                    <div>
                      {selectedTest && selectedFeedback ? (
                        <div className="space-y-3">
                          <div>
                            <h4 className="font-semibold">{selectedTest.title}</h4>
                            <p className="text-sm text-muted-foreground">
                              {formatTestDate(selectedTest.test_date)}
                            </p>
                            {selectedTest.description && (
                              <p className="text-sm text-muted-foreground mt-1 italic">
                                {selectedTest.description}
                              </p>
                            )}
                          </div>
                          <p className="text-sm leading-relaxed">{selectedFeedback.body}</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2 border-t">
                            <User className="w-4 h-4" />
                            <span>{selectedFeedback.profiles?.display_name ?? 'Admin'}</span>
                            <span>·</span>
                            <span>{formatDate(selectedFeedback.created_at)}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-full min-h-[80px] text-muted-foreground text-sm">
                          Select a test to view feedback
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No feedback yet for {student.first_name}</p>
                    <p className="text-sm mt-1">
                      Feedback will appear here after testing events
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}

        {students.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No students found on your account</p>
          </div>
        )}
      </div>
    </div>
  );
}
