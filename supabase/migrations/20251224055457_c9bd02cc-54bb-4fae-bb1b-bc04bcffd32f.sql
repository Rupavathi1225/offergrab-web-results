-- Allow new click types used by /landing2 tracking
ALTER TABLE public.clicks DROP CONSTRAINT IF EXISTS clicks_click_type_check;
ALTER TABLE public.clicks
  ADD CONSTRAINT clicks_click_type_check
  CHECK (
    click_type = ANY (
      ARRAY[
        'related_search'::text,
        'web_result'::text,
        'prelanding_submit'::text,
        'landing2_view'::text,
        'landing2_click'::text,
        'fallback_redirect'::text
      ]
    )
  );