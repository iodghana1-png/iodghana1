function doGet(e) {
  if (e.parameter.action === 'getAll') {
    return getAllRecords();
  }
  
  if (e.parameter.action === 'signOut') {
    return handleAdminSignOut(e.parameter);
  }
  
  return ContentService.createTextOutput("API is running");
}

function doPost(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getActiveSheet();
  
  try {
    var name = e.parameter.name || "";
    var phone = e.parameter.phone || "";
    var purpose = e.parameter.purpose || "";
    var action = e.parameter.action || "";
    
    name = name.trim();
    phone = phone.trim();
    purpose = purpose.trim();
    action = action.trim();
    
    if (!name || !phone || !purpose || !action) {
      return ContentService.createTextOutput("ERROR: Missing fields");
    }
    
    if (phone.length !== 10) {
      return ContentService.createTextOutput("ERROR: Invalid phone number");
    }
    
    if (phone.charAt(0) !== '0') {
      return ContentService.createTextOutput("ERROR: Phone must start with 0");
    }
    
    // Use GMT timezone
    var now = new Date();
    var dateStr = Utilities.formatDate(now, "GMT", "yyyy-MM-dd");
    var timeStr = Utilities.formatDate(now, "GMT", "HH:mm:ss");
    
    var lastRow = sheet.getLastRow();
    var foundRow = 0;
    var alreadySignedInToday = false;
    
    if (lastRow > 1) {
      for (var row = 2; row <= lastRow; row++) {
        var sheetDate = sheet.getRange(row, 1).getValue();
        var sheetPhone = sheet.getRange(row, 3).getValue();
        sheetPhone = String(sheetPhone).trim();
        
        var normalizedSheetPhone = sheetPhone.replace(/^0|^'/g, '');
        var normalizedInputPhone = phone.replace(/^0/, '');
        
        if (sheetDate) {
          var sheetDateStr = Utilities.formatDate(new Date(sheetDate), "GMT", "yyyy-MM-dd");
          
          if (sheetDateStr === dateStr && normalizedSheetPhone === normalizedInputPhone) {
            alreadySignedInToday = true;
            var timeOut = sheet.getRange(row, 6).getValue();
            if (!timeOut || String(timeOut).trim() === "") {
              foundRow = row;
            }
          }
        }
      }
    }
    
    if (action === 'signIn') {
      if (alreadySignedInToday) {
        return ContentService.createTextOutput("ALREADY_SIGNED_IN_TODAY");
      }
      sheet.appendRow([dateStr, name, "'" + phone, purpose, timeStr, ""]);
      return ContentService.createTextOutput("SIGN_IN_SUCCESS");
    }
    
    if (action === 'signOut') {
      if (foundRow === 0) {
        return ContentService.createTextOutput("NOT_SIGNED_IN");
      }
      var currentTimeOut = sheet.getRange(foundRow, 6).getValue();
      if (currentTimeOut && String(currentTimeOut).trim() !== "") {
        return ContentService.createTextOutput("ALREADY_SIGNED_OUT");
      }
      sheet.getRange(foundRow, 6).setValue(timeStr);
      return ContentService.createTextOutput("SIGN_OUT_SUCCESS");
    }
    
    return ContentService.createTextOutput("ERROR: Invalid action");
    
  } catch (error) {
    return ContentService.createTextOutput("ERROR: " + error.message);
  }
}

function handleAdminSignOut(params) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var phone = params.phone || "";
    var date = params.date || "";
    var timeOut = params.timeOut || "";
    
    if (!phone || !date || !timeOut) {
      return ContentService.createTextOutput(JSON.stringify({
        status: 'error',
        message: 'Missing parameters'
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    var lastRow = sheet.getLastRow();
    var foundRow = 0;
    
    if (lastRow > 1) {
      for (var row = 2; row <= lastRow; row++) {
        var sheetDate = sheet.getRange(row, 1).getValue();
        var sheetPhone = sheet.getRange(row, 3).getValue();
        var sheetTimeOut = sheet.getRange(row, 6).getValue();
        
        if (sheetDate) {
          var sheetDateStr = Utilities.formatDate(new Date(sheetDate), "GMT", "yyyy-MM-dd");
          var normalizedSheetPhone = String(sheetPhone).replace(/^0|^'/g, '');
          var normalizedInputPhone = phone.replace(/^0/, '');
          
          // Match by date and phone, and make sure they're not already signed out
          if (sheetDateStr === date && normalizedSheetPhone === normalizedInputPhone && 
              (!sheetTimeOut || String(sheetTimeOut).trim() === "")) {
            foundRow = row;
            break;
          }
        }
      }
    }
    
    if (foundRow === 0) {
      return ContentService.createTextOutput(JSON.stringify({
        status: 'error',
        message: 'Record not found or already signed out'
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // Update the timeOut column (column 6)
    sheet.getRange(foundRow, 6).setValue(timeOut);
    
    return ContentService.createTextOutput(JSON.stringify({
      status: 'success',
      message: 'Signed out successfully'
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: 'Error: ' + error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function getAllRecords() {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var data = sheet.getDataRange().getValues();
    var records = [];
    
    for (var i = 1; i < data.length; i++) {
      if (data[i][0]) {
        var dateStr = Utilities.formatDate(new Date(data[i][0]), "GMT", "yyyy-MM-dd");
        records.push({
          date: dateStr,
          name: data[i][1],
          phone: String(data[i][2]).replace(/^'/, ''),
          purpose: data[i][3],
          timeIn: String(data[i][4]),
          timeOut: String(data[i][5] || "")
        });
      }
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      status: 'success',
      data: records
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
