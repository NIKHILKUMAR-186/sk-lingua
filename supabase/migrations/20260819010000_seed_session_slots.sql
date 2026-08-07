-- ============================================================
-- Seed session_slots for demo booking
-- The demo booking form now fetches real available time slots
-- from the session_slots table. This migration seeds slots for
-- the next 30 days so the form has data to display.
--
-- NOTE: The languages array uses short codes (e.g. 'fr', 'es')
-- matching the LANGUAGES constant in src/lib/languages.ts
-- ============================================================

DO $$
DECLARE
  v_day date;
  v_time text;
  v_times text[] := ARRAY['09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'];
  v_langs text[];
BEGIN
  -- Loop through next 30 days
  FOR i IN 0..29 LOOP
    v_day := CURRENT_DATE + i;

    -- For each day, create slots for each time
    FOREACH v_time IN ARRAY v_times LOOP
      -- Skip past times for today
      IF v_day = CURRENT_DATE AND v_time <= TO_CHAR(NOW(), 'HH24:MI') THEN
        CONTINUE;
      END IF;

      -- Language list varies by time slot (using short codes)
      IF v_time IN ('09:00', '10:00', '11:00') THEN
        v_langs := ARRAY['en', 'hi', 'fr'];
      ELSIF v_time IN ('14:00', '15:00', '16:00') THEN
        v_langs := ARRAY['es', 'de', 'fr', 'en'];
      ELSE
        v_langs := ARRAY['fr', 'es', 'de', 'ja', 'en', 'hi'];
      END IF;

      -- Insert the slot
      INSERT INTO public.session_slots (
        slot_date,
        slot_time_start,
        slot_time_end,
        capacity,
        booked_count,
        status,
        languages,
        created_at,
        updated_at
      ) VALUES (
        v_day,
        v_time::time,
        (v_time::time + interval '30 minutes')::time,
        5,
        0,
        'available',
        v_langs,
        now(),
        now()
      )
      ON CONFLICT (slot_date, slot_time_start, slot_time_end) DO NOTHING;
    END LOOP;
  END LOOP;

  RAISE NOTICE 'Seeded session slots for the next 30 days.';
END $$;