import { supabase } from "@/integrations/supabase/client";

// Regex untuk membersihkan karakter non-alphanumeric dari part number
const PART_NO_CLEAN_REGEX = /[^A-Z0-9]/g;
// Regex untuk memvalidasi format part number akhir (1 huruf diikuti 9 digit)
const PART_NO_VALID_FORMAT_REGEX = /^[A-Z0-9]{10}$/;

/**
 * Memvalidasi apakah part number ada di tabel bom_master.
 * @param partNo Part number yang akan divalidasi.
 * @returns true jika part number ditemukan, false jika tidak.
 */
async function validatePartNoInBOM(partNo: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("bom_master")
    .select("child_part")
    .eq("child_part", partNo)
    .limit(1);

  if (error) {
    console.error("Error validating part number in BOM:", error);
    return false;
  }
  return data && data.length > 0;
}

/**
 * Memproses string label untuk mengekstrak PO dan Part Number,
 * serta memvalidasinya terhadap Master BOM.
 * @param inputString String label yang akan diproses.
 * @returns Objek JSON dengan detail PO, PartNo, status validasi BOM, versi label, dan pesan.
 */
export async function processLabel(inputString: string): Promise<{
  PO: string | null;
  PartNo: string | null;
  StatusBOM: boolean;
  VersiLabel: 1 | 2 | null;
  Pesan: string;
}> {
  let PO: string | null = null;
  let extractedPartNo: string | null = null;
  let VersiLabel: 1 | 2 | null = null;
  let StatusBOM = false;
  let Pesan = "";
  let PartNo: string | null = null; // Deklarasikan PartNo di sini

  // 1. Identifikasi Versi Label
  if (inputString.includes(" ")) {
    VersiLabel = 1;
    // Logika Ekstraksi Versi 1 (Kompleks)
    const tokens = inputString.split(" ").filter(Boolean); // Pisahkan berdasarkan spasi dan hapus token kosong

    if (tokens.length >= 2) {
      PO = tokens[1]; // Token kedua adalah PO
    }

    // Cari PartNo di antara semua token yang cocok dengan pola
    for (const token of tokens) {
      const cleanedToken = token.replace(PART_NO_CLEAN_REGEX, '');
      if (PART_NO_VALID_FORMAT_REGEX.test(cleanedToken)) {
        extractedPartNo = cleanedToken;
        break;
      }
    }
  } else {
    VersiLabel = 2;
    // Logika Ekstraksi Versi 2 (Sederhana)
    PO = null; // PO diabaikan
    extractedPartNo = inputString.replace(PART_NO_CLEAN_REGEX, ''); // Hapus karakter khusus
  }

  // 4. Validasi Master BOM (Universal)
  if (extractedPartNo && PART_NO_VALID_FORMAT_REGEX.test(extractedPartNo)) {
    StatusBOM = await validatePartNoInBOM(extractedPartNo);
    PartNo = extractedPartNo; // Set PartNo hanya jika formatnya valid
  } else {
    StatusBOM = false;
    PartNo = extractedPartNo; // Tetap kembalikan PartNo yang diekstrak (meskipun formatnya tidak valid) untuk debugging
  }

  // 5. Kondisi Output (Objek dan Pesan Akhir)
  if (StatusBOM) {
    Pesan = `✅ V${VersiLabel}: Part Number ${PartNo} COCOK dengan Master BOM. PO: ${PO || 'N/A'}.`;
  } else {
    Pesan = `❌ V${VersiLabel} KESALAHAN: Part Number ${PartNo || 'TIDAK TERDETEKSI'} TIDAK DITEMUKAN di Master BOM. PO: ${PO || 'N/A'}.`;
  }

  return { PO, PartNo, StatusBOM, VersiLabel, Pesan };
}