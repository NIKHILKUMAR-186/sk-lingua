import { useQuery } from "@tanstack/react-query";
import {
  listMentors,
  getMentorStats,
  type MentorListResponse,
  type MentorFilter,
  type MentorSort,
} from "../services/mentor-service";

export interface MentorListState {
  search: string;
  filter: MentorFilter;
  sort: MentorSort;
  page: number;
  limit: number;
}

export const DEFAULT_MENTOR_LIST_STATE: MentorListState = {
  search: "",
  filter: "all",
  sort: "recently_joined",
  page: 0,
  limit: 24,
};

export function useMentorList(state: MentorListState) {
  return useQuery<MentorListResponse>({
    queryKey: [
      "admin",
      "mentors",
      "list",
      state.search,
      state.filter,
      state.sort,
      state.page,
      state.limit,
    ],
    queryFn: () =>
      listMentors({
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

export function useMentorStats() {
  return useQuery({
    queryKey: ["admin", "mentors", "stats"],
    queryFn: getMentorStats,
    staleTime: 1000 * 30,
    placeholderData: (prev) => prev,
  });
}
