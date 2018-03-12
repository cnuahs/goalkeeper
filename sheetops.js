// GoalKeeper app for slack... sheets operations

// 2018-03-12 - Shaun L. Cloherty <s.cloherty@ieee.org>

function getColumnByName(s,name) { // OK
  // find column(s) by name, returning column number(s)
  var range = s.getDataRange();

  var nRows = range.getHeight();
  var nCols = range.getWidth();

  // first nonempty row contains column headings...
  rowloop:
  for (var row = 1; row <= nRows; row++) {
    for (var col = 1; col <= nCols; col++) {
      var value = range.getCell(row,col).getDisplayValue();
      if (value) {
        // first non-empty cell
        var headings = s.getRange(row,col,1,nCols-col+1).getValues()[0];

        name = name.map(function(n) {
          if (typeof(n) == "RegExp") {
            return n;
          } else {
            return new RegExp(n,"i");
          }
        });

        // look for our column heading... colName
        var idx = name.map(function(re) {
          for (var i = 0; i < headings.length; i++) {
            if (re.test(headings[i])) {
              return i + col;
            }
          }
        });

        break rowloop;
      }
    } // col
  } // row

  return idx
}

function testGetColumnByName() {
  // test getColumnByName()
  var ss = SpreadsheetApp.openById(sheetId());
  s = ss.getSheetByName("Sheet1");
  name = ["Writer"];

  Logger.log("Testing getColumnByName(%s,%s)",s.getName(),name);

  var result = getColumnByName(s,name);

  Logger.log("- %s",result);
}

function getRowByColumn(s,name,value) { // OK
  // find row by contents of column name, returning row number
  var range = s.getDataRange();

  var nRows = range.getHeight();
  var nCols = range.getWidth();

  var col = getColumnByName(s,name)[0]; // column index

  if (col == null) {
    return null; // column not found?
  }

  var idx = new Array();
  for (var row = 1; row <= nRows; row++) {
    var val = range.getCell(row,col).getValue();

    value.forEach(function(v) {
      if (v == val) {
        idx.push(row);
      }
    });

  }

  return idx;
}

function testGetRowByColumn() {
  // test getRowByColumn()
  var ss = SpreadsheetApp.openById(sheetId());
  s = ss.getSheetByName("Sheet1");
  name = ["Writer"];
  value = ["nobody"];

  Logger.log("Testing getRowByColumn(%s,%s,%s)",s.getName(),name,value);

  var result = getRowByColumn(s,name,value);

  Logger.log("- %s",result);
}


function setRow(s,row,name,value) { // SET name = value WHERE row; OK
  // set column name(s) to value(s) on row

//  var range = s.getDataRange();
  var range = s.getRange(1,1,row,s.getLastColumn()); // in case row is empty and therefore not included by getDataRange()

  var nRows = range.getHeight();

  var col = getColumnByName(s,name); // column indicies

  for (var i = 0; i < col.length; i++) {
    var cell = range.getCell(row,col[i]);
    cell.setValue(value[i]);
  }
}

function testSetRow() {
  // test setRow()
  var ss = SpreadsheetApp.openById(sheetId());
  s = ss.getSheetByName("Sheet1");
  row = getRowByColumn(s,["Writer"],["nobody"]);
  name = ["Goal"];
  value = ["A new goal."];

  Logger.log("Testing setRow(%s,%s,%s,%s)",s.getName(),row,name,value);

  var result = setRow(s,row,name,value);

  Logger.log("- %s",result);
}

function getRow(s,row,name) { // SELECT name WHERE row; OK
  // get value(s) from column name(s) on row

  var range = s.getDataRange();

  var value = getColumnByName(s,name).map(function (col) {
    return range.getCell(row,col).getValue();
  });

  return value;
}

function testGetRow() {
  // test getRow()
  var ss = SpreadsheetApp.openById(sheetId());
  var s = ss.getSheetByName("Sheet1");

  var row = getRowByColumn(s,["Writer"],["Shaun"]);
  var name = ["Writer","Goal"];

  Logger.log("Testing getRow(%s,%s,%s)",s.getName(),row,name);

  var result = getRow(s,row,name);

  Logger.log("- %s",result);
}
