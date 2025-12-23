const { google } = require("googleapis");
const path = require("path");
require("dotenv").config();

async function getGoogleSheetsClient() {
  try {
    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS),
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const authClient = await auth.getClient();
    const sheets = google.sheets({ version: "v4", auth: authClient });

    return sheets;
  } catch (error) {
    console.error("Failed to initialize Google Sheets client:", error);
    throw new Error("Google Sheets authentication failed");
  }
}

async function appendToSheet(formData) {
  try {
    const sheets = await getGoogleSheetsClient();
    const spreadsheetId = process.env.SHEET_ID;

    const row = [
      formData.timestamp,
      formData.service,
      formData.date,
      formData.time,
      formData.firstName,
      formData.email,
      formData.phone,
      formData.message,
    ];

    const response = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: "Sheet1!A:H",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [row],
      },
    });

    return {
      success: true,
      rowNumber: response.data.updates.updatedRows,
      range: response.data.updates.updatedRange,
    };
  } catch (error) {
    console.error("Error appending to sheet:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

async function appendAdminToSheet(formData) {
  try {
    const sheets = await getGoogleSheetsClient();
    const spreadsheetId = process.env.ADMIN_SHEET_ID;

    const row = [
      formData.timestamp,
      formData.name,
      formData.roomNo,
      formData.address,
      formData.contact,
      formData.paymentMode,
      formData.timeIn,
      formData.timeOut,
      formData.therapyName,
      formData.duration,
      formData.therapist,
      formData.date,
      formData.membership,
    ];

    const response = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: "Sheet1!A:M",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [row],
      },
    });

    return {
      success: true,
      rowNumber: response.data.updates.updatedRows,
      range: response.data.updates.updatedRange,
    };
  } catch (error) {
    console.error("Error appending to sheet:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

async function getTodayRows() {
  try {
    const sheets = await getGoogleSheetsClient();
    const spreadsheetId = process.env.SHEET_ID;

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "Sheet1!A:H",
    });

    const rows = response.data.values;

    if (!rows || rows.length === 0) return [];

    const today = new Date().toISOString().split("T")[0];

    const todayRows = rows.slice(1).filter((row) => {
      const timestamp = row[0];
      if (!timestamp) return false;
      const rowDate = new Date(timestamp).toISOString().split("T")[0];
      return rowDate === today;
    });

    return [rows[0], ...todayRows];
  } catch (error) {
    console.error("Error fetching today's rows:", error);
    throw new Error("Failed to fetch data from Google Sheets");
  }
}

async function initializeSheet() {
  try {
    const sheets = await getGoogleSheetsClient();
    const spreadsheetId = process.env.SHEET_ID;

    const headers = [
      "Timestamp",
      "Service",
      "Date",
      "Time",
      "First Name",
      "Email",
      "Phone",
      "Message",
    ];

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: "Sheet1!A1:H1",
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [headers] },
    });

    return { success: true };
  } catch (error) {
    console.error("Error initializing sheet:", error);
    return { success: false, error: error.message };
  }
}

async function getAllRows(type) {
  try {
    const sheets = await getGoogleSheetsClient();
    const spreadsheetId =
      type === "admin" ? process.env.ADMIN_SHEET_ID : process.env.SHEET_ID;

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "Sheet1!A:H",
    });

    return response.data.values || [];
  } catch (error) {
    console.error("Error fetching all rows:", error);
    throw new Error("Failed to fetch all sheet data");
  }
}

module.exports = {
  appendToSheet,
  appendAdminToSheet,
  getTodayRows,
  initializeSheet,
  getAllRows,
};
