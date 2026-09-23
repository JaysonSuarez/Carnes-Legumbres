ALTER TABLE public.cl_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cl_expenses ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.cl_notifications, public.cl_expenses FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.cl_notifications, public.cl_expenses TO service_role;
