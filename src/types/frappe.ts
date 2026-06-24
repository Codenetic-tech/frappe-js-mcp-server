export type FilterOperator =
  | "="
  | "!="
  | ">"
  | "<"
  | ">="
  | "<="
  | "like"
  | "not like"
  | "in"
  | "not in"
  | "between"
  | "is"
  | "is not"
  | "ancestor of"
  | "descendant of"
  | "not ancestor of"
  | "not descendant of";

export type Filter = [string, FilterOperator, any];

export interface GetDocListArgs {
  fields?: string[];
  filters?: Filter[];
  orFilters?: Filter[];
  limit_start?: number;
  limit?: number;
  orderBy?: {
    field: string;
    order: "asc" | "desc";
  };
  asDict?: boolean;
}

export interface FrappeDocument {
  name: string;
  doctype: string;
  [key: string]: any;
}
