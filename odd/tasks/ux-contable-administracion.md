# UX contable de administración — pasos 4 a 7

Objective: apply the pending frontend-only items of `docs/ux-administracion/08-analisis-contable-ux-2026-11-08.md` (H-07 to H-19, items 010 and 017 of the 2026-08-26 audit, and the fiscal voucher number bug). The backend is read-only.
Branch: `feat/ux-contable-administracion` (from `develop`). Delivery: work-unit commits, push/PR left to the user. Test runner: `npm run test:ci` (Vitest), plus `npm run lint` and `npm run build`.

## Specs

- **S1 (shared helpers):** `core/i18n/formato.ts` exposes `formatCuit` (`30667788994` → `30-66778899-4`, input already with dashes is normalized, anything that is not 11 digits is returned unchanged) and `etiquetaEstado` (technical enum → plain Spanish label; unknown values are humanized: `ALGO_RARO` → `Algo raro`). Every new display of CUIT or state goes through them.
- **S2 (H-08 language):** no technical enum, code formula, task code or English jargon visible in admin screens. Required replacements, verbatim from the report: `PENDIENTE_AFIP` → «Pendiente ARCA»; `CREDITO_COBRANZA` → «Cobro»; formula `sum(Cobranza.montoRemanente)` shown as plain text (keep the formula in a secondary, collapsed place or tooltip); «Libro de Entrada Inmutable (Append-Only) para Auditoría Financiera SAE» → «Movimientos de cuenta corriente. No se pueden borrar ni editar.»; «Workflow CBU Maker-Checker» → «Cuentas bancarias (requiere aprobación)»; «Centro de Costo Imputable (V3-S3-03)» → «Centro de costo»; «Módulo Profesional de Compras» → «Compras»; «Resumen operativo 360» → «Resumen»; «Tablero de gobierno (13 KPIs con drill-down)» → «Indicadores»; one form of address (voseo); visible «AFIP» → «ARCA» where it names the agency (button labels such as «CITI Ventas (AFIP)» become «CITI Ventas (ARCA)»).
- **S3 (H-09 color):** neutral by default, amber for "attention", red only for overdue or error, always with text. Invoice balance is red only when the invoice is `VENCIDA`. Zero amounts in muted grey. Aging cards with $0 are not colored. «Total vencido» is red only when > 0.
- **S4 (H-11 forms):** amount fields start empty (not `0`); validation messages appear on blur or submit, not before typing (the arqueo difference warning appears only after the counted amount is entered); fix «Caja a arqueada» → «Caja a arquear»; the cash box selector does not truncate the name.
- **S5 (017 treasury history):** treasury shows the movements of the selected box (date, type, concept, amount, user if available) using an existing endpoint; if no endpoint exists, show nothing new and record it as a backend gap.
- **S6 (H-10 top bar by role):** users whose roles are only administrative (CONTADOR, and any role without operations access) do not see «Activas / Críticas / Disp.», «Institucional» nor «+ Nueva Emergencia»; the page title is not truncated; the menu marks a single active item (exact match for parent routes such as `/administracion`).
- **S7 (H-13 cobro/pago):** in Cuentas corrientes, when the selected third party is only a supplier, the main action is «Registrar pago» (or the cobro action is hidden if no pago flow exists in the screen) and the ledger opens on CXP.
- **S8 (H-12 + 010 cobro windows):** both cobro windows show who is being charged in the header; show «Fecha del cobro: hoy (dd/mm/aaaa)» as fixed text; title and button use the same word («Registrar cobro»); in the imputation window, selecting documents fills the total automatically and the user can still adjust it; the read-only «Moneda ARS» input becomes plain text.
- **S9 (H-07 tables):** Facturación B2C list gets a totals row (importe and saldo of the visible rows), search by invoice number or group, a date range filter on emission date, CSV export of the filtered list, the «Período» filter relabeled «Tipo» (it filters monthly/annual type), and numeric headers right-aligned like their values. The ledger (submayor) gets a «Saldo» running-balance column computed in the client (debe − haber, cumulative in date order).
- **S10 (H-15 to H-19 polish):** uppercase + letter-spaced + monospace only for very short labels; amounts use `font-variant-numeric: tabular-nums`; admin menu items use one icon family (no emoji); the dark hero banner in Cuentas corrientes is reduced to a normal page header; the constant «Tipo: MENSUAL» column is not repeated in every row when all rows share it (show it once or drop it); CUIT shown with `formatCuit` in Proveedores and Cuentas corrientes; Facturación shows a bulk-action bar when invoices are selected, with the actions that already exist (export selected; cobrar only if one is selected).
- **S11 (fiscal voucher bug):** in Comprobantes fiscales, punto de venta and número show as integers padded with zeros (`0004`, `00000001`), never as decimals (`0,004`).
- **S12 (015 analytics consolidation):** out of scope for this feature: structural, needs a product decision. Recorded as pending.

## Tasks

| ID | Specs | Route | Status | Evidence |
|---|---|---|---|---|
| T0 | steps 1-3 (H-01..H-05) | inline | done | `acdb51c` |
| T1 | S1 | inline | pending | |
| T2 | S2, S3, S8 (010), S9 (Facturación), S10 (Facturación parts), S11 | delegated (parallel unit A, Facturación + Comprobantes) | pending | |
| T3 | S2, S3, S7, S8 (registrar cobro), S9 (submayor), S10 (CC parts), Reportes language | delegated (parallel unit B, Cuentas corrientes + Reportes) | pending | |
| T4 | S2, S3, S4, S5 | delegated (parallel unit C, Tesorería) | pending | |
| T5 | S2, S6, S10 (menu, typography, Proveedores CUIT), Centro Adm./Compras/Proveedores language | delegated (parallel unit D, layout + Centro Adm. + Compras + Proveedores) | pending | |
| T6 | integration: full suite, lint, build, live check | inline | pending | |

Route evidence: units A-D are independent pieces of behavior with disjoint files and several minutes of work each, launched together (Writer trigger, parallel). The parent owns git and the shared helper file.

## Log

- **L1 (2026-11-08, user):** «Procede con todo»
- **L2:** context. The user previously asked: «Que quede pendiente de las mejoras de ux ui?». The answer listed steps 4-7, the voucher bug, 010, 017 and 015, plus backend-only gaps (not in scope).
- **L3:** decision. 015 (consolidate analytics) is left out: it is structural and needs a product decision.
