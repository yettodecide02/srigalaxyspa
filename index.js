const express = require("express");
const path = require("path");
const cors = require("cors");
const PDFDocument = require("pdfkit");
require("dotenv").config();
const jwt = require("jsonwebtoken");

const {
  appendAdminToSheet,
  appendToSheet,
  getTodayRows,
} = require("./utils/sheets");
const { sendNotification } = require("./utils/sendNotification");
const { exportToExcel } = require("./utils/exportExcel");
const { sendWhatsAppMessage } = require("./utils/sendWhatsApp.js");
const { getAllRows } = require("./utils/sheets");

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use((req, res, next) => {
  const isPaid = String(process.env.PAID).toLowerCase() === "true";

  if (req.path.startsWith("/api") || req.path === "/robots.txt") {
    return next();
  }
  if (!isPaid && req.path !== "/error.html") {
    return res.sendFile(path.join(__dirname, "dist", "error.html"));
  }

  next();
});
app.use(
  express.static(path.join(__dirname, "dist"), {
    immutable: true,
    maxAge: "1y",
    setHeaders: (res, filePath) => {
      if (filePath.endsWith("index.html")) {
        res.setHeader(
          "Cache-Control",
          "no-store, no-cache, must-revalidate, proxy-revalidate"
        );
      }
    },
  })
);

const adminAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== "admin") {
      return res.status(403).json({ error: "Forbidden" });
    }
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};

app.post("/api/submit", async (req, res) => {
  try {
    const { service, date, time, firstName, email, phone, message } = req.body;
    console.log(req.body);

    if (!service || !date || !firstName || !phone) {
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
      const combinedMessage = `
      👤 Name: ${firstName}
      📞 Phone: ${phone}
      🛠 Service: ${service}
      📅 Date & Time: ${date} ${time}
      💬 Message: ${message || "No message"}`;
      await sendWhatsAppMessage({
        to: process.env.ADMIN_WA_NUMBER,
        templateName: "form_submission_alert",
        params: [combinedMessage],
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

app.post("/api/admin/check-password", (req, res) => {
  const adminPassword = process.env.ADMIN_PASSWORD;
  const { password } = req.body;
  if (password === adminPassword) {
    const token = jwt.sign({ role: "admin" }, process.env.JWT_SECRET);
    res.status(200).json({ ok: true, token });
  } else {
    res.status(401).json({ ok: false, error: "Incorrect password" });
  }
});

app.use("/api", adminAuth);

app.post("/api/admin/submit", async (req, res) => {
  try {
    const {
      name,
      roomNo,
      address,
      contact,
      paymentMode,
      timeIn,
      timeOut,
      therapyName,
      duration,
      therapist,
      date,
      membership,
    } = req.body;

    if (!name || !date || !therapyName) {
      return res.status(400).json({
        success: false,
        error: "Please fill all required fields (name, date, therapyName).",
      });
    }

    const phoneRegex = /^[\d\s\-\+\(\)]+$/;
    if (!phoneRegex.test(contact)) {
      return res.status(400).json({
        success: false,
        error: "Invalid contact number format.",
      });
    }

    const timestamp = new Date().toISOString();

    const formData = {
      timestamp,
      name,
      roomNo: roomNo || "",
      address: address || "",
      contact,
      paymentMode: paymentMode || "",
      timeIn: timeIn || "",
      timeOut: timeOut || "",
      therapyName,
      duration: duration || "",
      therapist: therapist || "",
      date,
      membership: membership || "",
    };

    const sheetResult = await appendAdminToSheet(formData);

    if (!sheetResult.success) {
      throw new Error(sheetResult.error);
    }

    try {
      await sendNotification(formData);
    } catch (notifError) {
      console.error("Notification failed:", notifError.message);
    }

    res.status(200).json({
      success: true,
      message: "Form saved successfully!",
      data: {
        id: sheetResult.rowNumber,
        timestamp: formData.timestamp,
      },
    });
  } catch (error) {
    console.error("Error saving form:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error.",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

app.get("/api/admin/export", async (req, res) => {
  try {
    const rows = await getAllRows("admin");

    if (!rows || rows.length < 1) {
      return res.status(404).json({
        success: false,
        message: "No admin data found",
      });
    }

    const excelBuffer = await exportAdminExcel(rows);
    const filename = `customervisits.xlsx`;

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    res.send(excelBuffer);
  } catch (error) {
    console.error("❌ Error exporting admin excel:", error);
    res.status(500).json({
      success: false,
      message: "Failed to export admin data",
      error: error.message,
    });
  }
});

app.get("/api/export", async (req, res) => {
  try {
    const rows = await getTodayRows();

    if (!rows || rows.length < 1) {
      return res.status(404).json({
        success: false,
        message: "No submissions found for today.",
      });
    }

    const excelBuffer = await exportToExcel(rows);
    const today = new Date().toISOString().split("T")[0];
    const filename = `galaxy-spa-bookings-${today}.xlsx`;

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

    if (!rows || rows.length < 1) {
      return res.status(404).json({
        success: false,
        message: "No data found in the sheet.",
      });
    }

    const excelBuffer = await exportToExcel(rows);
    const filename = `galaxy-spa-bookings-all.xlsx`;

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
  const isPaid = String(process.env.PAID).toLowerCase() === "true";

  res.setHeader(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, proxy-revalidate"
  );

  if (isPaid) {
    return res.sendFile(path.join(__dirname, "dist", "index.html"));
  } else {
    return res.sendFile(path.join(__dirname, "dist", "error.html"));
  }
});

app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({
    success: false,
    error: "Internal server error",
  });
});

app.listen(port, () => {
  console.log(`Galaxy Spa app listening at http://localhost:${port}`);
});

process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully");
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("\nSIGINT received, shutting down gracefully");
  process.exit(0);
});
