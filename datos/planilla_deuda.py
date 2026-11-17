"""Planilla de deuda Cosemar (recolección, ID 3447-86-LR23): debido vs tramitado por mes, resumen anual, proyección y alzas.
Lee tablero/store/pagos_contrato.json y alzas_contrato.json (generados por datos/historico_pagos.js). Uso: python3 datos/planilla_deuda.py"""
import json, os, datetime as dt
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

R = os.path.join(os.path.dirname(__file__), '..')
pagos = json.load(open(os.path.join(R, 'tablero/store/pagos_contrato.json')))['rows']
alzas = json.load(open(os.path.join(R, 'tablero/store/alzas_contrato.json')))['rows']
OUT = os.path.join(R, 'entregables', 'Deuda_Cosemar_recoleccion_3447-86-LR23.xlsx')

AZUL, NEGRO = Font(color='0000FF'), Font(color='000000')
B = Font(bold=True); H = Font(bold=True, color='FFFFFF'); HF = PatternFill('solid', fgColor='1F3864')
AM = PatternFill('solid', fgColor='FFF2CC'); RO = Font(color='C00000', bold=True)
thin = Side(style='thin', color='BFBFBF'); BOX = Border(top=thin, bottom=thin, left=thin, right=thin)
CLP = '"$"#,##0;[Red]-"$"#,##0;"$"0'; MES = 'mmm-yy'
d = lambda p: dt.date(int(p[:4]), int(p[5:7]), 1)

wb = Workbook()

def cabecera(ws, titulo, sub, cols, fila=4):
    ws['A1'] = titulo; ws['A1'].font = Font(bold=True, size=14)
    ws['A2'] = sub; ws['A2'].font = Font(italic=True, color='595959')
    for i, (c, w) in enumerate(cols, 1):
        x = ws.cell(row=fila, column=i, value=c); x.font = H; x.fill = HF; x.alignment = Alignment(wrap_text=True, vertical='center'); x.border = BOX
        ws.column_dimensions[get_column_letter(i)].width = w
    ws.row_dimensions[fila].height = 32; ws.freeze_panes = ws.cell(row=fila + 1, column=2)

# ---- Precios: valor mensual bruto que rige desde cada mes (supuestos editables en azul) ----
wp = wb.active; wp.title = 'Precios'
cabecera(wp, 'Valor mensual bruto vigente por tramo', 'Azul = cifra del acto citado (editable). Debido según decretos: contrato y decretos dictados. Debido según bases: agrega el IPC 4,3% devengado sin decreto (memo 2097/2026).',
         [('Rige desde', 12), ('Debido según decretos ($)', 22), ('Debido según bases ($)', 22), ('Acto', 52)])
cap_dec, cap_bas = ['Contrato', 'Decreto'], ['Contrato', 'Decreto', 'Bases sin decreto']
tramos = sorted({a['rigeDesde'] for a in alzas if a['rigeDesde'] and a['bruto'] is not None and a['capa'] in cap_bas})
def rige(p, capas):
    xs = sorted([a for a in alzas if a['capa'] in capas and a['rigeDesde'] and a['bruto'] is not None and a['rigeDesde'] <= p], key=lambda a: a['rigeDesde'])
    return xs[-1]
for i, t in enumerate(tramos):
    r = 5 + i; a, b = rige(t, cap_dec), rige(t, cap_bas)
    wp.cell(row=r, column=1, value=d(t)).number_format = MES
    for c, v in ((2, a['bruto']), (3, b['bruto'])):
        x = wp.cell(row=r, column=c, value=v); x.font = AZUL; x.number_format = CLP
    wp.cell(row=r, column=4, value=a['acto'] + ('' if a is b else ' · bases: ' + b['acto']))
PR = f'Precios!$A$5:$A${4 + len(tramos)}'; PD = f'Precios!$B$5:$B${4 + len(tramos)}'; PB = f'Precios!$C$5:$C${4 + len(tramos)}'

# ---- Mensual ----
wm = wb.create_sheet('Mensual')
cols = [('Mes de servicio', 11), ('Año', 7), ('Estado', 15), ('Memo', 24), ('Factura', 10), ('OC', 16), ('Tramitado ($)', 15), ('Retroactivo asignado ($)', 15),
        ('Retroactivo remitido este mes ($)', 15), ('Multa descontada ($)', 13), ('Debido según decretos ($)', 16), ('Debido según bases ($)', 16),
        ('Adeudado por decretos ($)', 15), ('Adicional según bases ($)', 15), ('Deuda acumulada por decretos ($)', 17), ('Deuda acumulada según bases ($)', 17), ('Nota', 60), ('Respaldo', 12)]
cabecera(wm, 'Debido y tramitado por mes de servicio', 'Montos brutos con IVA. Negro = fórmula; azul = dato del documento. «Tramitado» es el monto del memo de pago u OC; ningún mes tiene comprobante de pago efectivo en el expediente.', cols)
retro_mes = {}
for p in pagos:
    if p['ajusteRetro'] and p['ajusteRetroPagadoEn']: retro_mes[p['ajusteRetroPagadoEn']] = retro_mes.get(p['ajusteRetroPagadoEn'], 0) + p['ajusteRetro']
F0 = 5
for i, p in enumerate(pagos):
    r = F0 + i
    wm.cell(row=r, column=1, value=d(p['periodo'])).number_format = MES
    wm.cell(row=r, column=2, value=f'=YEAR(A{r})')
    for c, v in ((3, p['estado']), (4, p['memo']), (5, p['factura']), (6, p['oc'])): wm.cell(row=r, column=c, value=v)
    for c, v in ((7, p['tramitado']), (8, p['ajusteRetro']), (9, retro_mes.get(p['periodo'], 0)), (10, p['multa'])):
        x = wm.cell(row=r, column=c, value=v); x.font = AZUL; x.number_format = CLP
    f = {11: f'=LOOKUP(A{r},{PR},{PD})', 12: f'=LOOKUP(A{r},{PR},{PB})', 13: f'=K{r}-G{r}-H{r}', 14: f'=L{r}-K{r}',
         15: (f'=K{r}-G{r}-I{r}' if i == 0 else f'=O{r-1}+K{r}-G{r}-I{r}'), 16: (f'=N{r}' if i == 0 else f'=P{r-1}+N{r}')}
    for c, v in f.items(): x = wm.cell(row=r, column=c, value=v); x.number_format = CLP
    wm.cell(row=r, column=17, value=p['nota'] or '').alignment = Alignment(wrap_text=True, vertical='top')
    if p['respaldo']:
        x = wm.cell(row=r, column=18, value='Abrir'); x.hyperlink = p['respaldo']; x.font = Font(color='0563C1', underline='single')
    if p['nota'] and ('por verificar' in p['nota'] or 'no se halló' in p['nota']):
        for c in range(1, 19): wm.cell(row=r, column=c).fill = AM
FL = F0 + len(pagos) - 1
rt = FL + 1
wm.cell(row=rt, column=1, value='Total').font = B
for c in (7, 8, 9, 10, 11, 12, 13, 14):
    L = get_column_letter(c); x = wm.cell(row=rt, column=c, value=f'=SUM({L}{F0}:{L}{FL})'); x.font = B; x.number_format = CLP

# ---- Anual ----
wa = wb.create_sheet('Anual', 0)
cabecera(wa, 'Resumen de deuda con Cosemar por año', 'Contrato de recolección P.P. 060/2023, ID 3447-86-LR23. Por mes de servicio, montos brutos. El retroactivo del D.A. 2.459 se cuenta en el año del servicio que paga. Corte: octubre de 2026.',
         [('Año', 10), ('Meses', 8), ('Debido según decretos ($)', 20), ('Tramitado + retroactivo ($)', 20), ('Multas descontadas ($)', 16), ('Adeudado por decretos ($)', 18), ('Adicional según bases ($)', 18), ('Total adeudado ($)', 18)])
anios = sorted({p['anio'] for p in pagos}); M = f'Mensual!$B${F0}:$B${FL}'
for i, y in enumerate(anios):
    r = 5 + i; wa.cell(row=r, column=1, value=y)
    wa.cell(row=r, column=2, value=f'=COUNTIF({M},A{r})')
    for c, col in ((3, 'K'), (5, 'J'), (6, 'M'), (7, 'N')):
        x = wa.cell(row=r, column=c, value=f'=SUMIF({M},A{r},Mensual!${col}${F0}:${col}${FL})'); x.number_format = CLP
    x = wa.cell(row=r, column=4, value=f'=SUMIF({M},A{r},Mensual!$G${F0}:$G${FL})+SUMIF({M},A{r},Mensual!$H${F0}:$H${FL})'); x.number_format = CLP
    x = wa.cell(row=r, column=8, value=f'=F{r}+G{r}'); x.number_format = CLP
ra = 5 + len(anios); wa.cell(row=ra, column=1, value='Total').font = B
for c in range(2, 9):
    L = get_column_letter(c); x = wa.cell(row=ra, column=c, value=f'=SUM({L}5:{L}{ra-1})'); x.font = B; x.number_format = CLP if c > 2 else 'General'
for c in (6, 8): wa.cell(row=ra, column=c).font = RO
wa.cell(row=ra + 2, column=1, value='Lectura').font = B
notas = ['Adeudado por decretos: el D.A. 3.957/2026 fija $267.940.006 desde jul-2026; las OC y facturas siguen al valor del D.A. 2.459 ($261.767.423). Incluye $7 de redondeo del retroactivo.',
         'Adicional según bases: IPC 4,3% del 2.º año (art. 9 BA), pedido por carta de Cosemar del 10-07-2026 y concordado el 14-07-2026; sin decreto (memos 1490, 2013 y 2097/2026), anexo suspendido por falta de certificado presupuestario.',
         'La multa de 60 UTM descontada en jun-2026 (D.A. 2.463 y 3.649/2026) es una deducción legítima, no deuda.',
         'Pendiente de verificar: oct-2024 (solo memo que pide OC) y dic-2025 (el archivo del memo 274/2026 contiene el texto de oct-2025).']
for i, n in enumerate(notas):
    x = wa.cell(row=ra + 3 + i, column=1, value=n); wa.merge_cells(start_row=ra + 3 + i, start_column=1, end_row=ra + 3 + i, end_column=8); x.alignment = Alignment(wrap_text=True); wa.row_dimensions[ra + 3 + i].height = 30

# ---- Proyección ----
wq = wb.create_sheet('Proyección', 1)
cabecera(wq, 'Proyección de la deuda a junio de 2027 si no se regulariza', 'Repite la diferencia mensual del último mes registrado. No incluye el reajuste IPC del 3.er año (desde jul-2027).',
         [('Mes', 11), ('Adeudado por decretos ($)', 18), ('Adicional según bases ($)', 18), ('Acumulado por decretos ($)', 20), ('Acumulado según bases ($)', 20), ('Total acumulado ($)', 18)])
u = pagos[-1]['periodo']; y, m = int(u[:4]), int(u[5:7]); meses = []
while True:
    m += 1
    if m > 12: m, y = 1, y + 1
    p = f'{y}-{m:02d}'
    if p > '2027-06': break
    meses.append(p)
for i, p in enumerate(meses):
    r = 5 + i; wq.cell(row=r, column=1, value=d(p)).number_format = MES
    f = {2: f'=Mensual!$K${FL}-Mensual!$G${FL}', 3: f'=Mensual!$N${FL}', 4: (f'=Mensual!$O${FL}+B{r}' if i == 0 else f'=D{r-1}+B{r}'),
         5: (f'=Mensual!$P${FL}+C{r}' if i == 0 else f'=E{r-1}+C{r}'), 6: f'=D{r}+E{r}'}
    for c, v in f.items(): x = wq.cell(row=r, column=c, value=v); x.number_format = CLP
for c in (4, 5, 6): wq.cell(row=4 + len(meses), column=c).font = RO

# ---- Alzas ----
wz = wb.create_sheet('Alzas')
cabecera(wz, 'Alzas, decretos, anexos y cartas de Cosemar', 'Solo «Contrato» y «Decreto» son exigibles hoy; «Bases sin decreto» es el derecho del art. 9 BA por formalizar.',
         [('ID', 6), ('Fecha', 11), ('Tipo', 14), ('Acto', 34), ('Efecto', 70), ('Neto ($)', 15), ('Bruto ($)', 15), ('Rige desde', 11), ('Estado', 22), ('Capa', 16), ('Respaldo', 10)])
for i, a in enumerate(alzas):
    r = 5 + i
    vals = [a['id'], dt.date.fromisoformat(a['fecha']), a['tipo'], a['acto'], a['efecto'], a['neto'], a['bruto'], d(a['rigeDesde']) if a['rigeDesde'] else None, a['estado'], a['capa']]
    for c, v in enumerate(vals, 1):
        x = wz.cell(row=r, column=c, value=v); x.alignment = Alignment(wrap_text=True, vertical='top')
        if c == 2: x.number_format = 'dd-mm-yyyy'
        if c in (6, 7) and v is not None: x.number_format = CLP; x.font = AZUL
        if c == 8 and v: x.number_format = MES
    x = wz.cell(row=r, column=11, value='Abrir'); x.hyperlink = a['respaldo']; x.font = Font(color='0563C1', underline='single')

wb.save(OUT); print(OUT)
