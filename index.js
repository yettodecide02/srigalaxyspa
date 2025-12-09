const express = require("express");
const path = require("path");
const cors = require("cors");
require("dotenv").config();

const { appendToSheet, getTodayRows } = require("./utils/sheets");
const { sendNotification } = require("./utils/sendNotification");
const { exportToExcel } = require("./utils/exportExcel");
const { sendWhatsAppMessage } = require("./utils/sendWhatsApp.js");
const { getAllRows} = require("./utils/sheets");

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "dist")));

app.post("/api/submit", async (req, res) => {
  try {
    const { service, date, time, firstName, email, phone, message } = req.body;

    if (!service || !date || !time || !firstName || !phone) {
      return res.status(400).json({
        success: false,
        error:
          "Please fill all required fields (service, date, time, name, phone).",
      });
    }

    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          error: "Invalid email format.",
        });
      }
    }

    const phoneRegex = /^[\d\s\-\+\(\)]+$/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({
        success: false,
        error: "Invalid phone number format.",
      });
    }

    const timestamp = new Date().toISOString();
    const formData = {
      timestamp,
      service,
      date,
      time,
      firstName,
      email: email || "N/A",
      phone,
      message: message || "",
    };

    const sheetResult = await appendToSheet(formData);

    if (!sheetResult.success) {
      throw new Error(sheetResult.error);
    }

    try {
      await sendNotification(formData);
      await sendWhatsAppMessage({
        to: process.env.ADMIN_WA_NUMBER,
        templateName: "form_submission_alert",
        params: [
          firstName,
          phone,
          service,
          `${date} ${time}`,
          message || "No message",
        ],
      });
    } catch (notifError) {
      console.error("WhatsApp notification failed:", notifError.message);
    }

    res.status(200).json({
      success: true,
      message: "Appointment request submitted! We'll contact you soon.",
      data: {
        id: sheetResult.rowNumber,
        timestamp: formData.timestamp,
      },
    });
  } catch (error) {
    console.error("Error processing form submission:", error);
    res.status(500).json({
      success: false,
      error: "Something went wrong. Please try again.",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

app.get("/api/export", async (req, res) => {
  try {
    const rows = await getTodayRows();

    if (!rows || rows.length <= 1) {
      return res.status(404).json({
        success: false,
        message: "No submissions found for today.",
      });
    }

    const excelBuffer = await exportToExcel(rows);
    const today = new Date().toISOString().split("T")[0];
    const filename = `relax-thai-spa-bookings-${today}.xlsx`;

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(excelBuffer);
  } catch (error) {
    console.error("❌ Error exporting data:", error);
    res.status(500).json({
      success: false,
      error: "Failed to export data.",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

app.get("/api/export-all", async (req, res) => {
  try {
    const rows = await getAllRows();

    if (!rows || rows.length <= 1) {
      return res.status(404).json({
        success: false,
        message: "No data found in the sheet.",
      });
    }

    const excelBuffer = await exportToExcel(rows);
    const filename = `relax-thai-spa-bookings-all.xlsx`;

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(excelBuffer);
  } catch (error) {
    console.error("❌ Error exporting ALL data:", error);
    res.status(500).json({
      success: false,
      error: "Failed to export all data.",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});


app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    status: "healthy",
    timestamp: new Date().toISOString(),
    sheetId: process.env.SHEET_ID ? "configured" : "missing",
    adminEmail: process.env.ADMIN_EMAIL ? "configured" : "missing",
  });
});

app.get("/api/stats", async (req, res) => {
  try {
    const rows = await getTodayRows();
    const count = rows.length > 1 ? rows.length - 1 : 0;

    res.json({
      success: true,
      today: new Date().toISOString().split("T")[0],
      bookings: count,
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch statistics.",
    });
  }
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({
    success: false,
    error: "Internal server error",
  });
});

app.listen(port, () => {
  console.log(`Relax Thai Spa app listening at http://localhost:${port}`);
});

process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully");
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("\nSIGINT received, shutting down gracefully");
  process.exit(0);
});
