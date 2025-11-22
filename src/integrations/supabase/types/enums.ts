import { Database } from "../types";

type PublicSchema = Database['public'];

export type Enums<EnumName extends keyof PublicSchema['Enums']> =
  PublicSchema['Enums'][EnumName];

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "controller", "operator"],
    },
  },
} as const