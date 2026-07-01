UPDATE public.cases
SET
  title = 'Case Scenario 1: Allergy (Allergic Rhinitis)',
  correct_answer_json = jsonb_set(
    correct_answer_json - 'opening_patient_line',
    '{questions,0,choices,0}',
    to_jsonb('Good morning. Who is the medicine for?'::text),
    false
  )
WHERE id = '7edab79d-3920-4b28-8d31-7f3a5d86e001';

UPDATE public.cases
SET
  title = 'Case Scenario 2: Pain (Headache - OTC Analgesics)',
  correct_answer_json = jsonb_set(
    correct_answer_json - 'opening_patient_line',
    '{questions,0,choices,0}',
    to_jsonb('Hello. Who is the medicine for?'::text),
    false
  )
WHERE id = '7edab79d-3920-4b28-8d31-7f3a5d86e002';
