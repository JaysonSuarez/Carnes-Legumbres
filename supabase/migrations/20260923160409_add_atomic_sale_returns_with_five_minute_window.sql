CREATE TABLE public.cl_sale_returns (
  id text PRIMARY KEY,
  "saleId" text NOT NULL UNIQUE REFERENCES carne_legumbre."Sale"(id) ON DELETE RESTRICT,
  "tenantId" text NOT NULL,
  "refundAmount" double precision NOT NULL CHECK ("refundAmount" >= 0),
  "paymentMethod" text NOT NULL,
  items jsonb NOT NULL,
  "returnedAt" timestamp without time zone NOT NULL DEFAULT timezone('UTC', now())
);

ALTER TABLE public.cl_sale_returns ENABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE public.cl_sale_returns TO service_role;

CREATE OR REPLACE FUNCTION public.return_cl_sale(p_sale_id text, p_tenant_id text, p_return_id text)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  v_sale carne_legumbre."Sale"%ROWTYPE;
  v_credit carne_legumbre."Credit"%ROWTYPE;
  v_items jsonb;
  v_item_count integer;
  v_distinct_products integer;
  v_updated_products integer;
  v_returned_at timestamp without time zone := timezone('UTC', now());
BEGIN
  SELECT * INTO v_sale FROM carne_legumbre."Sale"
  WHERE id = p_sale_id AND "tenantId" = p_tenant_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'SALE_NOT_FOUND'; END IF;
  IF v_sale."createdAt" IS NULL OR v_sale."createdAt" <= timezone('UTC', now()) - interval '5 minutes' THEN
    RAISE EXCEPTION 'RETURN_WINDOW_EXPIRED';
  END IF;
  IF EXISTS (SELECT 1 FROM public.cl_sale_returns WHERE "saleId" = p_sale_id) THEN
    RAISE EXCEPTION 'SALE_ALREADY_RETURNED';
  END IF;

  SELECT jsonb_agg(jsonb_build_object(
      'productId', si."productId", 'productName', p.name, 'quantity', si.quantity,
      'unitPrice', si."unitPrice", 'subtotal', si.subtotal
    )), count(*), count(DISTINCT si."productId")
  INTO v_items, v_item_count, v_distinct_products
  FROM carne_legumbre."SaleItem" si
  LEFT JOIN carne_legumbre."Product" p ON p.id = si."productId" AND p."tenantId" = si."tenantId"
  WHERE si."saleId" = p_sale_id AND si."tenantId" = p_tenant_id;
  IF COALESCE(v_item_count, 0) = 0 THEN RAISE EXCEPTION 'SALE_ITEMS_NOT_FOUND'; END IF;

  IF upper(v_sale."paymentMethod") = 'CREDITO' THEN
    SELECT * INTO v_credit FROM carne_legumbre."Credit"
    WHERE "saleId" = p_sale_id AND "tenantId" = p_tenant_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'CREDIT_NOT_FOUND'; END IF;
    IF EXISTS (SELECT 1 FROM carne_legumbre."CreditPayment"
      WHERE "creditId" = v_credit.id AND "tenantId" = p_tenant_id) THEN
      RAISE EXCEPTION 'CREDIT_HAS_PAYMENTS';
    END IF;
    UPDATE carne_legumbre."Credit" SET "currentBalance" = 0, status = 'DEVUELTO', "updatedAt" = v_returned_at
    WHERE id = v_credit.id AND "tenantId" = p_tenant_id;
  END IF;

  WITH quantities AS (
    SELECT "productId", sum(quantity) AS quantity FROM carne_legumbre."SaleItem"
    WHERE "saleId" = p_sale_id AND "tenantId" = p_tenant_id GROUP BY "productId"
  )
  UPDATE carne_legumbre."Product" p
  SET "currentStock" = p."currentStock" + quantities.quantity, "updatedAt" = v_returned_at
  FROM quantities WHERE p.id = quantities."productId" AND p."tenantId" = p_tenant_id;
  GET DIAGNOSTICS v_updated_products = ROW_COUNT;
  IF v_updated_products <> v_distinct_products THEN RAISE EXCEPTION 'RETURN_STOCK_UPDATE_FAILED'; END IF;

  INSERT INTO public.cl_sale_returns (id, "saleId", "tenantId", "refundAmount", "paymentMethod", items, "returnedAt")
  VALUES (p_return_id, p_sale_id, p_tenant_id, v_sale."totalAmount", v_sale."paymentMethod", COALESCE(v_items, '[]'::jsonb), v_returned_at);

  RETURN jsonb_build_object('saleCode', v_sale."saleCode", 'refundAmount', v_sale."totalAmount",
    'paymentMethod', v_sale."paymentMethod", 'returnedAt', v_returned_at);
END;
$$;

REVOKE ALL ON FUNCTION public.return_cl_sale(text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.return_cl_sale(text, text, text) TO service_role;

CREATE OR REPLACE FUNCTION public.reject_payment_for_returned_credit()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE v_status text;
BEGIN
  SELECT status INTO v_status FROM carne_legumbre."Credit"
  WHERE id = NEW."creditId" AND "tenantId" = NEW."tenantId" FOR UPDATE;
  IF v_status = 'DEVUELTO' THEN RAISE EXCEPTION 'CREDIT_RETURNED'; END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.reject_payment_for_returned_credit() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS cl_reject_payment_for_returned_credit ON carne_legumbre."CreditPayment";
CREATE TRIGGER cl_reject_payment_for_returned_credit
BEFORE INSERT ON carne_legumbre."CreditPayment"
FOR EACH ROW EXECUTE FUNCTION public.reject_payment_for_returned_credit();

NOTIFY pgrst, 'reload schema';
