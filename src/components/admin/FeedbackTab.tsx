import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { Plus, Calendar, Trash2, User, CheckCircle2, Clock, Pencil, Search } from 'lucide-react';
import { getAllFeedbackTests, getAllStudentFeedback, getAllStudents, type FeedbackWithRelations } from '../../lib/supabase/queries';
import {
  createFeedbackTest,
  updateFeedbackTest,
  deleteFeedbackTest,
  createStudentFeedback,
  deleteStudentFeedback,
} from '../../lib/supabase/mutations';
import { supabase } from '../../lib/supabase/client';
import { formatShortDate, formatTestDate, formatTime } from '../../lib/format';
import type { Student, FeedbackTest } from '../../lib/types';

export function FeedbackTab() {
  const [tests, setTests] = useState<FeedbackTest[]>([]);
  const [feedback, setFeedback] = useState<FeedbackWithRelations[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTestId, setSelectedTestId] = useState<string | null>(null);

  // Create Test form
  const [showCreateTestForm, setShowCreateTestForm] = useState(false);
  const [testTitle, setTestTitle] = useState('');
  const [testDate, setTestDate] = useState('');
  const [testTime, setTestTime] = useState('');
  const [testDescription, setTestDescription] = useState('');
  const [savingTest, setSavingTest] = useState(false);

  // Edit Test form
  const [editingTestId, setEditingTestId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Add Feedback form (within a selected test)
  const [showAddFeedbackForm, setShowAddFeedbackForm] = useState(false);
  const [addStudentId, setAddStudentId] = useState('');
  const [addBody, setAddBody] = useState('');
  const [savingFeedback, setSavingFeedback] = useState(false);

  // Student search picker
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [studentPickerOpen, setStudentPickerOpen] = useState(false);

  // Feedback entries search
  const [feedbackSearchQuery, setFeedbackSearchQuery] = useState('');

  // Test list search
  const [testSearchQuery, setTestSearchQuery] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);
      const [testsData, feedbackData, studentsData] = await Promise.all([
        getAllFeedbackTests(),
        getAllStudentFeedback(),
        getAllStudents(),
      ]);
      setTests(testsData);
      setFeedback(feedbackData);
      setStudents(studentsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }

  const selectedTest = tests.find((t) => t.test_id === selectedTestId) ?? null;
  const feedbackForTest = feedback.filter((f) => f.test_id === selectedTestId);
  const studentsWithoutFeedback = students.filter(
    (s) => !feedbackForTest.some((f) => f.student_id === s.student_id)
  );

  const filteredPickerStudents = studentsWithoutFeedback.filter((s) =>
    `${s.first_name} ${s.last_name}`.toLowerCase().includes(studentSearchQuery.toLowerCase())
  );

  const filteredFeedback = feedbackForTest.filter((entry) => {
    if (!feedbackSearchQuery.trim()) return true;
    const student = students.find((s) => s.student_id === entry.student_id);
    if (!student) return true;
    return `${student.first_name} ${student.last_name}`
      .toLowerCase()
      .includes(feedbackSearchQuery.toLowerCase());
  });

  const studentNamesByTest = new Map<string, string[]>();
  for (const entry of feedback) {
    const student = students.find((s) => s.student_id === entry.student_id);
    if (student) {
      const names = studentNamesByTest.get(entry.test_id) ?? [];
      names.push(`${student.first_name} ${student.last_name}`);
      studentNamesByTest.set(entry.test_id, names);
    }
  }

  const filteredTests = testSearchQuery.trim()
    ? tests.filter((test) => {
        const q = testSearchQuery.toLowerCase();
        if (test.title.toLowerCase().includes(q)) return true;
        if (test.description?.toLowerCase().includes(q)) return true;
        if (formatTestDate(test.test_date).toLowerCase().includes(q)) return true;
        return (studentNamesByTest.get(test.test_id) ?? []).some((name) =>
          name.toLowerCase().includes(q)
        );
      })
    : tests;

  async function handleCreateTest() {
    if (!testTitle.trim() || !testDate) return;
    setSavingTest(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const newTest = await createFeedbackTest({
        title: testTitle.trim(),
        test_date: testDate,
        test_time: testTime || null,
        description: testDescription.trim() || null,
        created_by: user.id,
      });
      setTests((prev) => [newTest, ...prev]);
      setSelectedTestId(newTest.test_id);
      setShowCreateTestForm(false);
      setTestTitle('');
      setTestDate('');
      setTestTime('');
      setTestDescription('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create test');
    } finally {
      setSavingTest(false);
    }
  }

  function startEdit(test: FeedbackTest) {
    setEditingTestId(test.test_id);
    setEditTitle(test.title);
    setEditDate(test.test_date);
    setEditTime(test.test_time ? test.test_time.slice(0, 5) : '');
    setEditDescription(test.description ?? '');
  }

  async function handleSaveEdit() {
    if (!editingTestId || !editTitle.trim() || !editDate) return;
    setSavingEdit(true);
    try {
      const updated = await updateFeedbackTest(editingTestId, {
        title: editTitle.trim(),
        test_date: editDate,
        test_time: editTime || null,
        description: editDescription.trim() || null,
      });
      setTests((prev) => prev.map((t) => (t.test_id === editingTestId ? updated : t)));
      setEditingTestId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update test');
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleDeleteTest(testId: string) {
    try {
      await deleteFeedbackTest(testId);
      setTests((prev) => prev.filter((t) => t.test_id !== testId));
      setFeedback((prev) => prev.filter((f) => f.test_id !== testId));
      if (selectedTestId === testId) setSelectedTestId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete test');
    }
  }

  async function handleAddFeedback() {
    if (!selectedTestId || !addStudentId || !addBody.trim()) return;
    setSavingFeedback(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const newFeedback = await createStudentFeedback({
        student_id: addStudentId,
        author_user_id: user.id,
        test_id: selectedTestId,
        body: addBody.trim(),
      });
      setFeedback((prev) => [{ ...newFeedback, profiles: null } satisfies FeedbackWithRelations, ...prev]);
      setShowAddFeedbackForm(false);
      setAddStudentId('');
      setAddBody('');
      setStudentSearchQuery('');
      setStudentPickerOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save feedback');
    } finally {
      setSavingFeedback(false);
    }
  }

  async function handleDeleteFeedback(feedbackId: string) {
    try {
      await deleteStudentFeedback(feedbackId);
      setFeedback((prev) => prev.filter((f) => f.feedback_id !== feedbackId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete feedback');
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mr-3" />
        Loading feedback...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-4xl font-bold">Student Feedback</h2>
          <p className="text-muted-foreground text-lg">Create evaluation tests and provide feedback to students</p>
        </div>
        <Button onClick={() => { setShowCreateTestForm(true); setEditingTestId(null); }}>
          <Plus className="w-4 h-4 mr-2" />
          Create Test
        </Button>
      </div>

      {error && (
        <div className="text-sm text-destructive bg-destructive/10 rounded-md px-4 py-2">{error}</div>
      )}

      {/* Create Test Form */}
      {showCreateTestForm && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle>New Evaluation Test</CardTitle>
            <CardDescription>Create a test event before adding student feedback</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="test-title">Title <span className="text-destructive">*</span></Label>
                <Input
                  id="test-title"
                  placeholder="e.g., Spring Belt Testing"
                  value={testTitle}
                  onChange={(e) => setTestTitle(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="test-date">Date <span className="text-destructive">*</span></Label>
                <Input
                  id="test-date"
                  type="date"
                  value={testDate}
                  onChange={(e) => setTestDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="test-time">Time (optional)</Label>
                <Input
                  id="test-time"
                  type="time"
                  value={testTime}
                  onChange={(e) => setTestTime(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="test-description">Description (optional)</Label>
              <Textarea
                id="test-description"
                placeholder="Any notes about this test event..."
                rows={3}
                maxLength={500}
                value={testDescription}
                onChange={(e) => setTestDescription(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleCreateTest}
                disabled={savingTest || !testTitle.trim() || !testDate}
              >
                {savingTest ? 'Creating...' : 'Create Test'}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowCreateTestForm(false);
                  setTestTitle('');
                  setTestDate('');
                  setTestTime('');
                  setTestDescription('');
                }}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        {/* Test list */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Tests</CardTitle>
            <CardDescription>{tests.length} total</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search by name, date, or student…"
                className="pl-9"
                value={testSearchQuery}
                onChange={(e) => setTestSearchQuery(e.target.value)}
              />
            </div>
            {filteredTests.map((test) => {
              const count = feedback.filter((f) => f.test_id === test.test_id).length;
              return (
                <div
                  key={test.test_id}
                  className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                    selectedTestId === test.test_id
                      ? 'bg-primary/10 border-primary'
                      : 'hover:bg-secondary/50'
                  }`}
                  onClick={() => {
                    setSelectedTestId(test.test_id);
                    setEditingTestId(null);
                    setShowAddFeedbackForm(false);
                    setFeedbackSearchQuery('');
                    setStudentSearchQuery('');
                    setAddStudentId('');
                    setStudentPickerOpen(false);
                  }}
                >
                  <div className="space-y-2">
                    <h4 className="font-medium leading-tight">{test.title}</h4>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      {formatTestDate(test.test_date)}
                      {test.test_time && (
                        <span>· {formatTime(test.test_time)}</span>
                      )}
                    </div>
                    <Badge variant="secondary" className="gap-1">
                      <User className="w-3 h-3" />
                      {count} {count === 1 ? 'student' : 'students'}
                    </Badge>
                  </div>
                </div>
              );
            })}
            {tests.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No tests yet</p>
                <p className="text-sm mt-1">Create a test to get started</p>
              </div>
            ) : filteredTests.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground text-sm">
                No tests match your search.
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* Test detail */}
        <Card className="md:col-span-2">
          {selectedTest ? (
            <>
              <CardHeader>
                {editingTestId === selectedTest.test_id ? (
                  /* Edit form */
                  <div className="space-y-4">
                    <CardTitle>Edit Test</CardTitle>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="edit-title">Title <span className="text-destructive">*</span></Label>
                        <Input
                          id="edit-title"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-date">Date <span className="text-destructive">*</span></Label>
                        <Input
                          id="edit-date"
                          type="date"
                          value={editDate}
                          onChange={(e) => setEditDate(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-time">Time (optional)</Label>
                        <Input
                          id="edit-time"
                          type="time"
                          value={editTime}
                          onChange={(e) => setEditTime(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-description">Description (optional)</Label>
                      <Textarea
                        id="edit-description"
                        rows={3}
                        maxLength={500}
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={handleSaveEdit}
                        disabled={savingEdit || !editTitle.trim() || !editDate}
                      >
                        {savingEdit ? 'Saving...' : 'Save Changes'}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingTestId(null)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  /* Test info */
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <CardTitle>{selectedTest.title}</CardTitle>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        {formatTestDate(selectedTest.test_date)}
                        {selectedTest.test_time && (
                          <span>· {formatTime(selectedTest.test_time)}</span>
                        )}
                      </div>
                      {selectedTest.description && (
                        <p className="text-sm text-muted-foreground pt-1">{selectedTest.description}</p>
                      )}
                      <CardDescription className="pt-1">
                        {feedbackForTest.length} {feedbackForTest.length === 1 ? 'student' : 'students'} reviewed
                      </CardDescription>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <Button
                        size="sm"
                        disabled={studentsWithoutFeedback.length === 0}
                        onClick={() => setShowAddFeedbackForm(true)}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Student
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => startEdit(selectedTest)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDeleteTest(selectedTest.test_id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Add Feedback form */}
                {showAddFeedbackForm && editingTestId === null && (
                  <Card className="border-primary">
                    <CardContent className="pt-6 space-y-4">
                      <h4 className="font-medium">Add Feedback for Student</h4>
                      <div className="space-y-2">
                        <Label htmlFor="add-student">Student</Label>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                          <Input
                            id="add-student"
                            placeholder="Search students..."
                            className="pl-9"
                            value={studentSearchQuery}
                            onChange={(e) => {
                              setStudentSearchQuery(e.target.value);
                              setAddStudentId('');
                              setStudentPickerOpen(true);
                            }}
                            onFocus={() => setStudentPickerOpen(true)}
                            onBlur={() => setTimeout(() => setStudentPickerOpen(false), 150)}
                            autoComplete="off"
                          />
                          {studentPickerOpen && (
                            <div className="absolute z-10 mt-1 w-full max-h-48 overflow-y-auto rounded-md border border-input bg-background shadow-md">
                              {filteredPickerStudents.length === 0 ? (
                                <div className="px-3 py-2 text-sm text-muted-foreground">No students found</div>
                              ) : (
                                filteredPickerStudents.map((s) => (
                                  <button
                                    key={s.student_id}
                                    type="button"
                                    className="w-full text-left px-3 py-2 text-sm hover:bg-secondary/60 focus:bg-secondary/60 outline-none"
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => {
                                      setAddStudentId(s.student_id);
                                      setStudentSearchQuery(`${s.first_name} ${s.last_name}${s.belt_level ? ` — ${s.belt_level}` : ''}`);
                                      setStudentPickerOpen(false);
                                    }}
                                  >
                                    {s.first_name} {s.last_name}
                                    {s.belt_level && (
                                      <span className="text-muted-foreground"> — {s.belt_level}</span>
                                    )}
                                  </button>
                                ))
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="add-body">Feedback</Label>
                        <Textarea
                          id="add-body"
                          placeholder="Enter feedback for this student..."
                          rows={4}
                          maxLength={2000}
                          value={addBody}
                          onChange={(e) => setAddBody(e.target.value)}
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={handleAddFeedback}
                          disabled={savingFeedback || !addStudentId || !addBody.trim()}
                        >
                          {savingFeedback ? 'Saving...' : 'Save Feedback'}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setShowAddFeedbackForm(false);
                            setAddStudentId('');
                            setAddBody('');
                            setStudentSearchQuery('');
                            setStudentPickerOpen(false);
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Feedback entries */}
                {feedbackForTest.length > 0 && (
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <Input
                      placeholder="Search students..."
                      className="pl-9"
                      value={feedbackSearchQuery}
                      onChange={(e) => setFeedbackSearchQuery(e.target.value)}
                    />
                  </div>
                )}
                {feedbackForTest.length > 0 ? (
                  filteredFeedback.length > 0 ? filteredFeedback.map((entry) => {
                    const student = students.find((s) => s.student_id === entry.student_id);
                    return (
                      <Card key={entry.feedback_id}>
                        <CardContent className="pt-6">
                          <div className="space-y-3">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex items-start gap-3 flex-1">
                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                  <User className="w-5 h-5 text-primary" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-medium">
                                    {student ? `${student.first_name} ${student.last_name}` : 'Unknown Student'}
                                  </h4>
                                  {student?.belt_level && (
                                    <p className="text-xs text-muted-foreground">{student.belt_level}</p>
                                  )}
                                  <p className="text-sm text-muted-foreground">
                                    {entry.profiles?.display_name ?? 'Instructor'} · {formatShortDate(entry.created_at)}
                                  </p>
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                                onClick={() => handleDeleteFeedback(entry.feedback_id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                            <p className="text-sm leading-relaxed pl-13">{entry.body}</p>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  }) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Search className="w-10 h-10 mx-auto mb-2 opacity-50" />
                      <p>No students match your search</p>
                    </div>
                  )
                ) : (
                  !showAddFeedbackForm && (
                    <div className="text-center py-12 text-muted-foreground">
                      <User className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>No feedback added yet</p>
                      <p className="text-sm mt-1">Click "Add Student" to write feedback for a student</p>
                    </div>
                  )
                )}
              </CardContent>
            </>
          ) : (
            <CardContent className="flex items-center justify-center py-24 text-muted-foreground">
              <div className="text-center">
                <CheckCircle2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Select a test to view feedback</p>
                <p className="text-sm mt-1">Or create a new test to get started</p>
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}
