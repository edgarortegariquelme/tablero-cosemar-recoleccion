"""Planilla del contrato de disposición final Cosemar (P.P. 104/2024, ID 3447-187-LR24): debido = toneladas × tarifa vigente × 1,19 frente a lo tramitado.
Lee tablero/store/disposicion_final_pagos.json y disposicion_final_alzas.json (de datos/disposicion_final.js). Uso: python3 datos/planilla_disposicion.py"""
import json, os, datetime as dt
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

R = os.path.join(os.path.dirname(__file__), '..')
pagos = json.load(open(os.path.join(R, 'tablero/store/disposicion_final_pagos.json')))['rows']
actos = json.load(open(os.path.join(R, 'tablero/store/disposicion_final_alzas.json')))['rows']
OUT = os.path.join(R, 'entregables', 'Deuda_Cosemar_disposicion_final_3447-187-LR24.xlsx')
AZUL = Font(color='0000FF'); B = Font(bold=True); H = Font(bold=True, color='FFFFFF'); HF = PatternFill('solid', fgColor='1F3864'); AM = PatternFill('solid', fgColor='FFF2CC')
thin = Side(style='thin', color='BFBFBF'); BOX = Border(top=thin, bottom=thin, left=thin, right=thin)
CLP = '"$"#,##0;[Red]-"$"#,##0;"$"0'; TON = '#,##0.00'; MES = 'mmm-yy'
d = lambda p: dt.date(int(p[:4]), int(p[5:7]), 1)
LINK = Font(color='0563C1', underline='single')

def cab(ws, t, s, cols, f=4):
    ws['A1'] = t; ws['A1'].font = Font(bold=True, size=14); ws['A2'] = s; ws['A2'].font = Font(italic=True, color='595959')
    for i, (c, w) in enumerate(cols, 1):
        x = ws.cell(row=f, column=i, value=c); x.font = H; x.fill = HF; x.alignment = Alignment(wrap_text=True, vertical='center'); x.border = BOX
        ws.column_dimensions[get_column_letter(i)].width = w
    ws.row_dimensions[f].height = 32; ws.freeze_panes = ws.cell(row=f + 1, column=2)

wb = Workbook()
# Tarifas
wt = wb.active; wt.title = 'Tarifas'
cab(wt, 'Tarifa neta por tonelada vigente', 'Azul = cifra del acto (editable). Solo actos exigibles: contrato y decretos.', [('Rige desde', 12), ('Tarifa neta ($/t)', 16), ('Acto', 60)])
tr = sorted({(a['rigeDesde'], a['tarifaNeta'], a['acto']) for a in actos if a['capa'] in ('Contrato', 'Decreto') and a['rigeDesde'] and a['tarifaNeta']})
vistos = {}
for r in tr: vistos[r[0]] = r
for i, (rd, tf, ac) in enumerate(sorted(vistos.values())):
    wt.cell(row=5 + i, column=1, value=d(rd)).number_format = MES
    x = wt.cell(row=5 + i, column=2, value=tf); x.font = AZUL; x.number_format = CLP
    wt.cell(row=5 + i, column=3, value=ac)
n = len(vistos); TR = f'Tarifas!$A$5:$A${4 + n}'; TV = f'Tarifas!$B$5:$B${4 + n}'

# Mensual
wm = wb.create_sheet('Mensual')
cab(wm, 'Debido y tramitado por mes de servicio', 'Debido = ROUND(ROUND(toneladas × tarifa) × 1,19). Azul = dato del documento. Amarillo = por verificar.',
    [('Mes de servicio', 11), ('Año', 7), ('Toneladas', 11), ('Tarifa neta', 11), ('Debido neto ($)', 15), ('Debido bruto ($)', 15), ('Tramitado bruto ($)', 15), ('Diferencia ($)', 12),
     ('Estado', 15), ('OC', 16), ('Factura', 9), ('Memo OC', 16), ('Memo pago', 16), ('Fecha memo pago', 12), ('Meses hasta memo de pago', 10), ('Nota', 60), ('Respaldo', 10)])
F0 = 5
for i, p in enumerate(pagos):
    r = F0 + i
    wm.cell(row=r, column=1, value=d(p['periodo'])).number_format = MES
    wm.cell(row=r, column=2, value=f'=YEAR(A{r})')
    x = wm.cell(row=r, column=3, value=p['toneladas']); x.font = AZUL; x.number_format = TON
    wm.cell(row=r, column=4, value=f'=LOOKUP(A{r},{TR},{TV})').number_format = CLP
    wm.cell(row=r, column=5, value=f'=ROUND(C{r}*D{r},0)').number_format = CLP
    wm.cell(row=r, column=6, value=f'=ROUND(E{r}*1.19,0)').number_format = CLP
    x = wm.cell(row=r, column=7, value=p['tramitado']); x.font = AZUL; x.number_format = CLP
    wm.cell(row=r, column=8, value=f'=G{r}-F{r}').number_format = CLP
    for c, v in ((9, p['estado']), (10, p['oc']), (11, p['factura']), (12, p['memoOC']), (13, p['memoPago'])): wm.cell(row=r, column=c, value=v)
    if p['fechaMemoPago']:
        wm.cell(row=r, column=14, value=dt.date.fromisoformat(p['fechaMemoPago'])).number_format = 'dd-mm-yyyy'
        wm.cell(row=r, column=15, value=f'=(YEAR(N{r})-YEAR(A{r}))*12+MONTH(N{r})-MONTH(A{r})')
    wm.cell(row=r, column=16, value=p['nota'] or '').alignment = Alignment(wrap_text=True, vertical='top')
    if p['respaldo']: x = wm.cell(row=r, column=17, value='Abrir'); x.hyperlink = p['respaldo']; x.font = LINK
    if p['nota'] and ('verificar' in p['nota'] or not p['memoPago']):
        for c in range(1, 18): wm.cell(row=r, column=c).fill = AM
FL = F0 + len(pagos) - 1; rt = FL + 1
wm.cell(row=rt, column=1, value='Total').font = B
for c, fmt in ((3, TON), (5, CLP), (6, CLP), (7, CLP), (8, CLP)):
    L = get_column_letter(c); x = wm.cell(row=rt, column=c, value=f'=SUM({L}{F0}:{L}{FL})'); x.font = B; x.number_format = fmt

# Anual
wa = wb.create_sheet('Anual', 0)
cab(wa, 'Disposición final Cosemar · resumen por año', 'P.P. 104/2024, ID 3447-187-LR24. Montos brutos por mes de servicio. Corte: octubre de 2026.',
    [('Año', 10), ('Meses', 8), ('Toneladas', 12), ('Promedio t/mes', 12), ('Debido bruto ($)', 18), ('Tramitado bruto ($)', 18), ('Diferencia ($)', 14), ('Sin memo de pago ($)', 18)])
anios = sorted({p['anio'] for p in pagos}); M = f'Mensual!$B${F0}:$B${FL}'
for i, y in enumerate(anios):
    r = 5 + i; wa.cell(row=r, column=1, value=y)
    wa.cell(row=r, column=2, value=f'=COUNTIF({M},A{r})')
    wa.cell(row=r, column=3, value=f'=SUMIF({M},A{r},Mensual!$C${F0}:$C${FL})').number_format = TON
    wa.cell(row=r, column=4, value=f'=C{r}/B{r}').number_format = TON
    for c, col in ((5, 'F'), (6, 'G'), (7, 'H')): wa.cell(row=r, column=c, value=f'=SUMIF({M},A{r},Mensual!${col}${F0}:${col}${FL})').number_format = CLP
    wa.cell(row=r, column=8, value=f'=SUMIFS(Mensual!$G${F0}:$G${FL},{M},A{r},Mensual!$M${F0}:$M${FL},"")').number_format = CLP
ra = 5 + len(anios); wa.cell(row=ra, column=1, value='Total').font = B
for c in range(2, 9):
    if c == 4: x = wa.cell(row=ra, column=4, value=f'=C{ra}/B{ra}'); x.number_format = TON; continue
    L = get_column_letter(c); x = wa.cell(row=ra, column=c, value=f'=SUM({L}5:{L}{ra-1})'); x.font = B; x.number_format = CLP if c > 4 else (TON if c == 3 else 'General')
notas = ['Sin diferencias de precio: cada mes tramitado coincide con toneladas × tarifa vigente × 1,19 (diferencias de redondeo de $1).',
         'Sin memo de pago: julio y agosto de 2025 (solo memo que pide OC, 1820/2025) y octubre de 2026 (OC pedida el 05-11-2026).',
         'El D.A. 2.737/2026 proyecta 2026 con un promedio 2025 de 4.657,85 t/mes; los documentos mensuales suman un promedio de 4.574,38 t/mes. Verificar la base usada.',
         'Oficio 2025 que pedía rebajar 35% la tarifa: no se halló anexo ni decreto; las OC y facturas 2025 están a $14.836 neto.',
         'Próximo reajuste: enero de 2027, por el IPC 2026 (art. 40 BT). Borrador de memo del 13-11-2026 con el porcentaje en blanco.']
wa.cell(row=ra + 2, column=1, value='Lectura').font = B
for i, t in enumerate(notas):
    x = wa.cell(row=ra + 3 + i, column=1, value=t); wa.merge_cells(start_row=ra + 3 + i, start_column=1, end_row=ra + 3 + i, end_column=8); x.alignment = Alignment(wrap_text=True); wa.row_dimensions[ra + 3 + i].height = 30

# Actos
wz = wb.create_sheet('Actos')
cab(wz, 'Actos del contrato y su efecto en la tarifa', 'Solo «Contrato» y «Decreto» fijan la tarifa exigible.', [('ID', 6), ('Fecha', 11), ('Tipo', 14), ('Acto', 40), ('Efecto', 70), ('Tarifa neta ($/t)', 14), ('Rige desde', 11), ('Estado', 22), ('Capa', 12), ('Respaldo', 10)])
for i, a in enumerate(actos):
    r = 5 + i
    for c, v in enumerate([a['id'], dt.date.fromisoformat(a['fecha']), a['tipo'], a['acto'], a['efecto'], a['tarifaNeta'], d(a['rigeDesde']) if a['rigeDesde'] else None, a['estado'], a['capa']], 1):
        x = wz.cell(row=r, column=c, value=v); x.alignment = Alignment(wrap_text=True, vertical='top')
        if c == 2: x.number_format = 'dd-mm-yyyy'
        if c == 6 and v is not None: x.number_format = CLP; x.font = AZUL
        if c == 7 and v: x.number_format = MES
    if a['respaldo']: x = wz.cell(row=r, column=10, value='Abrir'); x.hyperlink = a['respaldo']; x.font = LINK
wb.save(OUT); print(OUT)
