const ExcelJS = require("exceljs");

async function exportToExcel(rows) {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Spa Bookings");

    workbook.creator = "Sri Galaxy Spa";
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

async function exportAdminExcel(rows) {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Admin Submissions");

    worksheet.columns = [
      { header: "Timestamp", key: "timestamp", width: 20 },
      { header: "Name", key: "name", width: 20 },
      { header: "Room No", key: "roomNo", width: 10 },
      { header: "Address", key: "address", width: 30 },
      { header: "Contact", key: "contact", width: 15 },
      { header: "Payment Mode", key: "paymentMode", width: 15 },
      { header: "Time In", key: "timeIn", width: 12 },
      { header: "Time Out", key: "timeOut", width: 12 },
      { header: "Therapy Name", key: "therapyName", width: 20 },
      { header: "Duration", key: "duration", width: 12 },
      { header: "Therapist", key: "therapist", width: 20 },
      { header: "Date", key: "date", width: 15 },
      { header: "Membership", key: "membership", width: 15 },
    ];

    worksheet.getRow(1).font = { bold: true };

    const dataRows = rows.slice(1);

    dataRows.forEach((row) => {
      worksheet.addRow({
        timestamp: row[0],
        name: row[1],
        roomNo: row[2],
        address: row[3],
        contact: row[4],
        paymentMode: row[5],
        timeIn: row[6],
        timeOut: row[7],
        therapyName: row[8],
        duration: row[9],
        therapist: row[10],
        date: row[11],
        membership: row[12],
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
  } catch (error) {
    console.error("❌ Error generating admin Excel:", error);
    throw new Error(error.message);
  }
}

module.exports = {
  exportToExcel,
  exportAdminExcel,
};
