import { NextResponse } from 'next/server';
import { fetchFirestoreDocRest, fetchFirestoreCollectionRest } from '@/lib/firebaseAdmin';
import path from 'path';
import fs from 'fs';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

/**
 * GET /api/clinic/appointments/[id]/prescription
 * Query params: ?format=docx | json
 * Generates and returns the authoritative clinical treatment report / prescription.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: appointmentId } = await params;
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'json';

    let appointment = await fetchFirestoreDocRest('appointments', appointmentId);
    if (!appointment) {
      const allApts = await fetchFirestoreCollectionRest('appointments');
      const found = allApts.find((a) => a.appointmentId === appointmentId || a.id === appointmentId);
      if (found) {
        appointment = found;
      }
    }

    if (!appointment) {
      return NextResponse.json(
        { success: false, error: 'Appointment not found.' },
        { status: 404 }
      );
    }

    let treatment: any = appointment.treatment || null;
    if (!treatment && appointment.treatmentId) {
      try {
        treatment = await fetchFirestoreDocRest('treatments', appointment.treatmentId);
      } catch (_) {}
    }

    const prescriptionData = {
      appointmentId: appointment.appointmentId || appointmentId,
      petId: appointment.petId || treatment?.petId || '',
      petName: treatment?.petName || appointment.petName || 'Patient',
      petRegistrationNumber:
        treatment?.petRegistrationNumber || appointment.petRegistrationNumber || 'HPPC/P/01',
      breed: treatment?.breed || appointment.breed || 'Canine',
      species: treatment?.species || appointment.petType || 'Dog',
      age: treatment?.age || appointment.age || 'N/A',
      gender: treatment?.gender || appointment.gender || 'N/A',
      consultationDate:
        treatment?.consultationDate ||
        appointment.appointmentDate ||
        new Date().toISOString().split('T')[0],
      ownerName: treatment?.ownerName || appointment.customerName || appointment.ownerName || 'Pet Parent',
      ownerPhone: treatment?.ownerPhone || appointment.customerPhone || appointment.ownerPhone || '',
      ownerAddress: treatment?.ownerAddress || appointment.customerAddress || 'Kanpur',
      doctorName: treatment?.doctorName || appointment.doctorName || 'Dr. Ashwani Kumar Singh',
      doctorRegdNo: treatment?.doctorRegdNo || 'UPVC 6394',
      doctorQualifications:
        treatment?.doctorQualifications || 'B.V.Sc & A.H (RAJUVAS, Bikaner)',
      businessName: appointment.businessName || 'Healthy Paws Pet Clinic',
      temperature: treatment?.temperature || '',
      weight: treatment?.weight || '',
      history: treatment?.history || appointment.symptoms || appointment.notes || '',
      clinicalSigns: treatment?.clinicalSigns || '',
      prognosis: treatment?.prognosis || 'Guarded',
      diagnosis: treatment?.diagnosis || '',
      administeredItems: treatment?.administeredItems || treatment?.injections || [],
      prescribedItems: treatment?.prescribedItems || treatment?.prescriptions || [],
      consultationFee: treatment?.consultationFee || 0,
      medicinesFee: treatment?.medicinesFee || 0,
      discount: treatment?.discount || 0,
      totalAmount: treatment?.totalAmount || 0,
      advice: treatment?.advice || '',
      nextVisitDate: treatment?.nextVisitDate || '',
      clinicAddress:
        '620/112, W Block, Keshav Nagar (Near Shri Guest House), Kanpur, UP - 208014',
      emergencyContacts: '7568308808, 9460674066',
      clinicTimings: '10:30AM to 01:00PM, 05:00PM to 09:00PM',
      disclaimer:
        'This prescription is issued based on clinical judgment and available investigations. Treatment outcome may vary depending on the patient’s condition and response to therapy. Follow-up evaluation is advised as recommended.',
    };

    if (format === 'json') {
      return NextResponse.json({
        success: true,
        prescription: prescriptionData,
      });
    }

    if (format === 'pdf' || format === 'download' || !searchParams.has('format')) {
      // Locate template file
      const projectRoot = path.resolve(process.cwd(), '..');
      let templatePath = path.join(projectRoot, 'Prescription Format.docx');
      if (!fs.existsSync(templatePath)) {
        templatePath = path.resolve(process.cwd(), 'Prescription Format.docx');
      }

      if (!fs.existsSync(templatePath)) {
        return NextResponse.json(
          {
            success: false,
            error: 'Template file "Prescription Format.docx" was not found in the workspace root.',
          },
          { status: 404 }
        );
      }

      const tempDir = path.resolve(process.cwd(), 'tmp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const tempJsonPath = path.join(tempDir, `data_${Date.now()}.json`);
      const tempOutDocxPath = path.join(tempDir, `Prescription_${appointmentId}_${Date.now()}.docx`);
      const tempOutPdfPath = path.join(tempDir, `Prescription_${appointmentId}_${Date.now()}.pdf`);

      fs.writeFileSync(tempJsonPath, JSON.stringify(prescriptionData), 'utf-8');

      const scriptPath = path.resolve(process.cwd(), 'scripts', 'generate_prescription.py');

      await execFileAsync('python', [
        scriptPath,
        tempJsonPath,
        templatePath,
        tempOutDocxPath,
        tempOutPdfPath,
      ]);

      if (!fs.existsSync(tempOutPdfPath)) {
        throw new Error('Failed to generate PDF document.');
      }

      const fileBuffer = fs.readFileSync(tempOutPdfPath);

      // Clean up temp files
      try {
        fs.unlinkSync(tempJsonPath);
        fs.unlinkSync(tempOutDocxPath);
        fs.unlinkSync(tempOutPdfPath);
      } catch (_) {}

      const filename = `Prescription-${appointment.appointmentId || appointmentId}.pdf`;

      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `inline; filename="${filename}"`,
        },
      });
    }

    if (format === 'docx') {
      // Locate template file
      const projectRoot = path.resolve(process.cwd(), '..');
      let templatePath = path.join(projectRoot, 'Prescription Format.docx');
      if (!fs.existsSync(templatePath)) {
        templatePath = path.resolve(process.cwd(), 'Prescription Format.docx');
      }

      if (!fs.existsSync(templatePath)) {
        return NextResponse.json(
          {
            success: false,
            error: 'Template file "Prescription Format.docx" was not found in the workspace root.',
          },
          { status: 404 }
        );
      }

      const tempDir = path.resolve(process.cwd(), 'tmp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const tempJsonPath = path.join(tempDir, `data_${Date.now()}.json`);
      const tempOutDocxPath = path.join(tempDir, `Prescription_${appointmentId}_${Date.now()}.docx`);

      fs.writeFileSync(tempJsonPath, JSON.stringify(prescriptionData), 'utf-8');

      const scriptPath = path.resolve(process.cwd(), 'scripts', 'generate_prescription.py');

      await execFileAsync('python', [scriptPath, tempJsonPath, templatePath, tempOutDocxPath]);

      if (!fs.existsSync(tempOutDocxPath)) {
        throw new Error('Failed to generate docx document.');
      }

      const fileBuffer = fs.readFileSync(tempOutDocxPath);

      // Clean up temp files
      try {
        fs.unlinkSync(tempJsonPath);
        fs.unlinkSync(tempOutDocxPath);
      } catch (_) {}

      const filename = `Prescription-${appointment.appointmentId || appointmentId}.docx`;

      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type':
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    }

    return NextResponse.json({ success: false, error: 'Unsupported format.' }, { status: 400 });
  } catch (error: any) {
    console.error('[Clinic Prescription GET Error]', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to generate prescription report.' },
      { status: 500 }
    );
  }
}
