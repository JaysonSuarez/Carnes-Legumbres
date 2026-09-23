GRANT USAGE ON SCHEMA carne_legumbre TO service_role;
GRANT SELECT, UPDATE ON TABLE
  carne_legumbre."Sale",
  carne_legumbre."SaleItem",
  carne_legumbre."Product",
  carne_legumbre."Credit",
  carne_legumbre."CreditPayment"
TO service_role;
