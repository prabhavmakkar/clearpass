function doPost(e) {
  var props = PropertiesService.getScriptProperties();
  var ssId = props.getProperty('SHEET_ID');

  if (!ssId) {
    var ss = SpreadsheetApp.create('ClearPass Waitlist');
    var sheet = ss.getActiveSheet();
    sheet.appendRow(['Timestamp', 'Email', 'Phone']);
    ssId = ss.getId();
    props.setProperty('SHEET_ID', ssId);
  }

  var data = JSON.parse(e.postData.contents);
  SpreadsheetApp.openById(ssId).getActiveSheet()
    .appendRow([new Date(), data.email, data.phone]);

  return ContentService
    .createTextOutput(JSON.stringify({ success: true }))
    .setMimeType(ContentService.MimeType.JSON);
}
