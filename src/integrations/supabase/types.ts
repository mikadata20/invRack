import { Tables, TablesInsert, TablesUpdate } from './types/tables';
import { Enums, Constants } from './types/enums';

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      activity_log: {
        Row: {
          action_type: string
          created_at: string
          description: string | null
          id: number
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string
          user_id: string | null
          username: string | null
        }
        Insert: {
          action_type: string
          created_at?: string
          description?: string | null
          id?: number
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name: string
          user_id?: string | null
          username?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string
          description?: string | null
          id?: number
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string
          user_id?: string | null
          username?: string | null
        }
        Relationships: []
      }
      bom_master: {
        Row: {
          assy_line_no: string | null
          bom: string | null
          child_part: string
          created_at: string
          created_by: string | null
          cyl: string | null
          id: number
          kanban_code: string | null
          label_code: string | null
          location: string | null
          model: string
          parent_part: string
          part_name: string
          qty_bom: number | null
          qty_per_set: number
          rack: string | null
          sequence: number | null
          safety_stock: number | null // Added safety_stock to bom_master
          source: string | null
          unix_no: string
          updated_at: string
        }
        Insert: {
          assy_line_no?: string | null
          bom?: string | null
          child_part: string
          created_at?: string
          created_by?: string | null
          cyl?: string | null
          id?: number
          kanban_code?: string | null
          label_code?: string | null
          location?: string | null
          model: string
          parent_part: string
          part_name: string
          qty_bom?: number | null
          qty_per_set?: number
          rack?: string | null
          sequence?: number | null
          safety_stock?: number | null // Added safety_stock to bom_master
          source?: string | null
          unix_no: string
          updated_at?: string
        }
        Update: {
          assy_line_no?: string | null
          bom?: string | null
          child_part?: string
          created_at?: string
          created_by?: string | null
          cyl?: string | null
          id?: number
          kanban_code?: string | null
          label_code?: string | null
          location?: string | null
          model?: string
          parent_part?: string
          part_name?: string
          qty_bom?: number | null
          qty_per_set?: number
          rack?: string | null
          sequence?: number | null
          safety_stock?: number | null // Added safety_stock to bom_master
          source?: string | null
          unix_no?: string
          updated_at?: string
        }
        Relationships: []
      }
      kanban_master: {
        Row: {
          id: number
          kanban_code: string
          part_name: string
          part_no: string
          qty: number
          rack_location: string
        }
        Insert: {
          id?: number
          kanban_code: string
          part_name: string
          part_no: string
          qty?: number
          rack_location: string
        }
        Update: {
          id?: number
          kanban_code?: string
          part_name?: string
          part_no?: string
          qty?: number
          rack_location?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          is_active: boolean
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          username: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          is_active?: boolean
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          username: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          is_active?: boolean
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      rack_inventory: {
        Row: {
          id: number
          last_picking: string | null
          last_supply: string | null
          part_name: string
          part_no: string
          qty: number
          rack_location: string
          max_capacity: number | null // Added max_capacity
          updated_at: string | null
        }
        Insert: {
          id?: number
          last_picking?: string | null
          last_supply?: string | null
          part_name: string
          part_no: string
          qty?: number
          rack_location: string
          max_capacity?: number | null // Added max_capacity
          updated_at?: string | null
        }
        Update: {
          id?: number
          last_picking?: string | null
          last_supply?: string | null
          part_name?: string
          part_no?: string
          qty?: number
          rack_location?: string
          max_capacity?: number | null // Added max_capacity
          updated_at?: string | null
        }
        Relationships: []
      }
      stock_adjustments: {
        Row: {
          adjust_qty: number
          adjusted_at: string
          adjusted_by: string | null
          current_stock: number
          id: number
          new_stock: number
          part_name: string
          part_no: string
          rack_location: string
          reason: string
        }
        Insert: {
          adjust_qty: number
          adjusted_at?: string
          adjusted_by?: string | null
          current_stock: number
          id?: number
          new_stock: number
          part_name: string
          part_no: string
          rack_location: string
          reason: string
        }
        Update: {
          adjust_qty?: number
          adjusted_at?: string
          adjusted_by?: string | null
          current_stock?: number
          id?: number
          new_stock?: number
          part_name?: string
          part_no?: string
          rack_location?: string
          reason?: string
        }
        Relationships: []
      }
      stock_transactions: {
        Row: {
          created_at: string
          document_ref: string | null
          id: number
          item_code: string
          item_name: string
          qty: number
          rack_location: string
          source_location: string | null
          timestamp: string
          transaction_id: string
          transaction_type: string
          user_id: string | null
          username: string | null
        }
        Insert: {
          created_at?: string
          document_ref?: string | null
          id?: number
          item_code: string
          item_name: string
          qty: number
          rack_location: string
          source_location?: string | null
          timestamp?: string
          transaction_id: string
          transaction_type: string
          user_id?: string | null
          username?: string | null
        }
        Update: {
          created_at?: string
          document_ref?: string | null
          id?: number
          item_code?: string
          item_name?: string
          qty?: number
          rack_location?: string
          source_location?: string | null
          timestamp?: string
          transaction_id?: string
          transaction_type?: string
          user_id?: string | null
          username?: string | null
        }
        Relationships: []
      }
      transaction_log: {
        Row: {
          duration_sec: number | null
          end_time: string | null
          id: number
          is_error: boolean | null
          part_no: string
          process_type: string
          qty: number
          rack_location: string
          remarks: string | null
          start_time: string
          user_id: string | null
        }
        Insert: {
          duration_sec?: number | null
          end_time?: string | null
          id?: number
          is_error?: boolean | null
          part_no: string
          process_type: string
          qty: number
          rack_location: string
          remarks?: string | null
          start_time?: string
          user_id?: string | null
        }
        Update: {
          duration_sec?: number | null
          end_time?: string | null
          id?: number
          is_error?: boolean | null
          part_no?: string
          process_type?: string
          qty?: number
          rack_location?: string
          remarks?: string | null
          start_time?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      enriched_rack_inventory: {
        Row: {
          id: number | null;
          part_no: string | null;
          part_name: string | null;
          rack_location: string | null;
          qty: number | null;
          safety_stock: number | null;
          last_supply: string | null;
          last_picking: string | null;
          updated_at: string | null;
          bom: number | null;
          qty_bom: number | null;
          qty_per_set: number | null;
          model: string | null;
          cyl: string | null;
          parent_part: string | null;
          sets: number | null;
        };
      };
      kd_set_summary: {
        Row: {
          model: string | null;
          cyl: string | null;
          parent_part: string | null;
          qty_min: number | null;
          qty_max: number | null;
        };
      };
      unset_part: {
        Row: {
          "Parent Part": string | null;
          "Child Part": string | null;
          "Part Name": string | null;
          "Qty Set": number | null;
          "Qty Min": number | null;
          "Unset": number | null;
          "Status": string | null;
        };
      };
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "controller" | "operator"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Re-export modular types
export type { Tables, TablesInsert, TablesUpdate } from './types/tables';
export type { Enums } from './types/enums';
export { Constants } from './types/enums';