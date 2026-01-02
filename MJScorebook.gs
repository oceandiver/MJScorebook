/**
 * Google Apps Script for Mahjong Score App
 * 
 * Instructions to deploy:
 * 1. Open your Google Sheet: https://docs.google.com/spreadsheets/.../edit
 * 2. Go to Extensions > Apps Script
 * 3. Replace the default code with this script
 * 4. Save the script (Ctrl+S or Cmd+S)
 * 5. Click "Deploy" > "New deployment"
 * 6. Click the gear icon and select "Web app"
 * 7. Set "Execute as" to "Me"
 * 8. Set "Who has access" to "Anyone"
 * 9. Click "Deploy"
 * 10. Copy the Web App URL and use it in the iOS app
 */

function doPost(e) {
  try {
    // Parse the incoming JSON data
    const data = JSON.parse(e.postData.contents);
    const sheetTitle = data.sheetTitle;
    const values = data.values;
    
    // Get the active spreadsheet
    const spreadsheet = SpreadsheetApp.openById('1wwbS3wo-asF9poeyPYhuA_WvE8OEYJjj1h-G1GxMA0E');
    
    // Check if sheet with this title already exists
    let sheet = spreadsheet.getSheetByName(sheetTitle);
    
    if (!sheet) {
      // Create a new sheet with the date as title
      sheet = spreadsheet.insertSheet(sheetTitle);
    } else {
      // Clear existing data if sheet exists
      sheet.clear();
    }
    
    // Write the data to the sheet
    if (values && values.length > 0) {
      sheet.getRange(1, 1, values.length, values[0].length).setValues(values);
      
      // Format the header row
      const headerRange = sheet.getRange(1, 1, 1, values[0].length);
      headerRange.setFontWeight('bold');
      headerRange.setBackground('#E8E8E8');
      
      // Format the totals row (last row)
      if (values.length > 1) {
        const totalsRange = sheet.getRange(values.length, 1, 1, values[0].length);
        totalsRange.setFontWeight('bold');
        totalsRange.setBackground('#ADD8E6');
      }
      
      // Auto-resize columns
      sheet.autoResizeColumns(1, values[0].length);
    }
    
    // Return success response
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: 'Data saved successfully'
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    // Return error response
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  try {
    // Get the active spreadsheet
    const spreadsheet = SpreadsheetApp.openById('1wwbS3wo-asF9poeyPYhuA_WvE8OEYJjj1h-G1GxMA0E');
    const sheets = spreadsheet.getSheets();
    
    const games = [];
    
    // Iterate through all sheets
    for (let i = 0; i < sheets.length; i++) {
      const sheet = sheets[i];
      const sheetName = sheet.getName();
      
      // Skip if it's not a date format sheet (optional: you can filter by date pattern)
      // For now, we'll process all sheets
      
      try {
        // Get all data from the sheet
        const dataRange = sheet.getDataRange();
        const values = dataRange.getValues();
        
        if (values.length < 2) continue; // Need at least header + one round or totals
        
        // Parse the sheet data
        const headerRow = values[0];
        if (headerRow[0] !== 'Round') continue; // Skip if not a game sheet
        
        // Extract player names (skip 'Round' column)
        const players = headerRow.slice(1).map(name => ({ name: name.toString() }));
        
        // Extract rounds (skip header and totals row)
        const rounds = [];
        for (let rowIndex = 1; rowIndex < values.length - 1; rowIndex++) {
          const row = values[rowIndex];
          if (row[0] === 'Total') break; // Stop at totals row
          
          // Parse scores (skip 'Round' column)
          const scores = row.slice(1).map(cell => {
            const scoreStr = cell.toString().trim();
            if (scoreStr.startsWith('+')) {
              return parseInt(scoreStr.substring(1)) || 0;
            } else {
              return parseInt(scoreStr) || 0;
            }
          });
          
          rounds.push({ scores: scores });
        }
        
        // Parse date from sheet name (format: yyyy-MM-dd)
        let gameDate = new Date();
        try {
          const dateParts = sheetName.split('-');
          if (dateParts.length === 3) {
            gameDate = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));
          }
        } catch (e) {
          // Use current date if parsing fails
        }
        
        games.push({
          id: sheetName, // Use sheet name as ID
          sheetTitle: sheetName,
          players: players,
          rounds: rounds,
          createdAt: gameDate.toISOString(),
          isCompleted: true
        });
      } catch (error) {
        // Skip sheets that can't be parsed
        Logger.log('Error parsing sheet ' + sheetName + ': ' + error.toString());
      }
    }
    
    // Sort by date (newest first)
    games.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    // Return games
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      games: games
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Test function - can be used to verify the script works
 */
function testScript() {
  const testData = {
    sheetTitle: '2025-01-01',
    values: [
      ['Round', 'Player1', 'Player2', 'Player3', 'Player4'],
      ['1', '+10', '-5', '-3', '-2'],
      ['2', '-5', '+10', '-3', '-2'],
      ['Total', '+5', '+5', '-6', '-4']
    ]
  };
  
  const mockEvent = {
    postData: {
      contents: JSON.stringify(testData)
    }
  };
  
  const result = doPost(mockEvent);
  Logger.log(result.getContent());
}

