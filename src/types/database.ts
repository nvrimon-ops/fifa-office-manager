export type SessionStatus = 'open' | 'active' | 'finished'
export type SlotType = 'open' | 'winner'

export interface Profile {
  id: string
  full_name: string
  nickname: string | null
  is_admin: boolean
  avatar_url: string | null
  created_at: string
}

export interface Session {
  id: string
  created_by: string
  scheduled_time: string
  status: SessionStatus
  created_at: string
}

export interface SessionRegistration {
  id: string
  session_id: string
  user_id: string
  slot_type: SlotType
  registered_at: string
  cancelled_at: string | null
}

export interface Game {
  id: string
  session_id: string
  team1_player1: string
  team1_player2: string | null
  team2_player1: string | null
  team2_player2: string | null
  score_team1: number | null
  score_team2: number | null
  reported_by: string | null
  created_at: string
}

export interface TrashTalk {
  id: string
  session_id: string
  user_id: string
  message: string
  created_at: string
}

// Row types need `& Record<string, unknown>` so they satisfy supabase-js's
// GenericTable constraint (which requires Row: Record<string, unknown>).
// Without it, TypeScript resolves Schema as `never` and all table operations fail.
type Row<T> = T & { [key: string]: unknown }
type Ins<T> = T & { [key: string]: unknown }
type Upd<T> = T & { [key: string]: unknown }

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Row<Profile>
        Insert: Ins<Omit<Profile, 'id' | 'created_at'> & { id?: string }>
        Update: Upd<Partial<Omit<Profile, 'id' | 'created_at'>>>
        Relationships: []
      }
      sessions: {
        Row: Row<Session>
        Insert: Ins<Omit<Session, 'id' | 'created_at'> & { id?: string }>
        Update: Upd<Partial<Omit<Session, 'id' | 'created_at'>>>
        Relationships: []
      }
      session_registrations: {
        Row: Row<SessionRegistration>
        Insert: Ins<Omit<SessionRegistration, 'id' | 'registered_at' | 'cancelled_at'> & { id?: string; cancelled_at?: string | null }>
        Update: Upd<Partial<Omit<SessionRegistration, 'id' | 'registered_at'>>>
        Relationships: []
      }
      games: {
        Row: Row<Game>
        Insert: Ins<Omit<Game, 'id' | 'created_at'> & { id?: string }>
        Update: Upd<Partial<Omit<Game, 'id' | 'created_at'>>>
        Relationships: []
      }
      trash_talk: {
        Row: Row<TrashTalk>
        Insert: Ins<Omit<TrashTalk, 'id' | 'created_at'> & { id?: string }>
        Update: Upd<Partial<Omit<TrashTalk, 'id' | 'created_at'>>>
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: { [_ in never]: never }
  }
}
