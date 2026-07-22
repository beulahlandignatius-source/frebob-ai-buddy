-- Profile extensions
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS ai_response_language text,
  ADD COLUMN IF NOT EXISTS audio_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS preferred_voice text,
  ADD COLUMN IF NOT EXISTS audio_playback_speed numeric NOT NULL DEFAULT 1.0;

-- Audio cache
CREATE TABLE IF NOT EXISTS public.audio_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  text_hash text NOT NULL,
  language_code text NOT NULL,
  voice_name text NOT NULL,
  response_format text NOT NULL DEFAULT 'mp3',
  audio_base64 text NOT NULL,
  duration_seconds numeric,
  source_type text,
  source_record_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  UNIQUE (user_id, text_hash, language_code, voice_name, response_format)
);
CREATE INDEX IF NOT EXISTS audio_cache_lookup_idx
  ON public.audio_cache (text_hash, language_code, voice_name, response_format);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.audio_cache TO authenticated;
GRANT ALL ON public.audio_cache TO service_role;

ALTER TABLE public.audio_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read their own audio cache"
  ON public.audio_cache FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Users insert their own audio cache"
  ON public.audio_cache FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete their own audio cache"
  ON public.audio_cache FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Voice tested-status registry (admin-managed)
CREATE TABLE IF NOT EXISTS public.yarngpt_voice_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  language_code text NOT NULL,
  voice_name text NOT NULL,
  tested boolean NOT NULL DEFAULT false,
  enabled boolean NOT NULL DEFAULT false,
  notes text,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (language_code, voice_name)
);

GRANT SELECT ON public.yarngpt_voice_status TO authenticated;
GRANT ALL ON public.yarngpt_voice_status TO service_role;

ALTER TABLE public.yarngpt_voice_status ENABLE ROW LEVEL SECURITY;

-- Any authenticated user may read the tested/enabled map (needed to render the
-- voice selector). Only service_role writes (via server functions).
CREATE POLICY "Anyone signed-in can read voice status"
  ON public.yarngpt_voice_status FOR SELECT TO authenticated
  USING (true);

-- Seed baseline voices (tested=false everywhere; admin flips after validating).
INSERT INTO public.yarngpt_voice_status (language_code, voice_name, tested, enabled) VALUES
  ('en','Idera',false,true),
  ('en','Emma',false,true),
  ('en','Zainab',false,true),
  ('yo','Wura',false,true),
  ('yo','Femi',false,true),
  ('ha','Zainab',false,true),
  ('ha','Umar',false,true),
  ('ig','Chinenye',false,true),
  ('ig','Adaora',false,true)
ON CONFLICT (language_code, voice_name) DO NOTHING;
