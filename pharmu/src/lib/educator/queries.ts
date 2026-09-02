import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * The educator side's reads.
 *
 * Every one of these is scoped by row-level security rather than by a filter
 * written here: an educator sees a class because they own it and a student's
 * scores because that student is enrolled in one of their classes. The queries
 * below would return nothing useful if run by anyone else, which is the point -
 * the frontend is not what is keeping cohorts apart.
 *
 * The educator tables are newer than the checked-in Supabase types, which are
 * generated from the live schema, so they are reached through one narrow cast
 * until those are regenerated.
 */
const db = () => supabase as unknown as {
  from: (table: string) => any;
  rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
};

export type ClassRow = {
  id: string;
  name: string;
  join_code: string;
  archived: boolean;
  created_at: string;
};

export type EnrolledStudent = {
  student_id: string;
  enrolled_at: string;
  full_name: string | null;
  xp: number;
  accuracy_rate: number;
  total_cases_completed: number;
};

export type ScoreRow = {
  user_id: string;
  mode: string;
  accuracy: number;
  errors_detail: unknown;
  class_attempts: unknown;
  completed_at: string;
};

export type AssignmentRow = {
  id: string;
  class_id: string;
  case_id: string | null;
  mode: string | null;
  title: string | null;
  due_at: string | null;
  created_at: string;
};

export type AssessmentRow = {
  id: string;
  class_id: string;
  title: string;
  mode: string;
  case_count: number;
  time_limit_sec: number;
  opens_at: string | null;
  closes_at: string | null;
  created_at: string;
};

export function useMyClasses(educatorId?: string) {
  return useQuery<ClassRow[]>({
    queryKey: ["educator-classes", educatorId],
    enabled: !!educatorId,
    queryFn: async (): Promise<ClassRow[]> => {
      const { data, error } = await db().from("classes")
        .select("id, name, join_code, archived, created_at")
        .eq("educator_id", educatorId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ClassRow[];
    },
  });
}

/**
 * The roll for one class, with each student's headline figures.
 *
 * Two queries rather than a join: enrolments and profiles are separate tables
 * behind separate policies, and PostgREST cannot embed across them without a
 * declared foreign key between profiles.user_id and auth.users.
 */
export function useClassRoster(classId?: string) {
  return useQuery<EnrolledStudent[]>({
    queryKey: ["class-roster", classId],
    enabled: !!classId,
    queryFn: async (): Promise<EnrolledStudent[]> => {
      const { data: rows, error } = await db().from("class_enrollments")
        .select("student_id, enrolled_at")
        .eq("class_id", classId!);
      if (error) throw error;

      const ids = (rows ?? []).map((r: any) => r.student_id);
      if (!ids.length) return [];

      const { data: profiles } = await db().from("profiles")
        .select("user_id, full_name, xp, accuracy_rate, total_cases_completed")
        .in("user_id", ids);

      const byId = new Map<string, any>((profiles ?? []).map((p: any) => [p.user_id, p]));
      return (rows ?? []).map((r: any) => ({
        student_id: r.student_id,
        enrolled_at: r.enrolled_at,
        full_name: byId.get(r.student_id)?.full_name ?? null,
        xp: byId.get(r.student_id)?.xp ?? 0,
        accuracy_rate: byId.get(r.student_id)?.accuracy_rate ?? 0,
        total_cases_completed: byId.get(r.student_id)?.total_cases_completed ?? 0,
      }));
    },
  });
}

/** Every student across every class this educator owns, de-duplicated. */
export function useAllMyStudents(classes: ClassRow[]) {
  const ids = classes.map((c) => c.id).sort().join(",");
  return useQuery<string[]>({
    queryKey: ["educator-students", ids],
    enabled: classes.length > 0,
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await db().from("class_enrollments")
        .select("student_id")
        .in("class_id", classes.map((c) => c.id));
      if (error) throw error;
      const ids: string[] = (data ?? []).map((r: any) => String(r.student_id));
      return [...new Set(ids)];
    },
  });
}

/**
 * Score rows for a set of students.
 *
 * Returns nothing for a student the caller does not teach, because the policy
 * on scores says so - there is no filter here doing that work.
 */
export function useCohortScores(studentIds: string[]) {
  const key = studentIds.slice().sort().join(",");
  return useQuery({
    queryKey: ["cohort-scores", key],
    enabled: studentIds.length > 0,
    queryFn: async (): Promise<ScoreRow[]> => {
      const { data, error } = await db().from("scores")
        .select("user_id, mode, accuracy, errors_detail, class_attempts, completed_at")
        .in("user_id", studentIds)
        .order("completed_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return (data ?? []) as ScoreRow[];
    },
  });
}

export function useClassAssignments(classIds: string[]) {
  const key = classIds.slice().sort().join(",");
  return useQuery({
    queryKey: ["class-assignments", key],
    enabled: classIds.length > 0,
    queryFn: async (): Promise<AssignmentRow[]> => {
      const { data, error } = await db().from("class_assignments")
        .select("id, class_id, case_id, mode, title, due_at, created_at")
        .in("class_id", classIds)
        .order("due_at", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as AssignmentRow[];
    },
  });
}

export function useClassAssessments(classIds: string[]) {
  const key = classIds.slice().sort().join(",");
  return useQuery({
    queryKey: ["class-assessments", key],
    enabled: classIds.length > 0,
    queryFn: async (): Promise<AssessmentRow[]> => {
      const { data, error } = await db().from("assessments")
        .select("id, class_id, title, mode, case_count, time_limit_sec, opens_at, closes_at, created_at")
        .in("class_id", classIds)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as AssessmentRow[];
    },
  });
}

export { db as educatorDb };
