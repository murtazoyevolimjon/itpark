import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface ExportColumn {
  header: string;
  key: string;
  width?: number;
}

/**
 * Export data to Excel (.xlsx) file
 */
export function exportToExcel({
  filename,
  sheetName = 'Sheet1',
  columns,
  data,
}: {
  filename: string;
  sheetName?: string;
  columns: ExportColumn[];
  data: any[];
}) {
  try {
    // Format data rows matching column keys and headers
    const formattedRows = data.map((item) => {
      const row: Record<string, any> = {};
      columns.forEach((col) => {
        const val = item[col.key];
        row[col.header] = val !== undefined && val !== null ? val : '-';
      });
      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(formattedRows);

    // Auto calculate column widths
    const colWidths = columns.map((col) => {
      const headerLength = col.header.length;
      const maxDataLength = Math.max(
        ...data.map((item) => {
          const val = item[col.key];
          return val ? String(val).length : 0;
        }),
        0
      );
      return { wch: Math.max(headerLength, maxDataLength, 12) + 3 };
    });
    worksheet['!cols'] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    const fullFilename = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
    XLSX.writeFile(workbook, fullFilename);
  } catch (error) {
    console.error('Excel export error:', error);
  }
}

/**
 * Export data to PDF (.pdf) file
 */
export function exportToPdf({
  filename,
  title,
  columns,
  data,
}: {
  filename: string;
  title: string;
  columns: ExportColumn[];
  data: any[];
}) {
  try {
    const doc = new jsPDF({
      orientation: columns.length > 5 ? 'landscape' : 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    // Add Header Information
    const formattedDate = new Date().toLocaleString('uz-UZ', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });

    doc.setFontSize(16);
    doc.setTextColor(30, 41, 59);
    doc.text(title, 14, 16);

    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(`Sana: ${formattedDate}  |  Jami yozuvlar: ${data.length} ta`, 14, 23);

    // Table Headers and Rows
    const tableHeaders = [columns.map((c) => c.header)];
    const tableRows = data.map((item) =>
      columns.map((col) => {
        const val = item[col.key];
        return val !== undefined && val !== null ? String(val) : '-';
      })
    );

    autoTable(doc, {
      head: tableHeaders,
      body: tableRows,
      startY: 28,
      theme: 'grid',
      styles: {
        fontSize: 9,
        cellPadding: 3,
        textColor: [30, 41, 59],
        lineColor: [226, 232, 240],
        lineWidth: 0.1,
      },
      headStyles: {
        fillColor: [43, 127, 255],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'left',
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      margin: { top: 28, left: 14, right: 14, bottom: 14 },
      didDrawPage: (dataInfo) => {
        // Footer page number
        const pageCount = (doc as any).internal.getNumberOfPages();
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        const pageSize = doc.internal.pageSize;
        const pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();
        doc.text(
          `Sahifa ${dataInfo.pageNumber} / ${pageCount}  •  IT-Park CRM`,
          14,
          pageHeight - 8
        );
      },
    });

    const fullFilename = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
    doc.save(fullFilename);
  } catch (error) {
    console.error('PDF export error:', error);
  }
}
