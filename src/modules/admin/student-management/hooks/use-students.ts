import { useMutation, useQuery, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getStudentDetail,
  getStudentStats,
  listStudents,
  updateStudentProfile,
  type StudentDetailData,
  type StudentFilter,
  type StudentListResponse,
  type StudentSort,
  type StudentStats,
} from "../services/student-service";

export interface StudentListState {
  search: string;
  filter: StudentFilter;
  sort: StudentSort;
  page: number;
  limit: number;
}

export const DEFAULT_STUDENT_LIST_STATE: StudentListState = {
  search: "",
  filter: "all",
  sort: "recently_joined",
  page: 0,
  limit: 24,
};

export function useStudentList(state: StudentListState) {
  return useQuery<StudentListResponse>({
    queryKey: ["admin", "students", "list", state.search, state.filter, state.sort, state.page, state.limit],
    queryFn: () =>
      listStudents({
        search: state.search,
        filter: state.filter,
        sort: state.sort,
        limit: state.limit,
        offset: state.page * state.limit,
      }),
    staleTime: 1000 * 30,
    placeholderData: (prev) => prev,
  });
}

export function useStudentStats() {
  return useQuery<StudentStats>({
    queryKey: ["admin", "students", "stats"],
    queryFn: getStudentStats,
    staleTime: 1000 * 30,
    placeholderData: (prev) => prev,
  });
}

export function useStudentDetail(studentId: string | null) {
  return useQuery<StudentDetailData | null>({
    queryKey: ["admin", "students", "detail", studentId],
    queryFn: () => (studentId ? getStudentDetail(studentId) : Promise.resolve(null)),
    enabled: !!studentId,
    staleTime: 1000 * 15,
  }) as UseQueryResult<StudentDetailData | null>;
}

export function useUpdateStudentProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ studentId, updates }: { studentId: string; updates: Record<string, unknown> }) =>
      updateStudentProfile(studentId, updates),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "students"] });
      toast.success("Student profile updated");
    },
    onError: (error: any) => {
      toast.error(error?.message || "Unable to update student profile.");
    },
  });
}
