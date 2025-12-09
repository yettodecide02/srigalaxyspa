const ExcelJS = require("exceljs");

async function exportToExcel(rows) {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Spa Bookings");

    workbook.creator = "Relax Thai Spa";
    workbook.created = new Date();
    workbook.modified = new Date();

    worksheet.columns = [
      { header: "Timestamp", key: "timestamp", width: 20 },
      { header: "Service", key: "service", width: 25 },
      { header: "Date", key: "date", width: 15 },
      { header: "Time", key: "time", width: 12 },
      { header: "First Name", key: "firstName", width: 20 },
      { header: "Email", key: "email", width: 30 },
      { header: "Phone", key: "phone", width: 18 },
      { header: "Message", key: "message", width: 40 },
    ];

    worksheet.getRow(1).font = {
      bold: true,
      size: 12,
      color: { argb: "FFFFFFFF" },
    };
    worksheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF4CAF50" },
    };
    worksheet.getRow(1).alignment = {
      vertical: "middle",
      horizontal: "center",
    };

    const dataRows = rows.slice(1);

    dataRows.forEach((row, index) => {
      const rowData = {
        timestamp: row[0] || "",
        service: row[1] || "",
        date: row[2] || "",
        time: row[3] || "",
        firstName: row[4] || "",
        email: row[5] || "",
        phone: row[6] || "",
        message: row[7] || "",
      };

      const excelRow = worksheet.addRow(rowData);

      if (index % 2 === 0) {
        excelRow.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFF9F9F9" },
        };
      }

      if (rowData.timestamp) {
        excelRow.getCell(1).numFmt = "yyyy-mm-dd hh:mm:ss";
      }
    });

    worksheet.autoFilter = {
      from: "A1",
      to: "H1",
    };

    worksheet.views = [{ state: "frozen", xSplit: 0, ySplit: 1 }];

    worksheet.eachRow((row, rowNumber) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: "thin", color: { argb: "FFD3D3D3" } },
          left: { style: "thin", color: { argb: "FFD3D3D3" } },
          bottom: { style: "thin", color: { argb: "FFD3D3D3" } },
          right: { style: "thin", color: { argb: "FFD3D3D3" } },
        };
      });
    });

    const summaryRow = worksheet.addRow([]);
    summaryRow.getCell(1).value = `Total Bookings: ${dataRows.length}`;
    summaryRow.getCell(1).font = { bold: true, italic: true };
    summaryRow.getCell(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFFFE599" },
    };

    const today = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const dateRow = worksheet.addRow([]);
    dateRow.getCell(1).value = `Report Date: ${today}`;
    dateRow.getCell(1).font = { italic: true };

    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
  } catch (error) {
    console.error("Error generating Excel file:", error);
    throw new Error(`Failed to generate Excel file: ${error.message}`);
  }
}

module.exports = {
  exportToExcel,
};
