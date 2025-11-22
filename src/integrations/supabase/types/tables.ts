import { Database, Json } from "../types";

type PublicSchema = Database['public'];

export type Tables<TableName extends keyof (PublicSchema['Tables'] & PublicSchema['Views'])> =
  (PublicSchema['Tables'] & PublicSchema['Views'])[TableName] extends {
    Row: infer R;
  }
    ? R
    : never;

export type TablesInsert<TableName extends keyof PublicSchema['Tables']> =
  PublicSchema['Tables'][TableName] extends {
    Insert: infer I;
  }
    ? I
    : never;

export type TablesUpdate<TableName extends keyof PublicSchema['Tables']> =
  PublicSchema['Tables'][TableName] extends {
    Update: infer U;
  }
    ? U
    : never;