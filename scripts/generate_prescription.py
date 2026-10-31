import sys
import json
import os
import docx
from docx.shared import Pt, RGBColor

def generate_prescription(data_json_path, template_path, output_docx_path, output_pdf_path=None):
    if not os.path.exists(template_path):
        raise FileNotFoundError(f"Template not found at {template_path}")

    with open(data_json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    # Extract target values
    pet_name = data.get('petName') or 'Silky'
    breed = data.get('breed') or data.get('species') or 'CB'
    age = data.get('age') or '04 Years'
    gender = data.get('gender') or 'Female'
    consultation_date = data.get('consultationDate') or '16-10-2026 10:30 PM (V-1)'
    if '(V-' not in consultation_date:
        consultation_date = f"{consultation_date} (V-1)"

    owner_name = data.get('ownerName') or 'Pet Parent'
    owner_address = data.get('ownerAddress') or 'Kanpur'
    owner_phone = data.get('ownerPhone') or ''

    history = data.get('history') or 'Normal activity'
    temperature = data.get('temperature') or '101.2 F'
    if temperature and not str(temperature).endswith('F') and not str(temperature).endswith('C'):
        temperature = f"{temperature} F"

    clinical_signs = data.get('clinicalSigns') or data.get('diagnosis') or 'General Checkup'
    weight = data.get('weight') or '09.100 Kgs'
    if weight and not str(weight).lower().endswith('kg') and not str(weight).lower().endswith('kgs'):
        weight = f"{weight} Kgs"

    prognosis = data.get('prognosis') or 'Guarded'
    next_visit = data.get('nextVisitDate') or 'As Advised'
    advice = data.get('advice') or 'Blood Profile: Basic + BP + RBS'

    # Collect Rx medications
    administered = data.get('administeredItems', [])
    prescribed = data.get('prescribedItems', [])
    rx_lines = []

    for item in administered:
        name = item.get('name') or item.get('medicineName') or 'Medicine'
        route = item.get('route', 'IM')
        dosage = item.get('dosage', '')
        line = f"Inj. {name} {dosage} {route}".strip()
        rx_lines.append(line)

    for item in prescribed:
        name = item.get('name') or item.get('medicineName') or 'Medicine'
        dosage = item.get('dosage', '')
        inst = item.get('instructions', '')
        line = f"{name} {dosage} {inst}".strip()
        rx_lines.append(line)

    if not rx_lines:
        rx_lines = ['No medications prescribed for this visit.']

    # Open docx document
    doc = docx.Document(template_path)

    # 1. Update Pet details (P6)
    if len(doc.paragraphs) > 6:
        p6 = doc.paragraphs[6]
        p6.text = ''
        r_p6 = p6.add_run(f"Pet Name: {pet_name} ({breed}), Age: {age}, Gender: {gender}, Date: {consultation_date}")
        r_p6.font.name = 'Monotype Corsiva'
        r_p6.font.size = Pt(14)
        r_p6.italic = True
        r_p6.underline = True

    # 2. Update Owner details (P7)
    if len(doc.paragraphs) > 7:
        p7 = doc.paragraphs[7]
        p7.text = ''
        r_p7 = p7.add_run(f"Pet Owner: {owner_name}, {owner_address} Mobile: {owner_phone}")
        r_p7.font.name = 'Monotype Corsiva'
        r_p7.font.size = Pt(14)
        r_p7.italic = True
        r_p7.underline = True

    # 3. Two-Column Clinical Body
    # P10: Left = H/O, Right = Rx 1
    if len(doc.paragraphs) > 10:
        p10 = doc.paragraphs[10]
        p10.text = ''
        r_ho = p10.add_run(f"H/O: {history[:25]}" if history else "H/O")
        r_ho.font.size = Pt(15)
        r_tab = p10.add_run('\t\t')
        r_tab.font.size = Pt(15)
        if len(rx_lines) >= 1:
            r_rx1 = p10.add_run(rx_lines[0])
            r_rx1.font.size = Pt(15)

    # P11: Left = Temp, Right = Rx 2
    if len(doc.paragraphs) > 11:
        p11 = doc.paragraphs[11]
        p11.text = ''
        r_temp = p11.add_run(f"Temp. {temperature}")
        r_temp.font.size = Pt(15)
        r_tab = p11.add_run('\t\t')
        r_tab.font.size = Pt(15)
        if len(rx_lines) >= 2:
            r_rx2 = p11.add_run(rx_lines[1])
            r_rx2.font.size = Pt(15)

    # P12: Left = Clinical Signs / Diagnosis, Right = Rx 3
    if len(doc.paragraphs) > 12:
        p12 = doc.paragraphs[12]
        p12.text = ''
        r_cs = p12.add_run(clinical_signs[:24])
        r_cs.font.size = Pt(15)
        r_tab = p12.add_run('\t\t')
        r_tab.font.size = Pt(15)
        if len(rx_lines) >= 3:
            r_rx3 = p12.add_run(rx_lines[2])
            r_rx3.font.size = Pt(15)

    # P13: Optional Rx 4
    if len(doc.paragraphs) > 13:
        p13 = doc.paragraphs[13]
        p13.text = ''
        if len(rx_lines) >= 4:
            r_tab = p13.add_run('\t\t')
            r_tab.font.size = Pt(15)
            r_rx4 = p13.add_run(rx_lines[3])
            r_rx4.font.size = Pt(15)

    # P14: Left = Weight, Right = Rx 5
    if len(doc.paragraphs) > 14:
        p14 = doc.paragraphs[14]
        p14.text = ''
        r_wt = p14.add_run(f"Weight: {weight}")
        r_wt.font.size = Pt(15)
        if len(rx_lines) >= 5:
            r_tab = p14.add_run('\t\t')
            r_tab.font.size = Pt(15)
            r_rx5 = p14.add_run(rx_lines[4])
            r_rx5.font.size = Pt(15)

    # P15: Left = Prognosis (RED), Right = Rx 6
    if len(doc.paragraphs) > 15:
        p15 = doc.paragraphs[15]
        p15.text = ''
        r_prog = p15.add_run(f"Prognosis {prognosis}")
        r_prog.font.size = Pt(15)
        r_prog.font.color.rgb = RGBColor(0xFF, 0x00, 0x00) # Pure Red like reference!
        if len(rx_lines) >= 6:
            r_tab = p15.add_run('\t\t')
            r_tab.font.size = Pt(15)
            r_rx6 = p15.add_run(rx_lines[5])
            r_rx6.font.size = Pt(15)

    # P16: Left = Next Visit, Right = Advice:
    if len(doc.paragraphs) > 16:
        p16 = doc.paragraphs[16]
        p16.text = ''
        r_nv = p16.add_run(f"Next Visit:  {next_visit}")
        r_nv.font.size = Pt(15)
        r_adv_lbl = p16.add_run('\tAdvice: ')
        r_adv_lbl.font.size = Pt(15)

    # P17: Advice content
    if len(doc.paragraphs) > 17:
        p17 = doc.paragraphs[17]
        p17.text = ''
        clean_adv = str(advice).strip()
        if clean_adv.startswith('1)'):
            clean_adv = clean_adv[2:].strip()
        r_adv = p17.add_run(clean_adv if clean_adv else "Blood Profile: Basic + BP + RBS")
        r_adv.font.size = Pt(15)

    # Save output DOCX
    abs_out_docx = os.path.abspath(output_docx_path)
    os.makedirs(os.path.dirname(abs_out_docx), exist_ok=True)
    doc.save(abs_out_docx)
    print(f"Prescription docx successfully created at {abs_out_docx}")

    # Convert to PDF if output_pdf_path provided
    if output_pdf_path:
        abs_out_pdf = os.path.abspath(output_pdf_path)
        os.makedirs(os.path.dirname(abs_out_pdf), exist_ok=True)
        try:
            import win32com.client
            word = win32com.client.Dispatch('Word.Application')
            word.Visible = False
            try:
                wdoc = word.Documents.Open(abs_out_docx)
                wdoc.SaveAs(abs_out_pdf, FileFormat=17) # 17 = wdFormatPDF
                wdoc.Close()
                print(f"Prescription PDF successfully created via Word COM at {abs_out_pdf}")
            finally:
                word.Quit()
        except Exception as e:
            print(f"Word COM conversion failed: {e}. Trying fallback...")
            raise e

if __name__ == '__main__':
    if len(sys.argv) < 4:
        print("Usage: python generate_prescription.py <data.json> <template.docx> <output.docx> [output.pdf]")
        sys.exit(1)
    
    pdf_out = sys.argv[4] if len(sys.argv) > 4 else None
    generate_prescription(sys.argv[1], sys.argv[2], sys.argv[3], pdf_out)
