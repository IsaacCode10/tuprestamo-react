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
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      analisis_documentos: {
        Row: {
          analysed_at: string | null
          created_at: string
          document_type: string | null
          id: number
          raw_data: Json | null
          solicitud_id: number | null
        }
        Insert: {
          analysed_at?: string | null
          created_at?: string
          document_type?: string | null
          id?: number
          raw_data?: Json | null
          solicitud_id?: number | null
        }
        Update: {
          analysed_at?: string | null
          created_at?: string
          document_type?: string | null
          id?: number
          raw_data?: Json | null
          solicitud_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "analisis_documentos_solicitud_id_fkey"
            columns: ["solicitud_id"]
            isOneToOne: false
            referencedRelation: "solicitudes"
            referencedColumns: ["id"]
          },
        ]
      }
      decisiones_de_riesgo: {
        Row: {
          analista_id: string
          comentarios: string | null
          created_at: string
          datos_infocred: Json | null
          decision: string
          etiqueta_aprobacion: string | null
          id: number
          perfil_riesgo_id: number
          razones: string[] | null
        }
        Insert: {
          analista_id: string
          comentarios?: string | null
          created_at?: string
          datos_infocred?: Json | null
          decision: string
          etiqueta_aprobacion?: string | null
          id?: never
          perfil_riesgo_id: number
          razones?: string[] | null
        }
        Update: {
          analista_id?: string
          comentarios?: string | null
          created_at?: string
          datos_infocred?: Json | null
          decision?: string
          etiqueta_aprobacion?: string | null
          id?: never
          perfil_riesgo_id?: number
          razones?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "decisiones_de_riesgo_perfil_riesgo_id_fkey"
            columns: ["perfil_riesgo_id"]
            isOneToOne: false
            referencedRelation: "perfiles_de_riesgo"
            referencedColumns: ["id"]
          },
        ]
      }
      documentos: {
        Row: {
          estado: string | null
          id: string
          nombre_archivo: string
          solicitud_id: number | null
          tipo_documento: string
          uploaded_at: string | null
          url_archivo: string
          user_id: string | null
        }
        Insert: {
          estado?: string | null
          id?: string
          nombre_archivo: string
          solicitud_id?: number | null
          tipo_documento: string
          uploaded_at?: string | null
          url_archivo: string
          user_id?: string | null
        }
        Update: {
          estado?: string | null
          id?: string
          nombre_archivo?: string
          solicitud_id?: number | null
          tipo_documento?: string
          uploaded_at?: string | null
          url_archivo?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documentos_solicitud_id_fkey"
            columns: ["solicitud_id"]
            isOneToOne: false
            referencedRelation: "solicitudes"
            referencedColumns: ["id"]
          },
        ]
      }
      inversiones: {
        Row: {
          amount: number
          created_at: string
          id: number
          investor_id: string
          opportunity_id: number
          status: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: number
          investor_id: string
          opportunity_id: number
          status?: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: number
          investor_id?: string
          opportunity_id?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "inversiones_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "oportunidades"
            referencedColumns: ["id"]
          },
        ]
      }
      loan_requests: {
        Row: {
          amount: number
          created_at: string
          purpose: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          purpose: string
          user_id?: string
        }
        Update: {
          amount?: number
          created_at?: string
          purpose?: string
          user_id?: string
        }
        Relationships: []
      }
      oportunidades: {
        Row: {
          comision_administracion_porcentaje: number | null
          comision_originacion_porcentaje: number | null
          comision_servicio_inversionista_porcentaje: number | null
          created_at: string
          estado: string
          id: number
          monto: number
          motivo: string | null
          perfil_riesgo: string | null
          plazo_meses: number
          riesgo: string | null
          seguro_desgravamen_porcentaje: number | null
          solicitud_id: number | null
          tasa_interes_anual: number
          tasa_interes_prestatario: number | null
          tasa_rendimiento_inversionista: number | null
          user_id: string | null
        }
        Insert: {
          comision_administracion_porcentaje?: number | null
          comision_originacion_porcentaje?: number | null
          comision_servicio_inversionista_porcentaje?: number | null
          created_at?: string
          estado?: string
          id?: number
          monto: number
          motivo?: string | null
          perfil_riesgo?: string | null
          plazo_meses: number
          riesgo?: string | null
          seguro_desgravamen_porcentaje?: number | null
          solicitud_id?: number | null
          tasa_interes_anual: number
          tasa_interes_prestatario?: number | null
          tasa_rendimiento_inversionista?: number | null
          user_id?: string | null
        }
        Update: {
          comision_administracion_porcentaje?: number | null
          comision_originacion_porcentaje?: number | null
          comision_servicio_inversionista_porcentaje?: number | null
          created_at?: string
          estado?: string
          id?: number
          monto?: number
          motivo?: string | null
          perfil_riesgo?: string | null
          plazo_meses?: number
          riesgo?: string | null
          seguro_desgravamen_porcentaje?: number | null
          solicitud_id?: number | null
          tasa_interes_anual?: number
          tasa_interes_prestatario?: number | null
          tasa_rendimiento_inversionista?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "oportunidades_solicitud_id_fkey"
            columns: ["solicitud_id"]
            isOneToOne: false
            referencedRelation: "solicitudes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oportunidades_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      perfiles_de_riesgo: {
        Row: {
          created_at: string
          dti_calculado: number | null
          estado: string | null
          id: number
          indice_confianza_datos: number | null
          perfil_sintetizado: Json | null
          solicitud_id: number
        }
        Insert: {
          created_at?: string
          dti_calculado?: number | null
          estado?: string | null
          id?: never
          indice_confianza_datos?: number | null
          perfil_sintetizado?: Json | null
          solicitud_id: number
        }
        Update: {
          created_at?: string
          dti_calculado?: number | null
          estado?: string | null
          id?: never
          indice_confianza_datos?: number | null
          perfil_sintetizado?: Json | null
          solicitud_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "perfiles_de_riesgo_solicitud_id_fkey"
            columns: ["solicitud_id"]
            isOneToOne: true
            referencedRelation: "solicitudes"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          direccion: string | null
          email: string | null
          id: string
          nombre_completo: string | null
          role: string
          telefono: string | null
        }
        Insert: {
          direccion?: string | null
          email?: string | null
          id?: string
          nombre_completo?: string | null
          role?: string
          telefono?: string | null
        }
        Update: {
          direccion?: string | null
          email?: string | null
          id?: string
          nombre_completo?: string | null
          role?: string
          telefono?: string | null
        }
        Relationships: []
      }
      solicitudes: {
        Row: {
          acepta_contacto: boolean | null
          antiguedad_laboral: string | null
          autoriza_infocred: boolean | null
          bancos_deuda: string | null
          cedula_identidad: string | null
          como_se_entero: string | null
          created_at: string
          departamento: string | null
          email: string
          estado: string | null
          expectativa_retorno: string | null
          experiencia_inversion: string | null
          fecha_nacimiento: string | null
          frecuencia_inversion: string | null
          id: number
          ingreso_mensual: number | null
          monto_interes_invertir: number | null
          monto_interes_invertir_rango: string | null
          monto_solicitado: number | null
          nombre_completo: string
          nombre_empresa: string | null
          opportunity_id: number | null
          plazo_meses: number | null
          saldo_deuda_tc: number | null
          situacion_laboral: string | null
          status: string | null
          tasa_interes_tc: number | null
          telefono: string | null
          tipo_solicitud: string
          user_id: string | null
        }
        Insert: {
          acepta_contacto?: boolean | null
          antiguedad_laboral?: string | null
          autoriza_infocred?: boolean | null
          bancos_deuda?: string | null
          cedula_identidad?: string | null
          como_se_entero?: string | null
          created_at?: string
          departamento?: string | null
          email: string
          estado?: string | null
          expectativa_retorno?: string | null
          experiencia_inversion?: string | null
          fecha_nacimiento?: string | null
          frecuencia_inversion?: string | null
          id?: number
          ingreso_mensual?: number | null
          monto_interes_invertir?: number | null
          monto_interes_invertir_rango?: string | null
          monto_solicitado?: number | null
          nombre_completo: string
          nombre_empresa?: string | null
          opportunity_id?: number | null
          plazo_meses?: number | null
          saldo_deuda_tc?: number | null
          situacion_laboral?: string | null
          status?: string | null
          tasa_interes_tc?: number | null
          telefono?: string | null
          tipo_solicitud: string
          user_id?: string | null
        }
        Update: {
          acepta_contacto?: boolean | null
          antiguedad_laboral?: string | null
          autoriza_infocred?: boolean | null
          bancos_deuda?: string | null
          cedula_identidad?: string | null
          como_se_entero?: string | null
          created_at?: string
          departamento?: string | null
          email?: string
          estado?: string | null
          expectativa_retorno?: string | null
          experiencia_inversion?: string | null
          fecha_nacimiento?: string | null
          frecuencia_inversion?: string | null
          id?: number
          ingreso_mensual?: number | null
          monto_interes_invertir?: number | null
          monto_interes_invertir_rango?: string | null
          monto_solicitado?: number | null
          nombre_completo?: string
          nombre_empresa?: string | null
          opportunity_id?: number | null
          plazo_meses?: number | null
          saldo_deuda_tc?: number | null
          situacion_laboral?: string | null
          status?: string | null
          tasa_interes_tc?: number | null
          telefono?: string | null
          tipo_solicitud?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "solicitudes_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "oportunidades"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      bytea_to_text: {
        Args: { data: string }
        Returns: string
      }
      get_opportunity_details_with_funding: {
        Args: { p_opportunity_id: number }
        Returns: {
          comision_servicio_inversionista_porcentaje: number
          id: number
          monto: number
          perfil_riesgo: string
          plazo_meses: number
          tasa_rendimiento_inversionista: number
          total_funded: number
        }[]
      }
      http: {
        Args: { request: Database["public"]["CompositeTypes"]["http_request"] }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
      }
      http_delete: {
        Args:
          | { content: string; content_type: string; uri: string }
          | { uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
      }
      http_get: {
        Args: { data: Json; uri: string } | { uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
      }
      http_head: {
        Args: { uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
      }
      http_header: {
        Args: { field: string; value: string }
        Returns: Database["public"]["CompositeTypes"]["http_header"]
      }
      http_list_curlopt: {
        Args: Record<PropertyKey, never>
        Returns: {
          curlopt: string
          value: string
        }[]
      }
      http_patch: {
        Args: { content: string; content_type: string; uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
      }
      http_post: {
        Args:
          | { content: string; content_type: string; uri: string }
          | { data: Json; uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
      }
      http_put: {
        Args: { content: string; content_type: string; uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
      }
      http_reset_curlopt: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      http_set_curlopt: {
        Args: { curlopt: string; value: string }
        Returns: boolean
      }
      text_to_bytea: {
        Args: { data: string }
        Returns: string
      }
      urlencode: {
        Args: { data: Json } | { string: string } | { string: string }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      http_header: {
        field: string | null
        value: string | null
      }
      http_request: {
        method: unknown | null
        uri: string | null
        headers: Database["public"]["CompositeTypes"]["http_header"][] | null
        content_type: string | null
        content: string | null
      }
      http_response: {
        status: number | null
        content_type: string | null
        headers: Database["public"]["CompositeTypes"]["http_header"][] | null
        content: string | null
      }
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const